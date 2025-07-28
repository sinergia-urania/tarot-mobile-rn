// AuthConfirmScreen.jsx
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Button, StyleSheet, Text, View } from "react-native";

const AuthConfirmScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Vaš nalog je potvrđen! 🎉</Text>
      <Text style={styles.info}>
        Sada se možete prijaviti koristeći svoj email i šifru.
      </Text>
      <Button title="Prijavi se" onPress={() => navigation.navigate("Login")} />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#10b981",
    marginBottom: 18,
    textAlign: "center",
  },
  info: {
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    fontSize: 16,
  },
});

export default AuthConfirmScreen;
