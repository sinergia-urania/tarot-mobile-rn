import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

const Kontakt = () => {
  const navigation = useNavigation();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Kontakt</Text>
      <Text style={styles.paragraph}>
        Ako imate bilo kakva pitanja, predloge ili tehničke poteškoće, slobodno nas kontaktirajte.
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL("mailto:info@infohelm.org")}>
     <Text style={styles.email}>📧 Email: <Text style={styles.emailLink}>info@infohelm.org</Text></Text>
       </TouchableOpacity>
      <Text style={styles.note}>
        Odgovaramo u roku od 24h radnim danima.
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
  email: {
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  emailLink: {
    color: "#60a5fa",
    textDecorationLine: "underline",
  },
  note: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 20,
    textAlign: "left",
  },
});

export default Kontakt;
