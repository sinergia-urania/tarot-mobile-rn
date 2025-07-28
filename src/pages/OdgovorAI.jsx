import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import TarotHeader from "../components/TarotHeader";
import { getCardImagePath } from "../utils/getCardImagePath";
import getLayoutByTip from "../utils/getLayoutByTip";

const unaAvatar = require("../assets/icons/una-avatar.webp");
const backgroundImg = require("../assets/icons/background-space.webp");

const sefiroti = [
  "Keter (Kruna)",
  "Hokmah (Mudrost)",
  "Binah (Razumevanje)",
  "Hesed (Milosrđe)",
  "Gevurah (Stroga pravda)",
  "Tiferet (Lepota)",
  "Necah (Večnost)",
  "Hod (Slava)",
  "Jesod (Temelj)",
  "Malhut (Carstvo)",
];

const kuceAstro = [
  "1. kuća (Ličnost)",
  "2. kuća (Finansije)",
  "3. kuća (Komunikacija)",
  "4. kuća (Dom i porodica)",
  "5. kuća (Kreativnost)",
  "6. kuća (Zdravlje)",
  "7. kuća (Partnerstva)",
  "8. kuća (Transformacija)",
  "9. kuća (Putovanja i uverenja)",
  "10. kuća (Karijera)",
  "11. kuća (Prijatelji i zajednica)",
  "12. kuća (Podsvest)",
];

const keltskePozicije = [
  "1. Sadašnja situacija",
  "2. Prepreka / izazov",
  "3. Temelj (nesvesno)",
  "4. Prošlost",
  "5. Svesno / mogućnosti",
  "6. Bliska budućnost",
  "7. Stav prema situaciji",
  "8. Uticaj okoline",
  "9. Nada / strah",
  "10. Ishod"
];

const OdgovorAI = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    tip,
    subtip,
    pitanje,
    podpitanja = [],
    izabraneKarte,
    karte,
    opisOtvaranja = ""
  } = route.params || {};

  const prikazaneKarte = izabraneKarte || karte || [];
  const kontekstOtvaranja = opisOtvaranja ? `Tip otvaranja: ${opisOtvaranja}. ` : "";
  const layout = route.params.layoutTemplate || getLayoutByTip(tip);

  const offsetX = tip === "keltski" ? -35 : 0;

  // Prilagodljiva veličina karata po tipu i broju
  let cardSize = { width: 48, height: 80 };
  if ((subtip === "ljubavno" && layout.length === 2) || (subtip === "tri" && layout.length === 3)) {
    cardSize = { width: 120, height: 198 };
  } else if (subtip === "pet" && layout.length === 5) {
    cardSize = { width: 80, height: 145 };
  }

  // Dimenzije ekrana
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const containerHeight = layout.length > 6 ? Math.max(600, windowHeight * 0.65) : 420;

  return (
    <ImageBackground
      source={backgroundImg}
      style={{ flex: 1, width: "100%", height: "100%" }}
      imageStyle={{ resizeMode: "cover" }}
    >
      {/* TarotHeader sticky na vrhu */}
      <View style={styles.headerWrapper}>
        <TarotHeader
          showBack={true}
          onBack={() => navigation.goBack()}
          onHome={() => navigation.navigate("Home")}
          showMenu={false}
        />
      </View>
      <ScrollView style={{ flex: 1 }}>
        <View style={styles.root}>
          {/* AVATAR Una – veći i niže */}
          <Image source={unaAvatar} style={styles.avatar} />
          <Text style={styles.pitanjeLabel}>Pitanje:</Text>
          <Text style={styles.pitanje}>{pitanje || "Nema pitanja."}</Text>

          {/* Podpitanja */}
          {podpitanja.length > 0 && (
            <View style={styles.podpitanja}>
              {podpitanja.map((p, idx) => (
                <View key={idx} style={styles.podpitanjeBox}>
                  <Text style={styles.podpitanjeText}>
                    Podpitanje {idx + 1}: {p}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Prikaz karata – sada POTPUNO CENTRIRANO */}
          <View
            style={[
              styles.cardsContainer,
              {
                height: containerHeight,
                width: windowWidth,
                alignSelf: "center",
                justifyContent: "center",
              }
            ]}
          >
            {layout.map((pos, idx) => {
              const card = prikazaneKarte[idx];
              const isRotated = tip === "keltski" && idx === 1;
              const zIndex = idx === 1 ? 20 : 10 + idx;
              // Centriranje karata po ekranu:
              return (
                <View
                  key={idx}
                  style={{
                    position: "absolute",
                    width: cardSize.width,
                    height: cardSize.height,
                    left: (windowWidth / 2) + (pos.x * cardSize.width) + offsetX - (cardSize.width / 2),

                    top: (containerHeight / 2) + (pos.y * cardSize.height) - (cardSize.height / 2),
                    zIndex,
                    backgroundColor: "#ffd700",
                    borderRadius: 6,
                    justifyContent: "center",
                    alignItems: "center",
                    overflow: "hidden",
                    transform: [{ rotate: isRotated ? "90deg" : "0deg" }]
                  }}
                >
                  {card && card.label ? (
                    <Image
                      source={getCardImagePath(card.label)}
                      style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                    />
                  ) : (
                    <Text style={{ fontSize: 11, color: "#222" }}>Karta {idx + 1}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* AI odgovor i kontekst */}
          <View style={styles.odgovorBox}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, justifyContent: "center" }}>
              <Image source={unaAvatar} style={{ width: 44, height: 44, borderRadius: 24, marginRight: 8 }} />
              <Text style={{ color: "#ffd700", fontSize: 18, fontWeight: "bold" }}>Una odgovara:</Text>
            </View>
            <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, marginBottom: 2 }}>
              {kontekstOtvaranja}
              Ovo je mesto gde će AI dati odgovor na osnovu odabranih karata.
            </Text>

            {/* Astrološke kuće */}
            {tip === "astrološko" && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                  Tumačenje po astrološkim kućama:
                </Text>
                {prikazaneKarte.map((card, index) => card ? (
                  <Text key={index} style={styles.listItem}>
                    <Text style={{ fontWeight: "bold" }}>{kuceAstro[index]}: </Text>
                    {card?.label || `Karta #${card.id}`}
                  </Text>
                ) : null)}
              </View>
            )}

            {/* Sefiroti */}
            {tip === "drvo" && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                  Tumačenje po sefirotima:
                </Text>
                {prikazaneKarte.map((card, index) => card ? (
                  <Text key={index} style={styles.listItem}>
                    <Text style={{ fontWeight: "bold" }}>{index + 1}. {sefiroti[index]}: </Text>
                    {card?.label || `Karta #${card.id}`}
                  </Text>
                ) : null)}
              </View>
            )}

            {/* Keltski krst */}
            {tip === "keltski" && (
              <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                  Tumačenje Keltskog krsta:
                </Text>
                {prikazaneKarte.map((card, index) => card ? (
                  <Text key={index} style={styles.listItem}>
                    <Text style={{ fontWeight: "bold" }}>{keltskePozicije[index]}: </Text>
                    {card?.label || `Karta #${card.id}`}
                  </Text>
                ) : null)}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    zIndex: 99,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.86)",
    position: "relative",
  },
  root: { flex: 1, alignItems: "center", padding: 8, backgroundColor: "transparent" },
  avatar: { width: 180, height: 180, borderRadius: 90, marginTop: 36, marginBottom: 12 },
  pitanjeLabel: { fontSize: 21, color: "#ffd700", fontWeight: "bold", marginBottom: 3, marginTop: 16 },
  pitanje: { fontSize: 17, color: "#fff", marginBottom: 18, textAlign: "center", maxWidth: 340 },
  podpitanja: { width: "100%", maxWidth: 340, marginBottom: 14 },
  podpitanjeBox: { backgroundColor: "#fff2", padding: 10, marginVertical: 3, borderRadius: 8 },
  podpitanjeText: { color: "#fff", fontSize: 14 },
  cardsContainer: {
    alignItems: "center",
    marginBottom: 18,
    marginTop: 6,
    position: "relative",
  },
  odgovorBox: { backgroundColor: "#fff1", borderRadius: 14, padding: 14, marginTop: 4, maxWidth: 380, width: "100%" },
  listItem: { color: "#fff", fontSize: 14, marginBottom: 3, textAlign: "left" },
});

export default OdgovorAI;
