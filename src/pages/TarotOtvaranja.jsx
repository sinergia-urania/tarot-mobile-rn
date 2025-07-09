import { Audio } from "expo-av";
import React, { useState } from "react";
import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import TarotHeader from "../components/TarotHeader";
import KlasicnoModal from "./KlasicnoModal";

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
    key: "kabalisticko",
    icon: require("../assets/icons/otvaranje-drvo.webp"),
    label: "Kabalističko otvaranje",
  },
];

// START: zvuk klik dugmeta (isti kao na TarotHome)
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

const TarotOtvaranja = ({ navigation }) => {
  const [showModal, setShowModal] = useState(false);

  const handleSelect = async (key) => {
    await playClickSound();
    if (key === "klasicno") {
      setShowModal(true);
    } else if (key === "keltski") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: "keltski",
        tip: "keltski",
        brojKarata: 10,
      });
    } else if (key === "astrološko") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: "astrološko",
        tip: "astrološko",
        brojKarata: 12,
      });
    } else if (key === "kabalisticko") {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: "drvo",
        tip: "drvo",
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
      {/* Sticky TarotHeader */}
      <View style={styles.headerWrapper}>
        <TarotHeader
          showBack={true}
          onBack={goHome}
          onHome={goHome}
          onMenu={() => navigation.openDrawer ? navigation.openDrawer() : null}
        />
      </View>

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
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Klasično otvaranje – modal */}
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
});

export default TarotOtvaranja;
