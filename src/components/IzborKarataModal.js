import { useNavigation } from "@react-navigation/native";
import { useAudioPlayer } from "expo-audio";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { READING_PRICES } from "../constants/readingPrices";
import { useAuth } from "../context/AuthProvider";
import { useDukati } from "../context/DukatiContext";
import cardMeanings from '../locales/sr/cardMeanings.json';
import extendedMeanings from '../locales/sr/extendedMeanings.json';
import { getCardImagePath } from '../utils/getCardImagePath';
import { getKartaDanaSmart } from '../utils/kartaDana';
import SafeImage from "./SafeImage";

// START: IzborKarataModal
const circleHeight = 220;
const centerYOffset = 120;

const getCardSizeStyle = (count) => {
  if (count === 1) return styles.cardOne;
  if (count === 5) return styles.cardFive;
  if (count >= 1 && count < 5) return styles.cardBig;
  return styles.cardSmall;
};

const IzborKarataModal = ({
  visible,
  onClose,
  layoutTemplate = [],
  pitanje = "",
  tip = "",
  subtip = "",           // <-- DODATO: sada možeš primati subtip kroz props
  shuffleId,
  allCardKeys = [],
}) => {

  // START: i18n init
  const { t } = useTranslation(['common', 'cardMeanings', 'extendedMeanings']);
  // END: i18n init

  // START: Guard za layoutTemplate
  if (!Array.isArray(layoutTemplate) || layoutTemplate.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#ffd700", fontSize: 20, textAlign: "center" }}>
          {/* START: i18n poruke greške */}
          {t('common:errors.invalidLayoutTemplate', { defaultValue: 'Greška: Nije prosleđen validan layoutTemplate!' })}{"\n"}
          {t('common:messages.tryAgainNav', { defaultValue: 'Vratite se i pokušajte ponovo.' })}
          {/* END: i18n poruke greške */}
        </Text>
      </View>
    );
  }
  // END: Guard za layoutTemplate
  const { dukati, platiOtvaranje } = useDukati();


  // ...ostatak tvoje logike
  if (!visible) return null;

  const navigation = useNavigation();
  const numPlaceholders = layoutTemplate.length || 1;
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const angleOffset = useRef(new Animated.Value(0)).current;
  const [currentAngle, setCurrentAngle] = useState(0);

  const [interactionDisabled, setInteractionDisabled] = useState(false);
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));


  // START: klasifikacija ekrana (telefon/tablet + podgrupe)
  const W = dimensions.width;
  const H = dimensions.height;

  const minSide = Math.min(W, H);
  const isTablet = minSide >= 600; // tablet: sw600dp+

  // telefoni po visini (portret)
  const phoneTier = H >= 820 ? "phoneLarge" : H >= 760 ? "phoneMedium" : "phoneSmall";

  // tableti po visini (portret)
  const tabletTier = H >= 1000 ? "tabLarge" : "tabSmall";

  // finalni tier
  const screenTier = isTablet ? tabletTier : phoneTier;
  // END: klasifikacija ekrana

  // START: fanBaseTop po tier-u
  const CARD_IN_FAN_HEIGHT = 140; // isto kao styles.singleCard.height

  const fanBaseTopByTier = {
    phoneSmall: 150,                                              // ~6.0" (umesto 80)
    phoneMedium: 230,                                             // ~6.5" (tvoj dobar broj)
    phoneLarge: 270 + 40 + Math.round(CARD_IN_FAN_HEIGHT / 3),    // ~6.7" (tvoja logika)
    tabSmall: 320,                                                // ~8.5–10.5"
    tabLarge: 360,                                                // ~10.5–14"
  };

  const fanBaseTop = fanBaseTopByTier[screenTier];
  // END: fanBaseTop po tier-u

  // START: CHEVRON_TOP po tier-u
  const chevronTopByTier = {
    phoneSmall: 150,   // ~6.0" (bezbedno iznad vrhova)
    phoneMedium: 200,  // ~6.5" (tvoj dobar broj)
    phoneLarge: 260,   // ~6.7" (tvoje podešavanje)
    tabSmall: 200,     // tabletovi su „viši“ pa držimo u sredini
    tabLarge: 210,
  };
  const CHEVRON_TOP = chevronTopByTier[screenTier];
  // END: CHEVRON_TOP po tier-u

  // START: CHEVRON_DISTANCE po tier-u
  const distCapByTier = {
    phoneSmall: 170,  // ~6.0"
    phoneMedium: 200, // ~6.5"
    phoneLarge: 260,  // ~6.7"
    tabSmall: 300,    // ~8.5–10.5"
    tabLarge: 360,    // ~10.5–14"
  };

  const distPctByTier = {
    phoneSmall: 0.28,
    phoneMedium: 0.32,
    phoneLarge: 0.34,
    tabSmall: 0.36,
    tabLarge: 0.38,
  };

  const CHEVRON_DISTANCE = Math.min(
    distCapByTier[screenTier],
    Math.round(W * distPctByTier[screenTier])
  );
  // END: CHEVRON_DISTANCE po tier-u


  const CHEVRON_TILT_DEG = 12;
  const CHEVRON_COLOR = "#ffd700";
  const SHOW_CHEVRON_HINT = true;
  // END: chevron hint — vrednosti po tier-u



  const [ukljuciObrnute, setUkljuciObrnute] = useState(tip !== "karta-dana");

  const [animatedKey, setAnimatedKey] = useState(null);
  const [instantAnswer, setInstantAnswer] = useState(null);
  // START: Chevron animacija
  const chevAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(chevAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(chevAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [chevAnim]);

  const leftShift = chevAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const rightShift = chevAnim.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });
  const chevOpacity = chevAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  // END: Chevron animacija

  // START: Audio player — jedna instanca (expo-audio)
  // ⚠️ Proveri relativnu putanju do zvuka u odnosu na ovu datoteku
  const clickSound = require("../assets/sounds/click-card.mp3");

  // hook upravlja lifecycle-om plejera
  const player = useAudioPlayer(clickSound);

  const playClick = useCallback(() => {
    try {
      // Za kratki „klik“: vrati na početak pa pusti
      player.seekTo(0);
      player.play();
    } catch (e) {
      if (__DEV__) console.log('[sound][play][err]', e?.message || e);
    }
  }, [player]);
  // END: Audio player — jedna instanca (expo-audio)

  // START: State za kartu dana
  const [kartaDana, setKartaDana] = useState(null);
  const [alreadyNavigated, setAlreadyNavigated] = useState(false);
  const [loadingKarta, setLoadingKarta] = useState(false);
  const { user } = useAuth();
  const userId = user?.id || null;
  // END: State za kartu dana
  // START: Dodaj state za "upravo izvučena karta dana"
  const [upravoIzvucena, setUpravoIzvucena] = useState(false);
  // END: Dodaj state za "upravo izvučena karta dana"


  // START: Detekcija draga za tap/drag razliku
  const [dragActive, setDragActive] = useState(false);
  // END: Detekcija draga za tap/drag razliku
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  function shuffleDeck(array) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  useEffect(() => {
    const id = angleOffset.addListener(({ value }) => setCurrentAngle(value));
    return () => angleOffset.removeListener(id);
  }, [angleOffset]);

  useEffect(() => {
    const updateDimensions = ({ window }) => setDimensions(window);
    const sub = Dimensions.addEventListener("change", updateDimensions);
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    const shuffled = shuffleDeck(allCardKeys);
    setAvailableCards(shuffled.map((key) => ({ key, removed: false })));
    setSelectedCards([]);
  }, [shuffleId]);

  // START: Resetuj "upravoIzvucena" kad se modal otvori
  useEffect(() => {
    if (visible) setUpravoIzvucena(false);
  }, [visible]);
  // END: Resetuj "upravoIzvucena" kad se modal otvori


  // START: Karta dana - uvek samo čita, nikad random ne generiše!
  useEffect(() => {
    if (tip === "karta-dana") {
      setLoadingKarta(true);
      getKartaDanaSmart(userId).then((kartaDana) => {
        if (kartaDana) {
          setKartaDana(kartaDana);
          setInteractionDisabled(!!kartaDana._izabranaDanas);
        }
        setAlreadyNavigated(true);
        setLoadingKarta(false);
      });
    }
  }, [user, tip, allCardKeys]);
  // END: Karta dana - uvek samo čita, nikad random ne generiše!


  const placeholderArray = Array.from({ length: numPlaceholders });
  const MAX_PER_ROW = 4;

  // indeksne grupe (npr. [0,1,2,3], [4,5,6,7], [8,9,10,11] za 12 karata)
  const rows = useMemo(() => {
    const total = numPlaceholders;
    const rowCount = Math.ceil(total / MAX_PER_ROW);
    return Array.from({ length: rowCount }, (_, r) => {
      const start = r * MAX_PER_ROW;
      const len = Math.min(MAX_PER_ROW, total - start);
      return Array.from({ length: len }, (_, i) => start + i);
    });
  }, [numPlaceholders]);
  // END: grid(4-per-row constants)

  const handleCardClick = (cardKey) => {
    if (selectedCards.length >= numPlaceholders) return;
    const cardIndex = availableCards.findIndex((c) => c.key === cardKey);
    if (cardIndex === -1 || availableCards[cardIndex].removed) return;

    // START: pusti klik zvuk
    void playClick();
    // END: pusti klik zvuk

    setAnimatedKey(cardKey);
    setTimeout(() => setAnimatedKey(null), 600);

    const isReversed = ukljuciObrnute && Math.random() < 0.5;
    const newAvailable = [...availableCards];
    newAvailable[cardIndex].removed = true;
    setAvailableCards(newAvailable);
    const novaKarta = { label: cardKey, reversed: isReversed };
    setSelectedCards((prev) => [...prev, ...[novaKarta]]);
  };

  // START: handleGoToAnswer – jedna funkcija, server-side naplata i uvek navigacija
  const handleGoToAnswer = async () => {
    if (interactionDisabled) {
      console.log("Klik disabled!");
      return;
    }

    if (selectedCards.length < numPlaceholders) {
      console.log("Nedovoljno karata izabrano!");
      return;
    }

    // KARTA DANA – setuj i završi
    if (tip === "karta-dana") {
      const prvaKarta = selectedCards[0];
      const novaKarta = { ...prvaKarta, _izabranaDanas: true };
      await getKartaDanaSmart(userId, () => novaKarta, { forceSave: true });
      setKartaDana(novaKarta);
      setInteractionDisabled(true);
      setLoadingKarta(false);
      setUpravoIzvucena(true);
      return;
    }

    // BESPLATNO – DA/NE
    if (tip === "dane") {
      const prvaKarta = selectedCards[0];
      navigation.navigate("DaNeOdgovor", {
        karta: {
          okrenuta: prvaKarta.reversed ? "obrnuto" : "uspravno",
          slika: getCardImagePath(prvaKarta.label),
        },
      });
      return;
    }

    // Plaćeni slučajevi – izračunaj cenu
    const priceKey = tip === "klasicno" ? subtip : tip;
    const cenaOtvaranja = READING_PRICES[priceKey] ?? 0;

    // Guard: nedovoljno dukata -> ne puštaj dalje
    if (cenaOtvaranja > 0 && dukati < cenaOtvaranja) {
      Alert.alert(
        // START: i18n alert
        t('common:errors.notEnoughCoinsTitle', { defaultValue: 'Nedovoljno dukata' }),
        t('common:errors.notEnoughCoinsMessage', {
          required: cenaOtvaranja,
          balance: dukati,
          defaultValue: 'Za ovo otvaranje treba {{required}} dukata, a imaš {{balance}}.'
        }),
        [
          { text: t('common:buttons.buyCoins', { defaultValue: 'Dodaj dukate' }), onPress: () => navigation.navigate("Membership") },
          { text: t('common:buttons.ok', { defaultValue: 'U redu' }) },
        ]
        // END: i18n alert
      );
      return;
    }

    setLoadingAnswer(true);
    try {
      navigation.navigate("OdgovorAI", {
        karte: selectedCards,
        pitanje,
        tip,
        subtip,
        cena: cenaOtvaranja,
        layoutTemplate,
      });
    } finally {
      setLoadingAnswer(false);
    }
  };
  // END: handleGoToAnswer – jedna funkcija, server-side naplata i uvek navigacija


  const handleClose = () => {
    navigation.goBack();
  };

  const pan = useRef({ last: 0 }).current;
  const rafRef = useRef(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        angleOffset.stopAnimation();
        pan.last = angleOffset.__getValue?.() ?? currentAngle;
        setDragActive(true);
      },
      onPanResponderMove: (_, g) => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
          angleOffset.setValue(pan.last + g.dx / 230);
          rafRef.current = null;
        });
      },
      onPanResponderRelease: (_, g) => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const vx = isNaN(g.vx) ? 0 : g.vx;
        Animated.decay(angleOffset, {
          velocity: vx * 0.3,
          deceleration: 0.992,
          useNativeDriver: false,
        }).start(() => {
          pan.last = angleOffset.__getValue?.() ?? currentAngle;
          setDragActive(false);
        });
      },
    })
  ).current;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
  // END: perf(rAF throttle) — PanResponder sa rAF + cleanup

  // --- centar lepeze ---
  const total = allCardKeys.length;
  const fanAngle = 360;
  const radius = 440;
  const centerX = dimensions.width / 2;
  const centerY = dimensions.height - 20;
  const startAngle = -fanAngle / 2;
  const removedSet = new Set(
    availableCards.filter((c) => c.removed).map((c) => c.key)
  );

  // START: perf(memo pozicije + trig)
  const basePositions = useMemo(() => {
    const totalInFan = Math.max(availableCards.length - 1, 1);
    return availableCards.map((_, idx) => {
      const baseDeg = startAngle + (idx * fanAngle) / totalInFan;
      const baseRad = (baseDeg * Math.PI) / 180;
      return {
        baseDeg,
        sinBase: Math.sin(baseRad),
        cosBase: Math.cos(baseRad),
      };
    });
  }, [availableCards.length, startAngle, fanAngle]);

  const currentAngleRad = (currentAngle * Math.PI) / 180;
  const sinCA = Math.sin(currentAngleRad);
  const cosCA = Math.cos(currentAngleRad);

  return (
    <View style={styles.modalBg}>
      {/* Dugme za zatvaranje */}
      <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.container}>
        {tip !== "dane" && tip !== "karta-dana" && (
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.checkbox, ukljuciObrnute && styles.checked]}
              onPress={() => setUkljuciObrnute((v) => !v)}
            >
              <Text style={styles.checkboxText}>
                {ukljuciObrnute ? "✔" : ""}
              </Text>
            </TouchableOpacity>
            {/* START: i18n opcija obrnute karte */}
            <Text style={styles.label}>
              {t('common:options.includeReversed', { defaultValue: 'Uključi obrnute karte' })}
            </Text>
            {/* END: i18n opcija obrnute karte */}
          </View>
        )}

        {/* Karta dana - loading */}
        {tip === "karta-dana" && loadingKarta && (
          <Text style={{ color: "#fff", margin: 24, fontSize: 16 }}>
            {/* START: i18n loading */}
            {t('common:messages.loadingDailyCard', { defaultValue: 'Učitavanje karte dana...' })}
            {/* END: i18n loading */}
          </Text>
        )}

        {/* START: Prikaz karte dana sa uslovom za crveni tekst */}
        {tip === "karta-dana" && !loadingKarta && kartaDana && kartaDana._izabranaDanas && (
          <View style={{ alignItems: 'center', margin: 24 }}>
            {!upravoIzvucena && (
              <Text style={{ color: "red", fontSize: 20, marginBottom: 5, fontWeight: 'bold' }}>
                {t('common:dailyCard.alreadyPicked', { defaultValue: 'Već si izabrao kartu dana!' })}
              </Text>
            )}
            <Text style={{ color: "#ffd700", fontSize: 17, marginTop: 10, marginBottom: 26, }}>
              {t('common:dailyCard.comeBackTomorrow', { defaultValue: 'Vrati se sutra za novu kartu. 🌞' })}
            </Text>
            <SafeImage
              source={getCardImagePath(kartaDana.label)}
              style={[
                styles.cardImage,
                kartaDana.reversed && { transform: [{ rotate: "180deg" }] },
                { width: 130, height: 200, marginBottom: 16 }
              ]}
              contentFit="contain"
            />
            <Text style={{
              color: "#ffd700",
              fontSize: 26,
              fontWeight: "bold",
              marginTop: 10,
              textAlign: "center"
            }}>
              {/* START: i18n ime karte sa fallback-om */}
              {t(`cardMeanings:cards.${kartaDana.label}.name`, {
                defaultValue: (cardMeanings.cards[kartaDana.label]?.name) || kartaDana.label
              })}
              {/* END: i18n ime karte */}
            </Text>
            <Text style={{ marginTop: 26, fontSize: 24, textAlign: 'center', color: "#fff" }}>
              {/* START: i18n daily opis sa fallback-om */}
              {t(`extendedMeanings:${kartaDana.label}.daily`, {
                defaultValue: extendedMeanings[kartaDana.label]?.daily || t('common:messages.noDescription', { defaultValue: 'Nema opisa za ovu kartu.' })
              })}
              {/* END: i18n daily opis */}
            </Text>
          </View>
        )}
        {/* END: Prikaz karte dana sa uslovom za crveni tekst */}

        {!(tip === "karta-dana" && kartaDana?._izabranaDanas) && (
          <>

            <View style={styles.selectedCardsGridWrapper}>
              {rows.map((row, rIdx) => (
                <View key={rIdx} style={styles.selectedCardsGrid}>
                  {row.map((globalIdx) => (
                    <View
                      key={globalIdx}
                      style={[
                        styles.cardPlaceholder,
                        getCardSizeStyle(numPlaceholders),
                        { borderRadius: 4 },
                      ]}
                    >
                      {selectedCards[globalIdx] !== undefined && (
                        <SafeImage
                          source={getCardImagePath(selectedCards[globalIdx]?.label)}
                          style={[
                            styles.cardImage,
                            selectedCards[globalIdx]?.reversed && {
                              transform: [{ rotate: "180deg" }],
                            },
                          ]}
                          contentFit="contain"
                        />
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
            {/* END: grid(4-per-row render) */}

            {instantAnswer && (
              <Text style={styles.instantAnswer}>
                {/* START: i18n oznaka odgovora */}
                {t('common:labels.answer', { defaultValue: 'Odgovor' })}: {instantAnswer}
                {/* END: i18n oznaka odgovora */}
              </Text>
            )}

            {/* START: (ISKLJUČENO) — stari luk ostavljen radi istorije */}
            {false && (
              <View style={{
                position: "absolute",
                top: dimensions.height - 220 - fanBaseTop,
                width: dimensions.width,
                height: 220,
                zIndex: 5,
                pointerEvents: "none",
              }}>
                <Svg width={dimensions.width} height={220}>

                </Svg>
              </View>
            )}
            {/* END: (ISKLJUČENO) — stari luk */}

            {/* START: Chevron hint — kompaktan i žut */}
            {SHOW_CHEVRON_HINT && (
              <View style={{
                position: "absolute",
                top: dimensions.height - 220 - fanBaseTop,
                width: dimensions.width,
                height: 220,
                zIndex: 6,
                pointerEvents: "none",
              }}>
                {/* Levi chevron */}
                <Animated.View style={{
                  position: "absolute",
                  top: CHEVRON_TOP,
                  left: (dimensions.width / 2) - CHEVRON_DISTANCE - 24,
                  opacity: chevOpacity,
                  transform: [{ translateX: leftShift }, { rotate: `-${CHEVRON_TILT_DEG}deg` }],
                }}>
                  <Svg width={48} height={48} viewBox="0 0 48 48">
                    <Path d="M30 8 L14 24 L30 40" stroke={CHEVRON_COLOR} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M18 8 L2 24 L18 40" stroke={CHEVRON_COLOR} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Animated.View>
                {/* Desni chevron */}
                <Animated.View style={{
                  position: "absolute",
                  top: CHEVRON_TOP,
                  left: (dimensions.width / 2) + CHEVRON_DISTANCE - 24,
                  opacity: Animated.add(chevOpacity, 0),
                  transform: [{ translateX: rightShift }, { rotate: `${CHEVRON_TILT_DEG}deg` }],
                }}>
                  <Svg width={48} height={48} viewBox="0 0 48 48">
                    <Path d="M18 8 L34 24 L18 40" stroke={CHEVRON_COLOR} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d="M 6 8 L22 24 L 6 40" stroke={CHEVRON_COLOR} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </Animated.View>
              </View>
            )}
            {/* END: Chevron hint */}

            {/* --- Lepeza sa PanResponder-om za fluidni drag --- */}
            <View
              {...panResponder.panHandlers}
              style={[
                styles.cardsCircle,
                {
                  position: "absolute",
                  top: dimensions.height - 220 - fanBaseTop,
                  width: dimensions.width,
                  height: 220,
                },
              ]}
            >
              {availableCards.map((card, idx) => {
                const cardKey = card.key;

                // START: perf(render) — koristi memo pozicije + rotacione formule
                const bp = basePositions[idx];
                const baseDeg =
                  bp?.baseDeg ?? (startAngle + (idx * fanAngle) / Math.max(availableCards.length - 1, 1));
                const angleDeg = baseDeg + currentAngle;

                const cb = bp?.cosBase ?? Math.cos((baseDeg * Math.PI) / 180);
                const sb = bp?.sinBase ?? Math.sin((baseDeg * Math.PI) / 180);
                const cosAngle = cb * cosCA - sb * sinCA;
                const sinAngle = sb * cosCA + cb * sinCA;

                const x = centerX + radius * cosAngle;
                const y = centerY + radius * sinAngle;
                const rotate = angleDeg + 90;
                // END: perf(render)

                return (
                  <View
                    key={cardKey}
                    style={[
                      styles.singleCard,
                      {
                        left: x - 40,
                        top: y - 90,
                        zIndex: idx,
                        transform: [{ rotate: `${rotate}deg` }],
                        position: 'absolute',
                      },
                    ]}
                  >
                    {!card.removed ? (
                      <Pressable
                        style={{ width: '100%', height: '100%' }}
                        onPress={() => {
                          if (!dragActive) handleCardClick(cardKey);
                        }}
                      >
                        <SafeImage
                          source={getCardImagePath("master_card")}
                          style={styles.cardImage}
                          contentFit="contain"
                        />
                      </Pressable>
                    ) : (
                      <View style={{ width: '100%', height: '100%' }} />
                    )}
                  </View>
                );
              })}
            </View>
            {/* --- Kraj lepeze --- */}

            {/* Dugme fiksirano na dnu */}
            {selectedCards.length === numPlaceholders && (
              <TouchableOpacity
                style={[
                  styles.answerBtn,
                  loadingAnswer && { opacity: 0.6 }
                ]}
                onPress={handleGoToAnswer}
                activeOpacity={0.85}
                disabled={loadingAnswer}
              >
                {loadingAnswer ? (
                  <ActivityIndicator color="#222" size="small" />
                ) : (
                  <Text style={styles.answerBtnText}>
                    {t('common:buttons.answer', { defaultValue: 'Odgovor' })}
                  </Text>
                )}
              </TouchableOpacity>
            )}

          </>
        )}
      </ScrollView>
    </View>
  );
};

// END: IzborKarataModal

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeBtn: {
    position: "absolute",
    top: 40,
    right: 28,
    zIndex: 20,
    backgroundColor: "#2226",
    borderRadius: 24,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
  },
  container: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 140,
    minHeight: "100%",
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#fff",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: "#ffd700" },
  checkboxText: { color: "#222", fontWeight: "bold" },
  label: { color: "#fff", fontSize: 16 },
  selectedCardsGrid: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
    minHeight: 100,
  },
  // START: grid(4-per-row styles) — wrapper za više redova
  /* ORIGINAL: (nema selectedCardsGridWrapper) */
  selectedCardsGridWrapper: {
    width: "100%",
    paddingHorizontal: 12,
    alignItems: "center",
  },
  // END: grid(4-per-row styles)
  cardPlaceholder: {
    backgroundColor: "#222",
    borderColor: "#ffd700",
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    margin: 1,
    overflow: "hidden",
  },
  cardBig: { width: 80, height: 140 },
  cardFive: { width: 72, height: 112 },
  cardSmall: { width: 56, height: 88 },
  cardOne: {
    width: 138,
    height: 222,
    margin: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardImage: { width: "100%", height: "100%" },
  cardsCircle: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  singleCard: {
    position: "absolute",
    width: 80,
    height: 140,
    borderRadius: 12,
    backgroundColor: "#111",
    borderColor: "#ffd700",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  animatedCard: {
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 10,
    transform: [{ scale: 1.1 }],
  },
  instantAnswer: {
    color: "#ffd700",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
  },
  answerBtn: {
    backgroundColor: "#ffd700",
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 30,
    position: "absolute",
    bottom: 36,
    alignSelf: "center",
    shadowColor: "#222",
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 7,
    zIndex: 99,
  },
  answerBtnText: { color: "#222", fontWeight: "bold", fontSize: 18 },

});

// START: Helperi za geometriju luka (ostavljeni iako luk ne prikazujemo)
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
  // sweepFlag=1 za smer kazaljke na satu
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}
// END: Helperi za geometriju luka

export default IzborKarataModal;
