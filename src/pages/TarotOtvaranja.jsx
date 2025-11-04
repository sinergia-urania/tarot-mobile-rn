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
    setTimeout(() => { try { p.remove?.(); } catch { } }, 1200);
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
  useFocusEffect(React.useCallback(() => {
    selectingRef.current = false;
    return () => { selectingRef.current = false; };
  }, []));


  // START: redosled ikonica — Astrološko poslednje, Kabalističko pre njega (labeli iz postojećih ključeva)
  const icons = [
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
    const autoRelease = setTimeout(() => { selectingRef.current = false; }, 1000);

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
      setTimeout(() => { selectingRef.current = false; }, 300);
      clearTimeout(autoRelease);
      return;
    }

    // Logika za ostala otvaranja (naplata)
    const cena = READING_PRICES[key] || 0;

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
          <TarotHeader
            showBack={true}
            onBack={goHome}
            onHome={goHome}
            showMenu={false}
          />
        </View>

        {/* START: Modal za nedovoljno dukata */}
        {showNoDukes && (
          <View style={{
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
          }}>
            <Text style={{
              color: "#ffd700",
              fontWeight: "bold",
              fontSize: 18,
              textAlign: "center"
            }}>
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
                borderRadius: 9
              }}>
              <Text style={{
                color: "#222",
                fontWeight: "bold",
                fontSize: 16,
              }}>
                {t("common:buttons.ok", { defaultValue: "U redu" })}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {/* END: Modal za nedovoljno dukata */}

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>
            {t("common:home.menu.allSpreads", { defaultValue: "Sva otvaranja" })}
          </Text>

          <View style={styles.verticalList}>
            {icons.map((opt) => {
              // START: lock logika (astrološko: samo PRO; drvo: PRO/PREMIUM, FREE nema)
              const isAstro = opt.key === "astrološko";
              const isDrvo = opt.key === "drvo";
              // const astroLocked = isAstro && userPlan !== "pro";         // samo PRO
              // START: PRO/ProPlus otključano za Astrološko
              const astroLocked = isAstro && !isProTier;                    // Pro ili ProPlus → otključano
              // END: PRO/ProPlus otključano za Astrološko
              const drvoLocked = isDrvo && userPlan === "free";          // PRO & PREMIUM imaju pristup
              const locked = astroLocked || drvoLocked;
              // END: lock logika

              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.iconButton,
                    locked && styles.disabledCard, // vizuelno zatamnjenje
                  ]}
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
                      {READING_PRICES[opt.key] ? `${READING_PRICES[opt.key]} 🪙` : ""}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Modal
          visible={showModal}
          animationType="slide"
          transparent={true}
        >
          <KlasicnoModal
            onClose={async (silent) => {
              if (!silent) { await playClickSound(); }
              setShowModal(false);
              // dozvoli ponovni klik posle zatvaranja
              setTimeout(() => { selectingRef.current = false; }, 200);
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
    backgroundColor: "rgba(0,0,0,0.86)",
    position: "relative",
  },
  content: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 32,
    minHeight: 500,
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
    marginVertical: 16,
    backgroundColor: "rgba(20,20,40,0.24)",
    borderRadius: 22,
    paddingVertical: 18,
    width: "90%",
    shadowColor: "#fff",
    shadowOpacity: 0.10,
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
    width: 68,
    height: 68,
    borderRadius: 34,
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
