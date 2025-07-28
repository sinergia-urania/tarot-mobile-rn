import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useRef, useState } from 'react';
import { Image, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdRewardModal from "../components/AdRewardModal";
import FlyingCoin from "../components/FlyingCoin";
import SidebarMenu from '../components/SidebarMenu';
import TarotHeader from '../components/TarotHeader';
import { useDukati } from "../context/DukatiContext";
import { showInterstitialAd } from "../utils/ads";
import MembershipModal from './MembershipModal';


const clickSound = require('../assets/sounds/hover-click.mp3');

const playClickSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(clickSound, { shouldPlay: true });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {}
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
  const { userPlan } = useDukati();
  // START: State za flying coin animaciju
  const [flying, setFlying] = useState(false);
  const [flyStart, setFlyStart] = useState({ x: 0, y: 0 });
  const [flyEnd, setFlyEnd] = useState({ x: 0, y: 0 });
  const [onCoinAnim, setOnCoinAnim] = useState(null);
  // END: State za flying coin animaciju

  
  
  const brojacOtvaranja = useRef(0);

  
  

  // START: Funkcija za brojač otvaranja i prikaz reklama
  const handleOtvaranje = () => {
    brojacOtvaranja.current += 1;
    if (userPlan  === "guest" && brojacOtvaranja.current % 3 === 0) {
      showInterstitialAd();
    }
    if (userPlan  === "free" && brojacOtvaranja.current % 5 === 0) {
      showInterstitialAd();
    }
    
  };
  // END: Funkcija za brojač otvaranja i prikaz reklama

  // START: Handler za root-level flying coin animaciju iz modala
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
              label="Sva otvaranja"
              onPress={() => {
                handleOtvaranje(); // Poziva funkciju za reklamu
                navigation.navigate('TarotOtvaranja');
              }}
            />

            <MenuButton
              icon={require('../assets/icons/daily.webp')}
              label="Karta dana"
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'karta-dana',
                  layoutTemplate: [{}], // OBAVEZNO!
                  pitanje: 'Tvoja karta dana je...'
                })
              }}
            />

            <MenuButton
              icon={require('../assets/icons/yes.no.webp')}
              label="Da / Ne"
              onPress={() => {
                handleOtvaranje();
                navigation.navigate('IzborKarata', {
                  tip: 'dane',
                  layoutTemplate: [{}], // OBAVEZNO!
                  pitanje: 'Tvoje pitanje za Da/Ne...'
                })
              }}
            />

            <MenuButton
              icon={require('../assets/icons/meaning.webp')}
              label="Značenje karata"
              onPress={() => navigation.navigate('ZnacenjeKarata')}
            />

            <MenuButton
              icon={require('../assets/icons/old-book.webp')}
              label="Arhiva otvaranja"
              onPress={() => {/* navigacija ili funkcija */}}
            />

            <MenuButton
              icon={require('../assets/icons/access.webp')}
              label="Pristup aplikaciji"
              onPress={() => setOpenModal(true)}
            />
            {/* START: Dugme za gledanje reklame samo free */}
            {userPlan  === "free" && (
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
                  Gledaj reklamu za dukate
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
      </ImageBackground>
    </>
  );
};

const MenuButton = ({ icon, label, onPress }) => {
  const [showInfo, setShowInfo] = useState(false);

  const hasInfo = label === "Sva otvaranja" || label === "Karta dana" || label === "Da / Ne";

  return (
    <>
      <TouchableOpacity
        onPress={async () => {
          await playClickSound();
          if (onPress) onPress();
        }}
        style={styles.button}
        activeOpacity={0.8}
      >
        <Image source={icon} style={styles.icon} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.label}>{label}</Text>
          {hasInfo && (
            <Pressable
              onPress={() => setShowInfo(true)}
              style={{ marginLeft: 10 }}
              hitSlop={12}
            >
              <Ionicons name="information-circle-outline" size={18} color="#FFD700" />
            </Pressable>
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
                {infoTexts[label]}
              </Text>
              <TouchableOpacity onPress={() => setShowInfo(false)}>
                <Text style={{
                  color: '#FFD700',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}>
                  Zatvori
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};

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
});

export default TarotHome;
