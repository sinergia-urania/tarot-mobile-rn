// START: LanguageSelector za RN + i18next + 7+ jezika (dodati TR/ID)
import { Picker } from '@react-native-picker/picker'; // proveri da li je instalirano: npm install @react-native-picker/picker
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, View } from 'react-native';
// START: zajednički handler za promenu jezika (i18n + Supabase)
import useChangeLanguage from '../hooks/useChangeLanguage';
// END: zajednički handler

const jezici = [
  { label: 'Srpski', value: 'sr' },
  { label: 'English', value: 'en' },
  { label: 'Português', value: 'pt' },
  { label: 'हिन्दी', value: 'hi' },
  { label: 'Français', value: 'fr' },
  { label: 'Español', value: 'es' },
  { label: 'Deutsch', value: 'de' },
  // START: dodati TR i ID jezike
  { label: 'Türkçe', value: 'tr' },
  { label: 'Bahasa Indonesia', value: 'id' },
  // END: dodati TR i ID jezike
];

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  // START: preuzmi centralni handler (sinhronizuje i18n + Supabase)
  const { changeLanguage } = useChangeLanguage();
  // END: preuzmi centralni handler

  // START: robustnost – iz i18n.language uzmi 2-slovni kod (npr. 'tr-TR' -> 'tr')
  const lang2 = (i18n.language || 'sr').slice(0, 2);
  // END: robustnost

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icons/yellow-globe.webp')} style={styles.planet} />
      <Picker
        // START: koristimo lang2 da uvek poklopi vrednosti iz liste
        selectedValue={lang2}
        // END: koristimo lang2
        style={styles.picker}
        // pre: onValueChange={lng => i18n.changeLanguage(lng)}
        // START: koristimo centralni handler (jedan izvor istine)
        onValueChange={(lng) => changeLanguage(lng)}
        // END: koristimo centralni handler (jedan izvor istine)
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
    // START: prilagođena širina za duže nazive (Türkçe / Bahasa Indonesia)
    width: 150,
    // END: prilagođena širina
    color: '#facc15',
    backgroundColor: 'transparent',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: -6,
  },
});

export default LanguageSelector;
// END: LanguageSelector za RN + i18next + 7+ jezika (dodati TR/ID)
