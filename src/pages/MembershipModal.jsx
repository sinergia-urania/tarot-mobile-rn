import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Toast from 'react-native-toast-message';
import { useDukati } from "../context/DukatiContext";

const PAKET_BONUSI = { free: 150, premium: 4000, pro: 7000 };

const packages = [
  // ... (ostaje isto kao kod tebe)
  {
    name: "Free",
    key: "free",
    color: "#facc15",
    features: [
      { label: "Značenje karata", icon: "bank-outline" },
      { label: "Klasična otvaranja", icon: "bank-outline" },
      { label: "Keltski krst", icon: "bank-outline" },
      { label: "Astrološko otvaranje", icon: "close", color: "#ff5454" },
      { label: "Kabalističko otvaranje", icon: "close", color: "#ff5454" },
      { label: "AI potpitanja", icon: "close", color: "#ff5454" },
      { label: "Arhiva otvaranja", icon: "close", color: "#ff5454" },
      { label: "", value: "Reklame", color: "#facc15" },
    ],
  },
  {
    name: "Premium",
    key: "premium",
    color: "#a8ff76",
    features: [
      { label: "Značenje karata", icon: "bank-outline" },
      { label: "Klasična otvaranja", icon: "bank-outline" },
      { label: "Keltski krst", icon: "bank-outline" },
      { label: "Astrološko otvaranje", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", icon: "close", color: "#ff5454" },
      { label: "AI potpitanja", icon: "close", color: "#ff5454" },
      { label: "Arhiva otvaranja", icon: "close", color: "#ff5454" },
      { label: "", value: "Bez reklama", color: "#a8ff76" },
    ],
  },
  {
    name: "Pro",
    key: "pro",
    color: "#ae7ffb",
    features: [
      { label: "Značenje karata", icon: "bank-outline" },
      { label: "Klasična otvaranja", icon: "bank-outline" },
      { label: "Keltski krst", icon: "bank-outline" },
      { label: "Astrološko otvaranje", icon: "bank-outline" },
      { label: "Kabalističko otvaranje", icon: "bank-outline" },
      { label: "AI potpitanja", icon: "bank-outline" },
      { label: "Arhiva otvaranja", icon: "bank-outline" },
      { label: "", value: "Bez reklama", color: "#ae7ffb" },
    ],
  },
];

export default function MembershipModal({ visible, onClose }) {
  const { promeniPlan, fetchDukatiSaServera, userPlan, dodeliDukatePrekoBackenda } = useDukati();

  // START: Loading state-ovi za svaku akciju
  const [loadingPremium, setLoadingPremium] = React.useState(false);
  const [loadingPro, setLoadingPro] = React.useState(false);
  const [loadingTopUp, setLoadingTopUp] = React.useState(false);
  // END: Loading state-ovi za svaku akciju

  // START: Atomarno dodeljivanje bonusa i promene paketa (uvek preko backenda)
  const handleKupiPremium = async () => {
    setLoadingPremium(true);
    try {
      await dodeliDukatePrekoBackenda(PAKET_BONUSI["premium"]);
      await promeniPlan("premium");
      await fetchDukatiSaServera();
      Toast.show({
        type: "success",
        text1: "Uspeh!",
        text2: `Vaš nalog je sada Premium. Dobili ste još ${PAKET_BONUSI["premium"]} dukata!`,
        position: "bottom",
        visibilityTime: 2800,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Greška",
        text2: err.message || "Pokušajte ponovo.",
        position: "bottom",
        visibilityTime: 2500,
      });
    } finally {
      setLoadingPremium(false);
    }
  };

  const handleKupiPro = async () => {
    setLoadingPro(true);
    try {
      await dodeliDukatePrekoBackenda(PAKET_BONUSI["pro"]);
      await promeniPlan("pro");
      await fetchDukatiSaServera();
      Toast.show({
        type: "success",
        text1: "Uspeh!",
        text2: `Vaš nalog je sada PRO. Dobili ste još ${PAKET_BONUSI["pro"]} dukata!`,
        position: "bottom",
        visibilityTime: 2800,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Greška",
        text2: err.message || "Pokušajte ponovo.",
        position: "bottom",
        visibilityTime: 2500,
      });
    } finally {
      setLoadingPro(false);
    }
  };
  // END: Atomarno dodeljivanje bonusa i promene paketa

  const handleTopUp = async (iznos) => {
    setLoadingTopUp(true);
    try {
      await dodeliDukatePrekoBackenda(iznos);
      Toast.show({
        type: "success",
        text1: "Uspešno!",
        text2: `Dobili ste ${iznos} dukata.`,
        position: "bottom",
        visibilityTime: 2200,
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Greška",
        text2: "Nije moguće dodati dukate.",
        position: "bottom",
        visibilityTime: 2200,
      });
    } finally {
      setLoadingTopUp(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8, alignSelf: "center" }}>
            DEBUG userPlan: {JSON.stringify(userPlan)}
          </Text>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 18, paddingVertical: 4, paddingHorizontal: 4 }}
            style={{ marginBottom: 10 }}
          >
            {packages.map((pkg) => (
              <View key={pkg.name} style={{ alignItems: "center" }}>
                <View style={[
                  styles.card,
                  {
                    borderColor: pkg.color,
                    width: 260,
                    minHeight: 240,
                    paddingHorizontal: 22,
                    paddingVertical: 18,
                  },
                  pkg.name === "Pro" && styles.cardBest,
                ]}>
                  <Text style={[
                    styles.cardTitle,
                    { color: pkg.color }
                  ]}>
                    {pkg.name}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 5 }}>
                    <Text style={{ fontSize: 20, marginRight: 5 }}>🪙</Text>
                    <Text style={{ color: "#ffd700", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 }}>
                      {PAKET_BONUSI[pkg.key]}
                    </Text>
                  </View>
                  {pkg.features.map((f, i) => (
                    <View style={styles.featureRow} key={i}>
                      {f.label ? (
                        <Text style={styles.featureLabel}>{f.label}</Text>
                      ) : null}
                      {f.icon ? (
                        f.icon === "close" ? (
                          <MaterialCommunityIcons name="close" size={20} color={f.color || "#fff"} />
                        ) : (
                          <MaterialCommunityIcons name={f.icon} size={20} color="#ffd700" />
                        )
                      ) : (
                        <Text style={[
                          styles.featureValue,
                          {
                            color: f.color || "#ffd700",
                            flex: 1,
                            textAlign: "center",
                            fontSize: 15,
                            alignSelf: "center",
                            width: "100%",
                          }
                        ]}>
                          {f.value}
                        </Text>
                      )}
                    </View>
                  ))}
                  {pkg.name === "Free" && (
                    <Text style={{
                      color: "#ffd700bb",
                      fontSize: 14,
                      textAlign: "center",
                      marginTop: 10,
                      marginBottom: 25,
                    }}>
                      Zlatnici se osvajaju gledanjem reklama (samo za free korisnike).
                    </Text>
                  )}
                  {pkg.name === "Premium" && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#a8ff76",
                        borderRadius: 7,
                        padding: 10,
                        marginTop: 12,
                        alignSelf: "center",
                        opacity: userPlan === "premium" || loadingPremium ? 0.45 : 1,
                      }}
                      onPress={handleKupiPremium}
                      disabled={userPlan === "premium" || loadingPremium}
                    >
                      {loadingPremium ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <Text style={{
                          color: userPlan === "premium" ? "#2d2d2d" : "#1a2b0a",
                          fontWeight: "bold",
                          fontSize: 16
                        }}>
                          {userPlan === "premium" ? "Već imate Premium " : "Kupi Premium (599 RSD / mesec)"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {pkg.name === "Pro" && (
                    <TouchableOpacity
                      style={{
                        backgroundColor: "#ae7ffb",
                        borderRadius: 7,
                        padding: 10,
                        marginTop: 12,
                        alignSelf: "center",
                        opacity: userPlan === "pro" || loadingPro ? 0.45 : 1,
                      }}
                      onPress={handleKupiPro}
                      disabled={userPlan === "pro" || loadingPro}
                    >
                      {loadingPro ? (
                        <ActivityIndicator color="#222" size="small" />
                      ) : (
                        <Text style={{
                          color: userPlan === "pro" ? "#7d7d7d" : "#291a42",
                          fontWeight: "bold",
                          fontSize: 16
                        }}>
                          {userPlan === "pro" ? "Već imate PRO " : "Kupi PRO (999 RSD / mesec)"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={{
            marginTop: 14,
            alignItems: "center",
            paddingBottom: 12
          }}>
            <Text style={{
              color: "#ffd700",
              fontWeight: "bold",
              fontSize: 17,
              marginBottom: 14,
              textAlign: "center"
            }}>
              Dopuni dukate
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#ffd700",
                borderRadius: 10,
                paddingHorizontal: 26,
                paddingVertical: 13,
                marginBottom: 10,
                minWidth: 210,
                alignItems: "center",
                opacity: loadingTopUp ? 0.5 : 1,
              }}
              onPress={() => handleTopUp(500)}
              disabled={loadingTopUp}
            >
              {loadingTopUp ? (
                <ActivityIndicator color="#222" size="small" />
              ) : (
                <Text style={{ color: "#222", fontWeight: "bold", fontSize: 18 }}>
                  Kupi 500 dukata — 100 RSD
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "#ffd700",
                borderRadius: 10,
                paddingHorizontal: 26,
                paddingVertical: 13,
                marginBottom: 4,
                minWidth: 210,
                alignItems: "center",
                opacity: loadingTopUp ? 0.5 : 1,
              }}
              onPress={() => handleTopUp(1000)}
              disabled={loadingTopUp}
            >
              {loadingTopUp ? (
                <ActivityIndicator color="#222" size="small" />
              ) : (
                <Text style={{ color: "#222", fontWeight: "bold", fontSize: 18 }}>
                  Kupi 1000 dukata — 170 RSD
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Ostatak stilova ostaje isti
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#18181b",
    padding: 18,
    borderRadius: 22,
    width: "92%",
    maxWidth: 390,
    elevation: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#252532",
    borderRadius: 14,
    borderWidth: 2,
    padding: 14,
    paddingTop: 12,
    minHeight: 240,
    width: 260,
    marginBottom: 8,
    alignItems: "center",
    position: "relative",
  },
  cardBest: {
    borderColor: "#ae7ffb",
    shadowColor: "#ae7ffb",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 7,
  },
  cardTitle: {
    fontWeight: "bold",
    fontSize: 19,
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: "#444",
    width: "100%",
  },
  featureLabel: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  featureValue: {
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
    marginLeft: 0,
    width: "100%",
    alignSelf: "center",
  },
  note: {
    color: "#ffd700cc",
    marginTop: 14,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "400",
  },
});
