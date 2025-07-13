import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const Uslovi = () => {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Uslovi korišćenja</Text>
      <Text style={styles.paragraph}>
        Korišćenjem ove aplikacije prihvatate sledeće uslove i pravila. Ako se ne slažete sa
        bilo kojim delom ovih uslova, molimo vas da ne koristite aplikaciju.
      </Text>
      <View style={styles.list}>
        <Text style={styles.listItem}>• Aplikacija je namenjena za ličnu i nekomercijalnu upotrebu.</Text>
        <Text style={styles.listItem}>• Ne smete kopirati, distribuirati ili modifikovati sadržaj bez dozvole autora.</Text>
        <Text style={styles.listItem}>• Možemo promeniti uslove korišćenja u bilo kom trenutku bez prethodne najave.</Text>
      </View>
      <Text style={styles.paragraph}>
        Nastavkom korišćenja aplikacije potvrđujete da ste pročitali, razumeli i prihvatili ove uslove.
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
  list: {
    marginTop: 5,
    marginBottom: 12,
    paddingLeft: 8,
  },
  listItem: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 8,
  },
});

export default Uslovi;
