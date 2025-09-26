import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import TarotHeader from "../components/TarotHeader";
import { formatDateLocal } from "../utils/formatDate";
import { getCardImagePath } from "../utils/getCardImagePath";
// i18n
import { useTranslation } from "react-i18next";

const DetaljOtvaranja = () => {
  const navigation = useNavigation();
  const { params } = useRoute();
  const { t } = useTranslation(["common"]);

  const otvaranje = params?.otvaranje || {};
  // START: Debug – detalji otvaranja
  console.log(">>> DETALJ OTVARANJA:", JSON.stringify(otvaranje, null, 2));
  // END: Debug

  const cards = otvaranje.cards || otvaranje.karte || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#18161a" }}>
      <TarotHeader
        showBack
        showHome
        showProfile={false}
        showCoins={false}
        showLogo={false}
        onBack={() => navigation.goBack()}
        onHome={() => navigation.navigate("Home")}
      />

      <View style={styles.root}>
        <Text style={styles.title}>
          {getOtvaranjeNaziv(otvaranje.type, otvaranje.subtip, t)}
        </Text>

        <Text style={styles.date}>
          {formatDateLocal(otvaranje.created_at || otvaranje.vreme)}
        </Text>

        <Text style={styles.label}>
          {t("common:detail.question", { defaultValue: "Pitanje:" })}
        </Text>
        <Text style={styles.q}>{otvaranje.question}</Text>

        <Text style={styles.label}>
          {t("common:detail.answer", { defaultValue: "Odgovor:" })}
        </Text>
        <Text style={styles.a}>{otvaranje.answer}</Text>

        {cards && cards.length > 0 && (
          <>
            <Text style={styles.label}>
              {t("common:detail.drawnCards", { defaultValue: "Izvučene karte:" })}
            </Text>
            <View style={styles.cardsContainer}>
              {cards.map((card, idx) => (
                <View key={idx} style={styles.cardBox}>
                  <Image source={getCardImagePath(card.label)} style={styles.cardImg} />
                  <Text style={styles.cardLabel}>{card.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {!!otvaranje.subquestion && (
          <>
            <Text style={styles.label}>
              {t("common:detail.followup", { defaultValue: "Podpitanje:" })}
            </Text>
            <Text style={styles.q}>{otvaranje.subquestion}</Text>
            <Text style={styles.label}>
              {t("common:detail.followupAnswer", { defaultValue: "Odgovor na podpitanje:" })}
            </Text>
            <Text style={styles.a}>{otvaranje.subanswer}</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
};

// Helper za prikaz lepog (i18n) naziva otvaranja na osnovu tipa/subtipa
export function getOtvaranjeNaziv(type, subtip, t) {
  if (type === "klasicno") {
    if (subtip === "ljubavno")
      return t("common:detail.loveReading", { defaultValue: "Ljubavno čitanje" });
    if (
      subtip === "proslost-sadasnjost-buducnost" ||
      subtip === "proslost" ||
      subtip === "tri"
    )
      return t("common:classic.options.pastPresentFuture", {
        defaultValue: "Prošlost – Sadašnjost – Budućnost",
      });
    if (subtip === "putspoznaje" || subtip === "put" || subtip === "pet")
      return t("common:detail.pathOfInsightReading", { defaultValue: "Put spoznaje" });
    return t("common:detail.classic", { defaultValue: "Klasično otvaranje" });
  }
  if (type === "astrološko")
    return t("common:membership.features.astrologicalSpread", { defaultValue: "Astrološko otvaranje" });
  if (type === "keltski")
    return t("common:membership.features.celticCross", { defaultValue: "Keltski krst" });
  if (type === "drvo")
    return t("common:detail.kabbalisticTree", { defaultValue: "Kabalističko drvo života" });
  return t("common:labels.spread", { defaultValue: "Otvaranje" });
}

const styles = StyleSheet.create({
  root: { padding: 16 },
  title: { fontSize: 21, color: "#ffd700", fontWeight: "bold", marginBottom: 3, textAlign: "center" },
  date: { color: "#ccc", fontSize: 13, textAlign: "center", marginBottom: 16 },
  label: { color: "#ffd700", fontSize: 15, marginTop: 12, marginBottom: 2 },
  q: { color: "#fff", fontSize: 16, marginBottom: 4 },
  a: { color: "#fff", fontSize: 15, fontStyle: "italic", marginBottom: 4 },
  cardsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 },
  cardBox: { alignItems: "center", marginRight: 8, marginBottom: 8 },
  cardImg: { width: 50, height: 85, borderRadius: 7, marginBottom: 2, backgroundColor: "#222" },
  cardLabel: { color: "#fff", fontSize: 13, textAlign: "center", maxWidth: 70 },
});

export default DetaljOtvaranja;
