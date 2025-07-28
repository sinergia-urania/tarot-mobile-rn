import { Audio } from "expo-av";
import React, { useState } from "react";
import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TarotHeader from "../components/TarotHeader";
import { ASTROLOSKO, KABALISTICKO, KELTSKI_KRST } from "../data/layoutTemplates";
import KlasicnoModal from "./KlasicnoModal";
// START: Import DukatiContext
import { useDukati } from "../context/DukatiContext";
// END: Import DukatiContext
const icons = [
  {
    key: "klasicno",
    icon: require("../assets/icons/otvaranje-klasicno.webp"),
    label: "Klasično otvaranje",
  },
  {
    key: "keltski",
    icon: require("../assets/icons/otvaranje-keltski.webp"),
    label: "Keltski krst",
  },
  {
    key: "astrološko",
    icon: require("../assets/icons/otvaranje-astro.webp"),
    label: "Astrološko otvaranje",
  },
  {
    key: "drvo",
    icon: require("../assets/icons/otvaranje-drvo.webp"),
    label: "Kabalističko otvaranje",
  },
];

const clickSound = require("../assets/sounds/hover-click.mp3");

const playClickSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(clickSound, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {}
};
// END: zvuk klik dugmeta
// START: Importuj cene otvaranja
import { READING_PRICES } from "../constants/readingPrices";
// END: Importuj cene otvaranja

const TarotOtvaranja = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);

  // START: State za modal nedostatka dukata
  const [showNoDukes, setShowNoDukes] = useState(false);
  const [noDukesText, setNoDukesText] = useState("");
  // END: State za modal nedostatka dukata

  // START: Uzimanje dukata iz context-a
  const { dukati } = useDukati();
  // END: Uzimanje dukata iz context-a

  const handleSelect = async (key) => {
    await playClickSound();

    // BESPLATNO: za klasično samo modal, ništa drugo
    if (key === "klasicno") {
      setShowModal(true);
      return;
    }

    // Logika za ostala otvaranja (naplata)
    // *** Definiši subtip/cenu na osnovu key ***
    const cena = READING_PRICES[key] || 0;

    // Guard: nemaš dovoljno dukata?
    if (cena > 0 && dukati < cena) {
      setNoDukesText(`Nemaš dovoljno dukata za ovo otvaranje! Potrebno: ${cena} 🪙`);
      setShowNoDukes(true);
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
  };

  const goHome = () => navigation.navigate("Home");

  return (
    <ImageBackground
      source={require("../assets/icons/background-space.webp")}
      style={styles.background}
      imageStyle={{ resizeMode: "cover" }}
    >
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
            {noDukesText || "Nemaš dovoljno dukata za ovo otvaranje!"}
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
            }}>OK</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* END: Modal za nedovoljno dukata */}

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Odaberite vrstu otvaranja</Text>

        <View style={styles.verticalList}>
          {icons.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={styles.iconButton}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.85}
            >
              <View style={styles.iconBox}>
                <Image source={opt.icon} style={styles.icon} />
              </View>
              <Text style={styles.iconLabel}>{opt.label}</Text>
              {/* Prikaz samo tri dukata za klasično */}
              {opt.key === "klasicno" ? (
                <Text style={styles.iconPrice}>
                  🪙🪙🪙
                </Text>
              ) : (
                <Text style={styles.iconPrice}>
                  {READING_PRICES[opt.key] ? `${READING_PRICES[opt.key]} 🪙` : ""}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
      >
        <KlasicnoModal
          onClose={async () => {
            await playClickSound();
            setShowModal(false);
          }}
          navigation={navigation}
        />
      </Modal>
    </ImageBackground>
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
