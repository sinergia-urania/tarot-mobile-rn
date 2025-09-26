import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabaseClient";

// Omogući da se web auth sesija pravilno zatvori i vrati rezultat u app
WebBrowser.maybeCompleteAuthSession();

// Expo AuthSession PROXY (HTTPS redirect) — radi i u Dev Client-u i u standalone buildovima
const REDIRECT_URI = AuthSession.makeRedirectUri({ useProxy: true });
console.log("[OAUTH] REDIRECT =", REDIRECT_URI);

// Helper: parsiraj i ?code=... i #access_token / refresh_token
function parseFromAnyUrl(url) {
  if (!url) return {};
  try {
    const u = new URL(url);
    const search = new URLSearchParams(u.search || "");
    const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));
    const code = search.get("code");
    if (code) return { code };
    const access_token = hash.get("access_token") || search.get("access_token");
    const refresh_token = hash.get("refresh_token") || search.get("refresh_token");
    if (access_token && refresh_token) return { access_token, refresh_token };
  } catch { }
  return {};
}

// Klasičan email/lozinka login (radi kao i do sada)
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// START: Delegacija na oauthProxy (Varijanta A)
import {
  loginWithFacebook as loginWithFacebookProxy,
  loginWithGoogle as loginWithGoogleProxy,
} from "./oauthProxy";

// OAuth Google – delegirano na oauthProxy (custom scheme + PKCE)
export async function loginWithGoogle() {
  return loginWithGoogleProxy();
}

// OAuth Facebook – delegirano na oauthProxy (custom scheme + PKCE)
export async function loginWithFacebook() {
  return loginWithFacebookProxy();
}
// END: Delegacija na oauthProxy (Varijanta A)

// (opciono) helper koji si koristio
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

    if (profileData?.package !== "free" && istek && danas > istek) {
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
    console.log("Greška u proveri isteka paketa:", err?.message || err);
    return { paketIstekao: false, greska: String(err?.message || err) };
  }
}

/* ===========================================================================
   START: LEGACY OAuth implementacije (sačuvano zbog pravila – ne brišemo kod)
   Napomena: OVE FUNKCIJE SE VIŠE NE KORISTE. Umesto njih koristimo
   loginWithGoogle/loginWithFacebook delegirane na utils/oauthProxy.js
   (custom scheme + PKCE, ujednačeno sa recovery/reset tokovima).
=========================================================================== */

/*
// Google OAuth preko AuthSession proxy-ja (legacy)
export async function loginWithGoogle_LEGACY() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REDIRECT_URI,
      flowType: "pkce",
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nije vraćen auth URL iz Supabase-a.");

  console.log("[OAUTH] openURL =", data.url);

  const result = await AuthSession.startAsync({
    authUrl: data.url,
    returnUrl: REDIRECT_URI,
  });
  console.log("[OAUTH] AuthSession result =", result);

  if (result.type !== "success" || !result.url) {
    await new Promise((r) => setTimeout(r, 1200));
    const { data: s } = await supabase.auth.getSession();
    if (s?.session?.user) {
      console.log("[OAUTH] session present after fallback polling");
      return { ok: true, via: "poll" };
    }
    throw new Error("Prijava prekinuta.");
  }

  const { code, access_token, refresh_token } = parseFromAnyUrl(result.url);

  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession({ code });
    if (exErr) throw exErr;
    return { ok: true, via: "code" };
  }
  if (access_token && refresh_token) {
    const { error: ssErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (ssErr) throw ssErr;
    return { ok: true, via: "tokens" };
  }
  throw new Error("Nepoznat redirect format.");
}

// Facebook OAuth preko AuthSession proxy-ja (legacy)
export async function loginWithFacebook_LEGACY() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: REDIRECT_URI,
      flowType: "pkce",
    },
  });
  if (error) throw error;
  if (!data?.url) throw new Error("Nije vraćen auth URL iz Supabase-a.");

  console.log("[OAUTH] openURL =", data.url);

  const result = await AuthSession.startAsync({
    authUrl: data.url,
    returnUrl: REDIRECT_URI,
  });
  console.log("[OAUTH] AuthSession result =", result);

  if (result.type !== "success" || !result.url) {
    await new Promise((r) => setTimeout(r, 1200));
    const { data: s } = await supabase.auth.getSession();
    if (s?.session?.user) {
      console.log("[OAUTH] session present after fallback polling");
      return { ok: true, via: "poll" };
    }
    throw new Error("Prijava prekinuta.");
  }

  const { code, access_token, refresh_token } = parseFromAnyUrl(result.url);

  if (code) {
    const { error: exErr } = await supabase.auth.exchangeCodeForSession({ code });
    if (exErr) throw exErr;
    return { ok: true, via: "code" };
  }
  if (access_token && refresh_token) {
    const { error: ssErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (ssErr) throw ssErr;
    return { ok: true, via: "tokens" };
  }
  throw new Error("Nepoznat redirect format.");
}
*/

/* =============================== END LEGACY =============================== */
