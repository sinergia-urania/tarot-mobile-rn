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
  // START: Apple delegacija
  loginWithApple as loginWithAppleProxy,
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

// START: Apple – delegirano na oauthProxy (custom scheme + PKCE)
export async function loginWithApple() {
  return loginWithAppleProxy();
}
// END: Apple – delegirano na oauthProxy (custom scheme + PKCE)
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

// START: Nova logika za dodelu dukata
export async function dodeliDukateZaFreeKorisnika(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("coins")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const noviDukati = (data?.coins || 0) + 150;

    await supabase
      .from("profiles")
      .update({ coins: noviDukati })
      .eq("id", userId);

    return { noviDukati };
  } catch (err) {
    console.error("Greška u dodeli dukata:", err);
    return { greska: String(err?.message || err) };
  }
}
// END: Nova logika za dodelu dukata
