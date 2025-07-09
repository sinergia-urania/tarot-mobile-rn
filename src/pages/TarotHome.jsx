import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useState } from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AdRewardModal from '../components/AdRewardModal';
import SidebarMenu from '../components/SidebarMenu';
import TarotHeader from '../components/TarotHeader';
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

const TarotHome = ({ dukatiRef }) => {
  const [openModal, setOpenModal] = useState(false);
  const [openAdModal, setOpenAdModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigation = useNavigation();
  return (
    <ImageBackground
      source={require('../assets/icons/background-space.webp')}
      style={styles.background}
      imageStyle={{ resizeMode: 'cover' }}
    >
      {/* TAROT HEADER JE VAN SCROLLVIEW-a: UVEK VIDLJIV */}
      <TarotHeader onMenu={() => setSidebarOpen(true)} />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.grid}>
          <MenuButton
            icon={require('../assets/icons/history.webp')}
            label="Sva otvaranja"
            onPress={() => navigation.navigate('TarotOtvaranja')}
          />

          <MenuButton
            icon={require('../assets/icons/daily.webp')}
            label="Karta dana"
            onPress={() => navigation.navigate('IzborKarata', { tip: 'karta-dana' })}
          />

          <MenuButton
            icon={require('../assets/icons/yes.no.webp')}
            label="Da / Ne"
            onPress={() => navigation.navigate('IzborKarata', { tip: 'dane' })}
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
        </View>

        <TouchableOpacity
          onPress={() => setOpenAdModal(true)}
          style={styles.adButton}
        >
          <Text style={styles.adText}>Gledaj reklamu i osvoji dukate</Text>
        </TouchableOpacity>

        {openModal && <MembershipModal onClose={() => setOpenModal(false)} />}
        {openAdModal && <AdRewardModal onClose={() => setOpenAdModal(false)} dukatiRef={dukatiRef} />}
      </ScrollView>

      <SidebarMenu visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </ImageBackground>
  );
};

const MenuButton = ({ icon, label, onPress }) => (
  <TouchableOpacity
    onPress={async () => {
      await playClickSound();
      if (onPress) onPress();
    }}
    style={styles.button}
  >
    <Image source={icon} style={styles.icon} />
    <Text style={styles.label}>{label}</Text>
  </TouchableOpacity>
);

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
