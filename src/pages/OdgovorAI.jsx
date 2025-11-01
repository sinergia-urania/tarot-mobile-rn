// src/page/OdgovorAI.jsx
// START: back → TarotOtvaranja import
import { CommonActions } from "@react-navigation/native";
// END: back → TarotOtvaranja import

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Button, Dimensions, Image, ImageBackground, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Toast from "react-native-toast-message";
import uuid from "react-native-uuid";
import i18n from '../../i18n';
import TarotHeader from "../components/TarotHeader";
import UnaSpinner from "../components/UnaSpinner";
import { READING_PRICES } from "../constants/readingPrices";
import { useAuth } from '../context/AuthProvider';
import { useDukati } from '../context/DukatiContext';
import { getAIAnswer } from "../utils/api/getAIAnswer";
import { getCardImagePath } from "../utils/getCardImagePath";
import getLayoutByTip from "../utils/getLayoutByTip";
// ⭐ Novi import: pametni tranziti
import { getTranzitiZaPeriodAdvanced } from '../utils/getTranzitiZaPeriod';

// START: Prosta heuristika detekcije jezika pitanja
function detectLangFromQuestion(q = "") {
  if (!q) return 'sr';
  if (/[čćšžđČĆŠŽĐ]/.test(q) || /[ЉЊЂЋЏА-Яа-я]/.test(q)) return 'sr';
  return 'non-sr';
}
// END: Prosta heuristika

// START: helper – detekcija da li je karta obrnuta (reversed)
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
// END: helper – detekcija da li je karta obrnuta (reversed)

// Helper – upis follow-up-a u poslednje otvaranje
async function upisiPodpitanjeUArhivu(subquestion, subanswer) {
  try {
    const raw = await AsyncStorage.getItem("arhiva_otvaranja");
    if (!raw) return;
    const arhiva = JSON.parse(raw);
    if (!arhiva.length) return;
    arhiva[0].subquestion = subquestion;
    arhiva[0].subanswer = subanswer;
    await AsyncStorage.setItem("arhiva_otvaranja", JSON.stringify(arhiva));
  } catch (e) {
    console.error("Ne mogu da upišem podpitanje u arhivu:", e);
  }
}

const unaAvatar = require("../assets/icons/una-avatar.webp");
const backgroundImg = require("../assets/icons/background-space.webp");

// Fallback liste (ostaju – i dalje koristimo i18n verzije kad su dostupne)
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
const POZICIJE_OTVARANJA = {
  tri: ["Prošlost", "Sadašnjost", "Budućnost"],
  dve: ["Ja", "On/Ona"],
  pet: [
    "Svesno",
    "Nesvesno",
    "Put kojim idem",
    "Šta ostavljam iza sebe",
    "Kuda vodi moja spoznaja"
  ]
};

const isNedovoljnoDukata = (s) => typeof s === "string" && /nedovoljno\s+dukata/i.test(s);

// ⭐ Preseti tranzita po tipu otvaranja
const TRANSIT_PRESETS = {
  // klasična čitanja (ljubavno / 3 / 5) — bez tranzita
  // bilo koji tip koji NIJE naveden ovde => null (bez tranzita)
  'keltski': {
    maxDays: 30,
    dayStep: 10,
    includeMoon: false, // po želji true ako baš želiš i Mesec
    roundDegreesTo: 1,
    slowPlanets: ['Jupiter', 'Saturn', 'Uran', 'Neptun', 'Pluton'],
    fastPlanets: ['Sunce', 'Merkur', 'Venera', 'Mars'],
    // START: format polje
    format: 'full',
    // END: format polje
  },
  // PRO i najskuplje → najbolje pokriće
  'astrološko': {
    maxDays: 30,
    dayStep: 3,
    includeMoon: true, // po želji true ako baš želiš i Mesec
    roundDegreesTo: 1,
    slowPlanets: ['Jupiter', 'Saturn', 'Uran', 'Neptun', 'Pluton'],
    fastPlanets: ['Sunce', 'Merkur', 'Venera', 'Mars'],
    // START: format polje
    format: 'full',
    // END: format polje
  },
  'drvo': {
    maxDays: 30,
    dayStep: 7,
    includeMoon: false, // po želji true ako baš želiš i Mesec
    roundDegreesTo: 1,
    slowPlanets: ['Jupiter', 'Saturn', 'Uran', 'Neptun', 'Pluton'],
    fastPlanets: ['Sunce', 'Merkur', 'Venera', 'Mars'],
    // START: format polje
    format: 'full',
    // END: format polje
  },
};
// START: helperi za tranzite na osnovu tipa
const uniq = (arr = []) => Array.from(new Set(arr));

function buildTransitTextForTip(tip, startISO, overrideFormat) {
  const preset = TRANSIT_PRESETS[tip];
  if (!preset) return ''; // klasična čitanja bez tranzita

  let fast = uniq([
    ...(preset.fastPlanets || []), ...(preset.includeMoon ? ['Mesec'] : []),
  ]);
  if (!preset.includeMoon) {
    fast = fast.filter(p => p !== 'Mesec');
  }

  const slow = uniq(preset.slowPlanets || ['Jupiter', 'Saturn', 'Uran', 'Neptun', 'Pluton']);

  return getTranzitiZaPeriodAdvanced(startISO, {
    brojDana: preset.maxDays ?? 30,
    dayStep: preset.dayStep ?? 3,
    includeMoon: !!preset.includeMoon,
    slowPlanets: slow,
    fastPlanets: fast,
    roundDegreesTo: preset.roundDegreesTo ?? 1,
    // START: simbolički format override + neutralan header
    format: overrideFormat || preset.format || 'full',
    headerLabel: (overrideFormat || preset.format) === 'symbol' ? '' : 'Spore planete (baza za period):',
    // END: simbolički format override + neutralan header
  });
}
// END: helperi za tranzite

const OdgovorAI = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { userPlan, userId, dukati, platiOtvaranje } = useDukati();
  const jezikAplikacije = i18n.language;
  const ime = undefined;
  const FOLLOWUP_PRICE = Number(READING_PRICES?.podpitanje ?? 60);

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
  // START: normalizacija – garantuj da AI dobija eksplicitno reversed: true/false
  const karteZaAI = (prikazaneKarte || []).map((c) => ({
    ...c,
    reversed: isCardReversed(c),
  }));
  // END: normalizacija – garantuj da AI dobija eksplicitno reversed: true/false
  // START: back → TarotOtvaranja (presretni hardverski Back)
  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (e.data.action?.type === "GO_BACK") {
        e.preventDefault();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "TarotOtvaranja" }],
          })
        );
      }
    });
    return sub;
  }, [navigation]);
  // END: back → TarotOtvaranja (presretni hardverski Back)

  const kontekstOtvaranja = opisOtvaranja ? `Tip otvaranja: ${opisOtvaranja}. ` : "";
  const layout = route.params?.layoutTemplate || getLayoutByTip(tip);

  const offsetX = tip === "keltski" ? -35 : 0;
  let cardSize = { width: 48, height: 80 };
  if ((subtip === "ljubavno" && layout.length === 2) || (subtip === "tri" && layout.length === 3)) {
    cardSize = { width: 120, height: 198 };
  } else if (subtip === "pet" && layout.length === 5) {
    cardSize = { width: 80, height: 145 };
  }

  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;
  const containerHeight = layout.length > 6 ? Math.max(600, windowHeight * 0.65) : 420;

  // State
  const [aiOdgovor, setAiOdgovor] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [podpitanje, setPodpitanje] = useState("");
  const [podpitanjeOdgovor, setPodpitanjeOdgovor] = useState("");
  const [loadingPodpitanje, setLoadingPodpitanje] = useState(false);
  const { profile, authLoading } = useAuth();

  // i18n (ai, cardMeanings, common)
  const { t } = useTranslation(['ai', 'cardMeanings', 'common']);
  // START: i18n kontekst otvaranja (novi, lokalizovan)
  const kontekstOtvaranjaI18n = opisOtvaranja
    ? t('ai:labels.spreadType', { value: opisOtvaranja, defaultValue: 'Tip otvaranja: {{value}}. ' })
    : '';
  // END: i18n kontekst otvaranja (novi, lokalizovan)

  // Astro profil norm
  const suncevZnak = profile?.znak && profile.znak !== "null" && profile.znak !== "" ? profile.znak : undefined;
  const podznak = profile?.podznak && profile.podznak !== "null" && profile.podznak !== "" ? profile.podznak : undefined;
  const datumrodjenja = profile?.datumrodjenja && profile.datumrodjenja !== "null" && profile.datumrodjenja !== "" ? profile.datumrodjenja : undefined;

  // i18n liste (sa fallback-om)
  const KUCE_ASTRO = t('ai:houses', { returnObjects: true }) || kuceAstro;
  const KELTSKE_I18N = t('ai:celticPositions', { returnObjects: true }) || keltskePozicije;
  const SEFIROTI_I18N = t('ai:sefirot', { returnObjects: true }) || sefiroti;
  // START: DEBUG i18n etikete
  if (__DEV__) {
    console.log('[AI][i18n-labels]', {
      appLang: jezikAplikacije,
      houses_len: KUCE_ASTRO?.length,
      celtic_len: KELTSKE_I18N?.length,
      sefirot_len: SEFIROTI_I18N?.length,
      samples: {
        house0: KUCE_ASTRO?.[0],
        celtic0: KELTSKE_I18N?.[0],
        sefirot0: SEFIROTI_I18N?.[0],
      }
    });
  }
  // END: DEBUG i18n etikete


  // Datum & tranziti (smart)
  const datumOtvaranja = new Date().toISOString().slice(0, 10);
  // START: biramo format prema jeziku pitanja
  const langQ = detectLangFromQuestion(pitanje);
  const tranzitiTekstRaw = buildTransitTextForTip(
    tip,
    datumOtvaranja,
    langQ === 'non-sr' ? 'symbol' : undefined
  );
  // END: biramo format prema jeziku pitanja
  const tranzitiTekst = tranzitiTekstRaw || undefined; // šalji u prompt samo ako postoji
  // START: DEBUG jezik i tranziti
  if (__DEV__) {
    console.log('[AI][lang/transits]', {
      questionLang: langQ,
      transitFormat: langQ === 'non-sr' ? 'symbol' : 'full',
      hasTransits: !!tranzitiTekst,
      transitsPreview: tranzitiTekst ? tranzitiTekst.split('\n').slice(0, 2) : []
    });
  }
  // END: DEBUG jezik i tranziti

  // Server-first: glavno otvaranje
  useEffect(() => {
    console.log('AI PROFILE DATA:', {
      znak: suncevZnak,
      podznak: podznak,
      datumrodjenja: datumrodjenja,
      display_name: profile?.display_name,
    });
    if (!aiOdgovor && pitanje && profile && !authLoading) {
      console.log('TRANZITI KOJI SE ŠALJU:', tranzitiTekst);
      // START: DEBUG payload main
      if (__DEV__) {
        console.log('[AI][payload.main]', {
          tip,
          subtip,
          userPlan,
          labels: {
            keltske: KELTSKE_I18N?.slice(0, 3),
            sefiroti: SEFIROTI_I18N?.slice(0, 3),
            kuce: KUCE_ASTRO?.slice(0, 3),
          },
          hasTransits: !!tranzitiTekst
        });
      }
      // END: DEBUG payload main

      getAIAnswer({
        userId,
        ime: profile?.display_name,              // ime (da Una oslovljava)
        gender: profile?.gender || "other",
        pitanje,
        tipOtvaranja: tip,
        subtip,
        userLevel: userPlan,
        jezikAplikacije,
        // START: AI – pošalji uvek normalizovane karte sa reversed
        karte: karteZaAI,
        // END: AI – pošalji uvek normalizovane karte sa reversed
        pozicije: POZICIJE_OTVARANJA[tip] || undefined,
        // START: prosledi i18n etikete za prompt (app jezik)
        keltskePozicije: KELTSKE_I18N,
        sefirotiLabels: SEFIROTI_I18N,
        kuceAstroLabels: KUCE_ASTRO,
        // END: prosledi i18n etikete za prompt (app jezik)
        znak: suncevZnak,
        podznak: podznak,
        datumrodjenja: datumrodjenja,
        datumOtvaranja,
        tranzitiTekst,                           // 👈 sad je “skraćen”
      })
        // START: robustniji prihvat i čuvanje sessionId
        .then(async (resp) => {
          const { odgovor } = resp || {};
          const sid =
            resp?.sessionId ??
            resp?.session_id ??
            resp?.id ??
            null;
          if (isNedovoljnoDukata(odgovor)) {
            Toast.show({
              type: "error",
              text1: t('common:errors.notEnoughCoinsTitle', { defaultValue: 'Nedovoljno dukata' }),
              text2: t('common:errors.notEnoughCoinsServerRejected', {
                defaultValue: 'Server je odbio naplatu. Dopuni dukate pa pokušaj ponovo.'
              }),
              position: "bottom",
            });

            navigation.goBack();
            return;
          }
          if (sid) {
            setSessionId(String(sid));
            try { await AsyncStorage.setItem('last_session_id', String(sid)); } catch { }
          } else if (__DEV__) {
            console.log('[AI][main] Nema sessionId u odgovoru (dev okruženje?)', resp);
          }
          setAiOdgovor(odgovor);
        })
        // END: robustniji prihvat i čuvanje sessionId
        .catch((err) => {
          console.log("AI ERROR:", err);
          Toast.show({
            type: "error",
            text1: t('common:errors.aiAnswerFailed', { defaultValue: 'Greška pri dobijanju AI odgovora' }),
            text2: err?.message ? String(err.message) : t('common:errors.tryAgain', { defaultValue: 'Pokušajte ponovo.' }),
            position: "bottom",
          });

          setAiOdgovor(
            t('common:errors.aiAnswerFailedDetailed', {
              defaultValue: 'Došlo je do greške prilikom dobijanja odgovora.{{extra}}',
              extra: err?.message ? ` ${String(err.message)}` : ''
            })
          );
        });
    }
  }, [pitanje, userPlan, prikazaneKarte, tip, profile, authLoading, tranzitiTekst]);

  const cenaOtvaranja = route.params?.cena || 0;

  // Lokalna arhiva (PRO)
  useEffect(() => {
    const sacuvajOtvaranje = async () => {
      if (!userPlan || userPlan !== "pro" || !aiOdgovor) return;
      const novoOtvaranje = {
        id: uuid.v4(),
        question: pitanje,
        answer: aiOdgovor,
        subquestion: podpitanje,
        subanswer: podpitanjeOdgovor,
        karte: prikazaneKarte,
        type: tip,
        vreme: Date.now(),
      };
      try {
        const raw = await AsyncStorage.getItem("arhiva_otvaranja");
        const arhiva = raw ? JSON.parse(raw) : [];
        const novaArhiva = [novoOtvaranje, ...arhiva].slice(0, 100);
        await AsyncStorage.setItem("arhiva_otvaranja", JSON.stringify(novaArhiva));
      } catch { }
    };
    sacuvajOtvaranje();
  }, [aiOdgovor, userPlan, pitanje, prikazaneKarte, tip]);

  // Follow-up (server naplata)
  const handlePodpitanje = async () => {
    try {
      setLoadingPodpitanje(true);
      // START: pokušaj da pribaviš sessionId iz state-a ili local storage-a (fallback)
      let sid = sessionId;
      if (!sid) { try { sid = await AsyncStorage.getItem('last_session_id'); } catch { } }
      if (!sid && __DEV__) {
        console.log('[AI][followup] DEV fallback: nastavljam bez sessionId (stateless follow-up).');
      }
      // END: pokušaj da pribaviš sessionId iz state-a ili local storage-a (fallback)

      // START: DEBUG followup context
      if (__DEV__) {
        console.log('[AI][payload.followup.prep]', {
          sessionId: sid || null,
          tip,
          subtip,
          labels: {
            keltske: KELTSKE_I18N?.slice(0, 3),
            sefiroti: SEFIROTI_I18N?.slice(0, 3),
            kuce: KUCE_ASTRO?.slice(0, 3),
          },
          prevAnswerLen: aiOdgovor?.length,
          followupText: podpitanje
        });
      }
      // END: DEBUG followup context

      const podpitanjeZnak = suncevZnak;
      const podpitanjePodznak = podznak;
      const podpitanjeDatum = datumrodjenja;
      // START: DEBUG followup payload call
      if (__DEV__) {
        console.log('[AI][payload.followup.calling]', { sessionId: sid || null, tip, subtip });
      }
      // END: DEBUG followup payload call

      const { odgovor } = await getAIAnswer({
        jePodpitanje: true,
        userId,
        podpitanjeMod: true,
        // START: prosledi sessionId samo ako postoji (u DEV-u sme i bez njega)
        ...(sid ? { sessionId: sid } : {}),
        // END: prosledi sessionId samo ako postoji
        tipOtvaranja: tip,
        subtip,
        // START: AI follow-up – takođe normalizovane karte
        karte: karteZaAI,
        // END: AI follow-up – takođe normalizovane karte
        pozicije: POZICIJE_OTVARANJA[tip] || undefined,
        // START: prosledi i18n etikete za prompt (app jezik)
        keltskePozicije: KELTSKE_I18N,
        sefirotiLabels: SEFIROTI_I18N,
        kuceAstroLabels: KUCE_ASTRO,
        // END: prosledi i18n etikete za prompt (app jezik)
        podpitanje,
        prethodniOdgovor: aiOdgovor,
        jezikAplikacije,
        znak: podpitanjeZnak,
        podznak: podpitanjePodznak,
        datumrodjenja: podpitanjeDatum,
        gender: profile?.gender || "other",
      });
      // START: DEBUG followup response
      if (__DEV__) {
        console.log('[AI][payload.followup.response]', {
          ok: !isNedovoljnoDukata(odgovor),
          answerPreview: String(odgovor || '').slice(0, 180)
        });
      }
      // END: DEBUG followup response

      if (isNedovoljnoDukata(odgovor)) {
        Toast.show({
          type: "error",
          text1: t('common:errors.notEnoughCoinsTitle', { defaultValue: 'Nedovoljno dukata' }),
          text2: t('common:errors.notEnoughCoinsFollowup', {
            defaultValue: 'Nemaš dovoljno dukata za AI podpitanje!'
          }),
          position: "bottom",
        });

        return;
      }
      setPodpitanjeOdgovor(odgovor);
      await upisiPodpitanjeUArhivu(podpitanje, odgovor);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: t('common:errors.aiFollowupFailed', { defaultValue: 'Greška pri dobijanju AI odgovora!' }),
        position: "bottom",
      });

    } finally {
      setLoadingPodpitanje(false);
    }
  };

  function isValidAIResponse(odgovor) {
    if (!odgovor) return false;
    const failPaterni = [
      "greška", "došlo je do greške", "nije moguće", "error", "ne mogu", "nije generisan"
    ];
    const odg = odgovor.trim().toLowerCase();
    return !failPaterni.some(fail => odg.includes(fail));
  }

  return (
    <ImageBackground
      source={backgroundImg}
      style={{ flex: 1, width: "100%", height: "100%" }}
      imageStyle={{ resizeMode: "cover" }}
    >
      <View style={styles.headerWrapper}>
        <TarotHeader
          showBack={false}
          onBack={() => navigation.goBack()}
          onHome={() => navigation.navigate("Home")}
          showMenu={false}
        />
      </View>

      {
        !aiOdgovor ? (
          <View style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000b"
          }}>
            <UnaSpinner size="large" color="#ffd700" />
            <Text style={{ color: "#ffd700", marginTop: 18, fontSize: 20 }}>
              {t('common:messages.waitingAI', { defaultValue: 'Čekam odgovor AI...' })}
            </Text>

          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.root}>
              <Image source={unaAvatar} style={styles.avatar} />
              {/* START: i18n "Pitanje:" */}
              <Text style={styles.pitanjeLabel}>
                {t('ai:labels.question', { defaultValue: 'Pitanje:' })}
              </Text>
              {/* END: i18n "Pitanje:" */}
              <Text style={styles.pitanje}>{pitanje || "Nema pitanja."}</Text>

              {/* Karte u layout-u */}
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
                  const isReversed = isCardReversed(card); // 👈 samo sliku kartice rotiramo ako je obrnuta
                  const zIndex = idx === 1 ? 20 : 10 + idx;
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
                          // START: vizuelna rotacija samo slike karte kad je obrnuta
                          style={{
                            width: "100%",
                            height: "100%",
                            resizeMode: "cover",
                            transform: isReversed ? [{ rotate: "180deg" }] : undefined,
                          }}
                        // END: vizuelna rotacija samo slike karte kad je obrnuta
                        />
                      ) : (
                        // START: i18n placeholder pozicije
                        <Text style={{ fontSize: 11, color: "#222" }}>
                          {t('ai:misc.cardPlaceholder', { index: idx + 1, defaultValue: 'Karta {{index}}' })}
                        </Text>
                        // END: i18n placeholder pozicije
                      )}
                    </View>
                  );
                })}
              </View>

              {/* AI odgovor + kontekst */}
              <View style={styles.odgovorBox}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8, justifyContent: "center" }}>
                  <Image source={unaAvatar} style={{ width: 44, height: 44, borderRadius: 24, marginRight: 8 }} />
                  <Text style={{ color: "#ffd700", fontSize: 18, fontWeight: "bold" }}>
                    {t('ai:titles.aiReply', { defaultValue: 'Una odgovara' })}:
                  </Text>
                </View>
                <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, marginBottom: 2 }}>
                  {/* START: i18n kontekst */}
                  {kontekstOtvaranjaI18n}
                  {/* END: i18n kontekst */}
                  {aiOdgovor || "Ovo je mesto gde će AI dati odgovor na osnovu odabranih karata."}
                </Text>

                {/* Astrološke kuće */}
                {tip === "astrološko" && (
                  <View style={{ marginTop: 20 }}>
                    {/* START: i18n naslov za kuće */}
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                      {t('ai:titles.astroHouses', { defaultValue: 'Tumačenje po astrološkim kućama:' })}
                    </Text>
                    {/* END: i18n naslov za kuće */}
                    {prikazaneKarte.map((card, index) => card ? (
                      <Text key={index} style={styles.listItem}>
                        <Text style={{ fontWeight: "bold" }}>{KUCE_ASTRO[index]}: </Text>
                        {t(`cardMeanings:cards.${card.label}.name`, { defaultValue: card?.label || `Karta #${card?.id}` })}
                      </Text>
                    ) : null)}
                  </View>
                )}

                {/* Sefiroti */}
                {tip === "drvo" && (
                  <View style={{ marginTop: 20 }}>
                    {/* START: i18n naslov za sefirote */}
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                      {t('ai:titles.sefirot', { defaultValue: 'Tumačenje po sefirotima:' })}
                    </Text>
                    {/* END: i18n naslov za sefirote */}
                    {prikazaneKarte.map((card, index) => card ? (
                      <Text key={index} style={styles.listItem}>
                        <Text style={{ fontWeight: "bold" }}>{index + 1}. {SEFIROTI_I18N[index]}: </Text>
                        {t(`cardMeanings:cards.${card.label}.name`, { defaultValue: card?.label || `Karta #${card?.id}` })}
                      </Text>
                    ) : null)}
                  </View>
                )}

                {/* Keltski krst */}
                {tip === "keltski" && (
                  <View style={{ marginTop: 20 }}>
                    {/* START: i18n naslov za Keltski krst */}
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: "#ffd700", marginBottom: 5 }}>
                      {t('ai:titles.celticInterpretation', { defaultValue: 'Tumačenje Keltskog krsta:' })}
                    </Text>
                    {/* END: i18n naslov za Keltski krst */}
                    {prikazaneKarte.map((card, index) => card ? (
                      <Text key={index} style={styles.listItem}>
                        <Text style={{ fontWeight: "bold" }}>{KELTSKE_I18N[index]}: </Text>
                        {t(`cardMeanings:cards.${card.label}.name`, { defaultValue: card?.label || `Karta #${card?.id}` })}
                      </Text>
                    ) : null)}
                  </View>
                )}

                {/* PRO follow-up */}
                {userPlan === "pro" && !podpitanjeOdgovor && aiOdgovor && (
                  <View style={{ marginTop: 22, backgroundColor: "#332", borderRadius: 12, padding: 12 }}>
                    <Text style={{ color: "#ffd700", fontWeight: "bold", marginBottom: 6 }}>
                      {t('ai:titles.followupPrompt', { defaultValue: 'Postavi dodatno podpitanje (PRO):' })}
                    </Text>
                    {/* START: prikaz samo vrednosti cene (ako je > 0) */}
                    {Number.isFinite(FOLLOWUP_PRICE) && FOLLOWUP_PRICE > 0 && (
                      <Text style={{ color: "#facc15", marginBottom: 6, fontWeight: "bold" }}>
                        {FOLLOWUP_PRICE} 🪙
                      </Text>
                    )}
                    {/* END: prikaz samo vrednosti cene */}
                    <TextInput
                      value={podpitanje}
                      onChangeText={setPodpitanje}
                      // START: i18n placeholder za podpitanje
                      placeholder={t('ai:placeholders.followup', { defaultValue: 'Unesi podpitanje...' })}
                      // END: i18n placeholder za podpitanje
                      placeholderTextColor="#999"
                      style={{
                        backgroundColor: "#fff2",
                        borderRadius: 8,
                        padding: 10,
                        color: "#fff",
                        marginBottom: 8,
                      }}
                      editable={!loadingPodpitanje}
                    />
                    <Button
                      title={loadingPodpitanje ? t('common:messages.loading') : t('common:buttons.askFollowUp')}
                      onPress={handlePodpitanje}
                      disabled={loadingPodpitanje || !podpitanje.trim()}
                      color="#ffd700"
                    />
                  </View>
                )}

                {/* Odgovor na PRO follow-up */}
                {podpitanjeOdgovor ? (
                  <View style={{ marginTop: 10, backgroundColor: "#221", borderRadius: 8, padding: 10 }}>
                    <Text style={{ color: "#fff", fontSize: 15, marginBottom: 3, fontWeight: "bold" }}>
                      {t('ai:misc.followupAnswer', { defaultValue: 'Odgovor na podpitanje:' })}
                    </Text>
                    <Text style={{ color: "#ffd700" }}>{podpitanjeOdgovor}</Text>
                    <Text style={{ color: "#fff", fontSize: 13, marginTop: 8, fontStyle: "italic" }}>
                      {t('ai:misc.oneFollowupNote', { defaultValue: 'Možete postaviti novo podpitanje tek pri sledećem otvaranju.' })}
                    </Text>
                  </View>
                ) : null}

                {/* Info za ne-PRO */}
                {userPlan !== "pro" && (
                  <View style={{ marginTop: 20, alignItems: "center" }}>
                    <Text style={{ color: "#ffd700", fontStyle: "italic" }}>
                      {t('ai:misc.proOnly', { defaultValue: 'Dodatna podpitanja dostupna su samo za Pro korisnike.' })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )
      }
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
