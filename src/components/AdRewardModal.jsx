// src/components/AdRewardModal.jsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
// START: expo-audio za SFX umesto expo-av
import { createAudioPlayer } from "expo-audio";
// END: expo-audio za SFX umesto expo-av
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from "react-native";
import Toast from "react-native-toast-message";

// AdMob
import { AdEventType, RewardedAdEventType } from "react-native-google-mobile-ads";
import { createRewardedAdInstance } from "../utils/ads";

// App konteksti
import { useDukati } from "../context/DukatiContext";
import { useTreasureRef } from "../context/TreasureRefContext";

// START: i18n
import { useTranslation } from 'react-i18next';
// END: i18n

const REWARD_AMOUNT = 30; // centralizovan iznos nagrade

export default function AdRewardModal({ visible = false, onClose, onFlyCoin }) {
  const [loading, setLoading] = useState(false);
  const [adReady, setAdReady] = useState(false);
  const [coinAnim, setCoinAnim] = useState(false);
  const [adError, setAdError] = useState(null);

  const adButtonRef = useRef(null);
  const rewardedRef = useRef(null);
  const rewardGiven = useRef(false);
  const shouldAnimateRef = useRef(false);

  const treasureRef = useTreasureRef();
  const { dodeliDukatePrekoBackenda, fetchDukatiSaServera } = useDukati();

  // START: i18n hook
  const { t } = useTranslation(['common']);
  // END: i18n hook

  const handleCoinAnim = () => setCoinAnim(true);

  // Učitavanje rewarded instance kad je modal vidljiv
  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    setAdReady(false);
    setAdError(null);
    rewardGiven.current = false;
    shouldAnimateRef.current = false;

    const rewarded = createRewardedAdInstance();
    rewardedRef.current = rewarded;

    const loadedSub = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        console.log("[REWARDED][LOAD] LOADED");
        setAdReady(true);
        setLoading(false);
      }
    );

    const errorSub = rewarded.addAdEventListener(
      AdEventType.ERROR,
      (err) => {
        console.log("[REWARDED][LOAD][ERROR]", err?.code, err?.message, err);
        setAdError(err);
        setLoading(false);
        setAdReady(false);
        const msg = `${err?.code ?? ""} ${err?.message ?? ""}`.trim();
        Toast.show({
          type: "error",
          text1: t('common:ads.errorTitle', { defaultValue: 'Greška sa reklamom!' }),
          text2: msg || t('common:ads.errorGeneric', { defaultValue: 'Pokušajte ponovo kasnije.' }),
          position: "bottom",
        });
      }
    );

    rewarded.load();

    return () => {
      try { loadedSub && loadedSub(); } catch { }
      try { errorSub && errorSub(); } catch { }
      rewardedRef.current = null;
    };
  }, [visible]);

  // Ako LOADED ne stigne (spora mreža) – pokušaj opet
  useEffect(() => {
    if (!visible || adReady || !loading) return;
    const tmo = setTimeout(() => {
      console.log("[REWARDED][RETRY] ponovni load");
      try { rewardedRef.current?.load(); } catch { }
    }, 8000);
    return () => clearTimeout(tmo);
  }, [visible, adReady, loading]);

  const handleWatchAd = async () => {
    if (!adReady) {
      Toast.show({
        type: "info",
        text1: t('common:ads.loading', { defaultValue: 'Reklama se učitava…' }),
        position: "bottom",
      });
      return;
    }
    setLoading(true);
    setAdError(null);

    const rewarded = rewardedRef.current;
    if (!rewarded) {
      setLoading(false);
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: t('common:ads.notReady', { defaultValue: 'Reklama nije spremna.' }),
        position: "bottom"
      });
      return;
    }

    // 1) Dodela dukata NA EARNED_REWARD (dok još traje oglas)
    const earnedSub = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async () => {
        if (rewardGiven.current) return;
        rewardGiven.current = true;
        shouldAnimateRef.current = true; // animaciju ćemo pustiti tek na CLOSED

        try {
          await dodeliDukatePrekoBackenda(REWARD_AMOUNT);
          await fetchDukatiSaServera(); // osveži header odmah
          Toast.show({
            type: "success",
            text1: t('common:ads.thanksTitle', { defaultValue: 'Hvala!' }),
            text2: t('common:ads.rewardToast', { amount: REWARD_AMOUNT, defaultValue: `Dobili ste ${REWARD_AMOUNT} dukata.` }),
            position: "bottom",
          });
        } catch (e) {
          Toast.show({
            type: "error",
            text1: t('common:ads.grantError', { defaultValue: 'Greška pri dodeli dukata' }),
            text2: String(e?.message || e),
            position: "bottom",
          });
        }
      }
    );

    // 2) Animacija i preload SLEDEĆE reklame TEK kad se oglas zatvori
    const closedSub = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      console.log("[REWARDED][CLOSED]");
      fetchDukatiSaServera().catch(() => { });
      // očisti ovaj ciklus
      try { earnedSub && earnedSub(); } catch { }
      try { closedSub && closedSub(); } catch { }

      setAdReady(false);

      // Prvo preload sledećeg
      try { setLoading(true); rewarded.load(); } catch { }

      // Onda animacija (iznad UI-a, bez preklapanja oglasa)
      if (shouldAnimateRef.current) {
        setTimeout(() => {
          let started = false;
          adButtonRef.current?.measureInWindow?.((sx, sy, w, h) => {
            treasureRef.current?.measureInWindow?.((tx, ty, tw, th) => {
              started = true;
              onFlyCoin?.(
                { x: sx + (w || 0) / 2, y: sy + (h || 0) / 2 },
                { x: tx + (tw || 0) / 2, y: ty + (th || 0) / 2 },
                handleCoinAnim
              );
            });
          });
          setTimeout(() => { if (!started) handleCoinAnim(); }, 120);
        }, 120);
      }
      shouldAnimateRef.current = false;
      setLoading(false);
    });

    try {
      rewarded.show();
      setAdReady(false);
    } catch (e) {
      console.log("[REWARDED][SHOW][ERROR]", e);
      setAdError(e);
      Toast.show({
        type: "error",
        text1: t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        text2: String(e?.message || e) || t('common:ads.errorGeneric', { defaultValue: 'Došlo je do greške sa reklamom. Pokušajte ponovo kasnije.' }),
        position: "bottom",
      });
      setLoading(false);
    }
  };

  // START: SFX sa expo-audio (jednokratni “bling”)
  const handleCoinComplete = async () => {
    try {
      const p = createAudioPlayer(require("../assets/sounds/bling.mp3"));
      p.loop = false;
      p.volume = 1;
      await p.seekTo(0);
      p.play();
      // grubo uklanjanje posle ~1.5s (kratak SFX); po želji koriguj trajanje
      setTimeout(() => { try { p.remove?.(); } catch { } }, 1500);
    } catch { }
    finally {
      setCoinAnim(false);
      setLoading(false);
      onClose?.();
    }
  };
  // END: SFX sa expo-audio

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" }}>
        <View
          style={{
            backgroundColor: "#18181b",
            borderRadius: 18,
            padding: 26,
            width: 340,
            alignItems: "center",
            elevation: 20,
            minHeight: 210,
            position: "relative",
          }}
        >
          {/* X */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 20,
              backgroundColor: "#fbbf24",
              borderRadius: 16,
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              elevation: 3,
            }}
          >
            <Text style={{ color: "#222", fontWeight: "bold", fontSize: 22 }}>×</Text>
          </TouchableOpacity>

          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 20, marginBottom: 18, textAlign: "center" }}>
            {t('common:home.watchAdForCoins', { defaultValue: 'Gledaj reklamu za dukate' })}
          </Text>

          {/* Dugme */}
          {!loading && !coinAnim && (
            <TouchableOpacity
              ref={adButtonRef}
              style={{
                backgroundColor: adReady ? "#facc15" : "#e5e7eb",
                borderRadius: 10,
                paddingHorizontal: 36,
                paddingVertical: 13,
                marginTop: 12,
                alignSelf: "center",
                marginBottom: 4,
                minWidth: 180,
                opacity: adReady ? 1 : 0.5,
              }}
              onPress={handleWatchAd}
              disabled={!adReady}
            >
              <Text style={{ color: "#222", fontWeight: "bold", fontSize: 17 }}>
                {adReady
                  ? t('common:ads.buttonReady', { amount: REWARD_AMOUNT, defaultValue: `Pogledaj reklamu za ${REWARD_AMOUNT} dukata` })
                  : t('common:ads.buttonLoading', { defaultValue: 'Reklama se učitava...' })
                }
              </Text>
            </TouchableOpacity>
          )}

          {/* Loading */}
          {loading && !coinAnim && (
            <View style={{ alignItems: "center", marginTop: 24 }}>
              <ActivityIndicator color="#facc15" size="large" />
              <Text style={{ color: "#facc15", fontWeight: "bold", fontSize: 15, marginTop: 12 }}>
                {adReady
                  ? t('common:ads.showing', { defaultValue: 'Prikazivanje reklame...' })
                  : t('common:ads.loading', { defaultValue: 'Učitavanje reklame...' })
                }
              </Text>
            </View>
          )}

          {/* Animacija + potvrda */}
          {coinAnim && (
            <View style={{ alignItems: "center", marginTop: 22 }}>
              <MaterialCommunityIcons name="currency-usd" size={54} color="#ffd700" />
              <Text style={{ color: "#ffd700", fontWeight: "bold", fontSize: 19, marginTop: 6 }}>
                {t('common:ads.plusCoins', { amount: REWARD_AMOUNT, defaultValue: `+${REWARD_AMOUNT} dukata!` })}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 18,
                  backgroundColor: "#facc15",
                  borderRadius: 12,
                  paddingVertical: 9,
                  paddingHorizontal: 34,
                  alignSelf: "center",
                }}
                onPress={handleCoinComplete}
              >
                <Text style={{ color: "#222", fontWeight: "bold", fontSize: 17 }}>
                  {t('common:buttons.ok', { defaultValue: 'U redu' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Greška */}
          {adError && !coinAnim && (
            <Text style={{ color: "red", marginTop: 14, textAlign: "center" }}>
              {t('common:ads.errorGeneric', { defaultValue: 'Došlo je do greške sa reklamom. Pokušajte ponovo kasnije.' })}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
