// src/screens/DetaljOtvaranja.js
import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import TarotHeader from "../components/TarotHeader";
import { formatDateLocal } from "../utils/formatDate";
import { getCardImagePath } from "../utils/getCardImagePath";
// i18n
import { useTranslation } from "react-i18next";
// START: SafeImage (expo-image) za iOS/WebP
import SafeImage from "../components/SafeImage";
// END: SafeImage

// START: lokalizacija karti – fallback JSON (sr)
import cardMeanings from "../locales/sr/cardMeanings.json";
// END: lokalizacija karti – fallback JSON (sr)

// START: sr fallback – ime karte iz key (za slučaj da i18n/json nisu dostupni)
const SR_MAJORS = {
  theFool: "Luda", theMagician: "Mag", theHighPriestess: "Sveštenica", theEmpress: "Carica",
  theEmperor: "Car", theHierophant: "Sveštenik", theLovers: "Ljubavnici", theChariot: "Kočija",
  strength: "Snaga", theHermit: "Pustinjak", wheelOfFortune: "Točak sreće", justice: "Pravda",
  theHangedMan: "Obešeni čovek", death: "Smrt", temperance: "Umerenost", theDevil: "Đavo",
  theTower: "Kula", theStar: "Zvezda", theMoon: "Mesec", theSun: "Sunce", judgement: "Sud", theWorld: "Svet"
};
function srCardNameFallback(key = "") {
  const k = String(key || "");
  if (SR_MAJORS[k]) return SR_MAJORS[k];
  const m = k.match(/^(ace|two|three|four|five|six|seven|eight|nine|ten|page|knight|queen|king)Of(Wands|Cups|Swords|Pentacles)$/i);
  if (m) {
    const rankMap = { ace: "As", two: "Dvojka", three: "Trojka", four: "Četvorka", five: "Petica", six: "Šestica", seven: "Sedmica", eight: "Osmica", nine: "Devetka", ten: "Desetka", page: "Paz", knight: "Vitez", queen: "Kraljica", king: "Kralj" };
    const suitMap = { Wands: "Štapova", Cups: "Pehara", Swords: "Mačeva", Pentacles: "Pentakla" };
    return `${rankMap[m[1].toLowerCase()]} ${suitMap[m[2]]}`;
  }
  return null;
}
// END: sr fallback – ime karte iz key

// START: helper za detekciju obrnutih karata (orientation)
const isCardReversed = (card) => {
  if (!card) return false;
  if (typeof card.reversed === 'boolean') return card.reversed;
  if (typeof card.isReversed === 'boolean') return card.isReversed;
  if (typeof card.obrnuto === 'boolean') return card.obrnuto;
  if (typeof card.upravno === 'boolean') return !card.upravno;
  if (typeof card.isUpright === 'boolean') return !card.isUpright;
  if (typeof card.orientation === 'string') return /revers|reverse|obrn/i.test(card.orientation);
  if (typeof card.polozaj === 'string') return /revers|obrn/i.test(card.polozaj);
  return false;
};
// END: helper za detekciju obrnutih karata

// START: normalizacija otvaranja (kanonska polja)
const normalizeOpening = (r = {}) => {
  const question =
    r.question ?? r.pitanje ?? r.query ?? null;

  const answer =
    r.answer ?? r.ai_answer ?? r.aiAnswer ?? r.response ?? r.result ?? r.odgovor ?? null;

  const subquestion =
    r.subquestion ?? r.podpitanje ?? r.followup ?? null;

  const subanswer =
    r.subanswer ?? r.followup_answer ?? r.followupAnswer ?? r.odgovor2 ?? null;

  const cards =
    r.cards ?? r.karte ?? r.drawn_cards ?? r.drawnCards ?? [];

  const type =
    r.type ?? r.tip ?? r.spread_type ?? null;

  const created_at =
    r.created_at ?? r.vreme ?? r.createdAt ?? null;

  const subtip =
    r.subtip ?? r.subtype ?? r.variant ?? r.kind ?? null;

  return { ...r, question, answer, subquestion, subanswer, cards, type, created_at, subtip };
};

const getCardLabel = (card = {}) =>
  card.label ?? card.key ?? card.name ?? card.id ?? "unknown";
// END: normalizacija

// START: lokalizacija karti – koristimo "key" kao kanonski
const getCardKey = (card = {}) =>
  card.key ?? card.label ?? card.name ?? card.id ?? "unknown";
// END: lokalizacija karti – koristimo "key" kao kanonski

const DetaljOtvaranja = () => {
  const navigation = useNavigation();
  const { params } = useRoute();
  // START: i18n namespace proširen (common + cardMeanings)
  const { t } = useTranslation(["common", "cardMeanings"]);
  // END: i18n namespace proširen (common + cardMeanings)

  const otvaranje = normalizeOpening(params?.otvaranje || {});

  // Debug (po želji ostavi/ukloni)
  // console.log(">>> DETALJ OTVARANJA (norm):", JSON.stringify(otvaranje, null, 2));

  const cards = Array.isArray(otvaranje.cards) ? otvaranje.cards : [];

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
          {formatDateLocal(otvaranje.created_at)}
        </Text>

        <Text style={styles.label}>
          {t("common:detail.question", { defaultValue: "Pitanje:" })}
        </Text>
        <Text style={styles.q}>{otvaranje.question}</Text>

        <Text style={styles.label}>
          {t("common:detail.answer", { defaultValue: "Odgovor:" })}
        </Text>
        <Text style={styles.a}>
          {otvaranje.answer || t("common:messages.noDescription", { defaultValue: "Nema opisa…" })}
        </Text>

        {cards.length > 0 && (
          <>
            <Text style={styles.label}>
              {t("common:detail.drawnCards", { defaultValue: "Izvučene karte:" })}
            </Text>
            <View style={styles.cardsContainer}>
              {cards.map((card, idx) => {
                const reversed = isCardReversed(card);
                const key = getCardKey(card);
                return (
                  <View key={`${key}-${idx}`} style={styles.cardBox}>
                    <SafeImage
                      source={getCardImagePath(key)}
                      style={[styles.cardImg, reversed && { transform: [{ rotate: "180deg" }] }]}
                      contentFit="contain"
                    />
                    <Text style={styles.cardLabel}>
                      {t(`cardMeanings:cards.${key}.name`, {
                        defaultValue:
                          cardMeanings?.cards?.[key]?.name ||
                          srCardNameFallback(key) ||
                          String(key),
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* FOLLOW-UP blok: prikaži i ako postoji samo subanswer (stari zapisi) */}
        {(!!otvaranje.subquestion || !!otvaranje.subanswer) && (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>
              {t("common:detail.followup", { defaultValue: "Podpitanje:" })}
            </Text>
            <Text style={styles.q}>{otvaranje.subquestion || "—"}</Text>
            <Text style={styles.label}>
              {t("common:detail.followupAnswer", { defaultValue: "Odgovor na podpitanje:" })}
            </Text>
            <Text style={styles.aFollowup}>
              {otvaranje.subanswer || t("common:messages.noDescription", { defaultValue: "Nema opisa…" })}
            </Text>
          </>
        )}
      </View>
    </ScrollView>
  );
};

// Helper za prikaz lepog (i18n) naziva otvaranja na osnovu tipa/subtipa
export function getOtvaranjeNaziv(type, subtip, t) {
  // START: robustna normalizacija tipa/subtipa
  const r = String(type || "").toLowerCase().trim();
  const s = String(subtip || "").toLowerCase().trim();
  const tokens = (r + " " + s).split(/[^a-zčćšđž0-9-]+/i).filter(Boolean);
  // direktni podtipovi ili klasicno+subtip
  if (["tri", "proslost", "proslost-sadasnjost-buducnost"].some(k => tokens.includes(k))) {
    return t("common:classic.options.pastPresentFuture", { defaultValue: "Prošlost – Sadašnjost – Budućnost" });
  }
  if (["ljubavno", "love"].some(k => tokens.includes(k))) {
    return t("common:detail.loveReading", { defaultValue: "Ljubavno čitanje" });
  }
  if (["pet", "put", "putspoznaje", "path", "path-of-insight"].some(k => tokens.includes(k))) {
    return t("common:detail.pathOfInsightReading", { defaultValue: "Put spoznaje" });
  }
  // END: robustna normalizacija tipa/subtipa

  if (r === "klasicno") {
    if (s === "ljubavno")
      return t("common:detail.loveReading", { defaultValue: "Ljubavno čitanje" });
    if (["proslost-sadasnjost-buducnost", "proslost", "tri"].includes(s))
      return t("common:classic.options.pastPresentFuture", {
        defaultValue: "Prošlost – Sadašnjost – Budućnost",
      });
    if (["putspoznaje", "put", "pet"].includes(s))
      return t("common:detail.pathOfInsightReading", { defaultValue: "Put spoznaje" });
    return t("common:detail.classic", { defaultValue: "Klasično otvaranje" });
  }
  if (r === "astrološko" || r === "astrolosko")
    return t("common:detail.astrologicalSpread", { defaultValue: "Astrološko otvaranje" });
  if (r === "keltski")
    return t("common:detail.celticCross", { defaultValue: "Keltski krst" });
  if (r === "drvo")
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
  // sivkast (muted) stil za follow-up odgovor — kako je "pre bilo"
  aFollowup: { color: "#c9c9c9", fontSize: 15, fontStyle: "italic", marginBottom: 4 },
  cardsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 8 },
  cardBox: { alignItems: "center", marginRight: 8, marginBottom: 8 },
  cardImg: { width: 50, height: 85, borderRadius: 7, marginBottom: 2, backgroundColor: "#222" },
  cardLabel: { color: "#fff", fontSize: 13, textAlign: "center", maxWidth: 70 },
});

export default DetaljOtvaranja;
