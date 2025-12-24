import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthProvider";
import { useDukati } from "../context/DukatiContext";

// ============================================================
// FEATURE FLAGS - Lako uključi/isključi login providere
// ============================================================
const ENABLE_FACEBOOK_LOGIN = false; // ← Promeni u true kad/ako Facebook odobri
// ============================================================
// START: import Apple login iz oauthProxy
import { loginWithApple, loginWithFacebook, loginWithGoogle } from "../utils/oauthProxy";
// END: import Apple login iz oauthProxy
import { supabase } from "../utils/supabaseClient";
// START: import za deep link/redirect (ostaje jer ga koristimo i za fallback)
import * as Linking from "expo-linking";
// END: import za deep link/redirect

// i18n
import { useTranslation } from "react-i18next";
// START: ikone za dugmad (Expo)
import { FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
// END: ikone za dugmad

const LoginScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation(["common"]);

  // START: recovery-aware – sada uzimamo samo recoveryActive (klasični login/register uklonjeni)
  const { user, recoveryActive } = useAuth();
  // END: recovery-aware

  const { refreshUserPlan, fetchDukatiSaServera } = useDukati();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  // START: uklonjen password state (prelaz na magic link)
  // const [password, setPassword] = useState("");
  // END: uklonjen password state
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const hasSyncedRef = useRef(false);

  // START: magic-link rate limit cooldown (60s)
  const [magicCooldown, setMagicCooldown] = useState(0); // sekunde
  useEffect(() => {
    if (magicCooldown <= 0) return;
    const id = setInterval(() => setMagicCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [magicCooldown]);
  // END: magic-link rate limit cooldown (60s)

  // Kad se pojavi user iz AuthProvider-a → sync i zatvori modal (uz guard)
  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      if (hasSyncedRef.current) return;
      hasSyncedRef.current = true;

      try {
        await refreshUserPlan?.();
        await fetchDukatiSaServera?.();
      } catch { }

      await new Promise((r) => setTimeout(r, 200));

      // START: recovery-aware redirect guard
      const state = navigation.getState?.();
      const idx = state?.index ?? ((state?.routes?.length ?? 1) - 1);
      const currentRoute = state?.routes?.[idx] ?? null;
      const prevent = currentRoute?.params?.preventAutoRedirect === true;
      const onReset = currentRoute?.name === "ResetPassword";

      if (recoveryActive || prevent || onReset) {
        return;
      }
      // END: recovery-aware redirect guard

      if (navigation.canGoBack()) navigation.goBack();
      else navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    };
    run();
  }, [user?.id]);

  const handleGoogleLogin = async () => {
    if (oauthBusy) return;
    setOauthBusy(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) {
        // best-effort: sačekaj da Supabase završi SIGNED_IN
        for (let i = 0; i < 12; i++) {
          const { data } = await supabase.auth.getUser();
          if (data?.user) break;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.googleFailed", { defaultValue: "Google prijava nije uspela." })
      );
    } finally {
      setTimeout(() => setOauthBusy(false), 2000);
    }
  };

  const handleFacebookLogin = async () => {
    // === FEATURE FLAG CHECK ===
    if (!ENABLE_FACEBOOK_LOGIN) {
      // Tiho ignoriši - dugme ionako nije vidljivo
      // Ali ako se nekako pozove, ne radi ništa
      console.log('[Auth] Facebook login is disabled');
      return;
    }

    if (oauthBusy) return;
    setOauthBusy(true);
    try {
      await loginWithFacebook();
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.facebookFailed", { defaultValue: "Facebook prijava nije uspela." })
      );
    } finally {
      setTimeout(() => setOauthBusy(false), 2000);
    }
  };

  // START: Apple login handler (OAuth preko Supabase-a, WebBrowser + deep link "auth")
  const handleAppleLogin = async () => {
    if (oauthBusy) return;
    setOauthBusy(true);
    try {
      const ok = await loginWithApple();
      if (ok) {
        // best-effort: čekaj da Supabase signalizira SIGNED_IN
        for (let i = 0; i < 12; i++) {
          const { data } = await supabase.auth.getUser();
          if (data?.user) break;
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.appleFailed", { defaultValue: "Apple prijava nije uspela." })
      );
    } finally {
      setTimeout(() => setOauthBusy(false), 2000);
    }
  };
  // END: Apple login handler

  // START: MAGIC_LINK – šalji link na tvoj web redirect (Varijanta B) pa u app
  // Ako postoji EXPO_PUBLIC_WEB_REDIRECT_URL u .env (npr. https://infohelm.org/auth-redirect-v3.html),
  // koristi ga; inače fallback na direktni deeplink.
  const MAGIC_REDIRECT =
    process.env.EXPO_PUBLIC_WEB_REDIRECT_URL || Linking.createURL("auth"); // fallback: com.mare82.tarotmobile://auth

  const handleSendMagicLink = async () => {
    // 1. Provera da li je unet email
    if (!email?.trim()) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        t("common:auth.emailRequired", { defaultValue: "Unesite email adresu." })
      );
      return;
    }

    const target = email.trim().toLowerCase();

    // ============================================================
    // OVO JE TAJ TRIK (BACKDOOR)
    // ============================================================

    // 1. Ovde tačno definišemo tvoj test email
    const TEST_EMAIL = "magiclinkfortest@hotmail.com";

    // 2. OVDE MORAŠ DA UPIŠEŠ ONU ŠIFRU KOJU SI ZADAO U SUPABASE-U
    // (Ona koju si napravio kad si kliknuo Create New User)
    const TEST_PASSWORD = "testforapp2025"; // <--- PROMENI OVO!!!

    // 3. Provera: Da li je uneti email baš taj test email?
    if (target === TEST_EMAIL) {
      try {
        setLoading(true);
        console.log("Prepoznat test nalog, pokušavam login šifrom...");

        // Umesto Magic Linka, ovde radimo login šifrom!
        const { error } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (error) throw error;

        // Ako nema greške, AuthProvider će automatski preusmeriti na Home.
        // Nema Alert-a, nema čekanja.
        return;
      } catch (err) {
        setLoading(false);
        Alert.alert("Test Login Error", "Proveri da li je šifra u kodu dobra.");
        return;
      }
    }
    // ============================================================


    // ZA SVE OSTALE (Obične ljude) - Standardni Magic Link
    if (magicCooldown > 0) return;

    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: {
          emailRedirectTo: MAGIC_REDIRECT,
        },
      });
      if (error) throw error;
      setMagicCooldown(60);
      Alert.alert(
        t("common:messages.successTitle", { defaultValue: "Uspeh!" }),
        t("common:auth.magicLinkSent", {
          defaultValue: "Poslali smo ti magični link. Otvori email na ovom uređaju.",
        })
      );
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.magicLinkFailed", { defaultValue: "Slanje magičnog linka nije uspelo." })
      );
    } finally {
      setLoading(false);
    }
  };
  // END: MAGIC_LINK

  return (
    <View style={styles.container}>
      {/* START: header sa avatarom i dobrodošlicom */}
      <View style={styles.header}>
        {/* START: avatar slika iz /assets/una.png */}
        <Image source={require("../../assets/una.png")} style={styles.avatarImg} />
        {/* END: avatar slika iz /assets/una.png */}
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>
      {/* END: header sa avatarom i dobrodošlicom */}

      <Text style={styles.title}>
        {isRegister
          ? t("common:auth.registerTitle", { defaultValue: "Registracija" })
          : t("common:auth.loginTitle", { defaultValue: "Prijava" })}
      </Text>

      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder={t("common:placeholders.enterName", { defaultValue: "Vaše ime" })}
          placeholderTextColor="#aaa"
          value={displayName}
          onChangeText={setDisplayName}
        />
      )}

      <TextInput
        style={styles.input}
        placeholder={t("common:placeholders.enterEmail", { defaultValue: "Email" })}
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />



      {loading ? (
        <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} />
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, (loading || oauthBusy) && { opacity: 0.7 }]}
            onPress={handleSendMagicLink}
            disabled={loading || oauthBusy || magicCooldown > 0}
          >
            <View style={styles.btnRow}>
              <MaterialCommunityIcons
                name="email-send-outline"
                size={20}
                color="#0b1026"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.buttonText}>
                {magicCooldown > 0
                  // Ako odbrojava vreme
                  ? t("common:auth.resetTryAgainIn", {
                    s: magicCooldown,
                    defaultValue: `Pokušaj ponovo za ${magicCooldown}s`,
                  })
                  // Standardni tekst (uvek isto, bez pominjanja Google/Test)
                  : t("common:auth.sendMagicLink", { defaultValue: "Pošalji magični link" })
                }
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gButton, (loading || oauthBusy) && { opacity: 0.6 }]}
            onPress={handleGoogleLogin}
            disabled={loading || oauthBusy}
          >
            <View style={styles.btnRow}>
              <FontAwesome name="google" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.gButtonText}>
                {oauthBusy
                  ? t("common:auth.googleOpening", { defaultValue: "Otvaram Google..." })
                  : t("common:auth.googleSignIn", { defaultValue: "Prijava preko Google-a" })}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Facebook dugme - prikazuje se samo ako je ENABLE_FACEBOOK_LOGIN = true */}
          {ENABLE_FACEBOOK_LOGIN && (
            <TouchableOpacity
              style={[styles.fbButton, (loading || oauthBusy) && { opacity: 0.6 }]}
              onPress={handleFacebookLogin}
              disabled={loading || oauthBusy}
            >
              <View style={styles.btnRow}>
                <FontAwesome name="facebook" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.fbButtonText}>
                  {oauthBusy
                    ? t("common:auth.facebookOpening", { defaultValue: "Otvaram Facebook..." })
                    : t("common:auth.facebookSignIn", { defaultValue: "Prijava preko Facebook-a" })}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* START: Apple dugme - PRIKAZUJEMO SAMO NA iOS-u */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.appleButton, (loading || oauthBusy) && { opacity: 0.6 }]}
              onPress={handleAppleLogin}
              disabled={loading || oauthBusy}
            >
              <View style={styles.btnRow}>
                <FontAwesome name="apple" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.appleButtonText}>
                  {oauthBusy
                    ? t("common:auth.appleOpening", { defaultValue: "Otvaram Apple..." })
                    : t("common:auth.appleSignIn", { defaultValue: "Prijava preko Apple-a" })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {/* END: Apple dugme */}

          <TouchableOpacity
            style={{ marginTop: 20 }}
            onPress={() => navigation.canGoBack() && navigation.goBack()}
          >
            <Text style={{ color: "#fff", fontSize: 15, textDecorationLine: "underline" }}>
              {t("common:buttons.close", { defaultValue: "Zatvori" })}
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.toggleBtn}>
        <Text style={styles.toggleText}>
          {isRegister
            ? t("common:auth.toggleHaveAccount", { defaultValue: "Već imaš nalog? Prijavi se" })
            : t("common:auth.toggleNoAccount", { defaultValue: "Nemaš nalog? Registruj se" })}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b1026", padding: 24, paddingTop: 60 },
  // START: header stilovi
  header: { alignItems: "center", marginBottom: 16 },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#1f2a5a",
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 8,
    backgroundColor: "#131a3a",
    borderWidth: 2,
    borderColor: "#1f2a5a",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { color: "#9aa4ff", fontSize: 28, fontWeight: "800" },
  welcome: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 },
  subtitle: { color: "#9aa4ff", fontSize: 13, marginTop: 2 },
  // END: header stilovi
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 16 },
  input: {
    backgroundColor: "#131a3a",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f2a5a",
  },
  button: {
    backgroundColor: "#facc15",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  // START: horizontalni raspored ikona + tekst
  btnRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  // END: horizontalni raspored ikona + tekst
  buttonText: { color: "#0b1026", fontWeight: "700", fontSize: 16 },
  gButton: {
    backgroundColor: "#ffffff10",
    borderColor: "#ffffff30",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  gButtonText: { color: "#fff", fontWeight: "600" },
  fbButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  fbButtonText: { color: "#fff", fontWeight: "600" },
  // START: Apple stil – crni, sivi obrub, belo slovo
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#333",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  appleButtonText: { color: "#fff", fontWeight: "600" },
  // END: Apple stil
  // START: review hint
  reviewHint: { color: "#9aa4ff", fontSize: 12, marginTop: -4, marginBottom: 10 },
  // END: review hint
  toggleBtn: { marginTop: 18, alignItems: "center" },
  toggleText: { color: "#9aa4ff" },
});
