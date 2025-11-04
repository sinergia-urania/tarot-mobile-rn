import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { registerForPushNotificationsAsync } from "../utils/pushNotifications";
import { supabase } from "../utils/supabaseClient";
// START: i18n import za sinhronizaciju jezika profil ⇄ app
import i18n from "../../i18n";
// END: i18n import

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// START: usklađeno – runtime generisani deep link ka /auth (bez /callback)
const DEEP_LINK_REDIRECT = Linking.createURL("auth");
// END: usklađeno – runtime generisani deep link ka /auth (bez /callback)

// START: storage keys – preimenovanje 'guest' -> 'anon' (+ BK čišćenje)
const keyDukati = (uid) => (uid ? `dukati:${uid}` : `dukati:anon`);
const keyPlan = (uid) => (uid ? `userPlan:${uid}` : `userPlan:anon`);
// END: storage keys

/* -------------------- Helpers -------------------- */
function parseTokensFromUrl(url) {
  if (!url) return {};
  // izvuci query i hash posebno (red OS vraća u hash-u, red u query-ju)
  const hashPart = url.includes("#") ? url.split("#")[1] : "";
  const queryPart = url.includes("?") ? url.split("?")[1].split("#")[0] : "";

  const fromHash = new URLSearchParams(hashPart);
  const fromQuery = new URLSearchParams(queryPart);

  const code = fromQuery.get("code"); // PKCE varijanta
  const access_token = fromHash.get("access_token") || fromQuery.get("access_token");
  const refresh_token = fromHash.get("refresh_token") || fromQuery.get("refresh_token");

  // START: recovery flag iz URL-a
  const type = (fromQuery.get("type") || fromHash.get("type") || "").toLowerCase();
  const isRecovery = type === "recovery";
  // END: recovery flag iz URL-a

  // START: ne menjamo postojeći povrat – samo ga proširujemo
  return { code, access_token, refresh_token, isRecovery };
  // END: ne menjamo postojeći povrat – samo ga proširujemo
}

// START: ensureSessionFromUrl – uklonjen getSessionFromUrl + ručno parsiranje (uz opciono helper fallback)
async function ensureSessionFromUrl(url) {
  try {
    if (!url) return false;

    // START: 1) Ručno parsiranje (radi na svim verzijama SDK-a)
    const { code, access_token, refresh_token } = parseTokensFromUrl(url);

    // 1) PKCE code flow
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession({ code });
      if (error) {
        console.warn("[OAUTH] exchangeCodeForSession error:", error.message);
        return false;
      }
      return true;
    }

    // 2) Hash/query tokens flow
    if (access_token && refresh_token) {
      console.log("[OAUTH] setSession (hash/search tokens)");
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) {
        console.warn("[OAUTH] setSession error:", error.message);
        return false;
      }
      return true;
    }
    // END: 1) Ručno parsiranje

    // 2) (Opciono) Ako SDK ipak ima helper, pokušaj i njega
    if (typeof supabase.auth.getSessionFromUrl === "function") {
      const { error: gsErr } = await supabase.auth.getSessionFromUrl({ storeSession: true }, url);
      if (!gsErr) return true;
      console.warn("[OAUTH] getSessionFromUrl helper err:", gsErr?.message);
    }
  } catch (e) {
    console.warn("[OAUTH] ensureSessionFromUrl failed:", e?.message);
  }
  return false;
}
// END: ensureSessionFromUrl – uklonjen getSessionFromUrl + ručno parsiranje (uz opciono helper fallback)

async function ensureUserProfileRow(user) {
  try {
    if (!user?.id) return null;

    // Probaj da pročitaš
    const { data: existing, error: readErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!readErr && existing) return existing;

    // Ako nema reda (ili just-created trka) — napravi
    const display_name =
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      user.email?.split("@")[0] ||
      "Korisnik";

    const username = (user.user_metadata?.username || user.email?.split("@")[0] || "korisnik")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/gi, "_");

    // Upsert kao fallback (ako trigger već upisuje, ovo neće škoditi)
    const { error: upErr } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name, username, coins: 150, package: "free" }, { onConflict: "id" });
    if (upErr) {
      console.warn("[AUTH] ensureUserProfile upsert err:", upErr.message);
      return null;
    }

    // Vrati svež red
    const { data: after } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return after ?? null;
  } catch (e) {
    console.warn("[AUTH] ensureUserProfileRow error:", e?.message);
    return null;
  }
}

/* -------------------- Provider -------------------- */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // START: recovery lock – globalni semafor za ResetPassword tok
  const [recoveryActive, setRecoveryActive] = useState(false);
  const clearRecoveryLock = () => setRecoveryActive(false);
  // END: recovery lock

  const signinWatchdogRef = useRef(null);

  // Init: initialURL -> setSession (ako ima token/code) -> getUser
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          // START: upali recovery ako je link tipa recovery
          const { isRecovery } = parseTokensFromUrl(initialUrl);
          if (isRecovery) setRecoveryActive(true);
          // END: upali recovery ako je link tipa recovery

          await ensureSessionFromUrl(initialUrl);
        }

        const { data } = await supabase.auth.getUser();
        if (mounted) setUser(data?.user ?? null);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    })();

    // Deeplink event: pokupi token/code i postavi sesiju
    const subLink = Linking.addEventListener("url", async ({ url }) => {
      console.log("[LINK] event url:", url);
      // START: upali recovery ako je link tipa recovery
      const { isRecovery } = parseTokensFromUrl(url);
      if (isRecovery) setRecoveryActive(true);
      // END: upali recovery ako je link tipa recovery

      await ensureSessionFromUrl(url);
    });

    // Auth state
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AUTH] event:", event, "user:", session?.user?.id ?? null);

      // START: recovery lock – Supabase signalizira recovery
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryActive(true);
      }
      // END: recovery lock

      if (event === "SIGNED_IN") {
        const u = session?.user ?? null;
        setUser(u);

        // watchdog (par pokušaja) — rešava OAuth “trku”
        if (signinWatchdogRef.current) clearInterval(signinWatchdogRef.current);
        let tries = 0;
        signinWatchdogRef.current = setInterval(async () => {
          tries += 1;
          const { data } = await supabase.auth.getUser();
          if (data?.user) {
            setUser(data.user);
            clearInterval(signinWatchdogRef.current);
            signinWatchdogRef.current = null;
            const prof = await ensureUserProfileRow(data.user);
            if (prof) setProfile(prof);
          } else if (tries >= 10) {
            clearInterval(signinWatchdogRef.current);
            signinWatchdogRef.current = null;
          }
        }, 250);
      } else if (event === "SIGNED_OUT") {
        // START: očisti i namespacovane ključeve za prethodnog korisnika (+ BK guest)
        const prevUid = session?.user?.id ?? user?.id ?? null;
        setUser(null);
        setProfile(null);
        try {
          await AsyncStorage.multiRemove([
            "dukati",
            "userPlan",
            prevUid ? keyDukati(prevUid) : "dukati:anon",
            prevUid ? keyPlan(prevUid) : "userPlan:anon",
            // BK: očisti i stare ključeve ako postoje
            "dukati:guest",
            "userPlan:guest",
          ]);
        } catch { }
        // END: očisti i namespacovane ključeve

        // START: safety – na logout ugasi recovery lock
        setRecoveryActive(false);
        // END: safety
      } else if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        setUser(session?.user ?? null);
      }
    });

    // AppState: kad se app vrati u fokus, osveži user-a
    const appStateSub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user ?? null);
      }
    });

    return () => {
      subLink?.remove?.();
      sub?.subscription?.unsubscribe?.();
      appStateSub?.remove?.();
      if (signinWatchdogRef.current) clearInterval(signinWatchdogRef.current);
      mounted = false;
    };
  }, []);

  // Kad se user promeni → dovedi profil (sa kratkim retry-jem protiv trke trigera)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setProfile(null);
        return;
      }
      // 2 pokušaja u razmaku 200ms
      for (let i = 0; i < 2; i++) {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!error && data) {
          if (!cancelled) setProfile(data);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      // fallback: force create
      const created = await ensureUserProfileRow(user);
      if (!cancelled && created) setProfile(created);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // START: posle što učitamo profil → primeni jezik iz profila na i18n
  useEffect(() => {
    const profLang = profile?.language?.slice(0, 2);
    const curr = i18n.language?.slice(0, 2);
    if (profLang && profLang !== curr) {
      i18n.changeLanguage(profLang);
    }
  }, [profile?.language]);
  // END: posle što učitamo profil → primeni jezik iz profila na i18n

  // negde unutar AuthProvider-a
  const pushTokenRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;

      try {
        const token = await registerForPushNotificationsAsync();
        if (!token) return;

        // izbegni nepotrebne UPDATE-ove
        if (pushTokenRef.current === token) return;
        pushTokenRef.current = token;

        await supabase
          .from("profiles")
          .update({ expo_push_token: token })
          .eq("id", user.id);
      } catch (e) {
        console.warn("[PUSH] upis tokena neuspešan:", e?.message || e);
      }
    })();
  }, [user?.id]);

  // START: dvosmerna sinhronizacija – kad se i18n jezik promeni, upiši u profil ako je različit
  useEffect(() => {
    if (!user?.id) return;
    const handler = async (lng) => {
      try {
        const short = (lng || "en").slice(0, 2);
        if (profile?.language?.slice(0, 2) === short) return; // već usklađeno
        await supabase
          .from("profiles")
          .update({ language: short }) // uklonjen updated_at (kolona ne postoji)
          .eq("id", user.id);
      } catch (e) {
        console.warn("[AUTH] i18n languageChanged → update profiles.language failed:", e?.message || e);
      }
    };
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, [user?.id, profile?.language]);
  // END: dvosmerna sinhronizacija – kad se i18n jezik promeni, upiši u profil ako je različit

  /* ---------- API ---------- */
  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (email, password, ime = "") => {
    setAuthLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: ime, display_name: ime },
          // START: redirect za potvrdu email-a – uvek ide na scheme://auth
          emailRedirectTo: DEEP_LINK_REDIRECT,
          // END: redirect za potvrdu email-a – uvek ide na scheme://auth
        },
      });
      if (error) throw error;
      return data;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      // START: zadrži UID pre signOut-a, da bi očistili per-user keš
      const prevUid = user?.id ?? null;
      // END: zadrži UID
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      try {
        // START: očisti i namespacovane ključeve za prethodnog korisnika (+ BK guest)
        await AsyncStorage.multiRemove([
          "dukati",
          "userPlan",
          prevUid ? keyDukati(prevUid) : "dukati:anon",
          prevUid ? keyPlan(prevUid) : "userPlan:anon",
          // BK: očisti i stare ključeve ako postoje
          "dukati:guest",
          "userPlan:guest",
        ]);
        // END: očisti i namespacovane ključeve
      } catch { }
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user?.id) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!error && data) {
      setProfile(data);
      return data;
    }
    return null;
  };

  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) setUser(data.user);
    return data?.user ?? null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        authLoading,
        // START: recovery lock – prosleđujemo u ceo app
        recoveryActive,
        clearRecoveryLock,
        // END: recovery lock
        login,
        register,
        logout,
        fetchProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
