import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { login, loginWithFacebook, loginWithGoogle, register } from "../utils/auth";

const LoginScreen = () => {
  const navigation = useNavigation();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Klasičan login
  const handleLogin = async () => {
    setLoading(true);
    try {
      await login(email, password);
      Alert.alert("Uspeh", "Uspešno ste se prijavili!");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Greška", err.message || "Neuspešna prijava.");
    }
    setLoading(false);
  };

  // Registracija
  const handleRegister = async () => {
    if (!displayName.trim()) {
      Alert.alert("Greška", "Unesite ime!");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, displayName);
      Alert.alert("Uspeh", "Uspešno ste se registrovali! Potvrdite email.");
      navigation.goBack();
    } catch (err) {
      Alert.alert("Greška", err.message || "Neuspešna registracija.");
    }
    setLoading(false);
  };

  // Facebook login (privremeno ne radi)
  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithFacebook();
      console.log("FB LOGIN result:", result);
      navigation.goBack();
    } catch (err) {
      console.log("FB LOGIN ERROR:", err);
      Alert.alert("Greška", err.message || "Facebook prijava nije uspela.");
    }
    setLoading(false);
  };

  // START: Google login handler
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      // Nema potrebe za navigation.goBack(); -- redirektuje browser
    } catch (err) {
      Alert.alert("Greška", err.message || "Google prijava nije uspela.");
    }
    setLoading(false);
  };
  // END: Google login handler

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? "Registracija" : "Prijava"}</Text>
      {isRegister && (
        <TextInput
          style={styles.input}
          placeholder="Vaše ime"
          placeholderTextColor="#aaa"
          value={displayName}
          onChangeText={setDisplayName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#aaa"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Lozinka"
        placeholderTextColor="#aaa"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {loading ? (
        <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} />
      ) : (
        <>
          <TouchableOpacity
            style={styles.button}
            onPress={isRegister ? handleRegister : handleLogin}
          >
            <Text style={styles.buttonText}>
              {isRegister ? "Registruj se" : "Prijavi se"}
            </Text>
          </TouchableOpacity>

          {/* START: Google login dugme */}
          <TouchableOpacity
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingVertical: 12,
              paddingHorizontal: 32,
              alignItems: "center",
              marginTop: 14,
              width: "100%",
              flexDirection: "row",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "#ccc",
            }}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={{ color: "#232323", fontSize: 17, fontWeight: "bold" }}>
              Prijava preko Google-a
            </Text>
          </TouchableOpacity>
          {/* END: Google login dugme */}

          {/* START: Facebook dugme (onemogućeno, za kasnije) */}
          <TouchableOpacity
            style={styles.fbButton}
            onPress={handleFacebookLogin}
            
          >
            <Text style={styles.fbButtonText}>Prijava preko Facebook-a</Text>
          </TouchableOpacity>
          {/* END: Facebook dugme */}
        </>
      )}

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={styles.toggleBtn}>
        <Text style={styles.toggleText}>
          {isRegister ? "Već imaš nalog? Prijavi se" : "Nemaš nalog? Registruj se"}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#181818",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
  },
  title: {
    fontSize: 28,
    color: "#facc15",
    fontWeight: "bold",
    marginBottom: 26,
  },
  input: {
    width: "100%",
    padding: 13,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    color: "#fff",
    marginBottom: 13,
    fontSize: 16,
    backgroundColor: "#232323",
  },
  button: {
    backgroundColor: "#facc15",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 4,
    width: "100%",
  },
  buttonText: {
    color: "#232323",
    fontSize: 18,
    fontWeight: "bold",
  },
  fbButton: {
    backgroundColor: "#1877f2",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    marginTop: 14,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
  fbButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 4,
  },
  toggleBtn: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    color: "#facc15",
    fontSize: 15,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});

export default LoginScreen;
