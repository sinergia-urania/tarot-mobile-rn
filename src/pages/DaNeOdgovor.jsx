// START: Migracija DaNeOdgovor u React Native - minimalistički home
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const DaNeOdgovor = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { karta } = route.params || {};

  if (!karta) {
    return (
      <View style={styles.background}>
        {/* Minimalistično home dugme */}
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.homeIcon}>🏠</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <Text style={styles.noCardText}>
            Nema izvučene karte. Vratite se i pokušajte ponovo.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.buttonText}>Nazad na Tarot početnu</Text>
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
      >
        <Text style={styles.homeIcon}>🏠</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.center}>
          <Text style={styles.title}>Odgovor na tvoje pitanje:</Text>
          <Image
            source={karta.slika}
            style={[
              styles.image,
              !isUspravna && { transform: [{ rotate: "180deg" }] }
            ]}
            resizeMode="contain"
          />
          <Text style={[styles.answer, isUspravna ? styles.yes : styles.no]}>
            {isUspravna ? "DA" : "NE"}
          </Text>
          <Text style={styles.orientation}>
            {`Karta je izvučena ${isUspravna ? "uspravno" : "obrnuto"}.`}
          </Text>
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
  },
  homeIcon: {
    fontSize: 32,
    color: "#ffd700",
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
