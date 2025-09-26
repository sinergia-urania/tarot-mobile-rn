import AsyncStorage from "@react-native-async-storage/async-storage";
// START: expo-audio migracija (umesto expo-av)
import { createAudioPlayer } from "expo-audio";
// END: expo-audio migracija
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../utils/supabaseClient";
// START: i18n (DukatiContext - import useTranslation)
import { useTranslation } from "react-i18next";
// END: i18n (DukatiContext - import useTranslation)

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const { user } = useAuth();
  // START: i18n (DukatiContext - t hook)
  /* inicijalizacija i18n prevoda za common namespace */
  const { t } = useTranslation(["common"]);
  // END: i18n (DukatiContext - t hook)

  const [dukati, setDukati] = useState(0);
  const [loading, setLoading] = useState(false);

  // START: canonical plan
  const normalizePlan = (p) => {
    const v = String(p ?? "free").trim().toLowerCase();
    if (v === "pro" || v === "premium") return v;
    return "free";
  };
  const [userPlan, setUserPlan] = useState("guest");
  // END: canonical plan

  const prevDukati = useRef(0);
  const isSoundPlayingRef = useRef(false);
  const isFetchingRef = useRef(false);
  // START: storage keys – namespacovani po korisniku
  const keyDukati = (uid) => (uid ? `dukati:${uid}` : `dukati:guest`);
  const keyPlan = (uid) => (uid ? `userPlan:${uid}` : `userPlan:guest`);
  // END: storage keys – namespacovani po korisniku

  // --- helper: retry
  const fetchProfileWithRetry = async (uid) => {
    const delays = [200, 400, 800];
    let lastErr = null;
    for (let i = 0; i < delays.length; i++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("package, coins")
        .eq("id", uid)
        .single();
      if (!error && data) return { data };
      lastErr = error;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    return { data: null, error: lastErr ?? new Error("profile_not_ready") };
  };

  // --- sync user→state
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        if (!user?.id) {
          // START: guest hard-reset – nikad ne preuzimaj stare vrednosti
          setDukati(0);
          setUserPlan("guest");
          try {
            await AsyncStorage.multiRemove(["dukati", "userPlan", keyDukati(), keyPlan()]);
          } catch { }
          return;
          // END: guest hard-reset
        }

        const { data } = await fetchProfileWithRetry(user.id);
        if (!cancelled) {
          setUserPlan(normalizePlan(data?.package));
          if (typeof data?.coins === "number") setDukati(data.coins);
        }
      } finally {
        isFetchingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // --- ručni refresh
  const refreshUserPlan = async () => {
    if (!user?.id) { setUserPlan("guest"); setDukati(0); return; }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await fetchProfileWithRetry(user.id);
      setUserPlan(normalizePlan(data?.package));
      if (typeof data?.coins === "number") setDukati(data.coins);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  // --- promena plana + lokalni refresh
  const setPlanInDatabase = async (plan) => {
    if (!user?.id) return;
    setLoading(true);

    const np = normalizePlan(plan);
    let premiumUntil = null;
    if (np === "premium" || np === "pro") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      premiumUntil = d.toISOString();
    }

    await supabase
      .from("profiles")
      .update({ package: np, premium_until: premiumUntil })
      .eq("id", user.id);

    try { await AsyncStorage.setItem("userPlan", np); } catch { }
    await refreshUserPlan();
    setLoading(false);
  };

  // --- full refresh
  const fetchDukatiSaServera = async () => {
    // START: i18n (notLoggedIn poruka)
    /* original:
    if (!user?.id) throw new Error("Niste ulogovani.");
    */
    if (!user?.id) {
      throw new Error(
        t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." })
      );
    }
    // END: i18n (notLoggedIn poruka)
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      const { data } = await fetchProfileWithRetry(user.id);
      if (data?.coins !== undefined) setDukati(data.coins);
      if (data?.package) setUserPlan(normalizePlan(data?.package));

      await AsyncStorage.setItem("dukati", String(data?.coins ?? 0));
      await AsyncStorage.setItem("userPlan", normalizePlan(data?.package));
    } catch {
      // START: offline fallback – čitaj isključivo namespacovane ključeve aktivnog user-a
      if (!user?.id) {
        // za gosta nikad ne vraćamo keš
        setDukati(0);
        setUserPlan("guest");
      } else {
        const dukatiLocal = await AsyncStorage.getItem(keyDukati(user.id));
        const planLocal = await AsyncStorage.getItem(keyPlan(user.id));
        if (dukatiLocal !== null) setDukati(Number(dukatiLocal));
        if (planLocal) setUserPlan(planLocal === "guest" ? "guest" : normalizePlan(planLocal));
      }
      // END: offline fallback
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  // --- helper parse add_coins
  const parseAddCoinsResult = (data) => {
    const rec = Array.isArray(data) ? data[0] : data;
    return {
      awarded: !!rec?.awarded,
      coinsAfter: typeof rec?.coins_after === "number" ? rec.coins_after : undefined,
      nextEligible: rec?.next_eligible ?? null,
    };
  };

  // --- ad reward (RPC)
  const dodeliDukatePrekoBackenda = async (kolicina = 30) => {
    // START: i18n (notLoggedIn poruka)
    /* original:
    if (!user?.id) throw new Error("Niste ulogovani.");
    */
    if (!user?.id) {
      throw new Error(
        t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." })
      );
    }
    // END: i18n (notLoggedIn poruka)

    const { data, error } = await supabase.rpc("add_coins", {
      p_user: user.id,
      p_amount: kolicina,
      p_reason: "ad_reward",
    });
    if (error) {
      console.log('[RPC add_coins ERR]', {
        code: error?.code, message: error?.message, details: error?.details, hint: error?.hint,
      });
      throw error;
    }

    const { awarded, coinsAfter, nextEligible } = parseAddCoinsResult(data);

    if (!awarded) {
      const e = new Error(`AD_LIMIT_REACHED ${nextEligible ?? ""}`.trim());
      e.code = "AD_LIMIT_REACHED";
      // START: i18n (AD_LIMIT_REACHED guidance)
      /* UI primer:
         if (e.code === "AD_LIMIT_REACHED") {
           toast.show(t("common:errors.adLimitReached", { defaultValue: "Dnevni limit oglasa je iskorišćen." }));
         }
      */
      // END: i18n (AD_LIMIT_REACHED guidance)
      throw e;
    }

    if (coinsAfter !== undefined) {
      setDukati(coinsAfter);
      // START: storage write – namespacovani ključ po korisniku
      try { await AsyncStorage.setItem(keyDukati(user.id), String(coinsAfter)); } catch { }
      // END: storage write – namespacovani ključ po korisniku
    } else {
      const { data: prof } = await supabase
        .from("profiles")
        .select("coins, package")
        .eq("id", user.id)
        .single();

      if (typeof prof?.coins === "number") {
        setDukati(prof.coins);
        // START: storage write – namespacovani ključ po korisniku
        try { await AsyncStorage.setItem(keyDukati(user.id), String(prof.coins)); } catch { }
        // END: storage write – namespacovani ključ po korisniku
      }
      if (prof?.package) {
        const np = normalizePlan(prof.package);
        setUserPlan(np);
        // START: storage write – namespacovani ključ po korisniku
        try { await AsyncStorage.setItem(keyPlan(user.id), np); } catch { }
        // END: storage write – namespacovani ključ po korisniku
      }
    }

    return coinsAfter ?? dukati;
  };

  // --- mesečni bonus (RPC)
  const dodeliMesecneDukate = async (kolicina = 150) => {
    // START: i18n (notLoggedIn poruka)
    /* original:
    if (!user?.id) throw new Error("Niste ulogovani.");
    */
    if (!user?.id) {
      throw new Error(
        t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." })
      );
    }
    // END: i18n (notLoggedIn poruka)

    const { data, error } = await supabase.rpc("add_coins", {
      p_user: user.id,
      p_amount: kolicina,
      p_reason: "monthly_bonus",
    });
    if (error) throw error;

    const { awarded, coinsAfter, nextEligible } = parseAddCoinsResult(data);

    if (coinsAfter !== undefined) {
      setDukati(coinsAfter);
      // START: storage write – namespacovani ključ po korisniku
      try { await AsyncStorage.setItem(keyDukati(user.id), String(coinsAfter)); } catch { }
      // END: storage write – namespacovani ključ po korisniku
    } else {
      await fetchDukatiSaServera();
    }

    return { awarded, coins_after: coinsAfter, next_eligible: nextEligible };
  };

  // --- deprecated
  const platiOtvaranje = async () => {
    console.warn("platiOtvaranje: DEPRECATED – koristi se Edge flow.");
    await fetchDukatiSaServera();
    return { deprecated: true };
  };

  // --- SFX on coins up
  useEffect(() => {
    const rast = dukati > prevDukati.current;
    if (!rast || isSoundPlayingRef.current) {
      prevDukati.current = dukati;
      return;
    }
    (async () => {
      try {
        isSoundPlayingRef.current = true;
        const p = createAudioPlayer(require("../assets/sounds/bling.mp3"));
        p.loop = false;
        p.volume = 1;
        await p.seekTo(0);
        p.play();
        setTimeout(() => {
          try { p.remove?.(); } catch { }
          isSoundPlayingRef.current = false;
        }, 1200);
      } catch {
        isSoundPlayingRef.current = false;
      } finally {
        prevDukati.current = dukati;
      }
    })();
  }, [dukati]);

  return (
    <DukatiContext.Provider
      value={{
        dukati,
        loading,
        userPlan,
        setUserPlan: setPlanInDatabase,
        refreshUserPlan,
        fetchDukatiSaServera,
        dodeliDukatePrekoBackenda,
        dodeliMesecneDukate,
        platiOtvaranje,
        userId: user?.id ?? null,
      }}
    >
      {children}
    </DukatiContext.Provider>
  );
};

export const useDukati = () => useContext(DukatiContext);
