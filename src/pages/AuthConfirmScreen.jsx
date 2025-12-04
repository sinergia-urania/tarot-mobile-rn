import { CommonActions, useNavigation, useRoute } from "@react-navigation/native";
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

export default function AuthConfirmScreen() {
  const nav = useNavigation();
  const route = useRoute();

  // START: recovery-aware – uklanjamo recoveryActive, više ne radimo ResetPassword tok
  const { fetchProfile } = useAuth();
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
      dbg("exchangeCodeForSession OK");

      setMsg("Uspešno! Sinhronišem nalog…");
      await postLoginSync();

      // START: navigacija – uvek na Home (nema Recovery modala)
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
      // END: navigacija
      return true;
    }

    if (access_token && refresh_token) {
      setMsg("Postavljam sesiju…");
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
      dbg("setSession OK (hash/search tokens)");

      setMsg("Uspešno! Sinhronišem nalog…");
      await postLoginSync();

      // START: navigacija – uvek na Home (nema Recovery modala)
      nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
      // END: navigacija
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

        dbg("route.params.url =", route?.params?.url);

        // 1) URL iz hook-a (najpouzdaniji)
        let candidate = hookUrl;

        // 2) Ako nema, probaj šta je ruter prosledio
        if (!candidate) candidate = route?.params?.url;

        // 3) Fallback – initialURL
        if (!candidate) {
          const init = await Linking.getInitialURL();
          dbg("getInitialURL =", init);
          candidate = init || null;
        }

        if (candidate) {
          const ok = await processUrl(candidate);
          if (ok || cancelled) return;
        }

        // 4) Poslednji fallback – pinguj sesiju
        dbg("no candidate URL, start session polling...");
        setMsg("Čekam potvrdu prijave…");
        const backoffs = [0, 300, 800, 1500];
        for (let i = 0; i < backoffs.length; i++) {
          if (backoffs[i] > 0) await delay(backoffs[i]);
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            dbg("session detected by polling, proceeding to sync");
            setMsg("Sesija aktivna. Sinhronišem…");
            await postLoginSync();
            if (!cancelled) {
              // START: navigacija – uvek na Home
              nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Home" }] }));
              // END: navigacija
            }
            return;
          }
        }

        dbg("no url and no session after polling");
        setMsg("Nije stigao povratni link. Zatvori i pokušaj ponovo.");
      } catch (e) {
        dbg("run error:", e?.message || e);
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
