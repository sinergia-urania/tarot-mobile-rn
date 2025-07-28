import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../utils/supabaseClient";

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const [dukati, setDukati] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userPlan, setUserPlan] = useState("gost");
  const [user, setUser] = useState(null);

  // Praćenje prethodnog broja dukata zbog zvuka
  const prevDukati = useRef(0);

  // --- Sinhronizacija user-a i plana iz Supabase ---
  useEffect(() => {
    const getUserAndPlan = async () => {
      setLoading(true);
      // 1. Dobavi ulogovanog korisnika
      const { data: { user: supaUser } = {} } =
        supabase.auth.getUser
          ? await supabase.auth.getUser()
          : { data: { user: supabase.auth.user() } };

      if (!supaUser) {
        setUser(null);
        setUserPlan("gost");
        setLoading(false);
        return;
      }
      setUser(supaUser);

      // 2. Dobavi plan iz baze
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("package")
        .eq("id", supaUser.id)
        .single();

      if (error) {
        setUserPlan("free");
      } else if (profile && profile.package) {
        setUserPlan(profile.package);
      } else {
        setUserPlan("free");
      }
      setLoading(false);
    };

    getUserAndPlan();

    // Slušaj promene auth-a (logout/login)
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      getUserAndPlan();
    });

    return () => {
      listener?.unsubscribe?.();
    };
  }, []);

  // Ručno refreshovanje plana (možeš pozvati kad god ti treba najnoviji plan iz baze)
  const refreshUserPlan = async () => {
    setLoading(true);
    if (!user) {
      setUserPlan("gost");
      setLoading(false);
      return;
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("package")
      .eq("id", user.id)
      .single();
    if (error) setUserPlan("free");
    else if (profile && profile.package) setUserPlan(profile.package);
    else setUserPlan("free");
    setLoading(false);
  };

  // Funkcija za promenu plana u Supabase i automatski refresh local state-a
  const setPlanInDatabase = async (plan) => {
    if (!user) return;
    setLoading(true);
    let premiumUntil = null;
    const danas = new Date();
    if (plan === "premium" || plan === "pro") {
      const za30Dana = new Date(danas);
      za30Dana.setDate(danas.getDate() + 30);
      premiumUntil = za30Dana.toISOString();
    }
    await supabase.from("profiles").update({ package: plan, premium_until: premiumUntil }).eq("id", user.id);
    await refreshUserPlan();
    setLoading(false);
  };

  // OSTALO: sve postojeće funkcije za dukate ostaju kao ranije
  const fetchDukatiSaServera = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Niste ulogovani.");
      const { data: profileData } = await supabase
        .from('profiles')
        .select('coins, package')
        .eq('id', userId)
        .single();
      if (profileData?.coins !== undefined) setDukati(profileData.coins);
      if (profileData?.package) setUserPlan(profileData.package);
      await AsyncStorage.setItem('dukati', String(profileData?.coins ?? 0));
      await AsyncStorage.setItem('userPlan', profileData?.package ?? "free");
    } catch (err) {
      const dukatiLocal = await AsyncStorage.getItem('dukati');
      const planLocal = await AsyncStorage.getItem('userPlan');
      if (dukatiLocal !== null) setDukati(Number(dukatiLocal));
      if (planLocal) setUserPlan(planLocal);
    } finally {
      setLoading(false);
    }
  };

  // Dodela dukata nakon gledanja reklame, dopune ili paketa (uvek koristi backend)
  const dodeliDukatePrekoBackenda = async (kolicina = 30) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Niste ulogovani.");
      const { data, error } = await supabase.rpc("reward_ad_watch", {
        user_id: userId,
        kolicina,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setDukati(data[0].broj_dukata ?? 0);
        await AsyncStorage.setItem("dukati", (data[0].broj_dukata ?? 0).toString());
      }
      return data?.[0]?.broj_dukata ?? dukati;
    } catch (err) {
      throw err;
    }
  };

  const dodeliMesecneDukate = async (kolicina = 150) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Niste ulogovani.");
      const { data, error } = await supabase.rpc("award_monthly_coins", {
        user_id: userId,
        kolicina,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setDukati(data[0].broj_dukata ?? 0);
        await AsyncStorage.setItem("dukati", (data[0].broj_dukata ?? 0).toString());
      }
      return data?.[0]?.broj_dukata ?? dukati;
    } catch (err) {
      throw err;
    }
  };

  // Plaćanje otvaranja i upis u tarot_sessions
  const platiOtvaranje = async ({ iznos, tip = "classic", is_archived = false }) => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Niste ulogovani.");
      const { data, error } = await supabase.rpc('spend_tarot_coins', {
        p_user_id: userId,
        p_coins_spent: iznos,
        p_type: tip,
        p_is_archived: is_archived,
      });
      if (error) throw error;
      await fetchDukatiSaServera();
      return data;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Globalni zvuk kad dukati RASTU
  useEffect(() => {
    if (prevDukati.current !== dukati && dukati > prevDukati.current) {
      // Samo kad su dukati porasli!
      (async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require("../assets/sounds/bling.mp3")
          );
          await sound.playAsync();
          setTimeout(() => sound.unloadAsync(), 1200); // Unload za svaki slučaj
        } catch {}
      })();
    }
    prevDukati.current = dukati;
  }, [dukati]);

  return (
    <DukatiContext.Provider
      value={{
        dukati,
        loading,
        userPlan,
        setUserPlan: setPlanInDatabase, // Backend-safe setter!
        refreshUserPlan, // ručni refresh plana
        fetchDukatiSaServera,
        dodeliDukatePrekoBackenda,
        dodeliMesecneDukate,
        platiOtvaranje,
      }}
    >
      {children}
    </DukatiContext.Provider>
  );
};

export const useDukati = () => useContext(DukatiContext);
