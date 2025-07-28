// START: Dodaj import za proveru isteka i toast
import Toast from "react-native-toast-message";
import { proveriIstekPaketa } from "../utils/auth";
// END: Dodaj import za proveru isteka i toast

import React, { createContext, useContext, useEffect, useState } from "react";
import { Linking } from "react-native";
import { supabase } from "../utils/supabaseClient";

const AuthContext = createContext();

// START: ensureUserProfile sa retry & delay logikom + extra logging!
async function ensureUserProfile(user) {
  console.log("ensureUserProfile: user =", user);
  if (!user || !user.id) {
    console.log("ensureUserProfile: nema validnog usera!");
    return;
  }

  await new Promise(resolve => setTimeout(resolve, 1200));
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  let profile = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    profile = data;
    if (profile) {
      console.log("ensureUserProfile: profil pronađen:", profile);
      break;
    }
    if (attempts === 0) {
      const username = user.user_metadata?.displayName || user.email || "Korisnik";
      const { error: insertError } = await supabase.from('profiles').insert([
        { id: user.id, username }
      ]);
      if (insertError && insertError.code !== "23505") {
        console.log("Greška pri kreiranju profila:", insertError);
        break;
      }
      console.log("ensureUserProfile: profil kreiran!");
    }
    await sleep(1000);
    attempts++;
  }
  if (!profile) {
    console.log("ensureUserProfile: profil NIJE pronađen ni posle retry-ja!");
  }
  return profile;
}
// END: ensureUserProfile sa retry & delay logikom

function getTokensFromUrl(url) {
  const fragment = url.split("#")[1];
  if (!fragment) return {};
  const params = new URLSearchParams(fragment);
  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sve što radiš sa session/user sada je ovde
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Polling za deep link login
  useEffect(() => {
    const refreshUserAfterDeepLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (
        initialUrl &&
        (initialUrl.includes("auth/callback") || initialUrl.includes("access_token"))
      ) {
        const { access_token, refresh_token } = getTokensFromUrl(initialUrl);
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          const { data } = await supabase.auth.getSession();
          setUser(data.session?.user || null);
          setAuthLoading(false);
        } else {
          setTimeout(async () => {
            const { data } = await supabase.auth.getSession();
            setUser(data.session?.user || null);
            setAuthLoading(false);
          }, 400);
        }
      }
    };
    refreshUserAfterDeepLink();
  }, []);

  // Deep link dok je app otvoren
  useEffect(() => {
    const handleDeepLink = async (event) => {
      if (
        event.url.includes("auth/callback") ||
        event.url.includes("access_token")
      ) {
        const { access_token, refresh_token } = getTokensFromUrl(event.url);
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          const { data } = await supabase.auth.getSession();
          setUser(data.session?.user || null);
          setAuthLoading(false);
        } else {
          setTimeout(async () => {
            const { data } = await supabase.auth.getSession();
            setUser(data.session?.user || null);
            setAuthLoading(false);
          }, 400);
        }
      }
    };
    const sub = Linking.addEventListener("url", handleDeepLink);
    return () => sub.remove();
  }, []);

  // START: Provera profila + automatska provera isteka paketa
  useEffect(() => {
    if (user && user.id) {
      setTimeout(async () => {
        await ensureUserProfile(user);
        const res = await proveriIstekPaketa(user.id);
        if (res?.paketIstekao) {
          Toast.show({
            type: "info",
            text1: "Pretplata je istekla",
            text2: `Vaš nalog je vraćen na Free paket. Dobili ste +${res.noviDukati} dukata!`,
            position: "bottom",
            visibilityTime: 4000,
          });
        }
      }, 1400);
    }
  }, [user]);
  // END: Provera profila + automatska provera isteka paketa

  const login = async (email, password) => {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setUser(data?.user || null);
    setAuthLoading(false);
    if (error) throw error;
    return data;
  };

  // START: Dodata funkcija za registraciju sa automatskim loginom
  const register = async (email, password, ime = "") => {
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: ime },
      },
    });
    setAuthLoading(false); // <- Uvek nakon async!
    if (error) throw error;
    return data;
  };
  // END: Dodata funkcija za registraciju sa automatskim loginom

  const [profile, setProfile] = useState(null);

  const logout = async () => {
    setAuthLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setAuthLoading(false);
    setProfile(null);
  };
  // START: Dodata funkcija fetchProfile i izložena u contextu
const fetchProfile = async () => {
  if (!user || !user.id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) {
    console.log("fetchProfile error:", error);
    return null;
  }
  setProfile(data);
  return data;
};
// END: Dodata funkcija fetchProfile i izložena u contextu

return (
  <AuthContext.Provider value={{
    user,
    profile,
    authLoading,
    login,
    logout,
    register,
    fetchProfile, // <- obavezno dodaj ovde!
  }}>
    {children}
  </AuthContext.Provider>
);

  
};

export const useAuth = () => useContext(AuthContext);

// END: Supabase AuthProvider za React Native/Expo sa podrškom za sesije
