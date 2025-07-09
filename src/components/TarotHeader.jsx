import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useMusic } from '../context/MusicProvider';

// Ova funkcija treba da vraća "Sr", "En", itd. iz tvog currentLanguage stanja
const getLangShort = (code) => {
  if (!code) return 'Sr';
  // Vrati prvo veliko slovo i drugo malo (ili sve veliko ako ti je draže)
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

const TarotHeader = ({
  onMenu,
  showBack = false,
  onBack,
  onHome,
  currentLanguage = 'sr',         // ili koristi prop/context za jezik
  onSelectLanguage,
}) => {
  return (
    <View style={styles.header}>
      {/* Hamburger uvek levo */}
      <TouchableOpacity
        onPress={onMenu}
        style={styles.iconButton}
        accessibilityLabel="Meni"
      >
        <Icon name="menu" size={36} color="#facc15" />
      </TouchableOpacity>

      {/* Back odmah desno od menija (ako treba) */}
      {showBack && (
        <TouchableOpacity
          onPress={onBack}
          style={styles.iconButton}
          accessibilityLabel="Nazad"
        >
          <Icon name="arrow-left" size={36} color="#facc15" />
        </TouchableOpacity>
      )}

      {/* Home uvek u centru */}
      <View style={styles.center}>
        <TouchableOpacity
          onPress={onHome}
          style={styles.iconButton}
          accessibilityLabel="Početna"
        >
          <Icon name="home" size={36} color="#facc15" />
        </TouchableOpacity>
      </View>

      {/* Jezik + zvučnik skroz desno */}
      <View style={styles.right}>
        {/* Skraćeni prikaz jezika */}
        <TouchableOpacity
          style={styles.langButton}
          onPress={onSelectLanguage} // ili otvara LanguageSelector
        >
          <Text style={styles.langText}>{getLangShort(currentLanguage)} ▼</Text>
        </TouchableOpacity>
        {/* Master zvuk */}
        <SoundMasterToggle />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'black',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#facc15',
    minHeight: 64,
    marginTop: 28,
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
