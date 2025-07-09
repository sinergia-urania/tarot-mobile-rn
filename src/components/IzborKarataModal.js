
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
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
import cardMeanings from '../locales/sr/cardMeanings.json'; // prilagodi putanju!
import extendedMeanings from '../locales/sr/extendedMeanings.json';
import { getKartaDanaSmart, upisiKartuDanaFirestore } from '../utils/kartaDana';


// START: Import SVG
import Svg, { Path } from "react-native-svg";
// END: Import SVG

const cardImages = {
  theFool: require('../assets/cards/the_fool.webp'),
  theMagician: require('../assets/cards/the_magician.webp'),
  theHighPriestess: require('../assets/cards/the_high_priestess.webp'),
  theEmpress: require('../assets/cards/the_empress.webp'),
  theEmperor: require('../assets/cards/the_emperor.webp'),
  theHierophant: require('../assets/cards/the_hierophant.webp'),
  theLovers: require('../assets/cards/the_lovers.webp'),
  theChariot: require('../assets/cards/the_chariot.webp'),
  strength: require('../assets/cards/strength.webp'),
  theHermit: require('../assets/cards/the_hermit.webp'),
  wheelOfFortune: require('../assets/cards/wheel_of_fortune.webp'),
  justice: require('../assets/cards/justice.webp'),
  theHangedMan: require('../assets/cards/the_hanged_man.webp'),
  death: require('../assets/cards/death.webp'),
  temperance: require('../assets/cards/temperance.webp'),
  theDevil: require('../assets/cards/the_devil.webp'),
  theTower: require('../assets/cards/the_tower.webp'),
  theStar: require('../assets/cards/the_star.webp'),
  theMoon: require('../assets/cards/the_moon.webp'),
  theSun: require('../assets/cards/the_sun.webp'),
  judgement: require('../assets/cards/judgement.webp'),
  theWorld: require('../assets/cards/the_world.webp'),
  aceOfWands: require('../assets/cards/ace_of_wands.webp'),
  twoOfWands: require('../assets/cards/two_of_wands.webp'),
  threeOfWands: require('../assets/cards/three_of_wands.webp'),
  fourOfWands: require('../assets/cards/four_of_wands.webp'),
  fiveOfWands: require('../assets/cards/five_of_wands.webp'),
  sixOfWands: require('../assets/cards/six_of_wands.webp'),
  sevenOfWands: require('../assets/cards/seven_of_wands.webp'),
  eightOfWands: require('../assets/cards/eight_of_wands.webp'),
  nineOfWands: require('../assets/cards/nine_of_wands.webp'),
  tenOfWands: require('../assets/cards/ten_of_wands.webp'),
  pageOfWands: require('../assets/cards/page_of_wands.webp'),
  knightOfWands: require('../assets/cards/knight_of_wands.webp'),
  queenOfWands: require('../assets/cards/queen_of_wands.webp'),
  kingOfWands: require('../assets/cards/king_of_wands.webp'),
  aceOfCups: require('../assets/cards/ace_of_cups.webp'),
  twoOfCups: require('../assets/cards/two_of_cups.webp'),
  threeOfCups: require('../assets/cards/three_of_cups.webp'),
  fourOfCups: require('../assets/cards/four_of_cups.webp'),
  fiveOfCups: require('../assets/cards/five_of_cups.webp'),
  sixOfCups: require('../assets/cards/six_of_cups.webp'),
  sevenOfCups: require('../assets/cards/seven_of_cups.webp'),
  eightOfCups: require('../assets/cards/eight_of_cups.webp'),
  nineOfCups: require('../assets/cards/nine_of_cups.webp'),
  tenOfCups: require('../assets/cards/ten_of_cups.webp'),
  pageOfCups: require('../assets/cards/page_of_cups.webp'),
  knightOfCups: require('../assets/cards/knight_of_cups.webp'),
  queenOfCups: require('../assets/cards/queen_of_cups.webp'),
  kingOfCups: require('../assets/cards/king_of_cups.webp'),
  aceOfSwords: require('../assets/cards/ace_of_swords.webp'),
  twoOfSwords: require('../assets/cards/two_of_swords.webp'),
  threeOfSwords: require('../assets/cards/three_of_swords.webp'),
  fourOfSwords: require('../assets/cards/four_of_swords.webp'),
  fiveOfSwords: require('../assets/cards/five_of_swords.webp'),
  sixOfSwords: require('../assets/cards/six_of_swords.webp'),
  sevenOfSwords: require('../assets/cards/seven_of_swords.webp'),
  eightOfSwords: require('../assets/cards/eight_of_swords.webp'),
  nineOfSwords: require('../assets/cards/nine_of_swords.webp'),
  tenOfSwords: require('../assets/cards/ten_of_swords.webp'),
  pageOfSwords: require('../assets/cards/page_of_swords.webp'),
  knightOfSwords: require('../assets/cards/knight_of_swords.webp'),
  queenOfSwords: require('../assets/cards/queen_of_swords.webp'),
  kingOfSwords: require('../assets/cards/king_of_swords.webp'),
  aceOfPentacles: require('../assets/cards/ace_of_pentacles.webp'),
  twoOfPentacles: require('../assets/cards/two_of_pentacles.webp'),
  threeOfPentacles: require('../assets/cards/three_of_pentacles.webp'),
  fourOfPentacles: require('../assets/cards/four_of_pentacles.webp'),
  fiveOfPentacles: require('../assets/cards/five_of_pentacles.webp'),
  sixOfPentacles: require('../assets/cards/six_of_pentacles.webp'),
  sevenOfPentacles: require('../assets/cards/seven_of_pentacles.webp'),
  eightOfPentacles: require('../assets/cards/eight_of_pentacles.webp'),
  nineOfPentacles: require('../assets/cards/nine_of_pentacles.webp'),
  tenOfPentacles: require('../assets/cards/ten_of_pentacles.webp'),
  pageOfPentacles: require('../assets/cards/page_of_pentacles.webp'),
  knightOfPentacles: require('../assets/cards/knight_of_pentacles.webp'),
  queenOfPentacles: require('../assets/cards/queen_of_pentacles.webp'),
  kingOfPentacles: require('../assets/cards/king_of_pentacles.webp'),
};

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
  allCardKeys = [],
}) => {
  if (!visible) return null;
  
  const navigation = useNavigation();
  const numPlaceholders = layoutTemplate.length || 1;
  const [availableCards, setAvailableCards] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const angleOffset = useRef(new Animated.Value(0)).current;
  const [currentAngle, setCurrentAngle] = useState(0);
  
  const [interactionDisabled, setInteractionDisabled] = useState(false);

  const [dimensions, setDimensions] = useState(Dimensions.get("window"));
  const [ukljuciObrnute, setUkljuciObrnute] = useState(tip === "dane");
  const [animatedKey, setAnimatedKey] = useState(null);
  const [instantAnswer, setInstantAnswer] = useState(null);
// START: State za kartu dana
  const [kartaDana, setKartaDana] = useState(null);
  const [alreadyNavigated, setAlreadyNavigated] = useState(false);
  const [loadingKarta, setLoadingKarta] = useState(false);
  const { user } = useAuth();
  const userId = user?.uid || null;

// END: State za kartu dana
  // START: Detekcija draga za tap/drag razliku
  const [dragActive, setDragActive] = useState(false);
  // END: Detekcija draga za tap/drag razliku

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
    // Shuffle karte na početku
    const shuffled = [...allCardKeys].sort(() => Math.random() - 0.5);
    setAvailableCards(shuffled.map((key) => ({ key, removed: false })));
  }, [allCardKeys]);
   
  useEffect(() => {
    if (tip === "karta-dana") {
       setLoadingKarta(true);
       const generisiKartu = () => {
        const shuffled = [...allCardKeys].sort(() => Math.random() - 0.5);
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

  // START: Nova ahimsa logika za "karta-dana" (AsyncStorage/Firebase friendly)
  const handleGoToAnswer = async () => {
    if (interactionDisabled) return;

    if (selectedCards.length < numPlaceholders) return;

    if (tip === "karta-dana") {
   const prvaKarta = selectedCards[0];
      const novaKarta = {
        ...prvaKarta,
        _izabranaDanas: true,
      };
      setKartaDana(novaKarta);
      setInteractionDisabled(true);
      setLoadingKarta(false);
      const danas = new Date().toISOString().split('T')[0];
      await upisiKartuDanaFirestore(userId, danas, novaKarta);
   return;
 }

   

   if (tip === "dane") {
     // Stara logika za Da/Ne ostaje
     const prvaKarta = selectedCards[0];
     navigation.navigate("DaNeOdgovor", {
       karta: {
         okrenuta: prvaKarta.reversed ? "obrnuto" : "uspravno",
         slika: cardImages[prvaKarta.label],
       },
     });
     return;
   }

   // Sve ostalo ide na AI tumača (pro)
   navigation.navigate("OdgovorAI", {
     karte: selectedCards,
     pitanje,
     tip,
     korisnikTip: "pro",
   });
 };
 // END: Nova ahimsa logika za "karta-dana" (AsyncStorage/Firebase friendly)

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
       pan.last = currentAngle;    // koristi currentAngle iz state-a
       setDragActive(true);
     },
     onPanResponderMove: (_, gestureState) => {
       angleOffset.setValue(pan.last + gestureState.dx / 15);
     },
     onPanResponderRelease: (_, gestureState) => {
       Animated.decay(angleOffset, {
         velocity: gestureState.vx * 8, // probaj 2 ili više za “mekši” osećaj
         deceleration: 0.991,           // probaj i 0.995, 0.996 za još duže okretanje
         useNativeDriver: false,
       }).start(() => {
         pan.last = currentAngle; // ažurira na kraju animacije!
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
            <Text style={styles.label}>Uključi obrnute karte</Text>
          </View>
        )}
        {/* START: Ahimsa prikaz za "karta-dana" */}
        {tip === "karta-dana" && loadingKarta && (
          <Text style={{ color: "#fff", margin: 24, fontSize: 16 }}>
            Učitavanje karte dana...
          </Text>
        )}

        {tip === "karta-dana" && !loadingKarta && kartaDana && kartaDana._izabranaDanas && (
          <View style={{ alignItems: 'center', margin: 24 }}>
            <Text style={{ color: "red", fontSize: 20, marginBottom: 5, fontWeight: 'bold' }}>
              Već si izabrao kartu dana!
            </Text>
            <Text style={{ color: "#ffd700", fontSize: 17, marginTop: 10, marginBottom: 26, }}>
              Vrati se sutra za novu kartu. 🌞
            </Text>
            <Image
              source={
                cardImages[kartaDana.label]
                  ? cardImages[kartaDana.label]
                  : cardImages["theFool"]
              }
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
        {/* kraj: Ahimsa prikaz za "karta-dana" */}
           {!(tip === "karta-dana" && kartaDana?._izabranaDanas) && (
            <>  
        

        
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
                  source={
                    cardImages[selectedCards[i]?.label]
                      ? cardImages[selectedCards[i]?.label]
                      : cardImages["theFool"]
                  }
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

        {instantAnswer && (
          <Text style={styles.instantAnswer}>Odgovor: {instantAnswer}</Text>
        )}

        {/* START: SVG strelice iznad lepeze */}
        <View style={{ width: dimensions.width, alignItems: 'center', position: "absolute",top: dimensions.height - circleHeight - 48,zIndex: 5,pointerEvents: "none", }}>
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
            { position: "absolute",
              top: dimensions.height - circleHeight - 270, // promeni brojku po potrebi
              width: dimensions.width,
              height: circleHeight,
             },



        
          ]}
         >
          {allCardKeys.map((cardKey, idx) => {
            const angleDeg =
              startAngle +
              (idx * fanAngle) / (total - 1 || 1) +
              currentAngle; 
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = centerX + radius * Math.cos(angleRad);
            const y = centerY + radius * Math.sin(angleRad);
            const rotate = angleDeg + 90;

            if (removedSet.has(cardKey)) {
              return null;
            }
            return (
              <Pressable
                key={cardKey}
                style={[
                  styles.singleCard,
                  {
                    left: x - 40,
                    top: y - 90,
                    zIndex: idx,
                    transform: [{ rotate: `${rotate}deg` }],
                  },
                ]}
                onPress={() => {
                  if (!dragActive) handleCardClick(cardKey);
                }}
              >
                <Image
                  source={require("../assets/cards/master_card.webp")}
                  style={styles.cardImage}
                  resizeMode="contain"
                />
              </Pressable>
            );
          })}
         </View>
             {/* --- Kraj lepeze --- */}
      
              
      
        {/* Dugme fiksirano na dnu */}
        {selectedCards.length === numPlaceholders &&  (
          <TouchableOpacity
            style={styles.answerBtn}
            onPress={handleGoToAnswer}
            activeOpacity={0.85}
          >
            <Text style={styles.answerBtnText}>Odgovor</Text>
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
    paddingBottom: 140, // više prostora za sticky dugme
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
    margin: 4,
    overflow: "hidden",
  },
  cardBig: { width: 80, height: 140 },
  cardFive: { width: 72, height: 112 },
  cardSmall: { width: 56, height: 88 },
  cardOne: {
  width: 138,   // možeš probati i 250 ili više, ako želiš još veće
  height: 222,  // ili 380, zavisi od tvog layout-a
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
