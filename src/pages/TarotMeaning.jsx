import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SidebarMenu from '../components/SidebarMenu'; // DODATO!
import TarotHeader from '../components/TarotHeader';
import CardGroupList from './CardGroupList';
import VelikaArkanaList from './VelikaArkanaList';
// START: Importi za must-watch reklame i toast
import Toast from "react-native-toast-message";
import { useDukati } from "../context/DukatiContext";
// START: Zamena stare logike za rewarded ad modernom logikom
import { createRewardedAdInstance, RewardedAdEventType, showInterstitialAd } from "../utils/ads";
// END: Zamena stare logike za rewarded ad modernom logikom
// END: Importi za must-watch reklame i toast

const groupMap = {
  velika: { label: 'Velika Arkana', icon: require('../assets/icons/major.webp') },
  stapovi: { label: 'Štapovi', icon: require('../assets/icons/wands.webp') },
  pehari: { label: 'Pehari', icon: require('../assets/icons/cups.webp') },
  macevi: { label: 'Mačevi', icon: require('../assets/icons/swords.webp') },
  zlatnici: { label: 'Zlatnici', icon: require('../assets/icons/pentacles.webp') },
};

const wandKeys = [ 'aceOfWands', 'twoOfWands', 'threeOfWands', 'fourOfWands', 'fiveOfWands',
  'sixOfWands', 'sevenOfWands', 'eightOfWands', 'nineOfWands', 'tenOfWands',
  'pageOfWands', 'knightOfWands', 'queenOfWands', 'kingOfWands'
 ];
const cupKeys = [ 'aceOfCups', 'twoOfCups', 'threeOfCups', 'fourOfCups', 'fiveOfCups',
  'sixOfCups', 'sevenOfCups', 'eightOfCups', 'nineOfCups', 'tenOfCups',
  'pageOfCups', 'knightOfCups', 'queenOfCups', 'kingOfCups'
];
const swordKeys = [ 
  'aceOfSwords', 'twoOfSwords', 'threeOfSwords', 'fourOfSwords', 'fiveOfSwords',
  'sixOfSwords', 'sevenOfSwords', 'eightOfSwords', 'nineOfSwords', 'tenOfSwords',
  'pageOfSwords', 'knightOfSwords', 'queenOfSwords', 'kingOfSwords'
 ];
const pentacleKeys = [ 
  'aceOfPentacles', 'twoOfPentacles', 'threeOfPentacles', 'fourOfPentacles', 'fiveOfPentacles',
  'sixOfPentacles', 'sevenOfPentacles', 'eightOfPentacles', 'nineOfPentacles', 'tenOfPentacles',
  'pageOfPentacles', 'knightOfPentacles', 'queenOfPentacles', 'kingOfPentacles'
];

// START: Zamena stare logike za rewarded ad modernom logikom
const prikaziRewardedReklamu = async () => {
  return new Promise((resolve, reject) => {
    const rewarded = createRewardedAdInstance();

    const earnedListener = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      async (reward) => {
        if (reward && reward.amount) {
          try {
            await dodeliDukatePrekoBackenda(reward.amount);
          } catch (err) {
            // Baci toast ili error, po želji
          }
        }
        resolve();
      }
    );

    const loadedListener = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewarded.show();
      }
    );

    const errorListener = rewarded.addAdEventListener(
      RewardedAdEventType.ERROR,
      (err) => {
        Toast.show({
          type: "error",
          text1: "Greška sa reklamom!",
          text2: err.message,
          position: "bottom",
        });
        earnedListener();
        loadedListener();
        errorListener();
        reject(err);
      }
    );

    const closedListener = rewarded.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        earnedListener();
        loadedListener();
        errorListener();
        closedListener();
        resolve();
      }
    );

    rewarded.load();
  });
};
// END: Zamena stare logike za rewarded ad modernom logikom

const TarotMeaning = () => {
  const [selectedGroup, setSelectedGroup] = useState('velika');
  const [sidebarOpen, setSidebarOpen] = useState(false); // DODATO!
  const navigation = useNavigation();
  const route = useRoute();
  // START: State i handler za must-watch reklame
  const [cardViewCount, setCardViewCount] = useState(0);
  const [offerShown, setOfferShown] = useState(false);
  const { dukati: contextDukati, userPlan, dodeliDukatePrekoBackenda, loading } = useDukati();

  const handleCardView = async () => {
  let next;
  setCardViewCount(prev => {
    next = prev + 1;
    return next;
  });

  // Sada koristiš next asinhrono
  if (userPlan === "guest" && next % 3 === 0) {
    showInterstitialAd();
  } else if (userPlan === "free") {
    if (next === 4 && !offerShown) {
      Toast.show({
        type: 'info',
        text1: 'Dukati za reklamu',
        text2: 'Pogledaj reklamu i osvoji dukate!',
        position: 'bottom',
        autoHide: true,
        visibilityTime: 8000,
        onPress: async () => {
          await prikaziRewardedReklamu();
          setOfferShown(true);
          Toast.hide();
        },
        onHide: () => setOfferShown(true)
      });
    }
    if (next === 6 && offerShown) {
      await prikaziRewardedReklamu();
      if (userPlan === "free" && next % 5 === 0) {
        showInterstitialAd();
      }
    }
  }
};

  // END: State i handler za must-watch reklame

  const generateCardList = (keys) =>
    keys.map((key) => ({
      key,
      name: key,
    }));

  const renderGroup = () => {
    switch (selectedGroup) {
      case 'velika':
        return <VelikaArkanaList onCardView={handleCardView} />;
      case 'stapovi':
        return <CardGroupList cards={generateCardList(wandKeys)} onCardView={handleCardView} />;
      case 'pehari':
        return <CardGroupList cards={generateCardList(cupKeys)} onCardView={handleCardView} />;
      case 'macevi':
        return <CardGroupList cards={generateCardList(swordKeys)} onCardView={handleCardView} />;
      case 'zlatnici':
        return <CardGroupList cards={generateCardList(pentacleKeys)} onCardView={handleCardView} />;
      default:
        return (
          <Text style={styles.notImplemented}>
            Još nije implementirano: {groupMap[selectedGroup].label}
          </Text>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      {/* Header fiksiran na vrhu */}
      <TarotHeader swapTreasureMenu
        showBack={false}
        onBack={() => navigation.goBack()}
        onHome={() => navigation.navigate('Home')}
        onMenu={() => setSidebarOpen(true)} // ISPRAVLJENO!
      />

      {/* Ikonice grupe odmah ispod zaglavlja */}
      <View style={styles.iconBarWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.navBarContent}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(groupMap).map(([key, { icon }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedGroup(key)}
              style={[
                styles.iconButton,
                selectedGroup === key && styles.iconButtonSelected
              ]}
              activeOpacity={0.7}
            >
              <Image source={icon} style={styles.iconImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Naziv grupe */}
      <Text style={styles.groupTitle}>
        {groupMap[selectedGroup].label}
      </Text>

      {/* Sadržaj (grid sa kartama) */}
      <View style={{ flex: 1 }}>
        {renderGroup()}
      </View>

      {/* SIDEBAR MENU je ovde, kao na TarotHome! */}
      <SidebarMenu visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconBarWrapper: {
    backgroundColor: '#181818',
    borderBottomColor: '#c9ad6a',
    borderBottomWidth: 1,
    minHeight: 54,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
  },
  navBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 54,
  },
  iconButton: {
    marginHorizontal: 5,
    opacity: 0.5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 1,
    backgroundColor: 'transparent',
  },
  iconButtonSelected: {
    opacity: 1,
    borderColor: '#c9ad6a',
    backgroundColor: '#2c2206',
  },
  iconImg: {
    width: 60,
    height: 60,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d8b33c',
    backgroundColor: '#fffbe7',
  },
  groupTitle: {
    color: '#fffbe7',
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: 10,
    letterSpacing: 1.5,
    backgroundColor: 'transparent',
  },
  notImplemented: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 17,
    marginTop: 40,
  },
});

export default TarotMeaning;
