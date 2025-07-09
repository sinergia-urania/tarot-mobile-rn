import React from "react";
import { StyleSheet, Text, View } from "react-native";
import GoogleLoginButton from "../components/GoogleLoginButton";

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dobrodošao!</Text>
      <GoogleLoginButton />
      {/* Ovde možeš kasnije dodati i Email/Password login */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, marginBottom: 20, fontWeight: "bold" }
});
