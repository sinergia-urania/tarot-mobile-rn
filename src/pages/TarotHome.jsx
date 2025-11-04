// src/pages/TarotHome.jsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// START: expo-audio za click SFX (umesto expo-av)
// import { Audio } from 'expo-av';
import { createAudioPlayer } from 'expo-audio';
// END: expo-audio za click SFX
import { useRef, useState } from 'react';
// START: import cleanup – sklanjamo ImageBackground i Image iz RN (ostavljeni u komentarima)
// import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// END: import cleanup
import AdRewardModal from "../components/AdRewardModal";
import FlyingCoin from "../components/FlyingCoin";
import SidebarMenu from '../components/SidebarMenu';
import TarotHeader from '../components/TarotHeader';
import { useDukati } from "../context/DukatiContext";
import { showInterstitialAd } from "../utils/ads";
import MembershipModal from './MembershipModal';
// START: i18n
import { useTranslation } from 'react-i18next';
// END: i18n

// START: Banner & (opciono) Ad Inspector
import { AdBanner } from '../utils/ads';
// import mobileAds from 'react-native-google-mobile-ads';
// END: Banner & (opciono) Ad Inspector

// START: ✅ NOVO – uvezimo guardovani banner iz utils/ads
import { AdBannerIfEligible } from '../utils/ads';
// END: ✅ NOVO – uvezimo guardovani banner iz utils/ads

// START: ✅ NOVO – SafeImage (expo-image) za iOS WebP
import SafeImage from '../components/SafeImage';
// END: ✅ NOVO – SafeImage (expo-image) za iOS WebP

const clickSound = require('../assets/sounds/hover-click.mp3');

const playClickSound = async () => {
  try {
    const p = createAudioPlayer(clickSound);
    p.loop = false;
    p.volume = 1;
    await p.seekTo(0);
    p.play();
    setTimeout(() => { try { p.remove?.(); } catch { } }, 1200);
  } catch (e) { }
};

const infoTexts = {
  "Sva otvaranja": "Ovo su otvaranja sa AI tumačem.",
  "Karta dana": "Ovo je intuitivno otvaranje, zamislite pitanje pre odabira karte.",
  "Da / Ne": "Ovo je intuitivno otvaranje, zamislite pitanje pre odabira karte.",
};

const TarotHome = () => {
  const [openModal, setOpenModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigation = useNavigation();
  const [showAdModal, setShowAdModal] = useState(false);
  // START: isPro iz konteksta (Pro i ProPlus)
  // const { userPlan } = useDukati();
  const { userPlan, isPro } = useDukati();
  const isProTier = !!isPro;
  // END: isPro iz konteksta (Pro i ProPlus)
  const { t } = useTranslation(['common']);

  const [flying, setFlying] = useState(false);
  const [flyStart, setFlyStart] = useState({ x: 0, y: 0 });
  const [flyEnd, setFlyEnd] = useState({ x: 0, y: 0 });
  const [onCoinAnim, setOnCoinAnim] = useState(null);

  const brojacOtvaranja = useRef(0);

  // START: uklanjanje guest logike u handleOtvaranje (samo free prikazuje interstitial po N)
  const handleOtvaranje = () => {
    brojacOtvaranja.current += 1;
    const n = brojacOtvaranja.current;

    if (userPlan === 'free') {
      if (n % 5 === 0) {
        showInterstitialAd().catch(e => console.log('[INTERSTITIAL][free]', e?.code, e?.message));
      }
    }
    // plaćeni planovi: bez oglasa
  };
  // END: uklanjanje guest logike u handleOtvaranje

  // START: uklonjeni guest stubovi za baner (koristimo realan kontekst unutar AdBannerIfEligible)
  // const isGuest = userPlan === 'guest' || userPlan === 'gost';
  // const sessionLike = isGuest ? null : { uid: 'local-session' };
  // const profileLike = { subscription_tier: userPlan };
  // console.log('[BANNER][DEBUG] userPlan=', userPlan, 'isGuest=', isGuest);
  // END: uklonjeni guest stubovi

  const handleFlyCoin = (start, end, coinAnimCallback) => {
    setFlyStart(start);
    setFlyEnd(end);
    setOnCoinAnim(() => coinAnimCallback);
    setFlying(true);
  };

  return (
    <>
      {flying && (
        <FlyingCoin
          start={flyStart}
          end={flyEnd}
          onComplete={() => {
            setFlying(false);
            if (onCoinAnim) {
              onCoinAnim();
              setOnCoinAnim(null);
            }
          }}
        />
      )}

      {/* START: View + SafeImage kao pozadina (WebP-friendly za iOS) */}
      {/* <ImageBackground
        source={require('../assets/icons/background-space.webp')}
        style={styles.background}
        imageStyle={{ resizeMode: 'cover' }}
      > */}
      <View style={styles.background}>
        <SafeImage
          source={require('../assets/icons/background-space.webp')}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
        {/* END: View + SafeImage kao pozadina */}

        {/* TAROT HEADER JE VAN SCROLLVIEW-a: UVEK VIDLJIV */}
        <TarotHeader swapTreasureMenu isHome={true} onMenu={() => setSidebarOpen(true)} />

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.grid}>
            <MenuButton
              icon={require('../assets/icons/history.webp')}
              label={t('common:home.menu.allSpreads', { defaultValue: 'Sva otvaranja' })}
              infoId="allSpreads"
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('TarotOtvaranja');
              }}
            />

            <MenuButton
              icon={require('../assets/icons/daily.webp')}
              label={t('common:home.menu.dailyCard', { defaultValue: 'Karta dana' })}
              infoId="dailyCard"
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'karta-dana',
                  layoutTemplate: [{}], // OBAVEZNO!
                  pitanje: t('common:questions.dailyCardPrompt', { defaultValue: 'Tvoja karta dana je...' })
                })
              }}
            />

            <MenuButton
              icon={require('../assets/icons/yes.no.webp')}
              label={t('common:home.menu.yesNo', { defaultValue: 'Da / Ne' })}
              infoId="yesNo"
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'dane',
                  layoutTemplate: [{}], // OBAVEZNO!
                  pitanje: t('common:questions.yesNoPrompt', { defaultValue: 'Tvoje pitanje za Da/Ne...' })
                })
              }}
            />

            <MenuButton
              icon={require('../assets/icons/meaning.webp')}
              label={t('common:home.menu.meanings', { defaultValue: 'Značenje karata' })}
              onPress={() => navigation.navigate('ZnacenjeKarata')}
            />

            <MenuButton
              icon={require('../assets/icons/old-book.webp')}
              label={t('common:home.menu.history', { defaultValue: 'Arhiva otvaranja' })}
              onPress={() => {
                // START: gating preko isPro (obuhvata i ProPlus)
                // if (userPlan === "pro") {
                //   navigation.navigate('ArhivaOtvaranja');
                // }
                if (isProTier) {
                  navigation.navigate('ArhivaOtvaranja');
                }
                // END: gating preko isPro
              }}
              // START: disable preko isPro (umesto userPlan === 'pro')
              // disabled={userPlan !== "pro"}
              disabled={!isProTier}
              // END: disable preko isPro
              isProOnly
            />

            <MenuButton
              icon={require('../assets/icons/access.webp')}
              label={t('common:home.menu.access', { defaultValue: 'Pristup aplikaciji' })}
              onPress={() => setOpenModal(true)}
            />

            {userPlan === "free" && (
              <TouchableOpacity
                style={{
                  backgroundColor: "#facc15",
                  borderRadius: 10,
                  padding: 12,
                  alignItems: "center",
                  marginTop: 16,
                }}
                onPress={() => setShowAdModal(true)}
              >
                <Text style={{ color: "#1a2b0a", fontWeight: "bold", fontSize: 16 }}>
                  {t('common:home.watchAdForCoins', { defaultValue: 'Gledaj reklamu za dukate' })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {openModal && <MembershipModal onClose={() => setOpenModal(false)} />}
          <AdRewardModal
            visible={showAdModal}
            onClose={() => setShowAdModal(false)}
            onFlyCoin={handleFlyCoin}
          />
        </ScrollView>

        <SidebarMenu visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* START: Test banner pri dnu ekrana (vidljiv u dev i free) */}
        {false && (
          <View style={styles.bannerWrap}>
            {(__DEV__ || userPlan === 'free') && <AdBanner />}
          </View>
        )}
        {/* END: Test banner pri dnu ekrana (bez guest/gost) */}

        {/* START: ✅ NOVO – guardovani banner (skriva se za premium/pro čak i u dev buildu) */}
        <View style={styles.bannerWrap}>
          {/* START: pojednostavljen AdBannerIfEligible – bez stub sesije/profila */}
          <AdBannerIfEligible />
          {/* END: pojednostavljen AdBannerIfEligible */}
        </View>
        {/* END: ✅ NOVO – guardovani banner */}
        {/* </ImageBackground> */}
      </View>
    </>
  );
};

// START: MenuButton prima opcioni infoId za i18n info–modal
const MenuButton = ({ icon, label, onPress, disabled = false, isProOnly = false, infoId }) => {
  const { t } = useTranslation(['common']);
  const [showInfo, setShowInfo] = useState(false);

  const hasInfo = !!infoId;

  return (
    <>
      <TouchableOpacity
        onPress={async () => {
          if (disabled) return;
          await playClickSound();
          if (onPress) onPress();
        }}
        style={[
          styles.button,
          disabled && { opacity: 0.5 },
        ]}
        activeOpacity={disabled ? 1 : 0.8}
      >
        {/* START: SafeImage umesto Image za ikonice (WebP na iOS) */}
        {/* <Image source={icon} style={styles.icon} /> */}
        <SafeImage source={icon} style={styles.icon} contentFit="contain" />
        {/* END: SafeImage umesto Image */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.label}>{label}</Text>
          {isProOnly && disabled && (
            <Text style={{ color: "#ffd700", fontSize: 13, marginLeft: 8, fontWeight: "bold" }}>
              {t('common:badges.proOnly', { defaultValue: '(Samo za PRO)' })}
            </Text>
          )}
          {hasInfo && (
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{ marginLeft: 10 }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common:accessibility.info', { defaultValue: 'Informacije' })}
            >
              <Ionicons name="information-circle-outline" size={18} color="#FFD700" />
            </Pressable>
          )}
        </View>
      </TouchableOpacity>

      {hasInfo && (
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#232323',
              borderRadius: 16,
              borderWidth: 2,
              borderColor: '#FFD700',
              padding: 24,
              minWidth: 250,
              alignItems: 'center',
            }}>
              <Text style={{
                color: '#FFD700',
                fontWeight: 'bold',
                fontSize: 18,
                marginBottom: 12,
                textAlign: 'center',
              }}>
                {label}
              </Text>
              <Text style={{
                color: '#eee',
                fontSize: 15,
                textAlign: 'center',
                marginBottom: 18,
              }}>
                {t(`common:home.info.${infoId}`, { defaultValue: '' })}
              </Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Text style={{
                  color: '#FFD700',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}>
                  {t('common:buttons.close', { defaultValue: 'Zatvori' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};
// END: MenuButton

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    paddingBottom: 110, // prostor da sadržaj ne uđe ispod fiksiranog bannera
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  grid: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    marginTop: 24,
  },
  button: {
    alignItems: 'center',
    marginVertical: 16,
    width: '85%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  icon: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  label: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  adButton: {
    marginTop: 30,
    backgroundColor: '#facc15',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  adText: {
    color: 'black',
    fontWeight: 'bold',
  },
  bannerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingTop: 6, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
});

export default TarotHome;
