
import { Audio } from "expo-av";
import React, { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { READING_PRICES } from "../constants/readingPrices";
import { LJUBAVNO_OTVARANJE, PET_KARATA, TRI_KARTE } from "../data/layoutTemplates";

import { useDukati } from "../context/DukatiContext";


const clickSound = require("../assets/sounds/hover-click.mp3");
const playClickSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(clickSound, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {}
};

const options = [
  { key: '2', label: 'Ja – On/Ona', icon: require("../assets/icons/love.webp"), subtip: "ljubavno" },
  { key: '3', label: 'Prošlost – Sadašnjost – Budućnost', icon: require("../assets/icons/history.webp"), subtip: "tri" },
  { key: '5', label: 'Put spoznaje', icon: require("../assets/icons/five-cards.webp"), subtip: "pet" },
];

const KlasicnoModal = ({ onClose, navigation }) => {
  // START: State za modal nedostatka dukata
  const [showNoDukes, setShowNoDukes] = useState(false);
  const [noDukesText, setNoDukesText] = useState("");
  // END: State za modal nedostatka dukata

  // START: Uzimanje dukata iz context-a
  const { dukati } = useDukati();
  // END: Uzimanje dukata iz context-a

  const handleSelect = async (key) => {
    await playClickSound();
    const opt = options.find(o => o.key === key);
    if (!opt) return;

    // GUARD: Provera dukata po subtipu
    const cena = READING_PRICES[opt.subtip] || 0;
    if (cena > 0 && dukati < cena) {
      setNoDukesText(`Nemaš dovoljno dukata za ovo otvaranje! Potrebno: ${cena} 🪙`);
      setShowNoDukes(true);
      return;
    }

    // Navigacija na odgovarajuće otvaranje (ako ima dovoljno dukata)
    if (key === '2') {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: LJUBAVNO_OTVARANJE.layout,        
        tip: "klasicno",
        subtip: "ljubavno",
        opisOtvaranja: "Ja – On/Ona"
      });
    } else if (key === '3') {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: TRI_KARTE.layout,  
        tip: "klasicno",
        subtip: "tri",
        opisOtvaranja: "Prošlost – Sadašnjost – Budućnost"
      });
    } else if (key === '5') {
      navigation.navigate("PitanjeIzbor", {
        layoutTemplate: PET_KARATA.layout,   
        tip: "klasicno",
        subtip: "pet",
        opisOtvaranja: "Put spoznaje"
      });
    }
    if (onClose) onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: "#bbb", fontSize: 28 }}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Izaberi otvaranje</Text>
        <View style={styles.options}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => handleSelect(opt.key)}
              style={styles.option}
              activeOpacity={0.85}
            >
              <View style={styles.iconBox}>
                <Image source={opt.icon} style={styles.icon} />
              </View>
              <Text style={styles.optionText}>{opt.label}</Text>
              {/* Cena po subtipu */}
              <Text style={styles.priceText}>
                {READING_PRICES[opt.subtip]} 🪙
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* START: Modal za nedovoljno dukata */}
        {showNoDukes && (
          <View style={{
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
          }}>
            <Text style={{
              color: "#ffd700",
              fontWeight: "bold",
              fontSize: 17,
              textAlign: "center"
            }}>
              {noDukesText || "Nemaš dovoljno dukata za ovo otvaranje!"}
            </Text>
            <TouchableOpacity
              onPress={() => setShowNoDukes(false)}
              style={{
                marginTop: 14,
                alignSelf: "center",
                backgroundColor: "#ffd700",
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 8
              }}>
              <Text style={{
                color: "#222",
                fontWeight: "bold"
              }}>OK</Text>
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
    resizeMode: "contain",
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
