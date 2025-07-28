import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDukati } from '../context/DukatiContext';
import { useMusic } from '../context/MusicProvider';
import { useTreasureRef } from '../context/TreasureRefContext';
import TarotHeaderBanner from './TarotHeaderBanner';

const getLangShort = (code) => {
  if (!code) return 'Sr';
  return code.slice(0,2).toUpperCase();
};

const SoundMasterToggle = () => {
  const { isPlaying, mute, unmute } = useMusic();
  return (
    <TouchableOpacity
      style={styles.soundButton}
      onPress={isPlaying ? mute : unmute}
      accessibilityLabel={isPlaying ? "Isključi zvuk" : "Uključi zvuk"}
    >
      <Text style={styles.soundIcon}>{isPlaying ? '🔊' : '🔇'}</Text>
    </TouchableOpacity>
  );
};

const DukatiTreasure = React.forwardRef(({ onPress }, ref) => {
  // START: Dodaj loading i fetchDukatiSaServera iz contexta
  const { dukati, loading, fetchDukatiSaServera } = useDukati();
  const scale = useRef(new Animated.Value(1)).current;
  const prevDukati = useRef(dukati);

  useEffect(() => {
    if (prevDukati.current !== dukati) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 170, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      prevDukati.current = dukati;
    }
  }, [dukati]);

  // Klik na sanduk refresuje stanje iz baze za ceo app!
  return (
    <TouchableOpacity
      ref={ref}
      style={styles.treasureBox}
      onPress={fetchDukatiSaServera} // ← OVO JE KLJUČ!
      accessibilityLabel="Dukati"
    >
      <Image
        source={require('../assets/icons/treasure.webp')}
        style={styles.treasureIcon}
        resizeMode="contain"
      />
      <Animated.Text style={[styles.dukatText, { transform: [{ scale }] }]}>
        {loading ? '...' : dukati}
      </Animated.Text>
    </TouchableOpacity>
  );
});

// ...sve import ostaje isto...
   




const TarotHeader = ({
  onMenu,
  showMenu = true,
  showBack = false,
  onBack,
  onHome,
  currentLanguage = 'sr',
  onSelectLanguage,
  isHome,
  onTreasurePress,
  swapTreasureMenu = false, // NOVI PROP: false = sanduk pa meni, true = meni pa sanduk
}) => {
  const treasureRef = useTreasureRef();

  return (
    <>
      <TarotHeaderBanner />
      <View style={styles.header}>
        {/* Ako swapTreasureMenu === false: Sanduk -> Meni, inače: Meni -> Sanduk */}
        {!swapTreasureMenu ? (
          <>
            <DukatiTreasure ref={treasureRef} onPress={onTreasurePress} />
            {showMenu && (
              <TouchableOpacity
                onPress={onMenu}
                style={styles.iconButton}
                accessibilityLabel="Meni"
              >
                <Icon name="menu" size={36} color="#facc15" />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            {showMenu && (
              <TouchableOpacity
                onPress={onMenu}
                style={styles.iconButton}
                accessibilityLabel="Meni"
              >
                <Icon name="menu" size={36} color="#facc15" />
              </TouchableOpacity>
            )}
            <DukatiTreasure ref={treasureRef} onPress={onTreasurePress} />
          </>
        )}
        {/* Ostatak header-a bez izmene */}
        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            accessibilityLabel="Nazad"
          >
            <Icon name="arrow-left" size={36} color="#facc15" />
          </TouchableOpacity>
        )}
        <View style={styles.center}>
          {!isHome && (
            <TouchableOpacity
              onPress={onHome}
              style={styles.iconButton}
              accessibilityLabel="Početna"
            >
              <Icon name="home" size={36} color="#facc15" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={onSelectLanguage}
          >
            <Text style={styles.langText}>{getLangShort(currentLanguage)} ▼</Text>
          </TouchableOpacity>
          <SoundMasterToggle />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'black',
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#facc15',
    height: Platform.OS === "ios" ? 78 : 70,
    marginTop: 0,
  },
  iconButton: {
    padding: 6,
    marginHorizontal: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  treasureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: '#facc15', // bez žutog backgrounda
    borderRadius: 22,
    paddingVertical: 3,
    paddingHorizontal: 12,
    marginRight: 7,
    shadowColor: '#fff7bb',
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 5,
  },
  treasureIcon: {
    width: 36,     // povećano za 20%
    height: 36,
    marginRight: 4,
  },
  dukatText: {
    color: '#633400',
    fontWeight: 'bold',
    fontSize: 18,
    textShadowColor: '#fff6b0',
    textShadowRadius: 4,
    textShadowOffset: { width: 1, height: 1 },
  },
  langButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginRight: 2,
    borderRadius: 8,
    backgroundColor: '#181818',
  },
  langText: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  soundButton: {
    marginLeft: 6,
    padding: 4,
  },
  soundIcon: {
    fontSize: 22,
    color: '#facc15',
  },
});

export default TarotHeader;
