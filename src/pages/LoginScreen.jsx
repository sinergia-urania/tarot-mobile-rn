// src/pages/LoginScreen.jsx
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthProvider";
import { useDukati } from "../context/DukatiContext";
import { loginWithFacebook, loginWithGoogle } from "../utils/oauthProxy";
import { supabase } from "../utils/supabaseClient";
// START: import za deep link/redirect za reset lozinke
import * as Linking from "expo-linking";
// END: import za deep link/redirect za reset lozinke

// i18n
import { useTranslation } from "react-i18next";

const LoginScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation(["common"]);

  // START: recovery-aware – uzmi recoveryActive iz AuthProvider-a
  const { user, login, register, recoveryActive } = useAuth();
  // END: recovery-aware

  const { refreshUserPlan, fetchDukatiSaServera } = useDukati();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const hasSyncedRef = useRef(false);

  // START: reset-email rate limit cooldown (90s)
  const [resetCooldown, setResetCooldown] = useState(0); // sekunde
  useEffect(() => {
    if (resetCooldown <= 0) return;
    const id = setInterval(() => setResetCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resetCooldown]);
  // END: reset-email rate limit cooldown (90s)

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

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.loginFailed", { defaultValue: "Neuspešna prijava." })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        t("common:errors.nameRequired", { defaultValue: "Ime ne može biti prazno!" })
      );
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      Alert.alert(
        t("common:messages.successTitle", { defaultValue: "Uspeh!" }),
        t("common:auth.checkEmail", { defaultValue: "Proverite email i potvrdite nalog." })
      );
    } catch (err) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.registerFailed", { defaultValue: "Neuspešna registracija." })
      );
    } finally {
      setLoading(false);
    }
  };

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

  // START: handleForgotPassword (1 pokušaj + NO fallback; stop na rate-limit)
  const handleForgotPassword = async () => {
    if (!email?.trim()) {
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        t("common:auth.emailRequired", { defaultValue: "Unesite email adresu." })
      );
      return;
    }
    if (resetCooldown > 0) return; // cooldown aktivan
    const target = email.trim();

    // START: jedinstveni ulaz (usklađeno sa linking config-om): scheme://auth?type=recovery
    // (Ako želiš direktno ResetPassword: "reset-password?type=recovery")
    const appRedirect = Linking.createURL("auth?type=recovery");
    // END: jedinstveni ulaz

    try {
      console.log("[RESET] A) appRedirect", { target, appRedirect, ts: Date.now() });
      let { data, error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo: appRedirect });
      console.log("[RESET] A) result", { data, err: error?.message, code: error?.code, name: error?.name });
      if (!error) {
        Alert.alert(
          t("common:messages.successTitle", { defaultValue: "Uspeh!" }),
          t("common:auth.resetEmailSent", {
            defaultValue: "Ako nalog postoji, poslali smo email sa uputstvima za reset lozinke.",
          })
        );
        return;
      }

      // Ako je rate-limit – odmah stani i upali cooldown (90s)
      const msg = (error?.message || "").toLowerCase();
      const code = (error?.code || "").toLowerCase();
      const isRate = msg.includes("rate") || code.includes("rate") || code.includes("over_email_send_rate_limit");
      if (isRate) {
        setResetCooldown(90);
        Alert.alert(
          t("common:messages.infoTitle", { defaultValue: "Info" }),
          t("common:auth.resetRateLimit", { defaultValue: "Previše zahteva. Pokušaj ponovo za ~1–2 minuta." })
        );
        return;
      }

      // NEMA više fallbacka bez redirectTo — to bi poslalo pogrešan https link iz Supabase-a

      // Ako nije redirect greška – digni originalnu grešku
      throw error;
    } catch (err) {
      console.log("[RESET] FINAL ERROR", { msg: err?.message, code: err?.code, name: err?.name });
      Alert.alert(
        t("common:errors.genericTitle", { defaultValue: "Greška" }),
        err?.message || t("common:auth.resetEmailFailed", { defaultValue: "Slanje emaila nije uspelo." })
      );
    }
  };
  // END: handleForgotPassword (1 pokušaj + NO fallback; stop na rate-limit)

  return (
    <View style={styles.container}>
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

      <TextInput
        style={styles.input}
        placeholder={t("common:placeholders.enterPassword", { defaultValue: "Lozinka" })}
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* START: Forgot password link (sa cooldown-om) */}
      <TouchableOpacity
        onPress={handleForgotPassword}
        style={{ alignSelf: "flex-end", marginBottom: 8, opacity: resetCooldown > 0 ? 0.6 : 1 }}
        disabled={resetCooldown > 0}
      >
        <Text style={{ color: "#9aa4ff", fontSize: 13 }}>
          {resetCooldown > 0
            ? t("common:auth.resetTryAgainIn", { defaultValue: `Pokušaj ponovo za ${resetCooldown}s` })
            : t("common:auth.forgotPassword", { defaultValue: "Zaboravljena lozinka?" })}
        </Text>
      </TouchableOpacity>
      {/* END: Forgot password link (sa cooldown-om) */}

      {loading ? (
        <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} />
      ) : (
        <>
          <TouchableOpacity
            style={[styles.button, (loading || oauthBusy) && { opacity: 0.7 }]}
            onPress={isRegister ? handleRegister : handleLogin}
            disabled={loading || oauthBusy}
          >
            <Text style={styles.buttonText}>
              {isRegister
                ? t("common:buttons.register", { defaultValue: "Registruj se" })
                : t("common:buttons.login", { defaultValue: "Prijavi se" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gButton, (loading || oauthBusy) && { opacity: 0.6 }]}
            onPress={handleGoogleLogin}
            disabled={loading || oauthBusy}
          >
            <Text style={styles.gButtonText}>
              {oauthBusy
                ? t("common:auth.googleOpening", { defaultValue: "Otvaram Google..." })
                : t("common:auth.googleSignIn", { defaultValue: "Prijava preko Google-a" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fbButton, (loading || oauthBusy) && { opacity: 0.6 }]}
            onPress={handleFacebookLogin}
            disabled={loading || oauthBusy}
          >
            <Text style={styles.fbButtonText}>
              {oauthBusy
                ? t("common:auth.facebookOpening", { defaultValue: "Otvaram Facebook..." })
                : t("common:auth.facebookSignIn", { defaultValue: "Prijava preko Facebook-a" })}
            </Text>
          </TouchableOpacity>

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
  toggleBtn: { marginTop: 18, alignItems: "center" },
  toggleText: { color: "#9aa4ff" },
});
