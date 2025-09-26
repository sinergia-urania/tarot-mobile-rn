// START: LanguageSelector za RN + i18next + 7 jezika
import { Picker } from '@react-native-picker/picker'; // proveri da li je instalirano: npm install @react-native-picker/picker
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';

const jezici = [
  { label: 'Srpski', value: 'sr' },
  { label: 'English', value: 'en' },
  { label: 'Português', value: 'pt' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
  { label: 'Deutsch', value: 'de' },
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icons/yellow-globe.webp')} style={styles.planet} />
      <Picker
        selectedValue={i18n.language}
        style={styles.picker}
        onValueChange={lng => i18n.changeLanguage(lng)}
        dropdownIconColor="#facc15"
        mode="dropdown"
      >
        {jezici.map(j => (
          <Picker.Item key={j.value} label={j.label} value={j.value} />
        ))}
      </Picker>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingRight: 0 },
  planet: { width: 22, height: 22, marginRight: 2 },
  picker: {
    width: 110,
    color: '#facc15',
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: -6,
  },
});

export default LanguageSelector;
// END: LanguageSelector za RN + i18next + 7 jezika


