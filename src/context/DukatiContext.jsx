import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer } from "expo-audio";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { isProTier, normalizePlanCanon } from "../constants/plans";
import { useAuth } from "../context/AuthProvider";
import { supabase } from "../utils/supabaseClient";

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const { user } = useAuth();
  const { t } = useTranslation(["common"]);

  const [dukati, setDukati] = useState(0);
  const [loading, setLoading] = useState(false);

  // ✅ NOVI STATE: premium_until i cancellation_scheduled
  const [premiumUntil, setPremiumUntil] = useState(null);
  const [cancellationScheduled, setCancellationScheduled] = useState(false);

  const normalizePlan = (p) => {
    const v = String(p ?? "free").trim().toLowerCase();
    if (v === "pro" || v === "premium" || v === "proplus") return v;
    return "free";
  };
  const [userPlan, setUserPlan] = useState(null);
  const isPro = isProTier(userPlan || "free");

  const prevDukati = useRef(0);
  const isSoundPlayingRef = useRef(false);
  const isFetchingRef = useRef(false);

  const keyDukati = (uid) => (uid ? `dukati:${uid}` : `dukati:anon`);
  const keyPlan = (uid) => (uid ? `userPlan:${uid}` : `userPlan:anon`);

  const fetchProfileWithRetry = async (uid) => {
    const delays = [200, 400, 800];
    let lastErr = null;
    for (let i = 0; i < delays.length; i++) {
      const { data, error } = await supabase
        .from("profiles")
        .select("package, coins, premium_until, cancellation_scheduled")
        .eq("id", uid)
        .single();
      if (!error && data) return { data };
      lastErr = error;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    return { data: null, error: lastErr ?? new Error("profile_not_ready") };
  };

  // ✅ NOVA FUNKCIJA: Proveri da li je istekao premium_until i automatski prebaci na free
  const checkAndExpirePremium = async (uid) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("package, premium_until, cancellation_scheduled")
        .eq("id", uid)
        .single();

      if (!data) return;

      const expiryDate = data.premium_until ? new Date(data.premium_until) : null;
      const now = new Date();

      // Ako je istekao period, prebaci na free
      if (expiryDate && expiryDate < now && data.package !== "free") {
        await supabase
          .from("profiles")
          .update({
            package: "free",
            cancellation_scheduled: false,
          })
          .eq("id", uid);

        // Ažuriraj lokalni state
        setUserPlan("free");
        setCancellationScheduled(false);
        setPremiumUntil(null);

        return "free";
      }

      // Ako nije istekao, vrati trenutni plan
      return normalizePlanCanon(data.package);
    } catch (err) {
      console.warn("[checkAndExpirePremium] error:", err);
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);

      try {
        if (!user?.id) {
          setUserPlan(null);
          setPremiumUntil(null);
          setCancellationScheduled(false);
          try {
            await AsyncStorage.multiRemove([
              "dukati",
              "userPlan",
              keyDukati(),
              keyPlan(),
              "dukati:guest",
              "userPlan:guest",
            ]);
          } catch { }
          return;
        }

        // ✅ PRVO: Proveri da li je istekao premium
        const updatedPlan = await checkAndExpirePremium(user.id);

        // Učitaj profil
        const { data } = await fetchProfileWithRetry(user.id);
        if (!cancelled) {
          const finalPlan = updatedPlan || normalizePlanCanon(data?.package);
          setUserPlan(finalPlan);
          setPremiumUntil(data?.premium_until || null);
          setCancellationScheduled(data?.cancellation_scheduled || false);

          if (typeof data?.coins === "number") {
            setDukati(data.coins);
            try {
              await AsyncStorage.setItem(keyDukati(user.id), String(data.coins));
            } catch { }
          }
        }
      } finally {
        isFetchingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const refreshUserPlan = async () => {
    if (!user?.id) {
      setUserPlan(null);
      setPremiumUntil(null);
      setCancellationScheduled(false);
      return;
    }
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      // ✅ Proveri istek
      const updatedPlan = await checkAndExpirePremium(user.id);

      const { data } = await fetchProfileWithRetry(user.id);
      const finalPlan = updatedPlan || normalizePlanCanon(data?.package);
      setUserPlan(finalPlan);
      setPremiumUntil(data?.premium_until || null);
      setCancellationScheduled(data?.cancellation_scheduled || false);

      if (typeof data?.coins === "number") {
        setDukati(data.coins);
        try {
          await AsyncStorage.setItem(keyDukati(user.id), String(data.coins));
        } catch { }
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const setPlanInDatabase = async (plan) => {
    if (!user?.id) return;
    setLoading(true);

    const np = normalizePlanCanon(plan);
    let premiumUntil = null;
    if (np === "pro" || np === "premium") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      premiumUntil = d.toISOString();
    } else if (np === "proplus") {
      const d = new Date();
      d.setDate(d.getDate() + 365);
      premiumUntil = d.toISOString();
    }

    await supabase.from("profiles").update({
      package: np,
      premium_until: premiumUntil,
      cancellation_scheduled: false, // Reset cancel flag on upgrade
    }).eq("id", user.id);

    try {
      await AsyncStorage.setItem("userPlan", np);
      await AsyncStorage.setItem(keyPlan(user.id), np);
    } catch { }
    await refreshUserPlan();
    setLoading(false);
  };

  const fetchDukatiSaServera = async () => {
    if (!user?.id) {
      throw new Error(t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." }));
    }
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    try {
      // ✅ Proveri istek
      await checkAndExpirePremium(user.id);

      const { data } = await fetchProfileWithRetry(user.id);
      if (data?.coins !== undefined) {
        setDukati(data.coins);
        try {
          await AsyncStorage.setItem(keyDukati(user.id), String(data.coins));
        } catch { }
      }
      if (data?.package) {
        setUserPlan(normalizePlanCanon(data?.package));
        setPremiumUntil(data?.premium_until || null);
        setCancellationScheduled(data?.cancellation_scheduled || false);
      }

      await AsyncStorage.setItem("dukati", String(data?.coins ?? 0));
      await AsyncStorage.setItem("userPlan", normalizePlanCanon(data?.package));
      if (user?.id) await AsyncStorage.setItem(keyPlan(user.id), normalizePlanCanon(data?.package));
    } catch {
      // Offline fallback
      const dukatiLocal = await AsyncStorage.getItem(keyDukati(user.id));
      const planLocal = await AsyncStorage.getItem(keyPlan(user.id));
      if (dukatiLocal !== null) setDukati(Number(dukatiLocal));
      if (planLocal) {
        const cleaned = planLocal === "guest" || planLocal === "anon" ? null : normalizePlanCanon(planLocal);
        setUserPlan(cleaned);
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  };

  const parseAddCoinsResult = (data) => {
    const rec = Array.isArray(data) ? data[0] : data;
    return {
      awarded: !!rec?.awarded,
      coinsAfter: typeof rec?.coins_after === "number" ? rec.coins_after : undefined,
      nextEligible: rec?.next_eligible ?? null,
    };
  };

  const dodeliDukatePrekoBackenda = async (kolicina = 30) => {
    if (!user?.id) {
      throw new Error(t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." }));
    }

    const { data, error } = await supabase.rpc("add_coins", {
      p_user: user.id,
      p_amount: kolicina,
      p_reason: "ad_reward",
    });
    if (error) {
      console.log("[RPC add_coins ERR]", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      throw error;
    }

    const { awarded, coinsAfter, nextEligible } = parseAddCoinsResult(data);

    if (!awarded) {
      const e = new Error(`AD_LIMIT_REACHED ${nextEligible ?? ""}`.trim());
      e.code = "AD_LIMIT_REACHED";
      throw e;
    }

    if (coinsAfter !== undefined) {
      setDukati(coinsAfter);
      try {
        await AsyncStorage.setItem(keyDukati(user.id), String(coinsAfter));
      } catch { }
    } else {
      const { data: prof } = await supabase
        .from("profiles")
        .select("coins, package")
        .eq("id", user.id)
        .single();

      if (typeof prof?.coins === "number") {
        setDukati(prof.coins);
        try {
          await AsyncStorage.setItem(keyDukati(user.id), String(prof.coins));
        } catch { }
      }
      if (prof?.package) {
        const np = normalizePlanCanon(prof.package);
        setUserPlan(np);
        try {
          await AsyncStorage.setItem(keyPlan(user.id), np);
        } catch { }
      }
    }

    return coinsAfter ?? dukati;
  };

  const dodeliMesecneDukate = async (kolicina = 150) => {
    if (!user?.id) {
      throw new Error(t("common:errors.notLoggedIn", { defaultValue: "Niste ulogovani." }));
    }

    const { data, error } = await supabase.rpc("add_coins", {
      p_user: user.id,
      p_amount: kolicina,
      p_reason: "monthly_bonus",
    });
    if (error) throw error;

    const { awarded, coinsAfter, nextEligible } = parseAddCoinsResult(data);

    if (coinsAfter !== undefined) {
      setDukati(coinsAfter);
      try {
        await AsyncStorage.setItem(keyDukati(user.id), String(coinsAfter));
      } catch { }
    } else {
      await fetchDukatiSaServera();
    }

    return { awarded, coins_after: coinsAfter, next_eligible: nextEligible };
  };

  const platiOtvaranje = async () => {
    console.warn("platiOtvaranje: DEPRECATED – koristi se Edge flow.");
    await fetchDukatiSaServera();
    return { deprecated: true };
  };

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
          try {
            p.remove?.();
          } catch { }
          isSoundPlayingRef.current = false;
        }, 1200);
      } catch {
        isSoundPlayingRef.current = false;
      } finally {
        prevDukati.current = dukati;
      }
    })();
  }, [dukati]);

  const refreshCoins = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("coins")
        .eq("id", user.id)
        .single();
      if (!error && typeof data?.coins === "number") {
        setDukati(data.coins);
        try {
          await AsyncStorage.setItem(keyDukati(user.id), String(data.coins));
        } catch { }
      }
    } catch { }
  };

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`coins:user:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload?.new?.coins;
          if (typeof next === "number") {
            setDukati(next);
            try { AsyncStorage.setItem(keyDukati(user.id), String(next)); } catch { }
          }
          // ✅ Ažuriraj i premium_until ako se promeni
          if (payload?.new?.premium_until !== undefined) {
            setPremiumUntil(payload.new.premium_until);
          }
          if (payload?.new?.cancellation_scheduled !== undefined) {
            setCancellationScheduled(payload.new.cancellation_scheduled);
          }
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch { }
    };
  }, [user?.id]);

  return (
    <DukatiContext.Provider
      value={{
        dukati,
        loading,
        userPlan,
        isPro,
        // ✅ NOVI EXPORT: premium_until i cancellation_scheduled
        premiumUntil,
        cancellationScheduled,
        setUserPlan: setPlanInDatabase,
        refreshUserPlan,
        fetchDukatiSaServera,
        refreshCoins,
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
