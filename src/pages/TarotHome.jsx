// src/pages/TarotHome.jsx
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// START: expo-audio za click SFX (umesto expo-av)
// import { Audio } from 'expo-av';
import { createAudioPlayer } from 'expo-audio';
// END: expo-audio za click SFX
import { useRef, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const clickSound = require('../assets/sounds/hover-click.mp3');

// START: click SFX sa expo-audio
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
// END: click SFX sa expo-audio

// START: deprecated infoTexts (i18n je jedini izvor istine)
const infoTexts = {
  "Sva otvaranja": "Ovo su otvaranja sa AI tumačem.",
  "Karta dana": "Ovo je intuitivno otvaranje, zamislite pitanje pre odabira karte.",
  "Da / Ne": "Ovo je intuitivno otvaranje, zamislite pitanje pre odabira karte.",
};
// Napomena: ovaj objekat više se ne koristi — ostavljen je zbog kompatibilnosti.
// END: deprecated infoTexts (i18n je jedini izvor istine)

const TarotHome = () => {
  const [openModal, setOpenModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigation = useNavigation();
  const [showAdModal, setShowAdModal] = useState(false);
  const { userPlan } = useDukati();
  // START: i18n init
  const { t } = useTranslation(['common']);
  // END: i18n init
  // START: State za flying coin animaciju
  const [flying, setFlying] = useState(false);
  const [flyStart, setFlyStart] = useState({ x: 0, y: 0 });
  const [flyEnd, setFlyEnd] = useState({ x: 0, y: 0 });
  const [onCoinAnim, setOnCoinAnim] = useState(null);
  // END: State za flying coin animaciju

  const brojacOtvaranja = useRef(0);

  // START: handleOtvaranje – guest/free interstitial gate
  const handleOtvaranje = () => {
    brojacOtvaranja.current += 1;
    const n = brojacOtvaranja.current;

    const isGuest = (userPlan === 'guest' || userPlan === 'gost');

    if (isGuest) {
      if (n % 3 === 0) {
        showInterstitialAd().catch(e => console.log('[INTERSTITIAL][guest]', e?.code, e?.message));
      }
      return;
    }

    if (userPlan === 'free') {
      if (n % 5 === 0) {
        showInterstitialAd().catch(e => console.log('[INTERSTITIAL][free]', e?.code, e?.message));
      }
      return;
    }

    // premium/pro: bez oglasa
  };
  // END: handleOtvaranje

  // START: ✅ NOVO – mapiraj userPlan na session/profile za guardovani banner
  // Gosti nemaju session, svi ostali imaju (placeholder je dovoljan)
  const isGuest = userPlan === 'guest' || userPlan === 'gost';
  const sessionLike = isGuest ? null : { uid: 'local-session' };
  const profileLike = { subscription_tier: userPlan }; // 'free' | 'premium' | 'pro' | 'guest'
  console.log('[BANNER][DEBUG] userPlan=', userPlan, 'isGuest=', isGuest);
  // END: ✅ NOVO – mapiranje
  // END: Handler za root-level flying coin animaciju iz modala
  const handleFlyCoin = (start, end, coinAnimCallback) => {
    setFlyStart(start);
    setFlyEnd(end);
    setOnCoinAnim(() => coinAnimCallback);
    setFlying(true);
  };
  // END: Handler za root-level flying coin animaciju

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
      <ImageBackground
        source={require('../assets/icons/background-space.webp')}
        style={styles.background}
        imageStyle={{ resizeMode: 'cover' }}
      >
        {/* TAROT HEADER JE VAN SCROLLVIEW-a: UVEK VIDLJIV */}
        <TarotHeader swapTreasureMenu isHome={true} onMenu={() => setSidebarOpen(true)} />

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.grid}>
            <MenuButton
              icon={require('../assets/icons/history.webp')}
              // START: i18n label
              label={t('common:home.menu.allSpreads', { defaultValue: 'Sva otvaranja' })}
              infoId="allSpreads"
              // END: i18n label
              onPress={() => {
                handleOtvaranje(); // Poziva funkciju za reklamu
                navigation.navigate('TarotOtvaranja');
              }}
            />

            <MenuButton
              icon={require('../assets/icons/daily.webp')}
              // START: i18n label
              label={t('common:home.menu.dailyCard', { defaultValue: 'Karta dana' })}
              infoId="dailyCard"
              // END: i18n label
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'karta-dana',
                  layoutTemplate: [{}], // OBAVEZNO!
                  // START: i18n pitanje
                  pitanje: t('common:questions.dailyCardPrompt', { defaultValue: 'Tvoja karta dana je...' })
                  // END: i18n pitanje
                })
              }}
            />

            <MenuButton
              icon={require('../assets/icons/yes.no.webp')}
              // START: i18n label
              label={t('common:home.menu.yesNo', { defaultValue: 'Da / Ne' })}
              infoId="yesNo"
              // END: i18n label
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'dane',
                  layoutTemplate: [{}], // OBAVEZNO!
                  // START: i18n pitanje
                  pitanje: t('common:questions.yesNoPrompt', { defaultValue: 'Tvoje pitanje za Da/Ne...' })
                  // END: i18n pitanje
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
                if (userPlan === "pro") {
                  navigation.navigate('ArhivaOtvaranja');
                }
                // Ako nije pro, klik ne radi ništa
              }}
              disabled={userPlan !== "pro"}
              isProOnly
            />

            <MenuButton
              icon={require('../assets/icons/access.webp')}
              label={t('common:home.menu.access', { defaultValue: 'Pristup aplikaciji' })}
              onPress={() => setOpenModal(true)}
            />

            {/* START: Dugme za gledanje reklame samo free */}
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
            {/* END: Dugme za gledanje reklame samo free */}
          </View>

          {openModal && <MembershipModal onClose={() => setOpenModal(false)} />}
          <AdRewardModal
            visible={showAdModal}
            onClose={() => setShowAdModal(false)}
            onFlyCoin={handleFlyCoin}
          />
        </ScrollView>

        <SidebarMenu visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* START: Test banner pri dnu ekrana (vidljiv u dev, free i guest) */}
        {/* START: ❌ ORIGINALNI USLOV – ostavljen samo kao reference, ne izvrsava se */}
        {false && (
          <View style={styles.bannerWrap}>
            {(__DEV__ || userPlan === 'free' || userPlan === 'guest' || userPlan === 'gost') && <AdBanner />}
          </View>
        )}
        {/* END: ❌ ORIGINALNI USLOV */}

        {/* START: ✅ NOVO – guardovani banner (skriva se za premium/pro čak i u dev buildu) */}
        <View style={styles.bannerWrap}>
          <AdBannerIfEligible session={sessionLike} profile={profileLike} />
        </View>
        {/* END: ✅ NOVO – guardovani banner */}
        {/* END: Test banner pri dnu */}
      </ImageBackground>
    </>
  );
};

// START: MenuButton prima opcioni infoId za i18n info–modal
const MenuButton = ({ icon, label, onPress, disabled = false, isProOnly = false, infoId }) => {
  const { t } = useTranslation(['common']);
  const [showInfo, setShowInfo] = useState(false);

  // START: i18n info modal bez fallback-a
  // Info modal prikazujemo samo ako imamo infoId
  const hasInfo = !!infoId;
  // END: i18n info modal bez fallback-a

  return (
    <>
      <TouchableOpacity
        onPress={async () => {
          if (disabled) return;
          await playClickSound();
          if (onPress) onPress();
        }}
        // START: style niz – ispravka zagrada
        style={[
          styles.button,
          disabled && { opacity: 0.5 },
        ]}
        // END: style niz – ispravka zagrada
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Image source={icon} style={styles.icon} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.label}>{label}</Text>
          {isProOnly && disabled && (
            <Text style={{ color: "#ffd700", fontSize: 13, marginLeft: 8, fontWeight: "bold" }}>
              {t('common:badges.proOnly', { defaultValue: '(Samo za PRO)' })}
            </Text>
          )}
          {hasInfo && (
            // START: pristupačnost info dugmeta (sr label iz i18n)
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{ marginLeft: 10 }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common:accessibility.info', { defaultValue: 'Informacije' })}
            >
              <Ionicons name="information-circle-outline" size={18} color="#FFD700" />
            </Pressable>
            // END: pristupačnost info dugmeta (sr label iz i18n)
          )}
        </View>
      </TouchableOpacity>

      {/* Modal za info */}
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
                {/* START: i18n telo info modala (bez lokalnih fallbackova) */}
                {t(`common:home.info.${infoId}`, { defaultValue: '' })}
                {/* END: i18n telo info modala (bez lokalnih fallbackova) */}
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
// END: MenuButton prima opcioni infoId za i18n info–modal

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
    paddingBottom: 110, // START: prostor da sadržaj ne uđe ispod fiksiranog bannera
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
  // START: fiksirani banner pri dnu
  bannerWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingTop: 6, paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  // END: fiksirani banner
});

export default TarotHome;
