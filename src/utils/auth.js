import { Linking } from 'react-native';
import { supabase } from './supabaseClient';

// Provera isteka paketa — helper funkcija za AuthProvider
export async function proveriIstekPaketa(userId) {
  try {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("package, premium_until, coins")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const danas = new Date();
    const istek = profileData?.premium_until ? new Date(profileData.premium_until) : null;

    if (profileData.package !== "free" && istek && danas > istek) {
      const noviDukati = (profileData.coins ?? 0) + 150;
      await supabase
        .from("profiles")
        .update({
          package: "free",
          coins: noviDukati,
          premium_until: null,
        })
        .eq("id", userId);
      return { paketIstekao: true, noviDukati };
    }
    return { paketIstekao: false };
  } catch (err) {
    console.log("Greška u proveri isteka paketa:", err.message);
    return { paketIstekao: false, greska: err.message };
  }
}

// Klasičan login (email/password)
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Login sa Google-om (OAuth, mobile) — koristi Linking
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "com.mare82.tarotmobile://auth/callback",
    }
  });
  if (error) throw error;
  if (data?.url) {
    await Linking.openURL(data.url);
  }
  return data;
}

// Login sa Facebook-om (OAuth, mobile) — koristi Linking
export async function loginWithFacebook() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: "com.mare82.tarotmobile://auth/callback",
    }
  });
  if (error) throw error;
  if (data?.url) {
    await Linking.openURL(data.url);
  }
  return data;
}
