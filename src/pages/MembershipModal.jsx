// src/pages/MembershipModal.jsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from "react";
import { ActivityIndicator, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useDukati } from "../context/DukatiContext";
import { supabase } from "../utils/supabaseClient";
// START: i18n import
import { useTranslation } from 'react-i18next';
// END: i18n import

// START: fallback bonus vrednosti (dodato objašnjenje)
// const PAKET_BONUSI = { free: 150, premium: 4000, pro: 7000 };
/* START: PAKET_BONUSI proplus fallback */
const PAKET_BONUSI = { free: 150, premium: 4000, pro: 6500, proplus: 70000 }; // +ProPlus fallback (70k)
/* END: PAKET_BONUSI proplus fallback */
// END: fallback bonus vrednosti (dodato objašnjenje)

// START: packages – dodati labelKey/valueKey uz postojeće label/value (fallback ostaje)
const packages = [
  {
    name: "Free",
    key: "free",
    color: "#facc15",
    features: [
      // START: AI model badge (value-only)
      { label: "", value: "AI model: Mini", valueKey: "aiModelMini", color: "#facc15" },
      // END: AI model badge
      { label: "Značenje karata", labelKey: "meanings", icon: "bank-outline" },
      { label: "Klasična otvaranja", labelKey: "classicSpreads", icon: "bank-outline" },
      { label: "Keltski krst", labelKey: "celticCross", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", labelKey: "kabbalisticSpread", icon: "close", color: "#ff5454" },
      { label: "Astrološko otvaranje", labelKey: "astrologicalSpread", icon: "close", color: "#ff5454" },
      // START: Astro tranziti – Free (isključeno)
      { label: "Astro tranziti", labelKey: "astrologicalTransits", icon: "close", color: "#ff5454" },
      // END: Astro tranziti – Free
      { label: "AI potpitanja", labelKey: "aiFollowups", icon: "close", color: "#ff5454" },
      { label: "Arhiva otvaranja", labelKey: "historyArchive", icon: "close", color: "#ff5454" },
      { label: "", value: "Reklame", valueKey: "ads", color: "#facc15" },
    ],
  },
  {
    name: "Premium",
    key: "premium",
    color: "#a8ff76",
    features: [
      // START: AI model badge (value-only)
      { label: "", value: "AI model: Large", valueKey: "aiModelLarge", color: "#a8ff76" },
      // END: AI model badge
      { label: "Značenje karata", labelKey: "meanings", icon: "bank-outline" },
      { label: "Klasična otvaranja", labelKey: "classicSpreads", icon: "bank-outline" },
      { label: "Keltski krst", labelKey: "celticCross", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", labelKey: "kabbalisticSpread", icon: "bank-outline" },
      { label: "Astrološko otvaranje", labelKey: "astrologicalSpread", icon: "close", color: "#ff5454" },
      // START: Astro tranziti – Premium (uključeno)
      { label: "Astro tranziti", labelKey: "astrologicalTransits", icon: "bank-outline" },
      // END: Astro tranziti – Premium
      { label: "AI potpitanja", labelKey: "aiFollowups", icon: "close", color: "#ff5454" },
      { label: "Arhiva otvaranja", labelKey: "historyArchive", icon: "close", color: "#ff5454" },
      { label: "", value: "Bez reklama", valueKey: "noAds", color: "#a8ff76" },
    ],
  },
  {
    name: "Pro",
    key: "pro",
    color: "#ae7ffb",
    features: [
      // START: AI model badge (value-only)
      { label: "", value: "AI model: Large", valueKey: "aiModelLarge", color: "#ae7ffb" },
      // END: AI model badge
      { label: "Značenje karata", labelKey: "meanings", icon: "bank-outline" },
      { label: "Klasična otvaranja", labelKey: "classicSpreads", icon: "bank-outline" },
      { label: "Keltski krst", labelKey: "celticCross", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", labelKey: "kabbalisticSpread", icon: "bank-outline" },
      { label: "Astrološko otvaranje", labelKey: "astrologicalSpread", icon: "bank-outline" },
      // START: Astro tranziti – Pro (uključeno)
      { label: "Astro tranziti", labelKey: "astrologicalTransits", icon: "bank-outline" },
      // END: Astro tranziti – Pro
      { label: "AI potpitanja", labelKey: "aiFollowups", icon: "bank-outline" },
      { label: "Arhiva otvaranja", labelKey: "historyArchive", icon: "bank-outline" },
      { label: "", value: "Bez reklama", valueKey: "noAds", color: "#ae7ffb" },
    ],
  },
  /* START: ProPlus (godišnji) – nova kartica */
  {
    name: "ProPlus",
    key: "proplus",
    color: "#ef4444",
    features: [
      { label: "", value: "AI model: Large", valueKey: "aiModelLarge", color: "#ef4444" },
      { label: "Značenje karata", labelKey: "meanings", icon: "bank-outline" },
      { label: "Klasična otvaranja", labelKey: "classicSpreads", icon: "bank-outline" },
      { label: "Keltski krst", labelKey: "celticCross", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", labelKey: "kabbalisticSpread", icon: "bank-outline" },
      { label: "Astrološko otvaranje", labelKey: "astrologicalSpread", icon: "bank-outline" },
      { label: "Astro tranziti", labelKey: "astrologicalTransits", icon: "bank-outline" },
      { label: "AI potpitanja", labelKey: "aiFollowups", icon: "bank-outline" },
      { label: "Arhiva otvaranja", labelKey: "historyArchive", icon: "bank-outline" },
      { label: "", value: "Bez reklama", valueKey: "noAds", color: "#ef4444" },
    ],
  },
  /* END: ProPlus (godišnji) – nova kartica */
];
// END: packages – dodati labelKey/valueKey

export default function MembershipModal({ visible, onClose }) {
  const { userId, fetchDukatiSaServera, userPlan, refreshUserPlan } = useDukati();
  // START: i18n init
  const { t } = useTranslation(['common']);
  // END: i18n init

  // helper mora biti u komponenti (ima pristup userId iz konteksta)
  const getUid = React.useCallback(async () => {
    if (userId) return userId;
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  }, [userId]);

  const [loadingPremium, setLoadingPremium] = React.useState(false);
  const [loadingPro, setLoadingPro] = React.useState(false);
  const [loadingTopUp, setLoadingTopUp] = React.useState(false);
  /* START: ProPlus state & env */
  const [loadingProPlus, setLoadingProPlus] = React.useState(false); // ProPlus CTA state
  const PRO_PLUS_ANNUAL_PRICE_ID = process.env.EXPO_PUBLIC_STRIPE_PRICE_PRO_PLUS_YEAR;
  /* END: ProPlus state & env */

  // START: remote membership pricing (čitamo sa Edge funkcije)
  const [mPricing, setMPricing] = React.useState(null);
  React.useEffect(() => {
    let live = true;
    supabase.functions
      .invoke('membership-config')
      .then(({ data, error }) => {
        if (!error && data && live) setMPricing(data);
      })
      .catch(() => { });
    return () => { live = false; };
  }, []);

  // Derivirani helperi (sa fallback vrednostima)
  const BONUS = {
    free: mPricing?.packages?.free?.coinsBonus ?? PAKET_BONUSI.free,
    premium: mPricing?.packages?.premium?.coinsBonus ?? PAKET_BONUSI.premium,
    pro: mPricing?.packages?.pro?.coinsBonus ?? PAKET_BONUSI.pro,
    /* START: BONUS ProPlus */
    proplus: mPricing?.packages?.proplus?.coinsBonus ?? PAKET_BONUSI.proplus,
    /* END: BONUS ProPlus */
  };
  const PRICE = {
    premium: mPricing?.packages?.premium?.price ?? { amount: 599, currency: 'RSD', period: 'mesec' },
    pro: mPricing?.packages?.pro?.price ?? { amount: 999, currency: 'RSD', period: 'mesec' },
    /* START: PRICE ProPlus (godišnje) */
    proplus: mPricing?.packages?.proplus?.price ?? { amount: 7999, currency: 'RSD', period: 'godina' },
    /* END: PRICE ProPlus (godišnje) */
    topup500: mPricing?.topups?.coins_500?.price ?? { amount: 100, currency: 'RSD' },
    topup1000: mPricing?.topups?.coins_1000?.price ?? { amount: 170, currency: 'RSD' },
  };
  // END: remote membership pricing

  // START: helper — sigurno upiši package (RPC → verify → direct UPDATE → verify)
  const writePackage = React.useCallback(async (uid, pkg) => {
    const target = String(pkg || "").toLowerCase();
    // START: RPC pokušaj — prvo novi RPC sa istekom, pa fallback na stari
    try {
      const { error: rpcErr1 } = await supabase.rpc("set_package_with_expiry", {
        p_user: uid,
        p_package: target,
      });
      if (rpcErr1) {
        if (__DEV__) console.warn("[set_package_with_expiry RPC] error:", rpcErr1);
        const { error: rpcErr2 } = await supabase.rpc("set_package", {
          p_user: uid,
          p_package: target,
        });
        if (rpcErr2 && __DEV__) console.warn("[set_package RPC] error:", rpcErr2);
      }
    } catch (e) {
      if (__DEV__) console.warn("[set_package*_ RPC] threw:", e);
    }
    // END: RPC pokušaj — prvo novi RPC sa istekom, pa fallback na stari

    // 1a) VERIFY posle RPC-a
    try {
      const { data: v1 } = await supabase
        .from("profiles")
        .select("package")
        .eq("id", uid)
        .single();
      if (String(v1?.package || "").toLowerCase() === target) {
        return true;
      }
    } catch { }
    // 2) Fallback: direktan UPDATE (ako RLS dozvoljava)
    try {
      const { data: upd, error: upErr } = await supabase
        .from("profiles")
        .update({ package: target })
        .eq("id", uid)
        .select("package")
        .single();
      if (!upErr && String(upd?.package || "").toLowerCase() === target) {
        return true;
      }
      if (__DEV__) console.warn("[profiles.update] err:", upErr);
    } catch (e) {
      if (__DEV__) console.warn("[profiles.update] threw:", e);
    }
    return false;
  }, []);
  // END: helper — sigurno upiši package

  // START: Atomarno dodeljivanje bonusa i promene paketa (uvek preko backenda)
  const handleKupiPremium = async () => {
    setLoadingPremium(true);
    try {
      const uid = await getUid();
      // START: i18n fallback 'notLoggedIn' harmonizacija
      /* original defaultValue: 'Niste prijavljeni.' */
      if (!uid) throw new Error(t('common:errors.notLoggedIn', { defaultValue: 'Niste ulogovani.' }));
      // END: i18n fallback 'notLoggedIn' harmonizacija

      // START: u handleru koristimo BONUS umesto PAKET_BONUSI
      await supabase.rpc("add_coins", {
        p_user: uid,
        p_amount: BONUS.premium,
        p_reason: "upgrade_premium",
      });
      // END: u handleru koristimo BONUS umesto PAKET_BONUSI

      // Siguran upis paketa (RPC → verify → UPDATE → verify)
      const ok = await writePackage(uid, "premium");
      if (!ok) throw new Error("PACKAGE_UPDATE_FAILED");

      await fetchDukatiSaServera();
      await refreshUserPlan();

      onClose?.(); // opciono zatvaranje modala

      Toast.show({
        type: "success",
        text1: t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
        // START: i18n toast premium interpolacija (BONUS umesto PAKET_BONUSI)
        text2: t('common:membership.toast.upgradedPremium', {
          bonus: BONUS.premium,
          defaultValue: 'Vaš nalog je sada Premium. Dobili ste još {{bonus}} dukata!'
        }),
        // END: i18n toast premium interpolacija
        position: "bottom",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: err?.message || t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
        position: "bottom",
      });
    } finally {
      setLoadingPremium(false);
    }
  };

  const handleKupiPro = async () => {
    setLoadingPro(true);
    try {
      const uid = await getUid();
      // START: i18n fallback 'notLoggedIn' harmonizacija
      /* original defaultValue: 'Niste prijavljeni.' */
      if (!uid) throw new Error(t('common:errors.notLoggedIn', { defaultValue: 'Niste ulogovani.' }));
      // END: i18n fallback 'notLoggedIn' harmonizacija

      // START: u handleru koristimo BONUS umesto PAKET_BONUSI
      await supabase.rpc("add_coins", {
        p_user: uid,
        p_amount: BONUS.pro,
        p_reason: "upgrade_pro",
      });
      // END: u handleru koristimo BONUS umesto PAKET_BONUSI

      // Siguran upis paketa (RPC → verify → UPDATE → verify)
      const ok = await writePackage(uid, "pro");
      if (!ok) throw new Error("PACKAGE_UPDATE_FAILED");

      await fetchDukatiSaServera();
      await refreshUserPlan();

      onClose?.(); // opciono zatvaranje modala

      Toast.show({
        type: "success",
        text1: t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
        // START: i18n toast pro interpolacija (BONUS umesto PAKET_BONUSI)
        text2: t('common:membership.toast.upgradedPro', {
          bonus: BONUS.pro,
          defaultValue: 'Vaš nalog je sada PRO. Dobili ste još {{bonus}} dukata!'
        }),
        // END: i18n toast pro interpolacija
        position: "bottom",
      });

    } catch (err) {
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: err?.message || t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
        position: "bottom",
      });
    } finally {
      setLoadingPro(false);
    }
  };
  // END: Atomarno dodeljivanje bonusa i promene paketa

  const handleTopUp = async (iznos) => {
    setLoadingTopUp(true);
    try {
      const uid = await getUid();
      // START: i18n fallback 'notLoggedIn' harmonizacija
      /* original defaultValue: 'Niste prijavljeni.' */
      if (!uid) throw new Error(t('common:errors.notLoggedIn', { defaultValue: 'Niste ulogovani.' }));
      // END: i18n fallback 'notLoggedIn' harmonizacija

      await supabase.rpc("add_coins", {
        p_user: uid,
        p_amount: iznos,
        p_reason: "topup",
      });

      await fetchDukatiSaServera();

      Toast.show({
        type: "success",
        text1: t('common:messages.successGeneric', { defaultValue: 'Uspešno!' }),
        // START: i18n toast topup interpolacija
        text2: t('common:membership.toast.topupDone', {
          amount: iznos,
          defaultValue: 'Dobili ste {{amount}} dukata.'
        }),
        // END: i18n toast topup interpolacija
        position: "bottom",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: t('common:errors.topupFailed', { defaultValue: 'Nije moguće dodati dukate.' }),
        position: "bottom",
      });
    } finally {
      setLoadingTopUp(false);
    }
  };

  /* START: ProPlus handler (godišnji plan) */
  const handleKupiProPlus = async () => {
    setLoadingProPlus(true);
    try {
      const uid = await getUid();
      if (!uid) throw new Error(t('common:errors.notLoggedIn', { defaultValue: 'Niste ulogovani.' }));

      // Ako postoji priceId (ENV ili edge config), idemo kroz checkout
      const priceId = mPricing?.packages?.proplus?.stripePriceId || PRO_PLUS_ANNUAL_PRICE_ID;
      if (priceId) {
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: { priceId, mode: 'subscription', plan: 'proplus' },
        });
        if (error) throw error;
        if (data?.url) {
          Linking.openURL(data.url);
          return; // nastavak je preko webhook-a → on setuje package/premium_until
        }
      }

      // Fallback (dev/test): direktno dodeli bonus i postavi package
      await supabase.rpc("add_coins", { p_user: uid, p_amount: BONUS.proplus, p_reason: "upgrade_proplus" });
      const ok = await writePackage(uid, "proplus");
      if (!ok) throw new Error("PACKAGE_UPDATE_FAILED");

      await fetchDukatiSaServera();
      await refreshUserPlan();
      onClose?.();

      Toast.show({
        type: "success",
        text1: t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
        text2: t('common:membership.toast.upgradedProPlus', {
          bonus: BONUS.proplus,
          defaultValue: 'Vaš nalog je sada ProPlus. Dobili ste još {{bonus}} dukata!'
        }),
        position: "bottom",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: err?.message || t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
        position: "bottom",
      });
    } finally {
      setLoadingProPlus(false);
    }
  };
  /* END: ProPlus handler (godišnji plan) */

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* START: sakriven debug banner (ostavljen u kodu, ali ne renderuje se) */}
          {false && (
            <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8, alignSelf: "center" }}>
              DEBUG userPlan: {JSON.stringify(userPlan)}
            </Text>
          )}
          {/* END: sakriven debug banner */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingVertical: 4, paddingHorizontal: 4 }}
            style={{ marginBottom: 10 }}
          >
            {packages.map((pkg) => (
              <View key={pkg.name} style={{ alignItems: "center" }}>
                <View style={[
                  styles.card,
                  {
                    borderColor: pkg.color,
                    width: 260,
                    minHeight: 240,
                    paddingHorizontal: 22,
                    paddingVertical: 18,
                  },
                  pkg.name === "Pro" && styles.cardBest,
                  /* START: istakni ProPlus karticu */
                  pkg.key === "proplus" && styles.cardBestPlus,
                  /* END: istakni ProPlus karticu */
                ]}>
                  {/* START: Best offer bedž za ProPlus */}
                  {pkg.key === "proplus" && (
                    <View style={styles.bestOfferBadge}>
                      <Text style={styles.bestOfferText}>
                        {/* i18n label sa fallbackom */}
                        ⭐ {t('common:membership.proplus.bestOffer', { defaultValue: 'Najbolja ponuda' })}
                      </Text>
                    </View>
                  )}
                  {/* END: Best offer bedž za ProPlus */}

                  <Text style={[
                    styles.cardTitle,
                    { color: pkg.color }
                  ]}>
                    {/* START: i18n naziv paketa */}
                    {t(`common:membership.packages.${pkg.key}`, { defaultValue: pkg.name })}
                    {/* END: i18n naziv paketa */}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                    <Text style={{ fontSize: 20, marginRight: 5 }}>🪙</Text>
                    <Text style={{ color: "#ffd700", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 }}>
                      {/* START: BONUS iz Edge funkcije (sa fallbackom) */}
                      {BONUS[pkg.key]}
                      {/* END: BONUS iz Edge funkcije */}
                    </Text>
                  </View>
                  {pkg.features.map((f, i) => (
                    <View style={styles.featureRow} key={i}>
                      {f.label ? (
                        <Text style={styles.featureLabel}>
                          {/* START: i18n feature label sa fallback-om */}
                          {t(`common:membership.features.${f.labelKey}`, { defaultValue: f.label })}
                          {/* END: i18n feature label */}
                        </Text>
                      ) : null}
                      {f.icon ? (
                        f.icon === "close" ? (
                          <MaterialCommunityIcons name="close" size={20} color={f.color || "#fff"} />
                        ) : (
                          <MaterialCommunityIcons name={f.icon} size={20} color="#ffd700" />
                        )
                      ) : (
                        <Text style={[
                          styles.featureValue,
                          {
                            color: f.color || "#ffd700",
                            flex: 1,
                            textAlign: "center",
                            fontSize: 15,
                            alignSelf: "center",
                            width: "100%",
                          }
                        ]}>
                          {/* START: i18n feature value sa fallback-om */}
                          {t(`common:membership.values.${f.valueKey}`, { defaultValue: f.value })}
                          {/* END: i18n feature value */}
                        </Text>
                      )}
                    </View>
                  ))}
                  {pkg.name === "Free" && (
                    <Text style={{
                      color: "#ffd700bb",
                      fontSize: 14,
                      textAlign: "center",
                      marginTop: 10,
                      marginBottom: 25,
                    }}>
                      {/* START: i18n napomena za free – terminološka konzistentnost */}
                      {t('common:membership.notes.freeCoinsAd', { defaultValue: 'Dukati se osvajaju gledanjem reklama (samo za free korisnike).' })}
                      {/* END: i18n napomena za free – terminološka konzistentnost */}
                    </Text>
                  )}
                  {pkg.name === "Premium" && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#a8ff76",
                        borderRadius: 7,
                        padding: 10,
                        marginTop: 12,
                        alignSelf: "center",
                        opacity: userPlan === "premium" || loadingPremium ? 0.45 : 1,
                      }}
                      onPress={handleKupiPremium}
                      disabled={userPlan === "premium" || loadingPremium}
                    >
                      {loadingPremium ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <Text style={{
                          color: userPlan === "premium" ? "#2d2d2d" : "#1a2b0a",
                          fontWeight: "bold",
                          fontSize: 16
                        }}>
                          {/* START: i18n CTA Premium – dinamika cene iz Edge funkcije */}
                          {userPlan === "premium"
                            ? t('common:membership.cta.alreadyPremium', { defaultValue: 'Već imate Premium' })
                            : t('common:membership.cta.buyPremium', { price: PRICE.premium.amount, currency: PRICE.premium.currency, defaultValue: 'Kupi Premium ({{price}} {{currency}} / mesec)' })}
                          {/* END: i18n CTA Premium – dinamika cene */}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {pkg.name === "Pro" && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#ae7ffb",
                        borderRadius: 7,
                        padding: 10,
                        marginTop: 12,
                        alignSelf: "center",
                        opacity: userPlan === "pro" || loadingPro ? 0.45 : 1,
                      }}
                      onPress={handleKupiPro}
                      disabled={userPlan === "pro" || loadingPro}
                    >
                      {loadingPro ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <Text style={{
                          color: userPlan === "pro" ? "#7d7d7d" : "#291a42",
                          fontWeight: "bold",
                          fontSize: 16
                        }}>
                          {/* START: i18n CTA Pro – dinamika cene iz Edge funkcije */}
                          {userPlan === "pro"
                            ? t('common:membership.cta.alreadyPro', { defaultValue: 'Već imate PRO' })
                            : t('common:membership.cta.buyPro', { price: PRICE.pro.amount, currency: PRICE.pro.currency, defaultValue: 'Kupi PRO ({{price}} {{currency}} / mesec)' })}
                          {/* END: i18n CTA Pro – dinamika cene */}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {/* START: CTA ProPlus (godišnje) */}
                  {pkg.key === "proplus" && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#ef4444",
                        borderRadius: 7,
                        padding: 10,
                        marginTop: 12,
                        alignSelf: "center",
                        opacity: userPlan === "proplus" || loadingProPlus ? 0.45 : 1,
                      }}
                      onPress={handleKupiProPlus}
                      disabled={userPlan === "proplus" || loadingProPlus}
                    >
                      {loadingProPlus ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <Text style={{
                          color: userPlan === "proplus" ? "#7d1a1a" : "#2b0a0a",
                          fontWeight: "bold",
                          fontSize: 16
                        }}>
                          {userPlan === "proplus"
                            ? t('common:membership.cta.alreadyProPlus', { defaultValue: 'Već imate ProPlus' })
                            : t('common:membership.cta.buyProPlus', {
                              price: PRICE.proplus.amount,
                              currency: PRICE.proplus.currency,
                              defaultValue: 'Kupi ProPlus ({{price}} {{currency}} / godinu)'
                            })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {/* END: CTA ProPlus (godišnje) */}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{
            marginTop: 14,
            alignItems: "center",
            paddingBottom: 12
          }}>
            <Text style={{
              color: "#ffd700",
              fontWeight: "bold",
              fontSize: 17,
              marginBottom: 14,
              textAlign: "center"
            }}>
              {/* START: i18n naslov topup-a */}
              {t('common:membership.topup.title', { defaultValue: 'Dopuni dukate' })}
              {/* END: i18n naslov topup-a */}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#ffd700",
                borderRadius: 10,
                paddingHorizontal: 26,
                paddingVertical: 13,
                marginBottom: 10,
                minWidth: 210,
                alignItems: "center",
                opacity: loadingTopUp ? 0.5 : 1,
              }}
              onPress={() => handleTopUp(500)}
              disabled={loadingTopUp}
            >
              {loadingTopUp ? (
                <ActivityIndicator color="#222" size="small" />
              ) : (
                <Text style={{ color: "#222", fontWeight: "bold", fontSize: 18 }}>
                  {/* START: i18n topup CTA 500 – dinamika cene iz Edge funkcije */}
                  {t('common:membership.topup.buyCoins', {
                    amount: 500, price: PRICE.topup500.amount, currency: PRICE.topup500.currency,
                    defaultValue: 'Kupi {{amount}} dukata — {{price}} {{currency}}'
                  })}
                  {/* END: i18n topup CTA 500 – dinamika cene */}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#ffd700",
                borderRadius: 10,
                paddingHorizontal: 26,
                paddingVertical: 13,
                marginBottom: 4,
                minWidth: 210,
                alignItems: "center",
                opacity: loadingTopUp ? 0.5 : 1,
              }}
              onPress={() => handleTopUp(1000)}
              disabled={loadingTopUp}
            >
              {loadingTopUp ? (
                <ActivityIndicator color="#222" size="small" />
              ) : (
                <Text style={{ color: "#222", fontWeight: "bold", fontSize: 18 }}>
                  {/* START: i18n topup CTA 1000 – dinamika cene iz Edge funkcije */}
                  {t('common:membership.topup.buyCoins', {
                    amount: 1000, price: PRICE.topup1000.amount, currency: PRICE.topup1000.currency,
                    defaultValue: 'Kupi {{amount}} dukata — {{price}} {{currency}}'
                  })}
                  {/* END: i18n topup CTA 1000 – dinamika cene */}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Ostatak stilova ostaje isti
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#18181b",
    padding: 18,
    borderRadius: 22,
    width: "92%",
    maxWidth: 390,
    elevation: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#252532",
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    paddingTop: 12,
    minHeight: 240,
    width: 260,
    marginBottom: 8,
    alignItems: "center",
    position: "relative",
  },
  cardBest: {
    borderColor: "#ae7ffb",
    shadowColor: "#ae7ffb",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  /* START: styles ProPlus (istaknuto) */
  cardBestPlus: {
    borderColor: "#ef4444",
    shadowColor: "#ef4444",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bestOfferBadge: {
    position: "absolute",
    top: -10,
    right: -8,
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffb4b4",
  },
  bestOfferText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  /* END: styles ProPlus (istaknuto) */
  cardTitle: {
    fontWeight: "bold",
    fontSize: 19,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#444",
    width: "100%",
  },
  featureLabel: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  featureValue: {
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
    marginLeft: 0,
    width: "100%",
    alignSelf: "center",
  },
  note: {
    color: "#ffd700cc",
    marginTop: 14,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "400",
  },
});
