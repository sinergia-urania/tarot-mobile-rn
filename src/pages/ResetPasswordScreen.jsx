// START: ResetPasswordScreen (rehidracija sesije + global nav ref)
import { CommonActions, useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../utils/supabaseClient";
// START: Linking za rehidraciju sesije iz deeplinka
import * as Linking from "expo-linking";
// END: Linking za rehidraciju sesije iz deeplinka
// START: globalni navigation ref + clearRecoveryLock
import { useAuth } from "../context/AuthProvider";
import { navigationRef } from "../utils/navigationRef";
// END: globalni navigation ref + clearRecoveryLock

const ResetPasswordScreen = () => {
    const { t } = useTranslation(["common"]);
    const navigation = useNavigation();
    // START: uzmi clearRecoveryLock iz AuthProvider-a
    const { clearRecoveryLock } = useAuth?.() || { clearRecoveryLock: () => { } };
    // END: uzmi clearRecoveryLock

    const [password1, setPassword1] = useState("");
    const [password2, setPassword2] = useState("");
    const [busy, setBusy] = useState(false);

    // START: čuvamo poslednji deeplink URL (nekad stigao dok je ekran zatvoren)
    const lastUrlRef = useRef(null);
    useEffect(() => {
        let mounted = true;
        Linking.getInitialURL().then((u) => {
            if (mounted && u) lastUrlRef.current = u;
        });
        const sub = Linking.addEventListener("url", ({ url }) => {
            lastUrlRef.current = url;
        });
        return () => {
            sub?.remove?.();
            mounted = false;
        };
    }, []);
    // END: čuvamo poslednji deeplink URL

    // START: helper – bezbedan povratak na Home čak i kada lokalni navigation nije spreman
    const goHomeSafely = () => {
        if (navigationRef?.isReady?.()) {
            try {
                navigationRef.dispatch(
                    CommonActions.reset({ index: 0, routes: [{ name: "Home" }] })
                );
                return;
            } catch { }
        }
        try {
            navigation.replace?.("Home");
        } catch { }
    };
    // END: helper – bezbedan povratak

    const handleSave = async () => {
        // START: usklađena validacija (8+ karaktera kao u poruci)
        if (!password1 || password1.length < 8) {
            Alert.alert(
                t("common:errors.genericTitle", { defaultValue: "Greška" }),
                t("common:auth.passwordTooShort", { defaultValue: "Lozinka mora imati bar 8 karaktera." })
            );
            return;
        }
        // END: usklađena validacija
        if (password1 !== password2) {
            Alert.alert(
                t("common:errors.genericTitle", { defaultValue: "Greška" }),
                t("common:auth.passwordsDontMatch", { defaultValue: "Lozinke se ne poklapaju." })
            );
            return;
        }

        setBusy(true);
        try {
            // START: obezbedi da postoji auth sesija iz recovery linka
            let { data: s1 } = await supabase.auth.getSession();
            if (!s1?.session) {
                const candidate = lastUrlRef.current || (await Linking.getInitialURL());
                if (candidate) {
                    // START: ručno parsiranje deeplinka (bez getSessionFromUrl)
                    try {
                        const u = new URL(candidate);
                        const search = new URLSearchParams(u.search || "");
                        const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));
                        const code = search.get("code");
                        const access_token = hash.get("access_token") || search.get("access_token");
                        const refresh_token = hash.get("refresh_token") || search.get("refresh_token");
                        if (code) {
                            const { error } = await supabase.auth.exchangeCodeForSession({ code });
                            if (error) console.log("[RESET] exchangeCodeForSession error:", error.message);
                        } else if (access_token && refresh_token) {
                            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                            if (error) console.log("[RESET] setSession error:", error.message);
                        }
                    } catch (e) {
                        console.log("[RESET] manual parse catch:", e?.message || e);
                    }
                    // END: ručno parsiranje
                }
            }
            const { data: s2 } = await supabase.auth.getSession();
            if (!s2?.session) {
                Alert.alert(
                    t("common:errors.genericTitle", { defaultValue: "Greška" }),
                    t("common:auth.recoveryNoSession", {
                        defaultValue: "Veza za reset nije aktivna ili je istekla. Otvorite link iz emaila ponovo.",
                    })
                );
                return;
            }
            // END: obezbedi da postoji auth sesija

            const { error } = await supabase.auth.updateUser({ password: password1 });
            if (error) throw error;

            Alert.alert(
                t("common:messages.successTitle", { defaultValue: "Uspeh!" }),
                t("common:auth.passwordUpdated", {
                    defaultValue: "Lozinka je ažurirana. Prijavite se novom lozinkom.",
                }),
                [
                    {
                        text: t("common:buttons.ok", { defaultValue: "OK" }),
                        onPress: () => {
                            // START: posle uspeha ugasi recovery mod i resetuj navigaciju ka Home
                            try { clearRecoveryLock?.(); } catch { }
                            goHomeSafely();
                            // END: posle uspeha ...
                        },
                    },
                ]
            );
        } catch (err) {
            Alert.alert(
                t("common:errors.genericTitle", { defaultValue: "Greška" }),
                err?.message || t("common:auth.passwordUpdateFailed", { defaultValue: "Ažuriranje lozinke nije uspelo." })
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                {t("common:auth.resetPasswordTitle", { defaultValue: "Reset lozinke" })}
            </Text>

            <TextInput
                style={styles.input}
                placeholder={t("common:placeholders.newPassword", { defaultValue: "Nova lozinka" })}
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password1}
                onChangeText={setPassword1}
            />

            <TextInput
                style={styles.input}
                placeholder={t("common:placeholders.repeatPassword", { defaultValue: "Ponovi lozinku" })}
                placeholderTextColor="#aaa"
                secureTextEntry
                value={password2}
                onChangeText={setPassword2}
            />

            {busy ? (
                <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} />
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleSave}>
                    <Text style={styles.buttonText}>
                        {t("common:buttons.savePassword", { defaultValue: "Sačuvaj lozinku" })}
                    </Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={{ marginTop: 16, alignItems: "center" }}
                onPress={goHomeSafely}
            >
                <Text style={{ color: "#9aa4ff" }}>
                    {t("common:buttons.close", { defaultValue: "Zatvori" })}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default ResetPasswordScreen;

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
});
// END: ResetPasswordScreen (rehidracija sesije + global nav ref)
