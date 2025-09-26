// src/pages/AuthConfirmScreen.jsx
import { useNavigation, useRoute } from "@react-navigation/native";
// START: recovery-aware import (CommonActions)
import { CommonActions } from "@react-navigation/native";
// END: recovery-aware import (CommonActions)
import * as Linking from "expo-linking";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthProvider";
import { useDukati } from "../context/DukatiContext";
import { supabase } from "../utils/supabaseClient";

// Aktivni handler – ekran SAM parsira URL i postavlja sesiju
const PASSIVE_AUTH_CONFIRM = false;

// START: debug log helpers (AuthConfirm)
const dbg = (...args) => console.log("[AUTHCONF]", ...args);
// END: debug log helpers (AuthConfirm)

function parseFromAnyUrl(url) {
  if (!url) return {};
  try {
    const u = new URL(url);
    const search = new URLSearchParams(u.search || "");
    const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));

    // PKCE code u query
    const code = search.get("code");
    if (code) return { code };

    // Hash i/ili query tokeni
    const access_token = hash.get("access_token") || search.get("access_token");
    const refresh_token = hash.get("refresh_token") || search.get("refresh_token");
    if (access_token && refresh_token) return { access_token, refresh_token };
  } catch { }
  return {};
}

// START: helper – prepoznaj recovery deeplink (?type=recovery u query ili hash)
function isRecoveryUrl(url) {
  try {
    if (!url) return false;
    const u = new URL(url);
    const qs = new URLSearchParams(u.search || "");
    const hs = new URLSearchParams((u.hash || "").replace(/^#/, ""));
    const t =
      (qs.get("type") || hs.get("type") || "")
        .toLowerCase()
        .trim();
    return t === "recovery";
  } catch {
    return false;
  }
}
// END: helper – prepoznaj recovery deeplink (?type=recovery u query ili hash)

export default function AuthConfirmScreen() {
  const nav = useNavigation();
  const route = useRoute();

  // START: recovery-aware – koristimo recoveryActive da ne pregazimo ResetPassword tok
  const { fetchProfile, recoveryActive } = useAuth();
  // END: recovery-aware

  const { fetchDukatiSaServera, refreshUserPlan } = useDukati();

  const [msg, setMsg] = useState("Potvrđujem prijavu…");

  // 1) Najpouzdanije: URL koji je iskoristio React Navigation linking
  const hookUrl = Linking.useURL();

  // START: log useURL promene
  useEffect(() => {
    dbg("useURL =", hookUrl);
  }, [hookUrl]);
  // END: log useURL promene

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const postLoginSync = async () => {
    // kratko sačekaj da Supabase zaista postavi sesiju
    for (let i = 0; i < 8; i++) {
      const { data } = await supabase.auth.getUser();
      if (data?.user) break;
      await delay(200);
    }
    try {
      await fetchProfile?.();
      await refreshUserPlan?.();
      await fetchDukatiSaServera?.();
    } catch { }
  };

  const processUrl = async (url) => {
    // START: processUrl debug
    dbg("processUrl candidate =", url);
    // END: processUrl debug

    const { code, access_token, refresh_token } = parseFromAnyUrl(url);

    // START: tokens kind
    if (code) dbg("detected PKCE code in query");
    if (access_token && refresh_token) dbg("detected hash/query tokens");
    // END: tokens kind

    if (code) {
      setMsg("Razmenjujem kod za sesiju…");
      const { error } = await supabase.auth.exchangeCodeForSession({ code });
      if (error) throw error;
      // START: exchange success
      dbg("exchangeCodeForSession OK");
      // END: exchange success

      setMsg("Uspešno! Sinhronišem nalog…");
      await postLoginSync();

      // START: recovery-aware navigacija posle PKCE
      if (isRecoveryUrl(url) || recoveryActive) {
        dbg("nav.reset -> ResetPassword (recovery)");
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
          })
        );
      } else {
        // dbg("nav.reset -> Home");
        // nav.reset({ index: 0, routes: [{ name: "Home" }] });
        nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
      }
      // END: recovery-aware navigacija posle PKCE
      return true;
    }

    if (access_token && refresh_token) {
      setMsg("Postavljam sesiju…");
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      // START: setSession success
      dbg("setSession OK (hash/search tokens)");
      // END: setSession success

      setMsg("Uspešno! Sinhronišem nalog…");
      await postLoginSync();

      // START: recovery-aware navigacija posle setSession
      if (isRecoveryUrl(url) || recoveryActive) {
        dbg("nav.reset -> ResetPassword (recovery)");
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
          })
        );
      } else {
        // dbg("nav.reset -> Home");
        // nav.reset({ index: 0, routes: [{ name: "Home" }] });
        nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
      }
      // END: recovery-aware navigacija posle setSession
      return true;
    }

    return false;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if (PASSIVE_AUTH_CONFIRM) {
          setMsg("Vraćam te u aplikaciju…");
          return;
        }

        // START: run entry logs
        dbg("route.params.url =", route?.params?.url);
        // END: run entry logs

        // 1) URL iz hook-a (najpouzdaniji)
        let candidate = hookUrl;

        // 2) Ako nema, probaj šta je ruter prosledio
        if (!candidate) candidate = route?.params?.url;

        // 3) Fallback – initialURL
        if (!candidate) {
          const init = await Linking.getInitialURL();
          // START: initialURL debug
          dbg("getInitialURL =", init);
          // END: initialURL debug
          candidate = init || null;
        }

        if (candidate) {
          const ok = await processUrl(candidate);
          if (ok || cancelled) return;
        }

        // 4) Poslednji fallback – pinguj sesiju
        // START: polling start
        dbg("no candidate URL, start session polling...");
        // END: polling start
        setMsg("Čekam potvrdu prijave…");
        const backoffs = [0, 300, 800, 1500];
        for (let i = 0; i < backoffs.length; i++) {
          if (backoffs[i] > 0) await delay(backoffs[i]);
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            // START: polling success
            dbg("session detected by polling, proceeding to sync");
            // END: polling success
            setMsg("Sesija aktivna. Sinhronišem…");
            await postLoginSync();
            if (!cancelled) {
              // START: recovery-aware navigacija tokom polling-a
              if (recoveryActive) {
                dbg("nav.reset -> ResetPassword (recovery via polling)");
                nav.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
                  })
                );
              } else {
                // dbg("nav.reset -> Home");
                // nav.reset({ index: 0, routes: [{ name: "Home" }] });
                nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
              }
              // END: recovery-aware navigacija tokom polling-a
            }
            return;
          }
        }

        // START: polling fail
        dbg("no url and no session after polling");
        // END: polling fail
        setMsg("Nije stigao povratni link. Zatvori i pokušaj ponovo.");
      } catch (e) {
        // START: run error
        dbg("run error:", e?.message || e);
        // END: run error
        setMsg("Greška pri potvrdi prijave.");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hookUrl, route?.params]); // bitno: useURL() kao dependency

  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color="#facc15" />
      <Text style={styles.info}>{msg}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: "#0b1026",
  },
  info: {
    color: "#fff",
    marginTop: 16,
    textAlign: "center",
    fontSize: 16,
  },
});
