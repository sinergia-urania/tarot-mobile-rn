import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthProvider";
import cardMeanings from '../locales/sr/cardMeanings.json';
import extendedMeanings from '../locales/sr/extendedMeanings.json';
import { getKartaDanaSmart } from '../utils/kartaDana';

// START: Import SVG
import Svg, { Path } from "react-native-svg";
// END: Import SVG

// START: Import getCardImagePath helper
import { getCardImagePath } from '../utils/getCardImagePath';
// END: Import getCardImagePath helper

// START: Import naplata po subtipu
import { READING_PRICES } from "../constants/readingPrices";
// END: Import naplata po subtipu
import Toast from 'react-native-toast-message';
import { useDukati } from "../context/DukatiContext"; // DODATO

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

  // START: Guard za layoutTemplate
  if (!Array.isArray(layoutTemplate) || layoutTemplate.length === 0) {
    return (
      <View style={{flex:1,justifyContent:"center",alignItems:"center",backgroundColor:"#000"}}>
        <Text style={{color:"#ffd700",fontSize:20, textAlign: "center"}}>
          Greška: Nije prosleđen validan layoutTemplate!{"\n"}
          Vratite se i pokušajte ponovo.
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
  const [ukljuciObrnute, setUkljuciObrnute] = useState(tip !== "karta-dana");

  const [animatedKey, setAnimatedKey] = useState(null);
  const [instantAnswer, setInstantAnswer] = useState(null);

  // START: State za kartu dana
  const [kartaDana, setKartaDana] = useState(null);
  const [alreadyNavigated, setAlreadyNavigated] = useState(false);
  const [loadingKarta, setLoadingKarta] = useState(false);
  const { user } = useAuth();
  const userId = user?.id || null;
  // END: State za kartu dana


  // START: Detekcija draga za tap/drag razliku
  const [dragActive, setDragActive] = useState(false);
  // END: Detekcija draga za tap/drag razliku

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

  useEffect(() => {
    if (tip === "karta-dana") {
      setLoadingKarta(true);
      const generisiKartu = () => {
        const shuffled = shuffleDeck(allCardKeys);
        const key = shuffled[0];
        return { label: key, reversed: Math.random() < 0.5 };
      };
      getKartaDanaSmart(userId, generisiKartu).then((kartaDana) => {
        if (kartaDana) {
          setKartaDana(kartaDana);
          setInteractionDisabled(!!kartaDana._izabranaDanas);
        }
        setAlreadyNavigated(true);
        setLoadingKarta(false);
      });
    }
  }, [user, tip, allCardKeys]);

  const placeholderArray = Array.from({ length: numPlaceholders });
  const DVA_REDA_OTVARANJA = ["keltski", "astrološko", "drvo"];
  const trebaDvaReda = DVA_REDA_OTVARANJA.includes(tip);
  const MAX_PER_ROW = 6;
  const prviRed = placeholderArray.slice(0, MAX_PER_ROW);
  const drugiRed = placeholderArray.slice(MAX_PER_ROW);

  const handleCardClick = (cardKey) => {
    if (selectedCards.length >= numPlaceholders) return;
    const cardIndex = availableCards.findIndex((c) => c.key === cardKey);
    if (cardIndex === -1 || availableCards[cardIndex].removed) return;

    setAnimatedKey(cardKey);
    setTimeout(() => setAnimatedKey(null), 600);

    const isReversed = ukljuciObrnute && Math.random() < 0.5;
    const newAvailable = [...availableCards];
    newAvailable[cardIndex].removed = true;
    setAvailableCards(newAvailable);
    const novaKarta = { label: cardKey, reversed: isReversed };
    setSelectedCards((prev) => [...prev, novaKarta]);
  };

  /// --- GUARD za modal “nemaš dukata” ---
  const [showNoDukes, setShowNoDukes] = useState(false);
   const [loadingAnswer, setLoadingAnswer] = useState(false);
  const handleGoToAnswer = async () => {
  if (interactionDisabled) {
    console.log("Klik disabled!");
    return;
  }

  if (selectedCards.length < numPlaceholders) {
    console.log("Nedovoljno karata izabrano!");
    return;
  }
  // BESPLATNO - KARTA DANA
  if (tip === "karta-dana") {
    const prvaKarta = selectedCards[0];
    const novaKarta = {
      ...prvaKarta,
      _izabranaDanas: true,
    };
    setKartaDana(novaKarta);
    setInteractionDisabled(true);
    setLoadingKarta(false);
    return;
  }

  // BESPLATNO - DA/NE
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

  const cenaOtvaranja = READING_PRICES[subtip] || 0;
  if (dukati < cenaOtvaranja) {
    setShowNoDukes(true);
    return;
  }

  setLoadingAnswer(true); // <-- OVDE krece loading
  try {
    await platiOtvaranje({
      iznos: cenaOtvaranja,
      tip: subtip,
      is_archived: false,
    });

    navigation.navigate("OdgovorAI", {
      karte: selectedCards,
      pitanje,
      tip,
      subtip,
      cena: cenaOtvaranja,
      korisnikTip: "pro",
      layoutTemplate,
    });
  } catch (err) {
    Toast.show({
      type: "error",
      text1: "Greška pri naplati",
      text2: "Pokušaj ponovo ili kontaktiraj podršku.",
      position: "bottom",
      visibilityTime: 3000,
    });
    console.log("NAPLATA ERROR:", err);
  } finally {
    setLoadingAnswer(false); // <-- Loading se završava
  }
};


  const handleClose = () => {
    navigation.goBack();
  };

  // --- PanResponder za lepezu (fluidno pomeranje) ---
  const pan = useRef({ last: 0 }).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: () => {
        angleOffset.stopAnimation();
        pan.last = angleOffset.__getValue?.() ?? currentAngle;
        setDragActive(true);
      },
      onPanResponderMove: (_, gestureState) => {
        angleOffset.setValue(pan.last + gestureState.dx / 230);
      },
      onPanResponderRelease: (_, gestureState) => {
        const vx = isNaN(gestureState.vx) ? 0 : gestureState.vx;
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

    return (
    <View style={styles.modalBg}>
      {/* Dugme za zatvaranje */}
      <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>

      {/* START: Modal za nedovoljno dukata */}
      {showNoDukes && (
        <View style={{
          position: "absolute",
          top: 120,
          alignSelf: "center",
          backgroundColor: "#220",
          borderColor: "#ffd700",
          borderWidth: 2,
          borderRadius: 16,
          padding: 20,
          zIndex: 100
        }}>
          <Text style={{
            color: "#ffd700",
            fontWeight: "bold",
            fontSize: 18,
            textAlign: "center"
          }}>
            Nemaš dovoljno dukata za ovo otvaranje!
          </Text>
          <TouchableOpacity
            onPress={() => setShowNoDukes(false)}
            style={{
              marginTop: 18,
              alignSelf: "center",
              backgroundColor: "#ffd700",
              paddingHorizontal: 22,
              paddingVertical: 8,
              borderRadius: 8
            }}>
            <Text style={{
              color: "#222",
              fontWeight: "bold"
            }}>OK</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* END: Modal za nedovoljno dukata */}

      <ScrollView contentContainerStyle={styles.container}>
        {tip !== "dane" && tip !== "karta-dana" && (
          <View className="row">
            <TouchableOpacity
              style={[styles.checkbox, ukljuciObrnute && styles.checked]}
              onPress={() => setUkljuciObrnute((v) => !v)}
            >
              <Text style={styles.checkboxText}>
                {ukljuciObrnute ? "✔" : ""}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Uključi obrnute karte</Text>
          </View>
        )}

        {/* Karta dana - loading */}
        {tip === "karta-dana" && loadingKarta && (
          <Text style={{ color: "#fff", margin: 24, fontSize: 16 }}>
            Učitavanje karte dana...
          </Text>
        )}

        {/* Karta dana - već izabrana */}
        {tip === "karta-dana" && !loadingKarta && kartaDana && kartaDana._izabranaDanas && (
          <View style={{ alignItems: 'center', margin: 24 }}>
            <Text style={{ color: "red", fontSize: 20, marginBottom: 5, fontWeight: 'bold' }}>
              Već si izabrao kartu dana!
            </Text>
            <Text style={{ color: "#ffd700", fontSize: 17, marginTop: 10, marginBottom: 26, }}>
              Vrati se sutra za novu kartu. 🌞
            </Text>
            <Image
              source={getCardImagePath(kartaDana.label)}
              style={[
                styles.cardImage,
                kartaDana.reversed && { transform: [{ rotate: "180deg" }] },
                { width: 130, height: 200, marginBottom: 16 }
              ]}
              resizeMode="contain"
            />
            <Text style={{
              color: "#ffd700",
              fontSize: 26,
              fontWeight: "bold",
              marginTop: 10,
              textAlign: "center"
            }}>
              {cardMeanings.cards[kartaDana.label]?.name || kartaDana.label}
            </Text>
            <Text style={{ marginTop: 26, fontSize: 24, textAlign: 'center', color: "#fff" }}>
              {extendedMeanings[kartaDana.label]?.daily || 'Nema opisa za ovu kartu.'}
            </Text>
          </View>
        )}

        {!(tip === "karta-dana" && kartaDana?._izabranaDanas) && (
          <>
            {["keltski", "astrološko", "drvo"].includes(tip) ? (
              <View style={styles.selectedCardsGridWrapper}>
                <View style={styles.selectedCardsGrid}>
                  {placeholderArray.slice(0, 6).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.cardPlaceholder,
                        getCardSizeStyle(numPlaceholders),
                        { borderRadius: 4 },
                      ]}
                    >
                      {selectedCards[i] !== undefined && (
                        <Image
                          source={getCardImagePath(selectedCards[i]?.label)}
                          style={[
                            styles.cardImage,
                            selectedCards[i]?.reversed && {
                              transform: [{ rotate: "180deg" }],
                            },
                          ]}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                  ))}
                </View>
                {placeholderArray.length > 6 && (
                  <View style={styles.selectedCardsGrid}>
                    {placeholderArray.slice(6).map((_, i) => (
                      <View
                        key={i + 6}
                        style={[
                          styles.cardPlaceholder,
                          getCardSizeStyle(numPlaceholders),
                          { borderRadius: 4 },
                        ]}
                      >
                        {selectedCards[i + 6] !== undefined && (
                          <Image
                            source={getCardImagePath(selectedCards[i + 6]?.label)}
                            style={[
                              styles.cardImage,
                              selectedCards[i + 6]?.reversed && {
                                transform: [{ rotate: "180deg" }],
                              },
                            ]}
                            resizeMode="contain"
                          />
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.selectedCardsGrid}>
                {placeholderArray.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.cardPlaceholder,
                      getCardSizeStyle(numPlaceholders),
                      { borderRadius: 4 },
                    ]}
                  >
                    {selectedCards[i] !== undefined && (
                      <Image
                        source={getCardImagePath(selectedCards[i]?.label)}
                        style={[
                          styles.cardImage,
                          selectedCards[i]?.reversed && {
                            transform: [{ rotate: "180deg" }],
                          },
                        ]}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                ))}
              </View>
            )}

            {instantAnswer && (
              <Text style={styles.instantAnswer}>Odgovor: {instantAnswer}</Text>
            )}

            {/* START: SVG strelice iznad lepeze */}
            <View style={{
              width: dimensions.width,
              alignItems: 'center',
              position: "absolute",
              top: dimensions.height - 220 - 48,
              zIndex: 5,
              pointerEvents: "none",
            }}>
              <Svg width={dimensions.width * 0.75} height={64} viewBox="0 0 300 64">
                <Path
                  d="M20 24 Q150 -12 280 24"
                  stroke="#ffd700"
                  strokeWidth={5}
                  fill="none"
                  strokeLinecap="round"
                />
                <Path
                  d="M28 15 l-10 8 10 8"
                  stroke="#ffd700"
                  strokeWidth={5}
                  fill="none"
                  strokeLinejoin="round"
                />
                <Path
                  d="M272 15 l10 8 -10 8"
                  stroke="#ffd700"
                  strokeWidth={5}
                  fill="none"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            {/* END: SVG strelice iznad lepeze */}

            {/* --- Lepeza sa PanResponder-om za fluidni drag --- */}
            <View
              {...panResponder.panHandlers}
              style={[
                styles.cardsCircle,
                {
                  position: "absolute",
                  top: dimensions.height - 220 - 270,
                  width: dimensions.width,
                  height: 220,
                },
              ]}
            >
              {availableCards.map((card, idx) => {
                const cardKey = card.key;
                const angleDeg =
                  startAngle +
                  (idx * fanAngle) / ((availableCards.length - 1) || 1) +
                  currentAngle;
                const angleRad = (angleDeg * Math.PI) / 180;
                const x = centerX + radius * Math.cos(angleRad);
                const y = centerY + radius * Math.sin(angleRad);
                const rotate = angleDeg + 90;

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
                        <Image
                          source={getCardImagePath("master_card")}
                          style={styles.cardImage}
                          resizeMode="contain"
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
              <Text style={styles.answerBtnText}>Odgovor</Text>
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

export default IzborKarataModal;
