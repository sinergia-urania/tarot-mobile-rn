// START: Migracija DaNeOdgovor u React Native - minimalistički home
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// START: SafeImage (expo-image) za iOS/WebP
import SafeImage from "../components/SafeImage";
// END: SafeImage
// START: i18n
import { useTranslation } from "react-i18next";
// END: i18n
// START: ikone (Expo)
import { Ionicons } from "@expo/vector-icons";
// END: ikone (Expo)

const DaNeOdgovor = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { karta } = route.params || {};
  // START: init i18n
  const { t } = useTranslation(["common"]);
  // END: init i18n

  if (!karta) {
    return (
      <View style={styles.background}>
        {/* Minimalistično home dugme */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate("Home")}
          accessibilityRole="button"
          accessibilityLabel={t("common:accessibility.home", { defaultValue: "Početna" })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.85}
        >
          <Ionicons name="home" size={26} color="#facc15" />
        </TouchableOpacity>

        <View style={styles.center}>
          {/* START: i18n – nema izvučene karte */}
          <Text style={styles.noCardText}>
            {t("common:messages.noCardSelected", {
              defaultValue: "Nema izvučene karte. Vratite se i pokušajte ponovo.",
            })}
          </Text>
          {/* END: i18n – nema izvučene karte */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Home")}
            accessibilityRole="button"
          >
            {/* START: i18n – dugme nazad na početnu */}
            <Text style={styles.buttonText}>
              {t("common:buttons.backToTarotHome", {
                defaultValue: "Nazad na Tarot početnu",
              })}
            </Text>
            {/* END: i18n – dugme nazad na početnu */}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isUspravna = karta.okrenuta === "uspravno";

  return (
    <View style={styles.background}>
      {/* Minimalistično home dugme */}
      <TouchableOpacity
        style={styles.homeBtn}
        onPress={() => navigation.navigate("Home")}
        accessibilityRole="button"
        accessibilityLabel={t("common:accessibility.home", { defaultValue: "Početna" })}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.85}
      >
        <Ionicons name="home" size={26} color="#facc15" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.center}>
          {/* START: i18n – naslov */}
          <Text style={styles.title}>
            {t("common:titles.yesNoAnswer", {
              defaultValue: "Odgovor na tvoje pitanje:",
            })}
          </Text>
          {/* END: i18n – naslov */}

          {/* START: SafeImage umesto Image (WebP friendly na iOS) */}
          <SafeImage
            source={karta.slika}
            style={[
              styles.image,
              !isUspravna && { transform: [{ rotate: "180deg" }] },
            ]}
            contentFit="contain"
          />
          {/* END: SafeImage */}

          {/* START: i18n – DA/NE */}
          <Text style={[styles.answer, isUspravna ? styles.yes : styles.no]}>
            {isUspravna
              ? t("common:answers.yes", { defaultValue: "DA" })
              : t("common:answers.no", { defaultValue: "NE" })}
          </Text>
          {/* END: i18n – DA/NE */}

          {/* START: i18n – orijentacija karte */}
          <Text style={styles.orientation}>
            {t("common:messages.cardDrawnWithOrientation", {
              orientation: t(
                isUspravna
                  ? "common:orientation.upright"
                  : "common:orientation.reversed",
                { defaultValue: isUspravna ? "uspravno" : "obrnuto" }
              ),
              defaultValue: "Karta je izvučena {{orientation}}.",
            })}
          </Text>
          {/* END: i18n – orijentacija karte */}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#0e0a24",
    minHeight: "100%",
  },
  homeBtn: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    zIndex: 99,
    backgroundColor: "#201c35",
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    borderWidth: 1,
    borderColor: "#facc15",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingTop: 0,
    minHeight: "100%",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  title: {
    fontSize: 22,
    color: "white",
    marginBottom: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  image: {
    width: 180,
    height: 270,
    marginBottom: 32,
    borderRadius: 12,
    backgroundColor: "#241a40",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 2, height: 2 },
    shadowRadius: 12,
  },
  answer: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  yes: {
    color: "#34d399",
  },
  no: {
    color: "#ef4444",
  },
  orientation: {
    marginTop: 12,
    fontSize: 16,
    color: "#e9d8fd",
    fontStyle: "italic",
    textAlign: "center",
  },
  noCardText: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 28,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 16,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

export default DaNeOdgovor;
// END: Migracija DaNeOdgovor u React Native - minimalistički home
