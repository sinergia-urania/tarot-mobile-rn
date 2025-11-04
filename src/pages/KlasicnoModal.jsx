// START: expo-audio migracija (umesto expo-av)
// import { Audio } from "expo-av";
import { createAudioPlayer } from "expo-audio";
// END: expo-audio migracija
import React, { useRef, useState } from "react";
// START: import cleanup (zadržavamo original u komentaru)
// import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
// END: import cleanup
import { READING_PRICES } from "../constants/readingPrices";
import { LJUBAVNO_OTVARANJE, PET_KARATA, TRI_KARTE } from "../data/layoutTemplates";

import { useDukati } from "../context/DukatiContext";

// i18n
import { useTranslation } from "react-i18next";

// START: SafeImage (expo-image) — WebP safe na iOS
import SafeImage from "../components/SafeImage";
// END: SafeImage

const clickSound = require("../assets/sounds/hover-click.mp3");

// START: click SFX sa expo-audio
const playClickSound = async () => {
  try {
    const p = createAudioPlayer(clickSound);
    p.loop = false;
    p.volume = 1;
    await p.seekTo(0);
    p.play();
    setTimeout(() => { try { p.remove?.(); } catch { } }, 1200);
  } catch (e) { }
};
// END: click SFX sa expo-audio

// START: Anti-dupli klik zvuk (lokalno za ovaj modal)
const CLICK_GAP = 180; // ms
let _lastClickAt = 0;
const playClickOnceLocal = async () => {
  const now = Date.now();
  if (now - _lastClickAt < CLICK_GAP) return; // ignoriši drugi poziv u istom gestu
  _lastClickAt = now;
  await playClickSound();
};
// END: Anti-dupli klik zvuk (lokalno za ovaj modal)

const KlasicnoModal = ({ onClose, navigation }) => {
  const { t } = useTranslation(["common"]);

  // START: State za modal nedostatka dukata
  const [showNoDukes, setShowNoDukes] = useState(false);
  const [noDukesText, setNoDukesText] = useState("");
  // END: State za modal nedostatka dukata

  // START: Uzimanje dukata iz context-a
  const { dukati } = useDukati();
  // END: Uzimanje dukata iz context-a

  // ANTIDUPLI KLIK (debounce)
  const selectingRef = useRef(false);

  // Opcije (i18n)
  const optionsUi = [
    {
      key: "2",
      label: t("common:classic.options.love", { defaultValue: "Ja – On/Ona" }),
      icon: require("../assets/icons/love.webp"),
      subtip: "ljubavno",
    },
    {
      key: "3",
      label: t("common:classic.options.pastPresentFuture", {
        defaultValue: "Prošlost – Sadašnjost – Budućnost",
      }),
      icon: require("../assets/icons/history.webp"),
      subtip: "tri",
    },
    {
      key: "5",
      label: t("common:classic.options.pathOfInsight", { defaultValue: "Put spoznaje" }),
      icon: require("../assets/icons/five-cards.webp"),
      subtip: "pet",
    },
  ];

  const handleSelect = async (key) => {
    if (selectingRef.current) return; // debounce
    selectingRef.current = true;

    // START: koristimo lokalni anti-dupli SFX
    await playClickOnceLocal();
    // END: koristimo lokalni anti-dupli SFX

    const opt = optionsUi.find((o) => o.key === key);
    if (!opt) { selectingRef.current = false; return; }

    // GUARD: Provera dukata po subtipu
    const cena = READING_PRICES[opt.subtip] || 0;
    if (cena > 0 && dukati < cena) {
      setNoDukesText(
        t("common:errors.notEnoughCoinsMessage", {
          required: cena,
          balance: dukati,
          defaultValue: `Za ovo otvaranje treba ${cena} dukata, a imaš ${dukati}.`,
        })
      );
      setShowNoDukes(true);
      selectingRef.current = false;
      return;
    }

    // Navigacija na odgovarajuće otvaranje (ako ima dovoljno dukata)
    if (key === "2") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: LJUBAVNO_OTVARANJE.layout,
        tip: "klasicno",
        subtip: "ljubavno",
        opisOtvaranja: t("common:classic.options.love", { defaultValue: "Ja – On/Ona" }),
      });
    } else if (key === "3") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: TRI_KARTE.layout,
        tip: "klasicno",
        subtip: "tri",
        opisOtvaranja: t("common:classic.options.pastPresentFuture", {
          defaultValue: "Prošlost – Sadašnjost – Budućnost",
        }),
      });
    } else if (key === "5") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: PET_KARATA.layout,
        tip: "klasicno",
        subtip: "pet",
        opisOtvaranja: t("common:classic.options.pathOfInsight", { defaultValue: "Put spoznaje" }),
      });
    }

    onClose?.(true);
    // nema potrebe da vraćamo selectingRef na false — modal se zatvara / komponenta unmount
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: "#bbb", fontSize: 28 }}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {t("common:classic.title", { defaultValue: "Izaberi otvaranje" })}
        </Text>
        <View style={styles.options}>
          {optionsUi.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect(opt.key)}
              style={styles.option}
              activeOpacity={0.85}
            >
              <View style={styles.iconBox}>
                {/* START: SafeImage hardening — disk cache, recycling, priority i error log */}
                <SafeImage
                  source={opt.icon}
                  style={styles.icon}
                  contentFit="contain"
                  transition={120}
                  cachePolicy="disk"
                  recyclingKey={`classic-${opt.key}`}
                  priority="high"
                  onError={(e) => { if (__DEV__) console.log('[classic-icon][err]', opt.key, e?.nativeEvent); }}
                />
                {/* END: SafeImage hardening */}
              </View>
              <Text style={styles.optionText}>{opt.label}</Text>
              {/* Cena po subtipu */}
              <Text style={styles.priceText}>{READING_PRICES[opt.subtip]} 🪙</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* START: Modal za nedovoljno dukata */}
        {showNoDukes && (
          <View
            style={{
              position: "absolute",
              top: "36%",
              left: "6%",
              width: "88%",
              backgroundColor: "#220",
              borderColor: "#ffd700",
              borderWidth: 2,
              borderRadius: 15,
              padding: 18,
              zIndex: 999,
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                color: "#ffd700",
                fontWeight: "bold",
                fontSize: 17,
                textAlign: "center",
              }}
            >
              {noDukesText ||
                t("common:errors.notEnoughCoinsTitle", {
                  defaultValue: "Nedovoljno dukata",
                })}
            </Text>
            <TouchableOpacity
              onPress={() => setShowNoDukes(false)}
              style={{
                marginTop: 14,
                alignSelf: "center",
                backgroundColor: "#ffd700",
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Text
                style={{
                  color: "#222",
                  fontWeight: "bold",
                }}
              >
                {t("common:buttons.ok", { defaultValue: "U redu" })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* END: Modal za nedovoljno dukata */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#181824",
    borderRadius: 18,
    padding: 22,
    width: 350,
    maxWidth: "95%",
    alignItems: "center",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: 12,
    top: 10,
    zIndex: 10,
    padding: 6,
  },
  title: {
    fontSize: 22,
    color: "#ffd700",
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 26,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  options: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    gap: 22,
  },
  option: {
    alignItems: "center",
    marginVertical: 10,
    backgroundColor: "rgba(30,30,55,0.27)",
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 26,
    width: 240,
    shadowColor: "#ffd700",
    shadowOpacity: 0.09,
    shadowRadius: 10,
  },
  iconBox: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(10,10,40,0.17)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#facc15",
    overflow: "hidden",
  },
  icon: {
    width: 64,
    height: 64,
  },
  optionText: {
    fontSize: 17,
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.2,
    marginTop: 10,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  priceText: {
    color: "#facc15",
    fontWeight: "bold",
    fontSize: 17,
    marginTop: 5,
  },
});

export default KlasicnoModal;
