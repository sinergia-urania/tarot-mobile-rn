import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { supabase } from "../utils/supabaseClient";

// Expo traži da se ovo pozove jednom pre prvog OAuth-a
WebBrowser.maybeCompleteAuthSession();

// START: SUPABASE_URL – prioritet .env varijablama, pa heuristici iz klijenta
const ENV_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const GUESS_BASE = (() => {
  try {
    const restUrl = supabase?.rest?.url; // npr. https://xxx.supabase.co/rest/v1
    if (restUrl) return restUrl.replace("/rest/v1", "");
  } catch { }
  return ""; // ako ne uspe, bolje prazan nego pogrešan
})();
const SUPABASE_URL = ENV_BASE || GUESS_BASE || "https://ozssorzirdwyqgbixgri.supabase.co";


// END: SUPABASE_URL – prioritet .env

// Custom scheme (isti na iOS/Android — mora biti ugradjen u app i allowlistovan u Supabase)
const REDIRECT_URL =
  Platform.select({
    android: "com.mare82.tarotmobile://auth/callback",
    ios: "com.mare82.tarotmobile://auth/callback",
  }) || Linking.createURL("auth/callback");

// Mali parser za query/hash tokene
function parseTokens(url) {
  try {
    const u = new URL(url);
    const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));
    const search = new URLSearchParams(u.search || "");

    const code = search.get("code");
    const access_token = hash.get("access_token") || search.get("access_token");
    const refresh_token = hash.get("refresh_token") || search.get("refresh_token");
    const type = search.get("type") || hash.get("type");
    const error = search.get("error") || hash.get("error");
    const error_description = search.get("error_description") || hash.get("error_description");

    return { code, access_token, refresh_token, type, error, error_description };
  } catch {
    return {};
  }
}

// (opciono) pomoćni wait — može nekad pomoći posle “success” da sačekamo da se sesija propagira
async function waitForUser(totalMs = 1500, stepMs = 150) {
  const steps = Math.ceil(totalMs / stepMs);
  for (let i = 0; i < steps; i++) {
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
    console.log(`[WAIT-FOR-USER] pokušaj ${i + 1} od ${steps}`);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, stepMs));
  }
  console.error("[WAIT-FOR-USER] Korisnik nije pronađen u sesiji");
  return null;
}

async function openProvider(provider) {
  if (!SUPABASE_URL) {
    console.warn("[OAUTH-PROXY] Nemam SUPABASE_URL — proveri supabaseClient init ili .env.");
    throw new Error("SUPABASE_URL nije definisan.");
  }

  // Autorize URL za providera
  const base = `${SUPABASE_URL}/auth/v1/authorize`;
  const common =
    `?provider=${encodeURIComponent(provider)}` +
    `&redirect_to=${encodeURIComponent(REDIRECT_URL)}` +
    `&flow_type=pkce`; // Stabilniji PKCE flow

  // START: provider-specifični dodaci
  const googleExtras =
    provider === "google"
      ? `&scopes=${encodeURIComponent("openid email profile")}&access_type=offline&prompt=consent`
      : "";

  const appleExtras =
    provider === "apple"
      ? `&scopes=${encodeURIComponent("name email")}`
      : "";

  // === NOVO: Facebook scopes (public_profile, email) ===
  const facebookExtras =
    provider === "facebook"
      ? `&scopes=${encodeURIComponent("public_profile email")}`
      : "";
  // =====================================================

  // Dodajemo i facebookExtras u link
  const authorize = base + common + googleExtras + appleExtras + facebookExtras;

  console.log("[OAUTH-PROXY] openURL =", authorize);
  console.log("[OAUTH-PROXY] REDIRECT =", REDIRECT_URL);

  try {
    const result = await WebBrowser.openAuthSessionAsync(authorize, REDIRECT_URL, {
      preferEphemeralSession: false,
      showInRecents: true,
    });

    if (result.type === "success" && result.url) {
      const { code, access_token, refresh_token, error, error_description } = parseTokens(result.url);

      if (error) {
        console.warn("[OAUTH-PROXY] provider error:", error, error_description || "");
        throw new Error(error_description || error);
      }

      try {
        if (code) {
          // PKCE flow
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
          await waitForUser();
          return true;
        }

        if (access_token && refresh_token) {
          // Legacy hash flow
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) throw error;
          await waitForUser();
          return true;
        }

        console.warn("[OAUTH-PROXY] success bez tokena/code u URL-u:", result.url);
        await waitForUser();
        return true;
      } catch (e) {
        console.error("[OAUTH-PROXY] setSession/exchange failed:", e?.message || e);
        throw e;
      }
    } else {
      console.log("[OAUTH-PROXY] korisnik je zatvorio auth prozor.");
    }
  } catch (e) {
    console.error("[OAUTH-PROXY] došlo je do greške pri otvaranju auth sesije:", e);
    throw e;
  }

  return false;
}

export const loginWithGoogle = () => openProvider("google");
export const loginWithFacebook = () => openProvider("facebook");
export const loginWithApple = () => openProvider("apple");
