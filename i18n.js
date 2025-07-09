import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Prilagodi putanje ako treba
import de from './src/locales/de/translation.json';
import en from './src/locales/en/translation.json';
import es from './src/locales/es/translation.json';
import fr from './src/locales/fr/translation.json';
import hi from './src/locales/hi/translation.json';
import pt from './src/locales/pt/translation.json';
import sr from './src/locales/sr/translation.json';

const resources = {
  sr: { translation: sr },
  en: { translation: en },
  pt: { translation: pt },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  hi: { translation: hi },
};

// NAPOMENA:
// Automatska detekcija jezika NE radi u Expo Go aplikaciji, jer je 'react-native-localize' nativni modul.
// Kada praviš pravi build (EAS build), možeš vratiti automatsku detekciju.

i18n
  // .use(languageDetector) // NE koristi dok si u Expo Go
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3', // zbog RN
    resources,
    fallbackLng: 'sr',
    lng: 'sr', // OVO ručno promeni u npr. 'en' za test (ili pusti da menjaš kroz LanguageSelector)
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
