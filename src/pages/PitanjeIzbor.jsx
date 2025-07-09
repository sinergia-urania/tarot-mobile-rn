import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import TarotHeader from "../components/TarotHeader"; // prilagodi putanju ako treba
const oblasti = [
  // ... (ostaje tvoja lista oblasti, nisam dirao)
  {
    naziv: "Ljubav",
    ikonica: "❤️",
    pitanja: [
      "Da li me voli?",
      "Kakva je naša budućnost?",
      "Da li ćemo se pomiriti?",
      "Da li ću uskoro upoznati nekog posebnog?",
      "Kako mogu poboljšati svoj ljubavni život?",
      "Da li je moj partner iskren prema meni?",
    ],
  },
  {
    naziv: "Posao",
    ikonica: "💼",
    pitanja: [
      "Da li ću dobiti posao koji želim?",
      "Kakva me karijera čeka?",
      "Da li je vreme za promenu posla?",
      "Kako da napredujem na poslu?",
      "Da li će moj trud biti prepoznat?",
      "Kako da pronađem posao koji me ispunjava?",
    ],
  },
  {
    naziv: "Zdravlje",
    ikonica: "🧘",
    pitanja: [
      "Da li me očekuje oporavak?",
      "Na šta treba da obratim pažnju?",
      "Kako da unapredim svoje zdravlje?",
      "Da li je trenutni tretman pravi izbor?",
      "Kako mogu poboljšati mentalno zdravlje?",
      "Da li treba da tražim drugo mišljenje?",
    ],
  },
  {
    naziv: "Finansije",
    ikonica: "💰",
    pitanja: [
      "Kako da poboljšam svoje finansije?",
      "Da li je pametno ulaganje?",
      "Da li ću imati stabilnost?",
      "Kako da raspolažem novcem pametnije?",
      "Da li ću otplatiti dugove?",
      "Da li mi sledi dobitak?",
    ],
  },
  {
    naziv: "Duhovni razvoj",
    ikonica: "🌀",
    pitanja: [
      "Koja je moja svrha?",
      "Šta mi duša poručuje?",
      "Na čemu treba da radim duhovno?",
      "Koji je sledeći korak u mom razvoju?",
      "Kako da pronađem unutrašnji mir?",
      "Koja lekcija mi se ponavlja?",
    ],
  },
  {
    naziv: "Porodica i odnosi",
    ikonica: "🏡",
    pitanja: [
      "Kako da poboljšam porodične odnose?",
      "Da li će se situacija u porodici smiriti?",
      "Kako da pomognem članu porodice?",
      "Da li će se odnos sa [ime] popraviti?",
      "Kako da budem podrška partneru/partnerki?",
      "Da li nas očekuje mir u kući?",
    ],
  },
];

function OblastModal({ oblast, visible, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>{oblast.naziv} pitanja</Text>
          <ScrollView style={{ maxHeight: 260 }}>
            {oblast.pitanja.map((p, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.questionBtn}
                onPress={() => {
                  onSelect(p);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.questionText}>{p}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={{ color: "#bbb", fontSize: 18 }}>Zatvori</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function PitanjeIzbor() {
  const navigation = useNavigation();
  const route = useRoute();
  const { layoutTemplate, tip } = route.params || {};

  const [pitanje, setPitanje] = useState("");
  const [openModal, setOpenModal] = useState(null);

  const handleNastavi = () => {
    if (!pitanje.trim()) return;
    navigation.navigate("IzborKarata", {
      layoutTemplate,
      pitanje,
      tip,
    });
  };

  const prikazOblasti =
    tip === "ljubavno"
      ? oblasti.filter((o) => o.naziv === "Ljubav")
      : oblasti;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
        <TarotHeader
          showBack={true}
          onBack={() => navigation.goBack()}
          showHome={true}
          onHome={() => navigation.navigate("Home")}
        />
      
      {/* Ostatak sadržaja se skroluje ispod headera */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32}}
        // paddingTop mora biti veći od visine headera
      >
        <View style={styles.container}>
          <Text style={styles.infoMsg}>
            Izaberi neko od ponuđenih pitanja ili postavi svoje pitanje AI tumaču.
          </Text>
          <View style={styles.oblastiCol}>
            {prikazOblasti.map((oblast, idx) => (
              <View key={oblast.naziv} style={{ width: "100%" }}>
                <TouchableOpacity
                  style={styles.oblastBtn}
                  onPress={() => setOpenModal(idx)}
                  activeOpacity={0.87}
                >
                  <Text style={styles.oblastText}>
                    <Text style={styles.ikona}>{oblast.ikonica}</Text> {oblast.naziv} <Text style={styles.ikona}>{oblast.ikonica}</Text>
                  </Text>
                </TouchableOpacity>
                <OblastModal
                  oblast={oblast}
                  visible={openModal === idx}
                  onClose={() => setOpenModal(null)}
                  onSelect={(p) => {
                    setPitanje(p);
                    setTimeout(handleNastavi, 250);
                  }}
                />
              </View>
            ))}
          </View>
          <Text style={styles.subTitle}>Ili unesi svoje pitanje</Text>
          <TextInput
            value={pitanje}
            onChangeText={setPitanje}
            placeholder="Unesi pitanje"
            placeholderTextColor="#aaa"
            style={styles.input}
          />
          <TouchableOpacity style={styles.nastaviBtn} onPress={handleNastavi}>
            <Text style={styles.nastaviText}>Izbor karata</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    // Podešavanje visine, možeš je prilagoditi ako menjaš TarotHeader
    height: Platform.OS === "ios" ? 78 : 70,
    backgroundColor: "#000", // ili "black" za vizuelni kontinuitet
    borderBottomWidth: 1,
    borderBottomColor: "#ffd700",
  },
  container: {
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    padding: 20,
    paddingTop: 8,
  },
  infoMsg: {
    color: "#ffd700",
    backgroundColor: "#19191e",
    fontSize: 17,
    fontWeight: "bold",
    padding: 12,
    marginBottom: 18,
    borderRadius: 10,
    textAlign: "center",
  },
  oblastiCol: {
    flexDirection: "column",
    gap: 12,
    alignItems: "center",
    marginBottom: 28,
  },
  oblastBtn: {
    backgroundColor: "#111a",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffd700",
    paddingVertical: 14,
    marginBottom: 10,
  },
  oblastText: {
    fontSize: 18,
    color: "#ffd700",
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 1,
  },
  ikona: { fontSize: 20, color: "#ffd700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#1c1c28",
    borderRadius: 14,
    padding: 22,
    width: 320,
    maxWidth: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 19,
    color: "#ffd700",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  questionBtn: {
    backgroundColor: "#282842",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    width: 250,
    alignItems: "center",
  },
  questionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  closeBtn: {
    alignSelf: "center",
    marginTop: 8,
  },
  subTitle: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
    marginTop: 24,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderRadius: 9,
    color: "#ffd700",
    borderWidth: 1,
    borderColor: "#ffd700",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    marginBottom: 18,
    width: "100%",
    alignSelf: "center",
  },
  nastaviBtn: {
    backgroundColor: "#ffd700",
    borderRadius: 9,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 18,
  },
  nastaviText: {
    color: "#222",
    fontWeight: "bold",
    fontSize: 17,
  },
});