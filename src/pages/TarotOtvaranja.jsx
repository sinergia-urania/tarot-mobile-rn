// src/pages/TarotOtvaranja.jsx
// START: expo-audio migracija (umesto expo-av)
// import { Audio } from "expo-av";
import { createAudioPlayer } from "expo-audio";
// END: expo-audio migracija
import React, { useRef, useState } from "react";
// START: import cleanup (ostavljam stari u komentaru)
// import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// END: import cleanup
import TarotHeader from "../components/TarotHeader";
import { ASTROLOSKO, KABALISTICKO, KELTSKI_KRST } from "../data/layoutTemplates";
import KlasicnoModal from "./KlasicnoModal";
// START: Import DukatiContext (+ userPlan za PRO gate)
import { useDukati } from "../context/DukatiContext";
// END: Import DukatiContext
// START: Importuj cene otvaranja
import { READING_PRICES } from "../constants/readingPrices";
// END: Importuj cene otvaranja
// i18n
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from "react-i18next";

// START: SafeImage (expo-image) za WebP background i ikone
import SafeImage from "../components/SafeImage";
// END: SafeImage (expo-image) za WebP background i ikone

const clickSound = require("../assets/sounds/hover-click.mp3");

// START: click SFX sa expo-audio
const playClickSound = async () => {
  try {
    const p = createAudioPlayer(clickSound);
    p.loop = false;
    p.volume = 1;
    await p.seekTo(0);
    p.play();
    setTimeout(() => {
      try {
        p.remove?.();
      } catch { }
    }, 1200);
  } catch (e) { }
};
// END: click SFX sa expo-audio

const TarotOtvaranja = ({ navigation }) => {
  const { t } = useTranslation(["common"]);
  const [showModal, setShowModal] = useState(false);

  // START: State za modal nedostatka dukata
  const [showNoDukes, setShowNoDukes] = useState(false);
  const [noDukesText, setNoDukesText] = useState("");
  // END: State za modal nedostatka dukata

  // START: Uzimanje dukata i plana iz context-a (PRO gate)
  // const { dukati, userPlan } = useDukati();
  // START: isPro iz konteksta (Pro i ProPlus)
  const { dukati, userPlan, isPro } = useDukati();
  const isProTier = !!isPro;
  // END: isPro iz konteksta (Pro i ProPlus)
  // END: Uzimanje dukata i plana iz context-a

  // ANTIDUPLI KLIK (debounce) – sprečava dvostruki SFX i duple navigacije
  const selectingRef = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      selectingRef.current = false;
      return () => {
        selectingRef.current = false;
      };
    }, [])
  );

  // START: Jung – specijalno otvaranje (pitanja bez ručnog unosa)
  const JUNG_READING_PRICE = 100;
  // END: Jung – specijalno otvaranje

  // START: redosled ikonica — Astrološko poslednje, Kabalističko pre njega (labeli iz postojećih ključeva)
  const icons = [
    // START: Jung entry kao PRVI na listi
    {
      key: "jung",
      icon: require("../assets/icons/naucnik.webp"),
      label: t("common:home.menu.jungLessons", { defaultValue: "Jungian Archetypes" }),
      price: JUNG_READING_PRICE,
    },
    // END: Jung entry
    {
      key: "klasicno",
      icon: require("../assets/icons/otvaranje-klasicno.webp"),
      label: t("common:membership.features.classicSpreads", { defaultValue: "Klasična otvaranja" }),
    },
    {
      key: "keltski",
      icon: require("../assets/icons/otvaranje-keltski.webp"),
      label: t("common:membership.features.celticCross", { defaultValue: "Keltski krst" }),
    },
    {
      key: "drvo",
      icon: require("../assets/icons/otvaranje-drvo.webp"),
      label: t("common:membership.features.kabbalisticSpread", { defaultValue: "Kabalističko otvaranje" }),
    },
    {
      key: "astrološko",
      icon: require("../assets/icons/otvaranje-astro.webp"),
      label: t("common:membership.features.astrologicalSpread", { defaultValue: "Astrološko otvaranje" }),
    },
  ];
  // END: redosled ikonica

  const handleSelect = async (key) => {
    if (selectingRef.current) return; // debounce
    selectingRef.current = true;
    const autoRelease = setTimeout(() => {
      selectingRef.current = false;
    }, 1000);

    await playClickSound();

    // START: PRO/ProPlus gate za Astrološko
    // if (key === "astrološko" && userPlan !== "pro") {
    if (key === "astrološko" && !isProTier) {
      selectingRef.current = false;
      clearTimeout(autoRelease);
      return;
    }
    // END: PRO/ProPlus gate za Astrološko

    // BESPLATNO: za klasično samo modal
    if (key === "klasicno") {
      setShowModal(true);
      // dozvoli ponovni klik nakon otvaranja modala
      setTimeout(() => {
        selectingRef.current = false;
      }, 300);
      clearTimeout(autoRelease);
      return;
    }

    // Logika za ostala otvaranja (naplata)
    // const cena = READING_PRICES[key] || 0;
    // START: Jung – override cene (ne zavisi od READING_PRICES)
    const cena = key === "jung" ? JUNG_READING_PRICE : READING_PRICES[key] || 0;
    // END: Jung – override cene

    // Guard: nemaš dovoljno dukata?
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
      clearTimeout(autoRelease);
      return;
    }

    // Ako ima dovoljno, normalna navigacija
    // START: Jung – vodi na poseban screen sa pitanjima (bez ručnog unosa)
    if (key === "jung") {
      navigation.navigate("JungQuestions", {
        tip: "jung",
        brojKarata: 5,
        // source: "TarotOtvaranja", // opcionalno, ako ti treba za analytics/debug
      });
      clearTimeout(autoRelease);
      return;
    }

    // END: Jung – poseban flow

    if (key === "keltski") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: KELTSKI_KRST.layout,
        tip: "keltski",
        subtip: "keltski",
        brojKarata: 10,
      });
    } else if (key === "astrološko") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: ASTROLOSKO.layout,
        tip: "astrološko",
        subtip: "astrološko",
        brojKarata: 12,
      });
    } else if (key === "drvo") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: KABALISTICKO.layout,
        tip: "drvo",
        subtip: "drvo",
        brojKarata: 10,
      });
    }

    clearTimeout(autoRelease);
    // nakon navigacije komponenta će se unmount-ovati; nije potrebno resetovati selectingRef
  };

  const goHome = () => navigation.navigate("Home");

  return (
    <>
      {/* START: View + SafeImage kao background (WebP-friendly za iOS) */}
      {/* ORIGINALNO:
        <ImageBackground
          source={require("../assets/icons/background-space.webp")}
          style={styles.background}
          imageStyle={{ resizeMode: "cover" }}
        >
      */}
      <View style={styles.background}>
        <SafeImage
          source={require("../assets/icons/background-space.webp")}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        {/* END: View + SafeImage background */}

        <View style={styles.headerWrapper}>
          <TarotHeader showBack={true} onBack={goHome} onHome={goHome} showMenu={false} />
        </View>

        {/* START: Modal za nedovoljno dukata */}
        {showNoDukes && (
          <View
            style={{
              position: "absolute",
              top: "40%",
              left: "5%",
              width: "90%",
              backgroundColor: "#220",
              borderColor: "#ffd700",
              borderWidth: 2,
              borderRadius: 16,
              padding: 24,
              zIndex: 500,
              alignSelf: "center",
            }}
          >
            <Text
              style={{
                color: "#ffd700",
                fontWeight: "bold",
                fontSize: 18,
                textAlign: "center",
              }}
            >
              {noDukesText || t("common:errors.notEnoughCoinsTitle", { defaultValue: "Nedovoljno dukata" })}
            </Text>
            <TouchableOpacity
              onPress={() => setShowNoDukes(false)}
              style={{
                marginTop: 18,
                alignSelf: "center",
                backgroundColor: "#ffd700",
                paddingHorizontal: 28,
                paddingVertical: 10,
                borderRadius: 9,
              }}
            >
              <Text
                style={{
                  color: "#222",
                  fontWeight: "bold",
                  fontSize: 16,
                }}
              >
                {t("common:buttons.ok", { defaultValue: "U redu" })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* END: Modal za nedovoljno dukata */}

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t("common:home.menu.allSpreads", { defaultValue: "Sva otvaranja" })}</Text>

          <View style={styles.verticalList}>
            {icons.map((opt) => {
              // START: lock logika (astrološko: samo PRO; drvo: PRO/PREMIUM, FREE nema)
              const isAstro = opt.key === "astrološko";
              const isDrvo = opt.key === "drvo";
              // const astroLocked = isAstro && userPlan !== "pro";         // samo PRO
              // START: PRO/ProPlus otključano za Astrološko
              const astroLocked = isAstro && !isProTier; // Pro ili ProPlus → otključano
              // END: PRO/ProPlus otključano za Astrološko
              const drvoLocked = isDrvo && userPlan === "free"; // PRO & PREMIUM imaju pristup
              const locked = astroLocked || drvoLocked;
              // END: lock logika

              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.iconButton, locked && styles.disabledCard /* vizuelno zatamnjenje */]}
                  onPress={() => {
                    if (locked) return; // blokiraj tap kada je zaključano
                    handleSelect(opt.key);
                  }}
                  activeOpacity={locked ? 1 : 0.85}
                >
                  <View style={styles.iconBox}>
                    {/* START: prelazak na SafeImage (expo-image) za WebP ikone */}
                    {/* <Image source={opt.icon} style={styles.icon} /> */}
                    <SafeImage source={opt.icon} style={styles.icon} contentFit="contain" />
                    {/* END: prelazak na SafeImage (expo-image) */}
                  </View>

                  <Text style={styles.iconLabel}>{opt.label}</Text>

                  {/* START: Lock bedževi */}
                  {astroLocked && (
                    <Text style={{ color: "#ffd700", fontSize: 13, marginTop: 4, fontWeight: "bold" }}>
                      {t("common:badges.proOnly", { defaultValue: "(Samo za PRO)" })}
                    </Text>
                  )}
                  {drvoLocked && (
                    <Text style={{ color: "#ffd700", fontSize: 13, marginTop: 4, fontWeight: "bold" }}>
                      {t("common:badges.proOrPremium", { defaultValue: "(Pro/Premium)" })}
                    </Text>
                  )}
                  {/* END: Lock bedževi */}

                  {/* Cene / specijalni prikaz za klasično */}
                  {opt.key === "klasicno" ? (
                    <Text style={styles.iconPrice}>🪙🪙🪙</Text>
                  ) : (
                    <Text style={styles.iconPrice}>
                      {/* START: Jung – prikaži cenu iz opt.price ako postoji */}
                      {/* {READING_PRICES[opt.key] ? `${READING_PRICES[opt.key]} 🪙` : ""} */}
                      {(typeof opt.price === "number" ? opt.price : READING_PRICES[opt.key])
                        ? `${typeof opt.price === "number" ? opt.price : READING_PRICES[opt.key]} 🪙`
                        : ""}
                      {/* END: Jung – prikaži cenu */}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Modal visible={showModal} animationType="slide" transparent={true}>
          <KlasicnoModal
            onClose={async (silent) => {
              if (!silent) {
                await playClickSound();
              }
              setShowModal(false);
              // dozvoli ponovni klik posle zatvaranja
              setTimeout(() => {
                selectingRef.current = false;
              }, 200);
            }}
            navigation={navigation}
          />
        </Modal>

        {/* START: zatvaranje View background omota */}
      </View>
      {/* END: zatvaranje View background omota */}
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#010012",
  },
  headerWrapper: {
    zIndex: 99,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.4)", // bilo 0.86, sada 0.4 kao na Home
    position: "relative",
  },
  content: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 32,
    minHeight: 500,
    backgroundColor: "rgba(0,0,0,0.4)", // dodato za konzistentnost sa Home
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffd700",
    textAlign: "center",
    marginVertical: 22,
    marginBottom: 30,
    letterSpacing: 1,
  },
  verticalList: {
    width: "95%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "flex-start",
    marginVertical: 12, // bilo 16, sada 12 za kompaktniji izgled
    backgroundColor: "rgba(20,20,40,0.3)", // bilo 0.24, sada 0.3
    borderRadius: 16, // bilo 22, sada 16 (kao na Home)
    paddingVertical: 14, // bilo 18, sada 14
    width: "85%", // bilo 90%, sada 85% (kao na Home)
    shadowColor: "#fff",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: "#facc15",
  },
  // START: vizuelni lock – zatamnjeno kada je zaključano
  disabledCard: {
    opacity: 0.5,
  },
  // END: vizuelni lock
  iconBox: {
    width: 64, // bilo 68, sada 64
    height: 64, // bilo 68, sada 64
    borderRadius: 32, // bilo 34, sada 32
    backgroundColor: "rgba(10,10,40,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#facc15",
  },
  icon: {
    width: 54,
    height: 54,
    resizeMode: "contain",
    tintColor: null,
  },
  iconLabel: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.2,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  // START: novi stil za cenu
  iconPrice: {
    color: "#facc15",
    fontWeight: "bold",
    fontSize: 15,
    marginTop: 4,
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  // END: novi stil za cenu
});

export default TarotOtvaranja;
