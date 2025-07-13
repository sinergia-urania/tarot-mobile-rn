import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

const Disclaimer = () => {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Odricanje od odgovornosti</Text>
      <Text style={styles.paragraph}>
        Ova aplikacija koristi veštačku inteligenciju za tumačenje simbola i odgovaranje na pitanja,
        slično načinu na koji bi to radio iskusan tumač tarota. Iako AI analizira obrasce i pruža uvide,
        njeni odgovori nisu zamena za profesionalni savet u oblastima poput zdravlja, prava ili finansija.
      </Text>
      <Text style={styles.paragraph}>
        Korisnik samostalno donosi odluke na osnovu dobijenih poruka i uvida. Kreator aplikacije ne preuzima
        odgovornost za posledice koje mogu proizaći iz korišćenja sadržaja.
      </Text>
      <Text style={styles.paragraph}>
        Korišćenjem aplikacije potvrđujete da ste saglasni sa ovim uslovima.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 22,
    backgroundColor: "#181818",
    minHeight: "100%",
  },
  backBtn: {
    position: "absolute",
    top: 22,
    left: 12,
    zIndex: 2,
    padding: 5,
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 26,
    color: "#facc15",
    fontWeight: "bold",
  },
  title: {
    color: "#facc15",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 18,
    textAlign: "center",
    marginTop: 10,
  },
  paragraph: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 15,
    textAlign: "left",
  },
});

export default Disclaimer;
