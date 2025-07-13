import { useNavigation } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const OAplikaciji = () => {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>O aplikaciji</Text>

      <Text style={styles.paragraph}>
        Ova aplikacija je zasnovana na kombinaciji savremenih AI tehnologija i arhetipskih simbola iz
        sveta tarota, kako bi korisnicima pružila personalizovano, promišljeno i korisno tumačenje.
        AI ne generiše nasumične poruke – već koristi duboku analizu, u kontekstu korisnikovog pitanja
        i rasporeda karata.
      </Text>

      <Text style={styles.paragraph}>
        Sva otvaranja u aplikaciji (osim "Karta dana" i "Da/Ne" koje su intuitivne prirode) analiziraju
        karte kroz višeslojni simbolički sistem i pokušavaju da prepoznaju unutrašnju logiku u vezi
        korisnikovog upita.
      </Text>

      <Text style={styles.subtitle}>Kako funkcioniše</Text>
      <Text style={styles.paragraph}>
        Aplikacija nudi listu često postavljanih pitanja, kao i mogućnost da korisnik sam unese svoje
        pitanje ukoliko nije među predloženima. Time je omogućeno da svaki korisnik pristupi tumačenju
        koje je zaista lično i relevantno.
      </Text>

      <Text style={styles.subtitle}>Pristup i paketi</Text>
      <View style={styles.list}>
        <Text style={styles.listItem}>• <Text style={{fontWeight: "bold"}}>Free</Text>: osnovni pristup sa ograničenim brojem otvaranja i funkcionalnosti.</Text>
        <Text style={styles.listItem}>• <Text style={{fontWeight: "bold"}}>Premium</Text>: otključava dodatne tipove otvaranja i uvida.</Text>
        <Text style={styles.listItem}>• <Text style={{fontWeight: "bold"}}>Pro</Text>: puni pristup svim alatima, analizi i personalizaciji.</Text>
      </View>
      <Text style={styles.paragraph}>
        Pored paketa, aplikacija omogućava i <Text style={{fontWeight: "bold"}}>AdReward</Text> opciju – gledanjem reklama,
        korisnici mogu otključati određene funkcije, kao alternativu plaćanju.
      </Text>

      <Text style={styles.subtitle}>Napomena</Text>
      <Text style={styles.paragraph}>
        Aplikacija ne predviđa budućnost u determinističkom smislu, već pokušava da osvetli potencijalne
        pravce i unutrašnje obrasce kroz arhetipski jezik karata i simbolike.
      </Text>

      <Text style={styles.version}>Verzija aplikacije: 1.0.0</Text>
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
    marginBottom: 10,
    textAlign: "center",
    marginTop: 10,
  },
  subtitle: {
    color: "#eab308",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 18,
    marginBottom: 6,
  },
  paragraph: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
    textAlign: "left",
  },
  list: {
    marginTop: 2,
    marginBottom: 12,
    paddingLeft: 8,
  },
  listItem: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 6,
  },
  version: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 16,
    textAlign: "right",
  },
});

export default OAplikaciji;
