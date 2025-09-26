import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import Toast from 'react-native-toast-message';
import SidebarMenu from '../components/SidebarMenu';
import TarotHeader from '../components/TarotHeader';
import { useDukati } from '../context/DukatiContext';
import { createRewardedAdInstance, showInterstitialAd } from '../utils/ads';
import CardGroupList from './CardGroupList';
import VelikaArkanaList from './VelikaArkanaList';
// START: i18n import
import { useTranslation } from 'react-i18next';
// END: i18n import
// START: zvuk klika (expo-audio)
import { useAudioPlayer } from 'expo-audio';
const clickSound = require('../assets/sounds/click-card.mp3');
// END: zvuk klika

const groupMap = {
  velika: { label: 'Velika Arkana', icon: require('../assets/icons/major.webp') },
  stapovi: { label: 'Štapovi', icon: require('../assets/icons/wands.webp') },
  pehari: { label: 'Pehari', icon: require('../assets/icons/cups.webp') },
  macevi: { label: 'Mačevi', icon: require('../assets/icons/swords.webp') },
  zlatnici: { label: 'Zlatnici', icon: require('../assets/icons/pentacles.webp') },
};

const wandKeys = [
  'aceOfWands', 'twoOfWands', 'threeOfWands', 'fourOfWands', 'fiveOfWands',
  'sixOfWands', 'sevenOfWands', 'eightOfWands', 'nineOfWands', 'tenOfWands',
  'pageOfWands', 'knightOfWands', 'queenOfWands', 'kingOfWands'
];
const cupKeys = [
  'aceOfCups', 'twoOfCups', 'threeOfCups', 'fourOfCups', 'fiveOfCups',
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

const TarotMeaning = () => {
  const [selectedGroup, setSelectedGroup] = useState('velika');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cardViewCount, setCardViewCount] = useState(0);
  const [offerShown, setOfferShown] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();

  const { userPlan, dodeliDukatePrekoBackenda, fetchDukatiSaServera } = useDukati();
  // START: i18n inicijalizacija (koristimo 'common' za grupe i poruke)
  const { t } = useTranslation(['common']);
  // END: i18n inicijalizacija

  // Guard da spreči paralelne/duple pozive rewarded-a
  const rewardSessionRef = useRef(false);

  // START: audio player — hook upravlja lifecycle-om
  const player = useAudioPlayer(clickSound);

  const playClick = useCallback(() => {
    try {
      // expo-audio ne resetuje automatski poziciju nakon završetka —
      // za „klik” SFX radi kratko seek pa play
      player.seekTo(0);
      player.play();
    } catch (e) {
      if (__DEV__) console.log('[sound][play][err]', e?.message || e);
    }
  }, [player]);
  // END: audio player — hook


  // Rewarded helper – jedna instanca, idempotent dodela
  const prikaziRewardedReklamu = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (rewardSessionRef.current) {
        console.log('[REWARDED] already in progress – ignoring');
        resolve(undefined);
        return;
      }
      rewardSessionRef.current = true;

      let rewarded = null;
      let awarded = false;

      const cleanup = () => {
        try { unsubLoaded && unsubLoaded(); } catch { }
        try { unsubEarned && unsubEarned(); } catch { }
        try { unsubClosed && unsubClosed(); } catch { }
        try { unsubError && unsubError(); } catch { }
        rewarded = null;
        rewardSessionRef.current = false;
      };

      try {
        rewarded = createRewardedAdInstance();

        const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
          console.log('[REWARDED][LOAD] LOADED (Znacenje)');
          try { rewarded.show(); } catch (e) {
            console.log('[REWARDED][SHOW][ERR]', e);
            cleanup(); reject(e);
          }
        });

        const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async (reward) => {
          console.log('[REWARDED][EARNED] (Znacenje)', reward);
          if (awarded) return; // idempotentno
          awarded = true;
          try {
            await dodeliDukatePrekoBackenda(30);
            await fetchDukatiSaServera?.();
            Toast.show({ type: 'success', text1: 'Hvala!', text2: 'Dobili ste 30 dukata.' });
          } catch (e) {
            Toast.show({ type: 'error', text1: 'Greška pri dodeli', text2: e?.message || 'Pokušajte ponovo.' });
          }
        });

        const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
          console.log('[REWARDED][CLOSED] (Znacenje)');
          cleanup();
          resolve(undefined);
        });

        const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
          console.log('[REWARDED][ERROR] (Znacenje)', err?.code, err?.message);
          Toast.show({
            type: 'error',
            text1: 'Greška sa reklamom!',
            text2: `${err?.code ?? ''} ${err?.message ?? ''}`.trim(),
            position: 'bottom',
          });
          cleanup();
          reject(err);
        });

        rewarded.load();
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  }, [dodeliDukatePrekoBackenda, fetchDukatiSaServera]);

  // START: handleCardView – must-watch za guest, mix za free
  const handleCardView = () => {
    // START: zvuk na pregled/izbor karte
    playClick();
    // END: zvuk
    setCardViewCount(prev => {
      const next = prev + 1;
      const isGuest = (userPlan === 'guest' || userPlan === 'gost');

      if (isGuest) {
        // svaka 4. karta – interstitial
        if (next % 4 === 0) {
          showInterstitialAd().catch(e => console.log('[INTERSTITIAL][guest]', e?.code, e?.message));
        }
        return next;
      }

      if (userPlan === 'free') {
        // 4. klik – ponudi rewarded (tap na Toast otvara rewarded)
        if (next === 4 && !offerShown) {
          Toast.show({
            type: 'info',
            text1: 'Dukati za reklamu',
            text2: 'Pogledaj reklamu i osvoji dukate!',
            position: 'bottom',
            autoHide: true,
            visibilityTime: 6000,
            onPress: async () => {
              try { await prikaziRewardedReklamu(); } catch { }
              setOfferShown(true);
              Toast.hide();
            },
            onHide: () => setOfferShown(true),
          });
        }

        // 6. klik – “force” rewarded ako je ponuda već bila viđena
        if (next === 6 && offerShown) {
          prikaziRewardedReklamu().catch(e => console.log('[REWARDED][force free]', e));
        }

        // svaka 5. – interstitial (blago)
        if (next % 5 === 0) {
          showInterstitialAd().catch(e => console.log('[INTERSTITIAL][free]', e?.code, e?.message));
        }
        return next;
      }

      // premium/pro – bez oglasa
      return next;
    });
  };
  // END: handleCardView

  const generateCardList = (keys) =>
    keys.map((key) => ({ key, name: key }));

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
            {/* START: i18n poruka sa fallback-om */}
            {t('common:messages.notImplemented', {
              group: t(`common:groups.${selectedGroup}`, {
                defaultValue: groupMap[selectedGroup]?.label || selectedGroup
              })
            })}
            {/* END: i18n poruka sa fallback-om */}
          </Text>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      <TarotHeader
        swapTreasureMenu
        showBack={false}
        onBack={() => navigation.goBack()}
        onHome={() => navigation.navigate('Home')}
        onMenu={() => setSidebarOpen(true)}
      />

      <View style={styles.iconBarWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.navBarContent}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(groupMap).map(([key, { icon }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => { setSelectedGroup(key); playClick(); }}
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

      {/* START: i18n naslov grupe sa fallback-om na hardkodovani label */}
      <Text style={styles.groupTitle}>
        {t(`common:groups.${selectedGroup}`, {
          defaultValue: groupMap[selectedGroup]?.label || selectedGroup
        })}
      </Text>
      {/* END: i18n naslov grupe */}

      <View style={{ flex: 1 }}>
        {renderGroup()}
      </View>

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
