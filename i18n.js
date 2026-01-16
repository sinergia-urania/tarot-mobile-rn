// tarot-mobile1/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// START: custom language detector (čita iz AsyncStorage)
import languageDetector from './src/utils/languageDetector';
// END: custom language detector

// START: statički import 4 JSON ns za sr
import sr_ai from './src/locales/sr/ai.json';
import sr_cardMeanings from './src/locales/sr/cardMeanings.json';
import sr_common from './src/locales/sr/common.json';
import sr_extendedMeanings from './src/locales/sr/extendedMeanings.json';
// END: statički import 4 JSON ns za sr

// START: dokumenta (O aplikaciji, Uslovi, Odricanje, Kontakt…)
import sr_documents from './src/locales/sr/documents.json';
// END: dokumenta
import sr_questions from './src/locales/sr/questions.json';

// START: EN resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import en_ai from './src/locales/en/ai.json';
import en_cardMeanings from './src/locales/en/cardMeanings.json';
import en_common from './src/locales/en/common.json';
import en_documents from './src/locales/en/documents.json';
import en_extendedMeanings from './src/locales/en/extendedMeanings.json';
import en_jungQuestions from './src/locales/en/jungQuestions.json';
import en_lessons from './src/locales/en/lessons.json';
import en_questions from './src/locales/en/questions.json';
// END: EN resursi

// START: ES resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import es_ai from './src/locales/es/ai.json';
import es_cardMeanings from './src/locales/es/cardMeanings.json';
import es_common from './src/locales/es/common.json';
import es_documents from './src/locales/es/documents.json';
import es_extendedMeanings from './src/locales/es/extendedMeanings.json';
import es_questions from './src/locales/es/questions.json';
// END: ES resursi

// START: DE resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import de_ai from './src/locales/de/ai.json';
import de_cardMeanings from './src/locales/de/cardMeanings.json';
import de_common from './src/locales/de/common.json';
import de_documents from './src/locales/de/documents.json';
import de_extendedMeanings from './src/locales/de/extendedMeanings.json';
import de_questions from './src/locales/de/questions.json';
// END: DE resursi

// START: add French (FR) resources and config - imports
import fr_ai from './src/locales/fr/ai.json';
import fr_cardMeanings from './src/locales/fr/cardMeanings.json';
import fr_common from './src/locales/fr/common.json';
import fr_documents from './src/locales/fr/documents.json';
import fr_extendedMeanings from './src/locales/fr/extendedMeanings.json';
import fr_questions from './src/locales/fr/questions.json';
// END: add French (FR) resources and config - imports

// START: PT resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import pt_ai from './src/locales/pt/ai.json';
import pt_cardMeanings from './src/locales/pt/cardMeanings.json';
import pt_common from './src/locales/pt/common.json';
import pt_documents from './src/locales/pt/documents.json';
import pt_extendedMeanings from './src/locales/pt/extendedMeanings.json';
import pt_questions from './src/locales/pt/questions.json';
// END: PT resursi

// START: HI resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import hi_ai from './src/locales/hi/ai.json';
import hi_cardMeanings from './src/locales/hi/cardMeanings.json';
import hi_common from './src/locales/hi/common.json';
import hi_documents from './src/locales/hi/documents.json';
import hi_extendedMeanings from './src/locales/hi/extendedMeanings.json';
import hi_questions from './src/locales/hi/questions.json';
// END: HI resursi

// START: TR resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import tr_ai from './src/locales/tr/ai.json';
import tr_cardMeanings from './src/locales/tr/cardMeanings.json';
import tr_common from './src/locales/tr/common.json';
import tr_documents from './src/locales/tr/documents.json';
import tr_extendedMeanings from './src/locales/tr/extendedMeanings.json';
import tr_questions from './src/locales/tr/questions.json';
// END: TR resursi

// START: ID resursi (komplet – common, ai, cardMeanings, extendedMeanings, documents, questions)
import id_ai from './src/locales/id/ai.json';
import id_cardMeanings from './src/locales/id/cardMeanings.json';
import id_common from './src/locales/id/common.json';
import id_documents from './src/locales/id/documents.json';
import id_extendedMeanings from './src/locales/id/extendedMeanings.json';
import id_questions from './src/locales/id/questions.json';
// END: ID resursi

// START: lessons & jungQuestions imports (sr/es/de/fr/pt/hi/tr/id)
import sr_jungQuestions from './src/locales/sr/jungQuestions.json';
import sr_lessons from './src/locales/sr/lessons.json';

import es_jungQuestions from './src/locales/es/jungQuestions.json';
import es_lessons from './src/locales/es/lessons.json';

import de_jungQuestions from './src/locales/de/jungQuestions.json';
import de_lessons from './src/locales/de/lessons.json';

import fr_jungQuestions from './src/locales/fr/jungQuestions.json';
import fr_lessons from './src/locales/fr/lessons.json';

import pt_jungQuestions from './src/locales/pt/jungQuestions.json';
import pt_lessons from './src/locales/pt/lessons.json';

import hi_jungQuestions from './src/locales/hi/jungQuestions.json';
import hi_lessons from './src/locales/hi/lessons.json';

import tr_jungQuestions from './src/locales/tr/jungQuestions.json';
import tr_lessons from './src/locales/tr/lessons.json';

import id_jungQuestions from './src/locales/id/jungQuestions.json';
import id_lessons from './src/locales/id/lessons.json';
// END: lessons & jungQuestions imports (sr/es/de/fr/pt/hi/tr/id)

// START: resources — sr/en/es (+ de + fr)
const resources = {
  sr: {
    common: sr_common,
    ai: sr_ai,
    cardMeanings: sr_cardMeanings,
    extendedMeanings: sr_extendedMeanings,
    documents: sr_documents,
    questions: sr_questions,
    // START: add lessons & jungQuestions for sr
    lessons: sr_lessons,
    jungQuestions: sr_jungQuestions,
    // END: add lessons & jungQuestions for sr
  },

  // START: en resources (komplet)
  en: {
    common: en_common,
    ai: en_ai,
    cardMeanings: en_cardMeanings,
    extendedMeanings: en_extendedMeanings,
    documents: en_documents,
    questions: en_questions,
    lessons: en_lessons,
    jungQuestions: en_jungQuestions,
  },
  // END: en resources

  // START: es resources (komplet)
  es: {
    common: es_common,
    ai: es_ai,
    cardMeanings: es_cardMeanings,
    extendedMeanings: es_extendedMeanings,
    documents: es_documents,
    questions: es_questions,
    // START: add lessons & jungQuestions for es
    lessons: es_lessons,
    jungQuestions: es_jungQuestions,
    // END: add lessons & jungQuestions for es
  },
  // END: es resources

  // START: de resources (komplet)
  de: {
    common: de_common,
    ai: de_ai,
    cardMeanings: de_cardMeanings,
    extendedMeanings: de_extendedMeanings,
    documents: de_documents,
    questions: de_questions,
    // START: add lessons & jungQuestions for de
    lessons: de_lessons,
    jungQuestions: de_jungQuestions,
    // END: add lessons & jungQuestions for de
  },
  // END: de resources

  // START: fr resources (komplet)
  fr: {
    common: fr_common,
    ai: fr_ai,
    cardMeanings: fr_cardMeanings,
    extendedMeanings: fr_extendedMeanings,
    documents: fr_documents,
    questions: fr_questions,
    // START: add lessons & jungQuestions for fr
    lessons: fr_lessons,
    jungQuestions: fr_jungQuestions,
    // END: add lessons & jungQuestions for fr
  },
  // END: fr resources

  // START: pt resources (komplet)
  pt: {
    common: pt_common,
    ai: pt_ai,
    cardMeanings: pt_cardMeanings,
    extendedMeanings: pt_extendedMeanings,
    documents: pt_documents,
    questions: pt_questions,
    // START: add lessons & jungQuestions for pt
    lessons: pt_lessons,
    jungQuestions: pt_jungQuestions,
    // END: add lessons & jungQuestions for pt
  },
  // END: pt resources

  // START: hi resources (komplet)
  hi: {
    common: hi_common,
    ai: hi_ai,
    cardMeanings: hi_cardMeanings,
    extendedMeanings: hi_extendedMeanings,
    documents: hi_documents,
    questions: hi_questions,
    // START: add lessons & jungQuestions for hi
    lessons: hi_lessons,
    jungQuestions: hi_jungQuestions,
    // END: add lessons & jungQuestions for hi
  },
  // END: hi resources

  // START: tr resources (komplet)
  tr: {
    common: tr_common,
    ai: tr_ai,
    cardMeanings: tr_cardMeanings,
    extendedMeanings: tr_extendedMeanings,
    documents: tr_documents,
    questions: tr_questions,
    // START: add lessons & jungQuestions for tr
    lessons: tr_lessons,
    jungQuestions: tr_jungQuestions,
    // END: add lessons & jungQuestions for tr
  },
  // END: tr resources

  // START: id resources (komplet)
  id: {
    common: id_common,
    ai: id_ai,
    cardMeanings: id_cardMeanings,
    extendedMeanings: id_extendedMeanings,
    documents: id_documents,
    questions: id_questions,
    // START: add lessons & jungQuestions for id
    lessons: id_lessons,
    jungQuestions: id_jungQuestions,
    // END: add lessons & jungQuestions for id
  },
  // END: id resources
};
// END: resources

i18n
  // START: koristi custom language detector (AsyncStorage → Device → Fallback)
  .use(languageDetector)
  // END: koristi custom language detector
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    ns: ['common', 'ai', 'cardMeanings', 'extendedMeanings', 'documents', 'questions', 'lessons', 'jungQuestions'],

    defaultNS: 'common',

    // START: fallbackNS — ako ključ fali u aktivnom ns, traži ga u "common"
    fallbackNS: 'common',

    // START: pametan fallback — globalno prvo EN, pa SR; za sr ostaje sr→en
    fallbackLng: {
      default: ['en', 'sr'],
      sr: ['sr', 'en'],
      en: ['en', 'sr'],
      es: ['en', 'sr'], // španski pada na EN, pa SR
      de: ['de', 'en', 'sr'], // nemački: DE → EN → SR

      // START: add French (FR) resources and config - fallbackLng.fr
      fr: ['fr', 'en', 'sr'], // francuski: FR → EN → SR
      // END: add French (FR) resources and config - fallbackLng.fr

      // START: pt & hi fallbacks
      pt: ['pt', 'en', 'sr'], // portugalski: PT → EN → SR
      hi: ['hi', 'en', 'sr'], // hindski: HI → EN → SR
      // END: pt & hi fallbacks

      // START: tr & id fallbacks
      tr: ['tr', 'en', 'sr'], // turski: TR → EN → SR
      id: ['id', 'en', 'sr'], // indonezijski: ID → EN → SR
      // END: tr & id fallbacks
    },
    // END: pametan fallback

    // UKLONJENO: lng: Localization.getLocales()[0].languageCode,
    // Sada koristimo languageDetector koji čita iz AsyncStorage pa fallback na device

    // START: podržani jezici
    // START: add German & French - supportedLngs
    // supportedLngs: ['sr', 'en', 'es', 'de', 'fr', 'pt', 'hi'],
    // END: add German & French - supportedLngs

    // START: add Turkish & Indonesian - supportedLngs (extend list)
    supportedLngs: ['sr', 'en', 'es', 'de', 'fr', 'pt', 'hi', 'tr', 'id'],
    // END: add Turkish & Indonesian - supportedLngs (extend list)

    load: 'languageOnly', // en-US/sr-RS/es-ES → en/sr/es
    nonExplicitSupportedLngs: true,
    // END: podržani jezici

    interpolation: { escapeValue: false },

    // START: RN best-practice – bez suspense-a
    react: { useSuspense: false },
    // END: RN best-practice

    // START: dev pomoć – prijavi nestale ključeve u konzolu (samo u __DEV__)
    missingKeyHandler: (__lng, __ns, key) => {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[i18n][missing]', `${__ns}:${key}`);
      }
    },
    // END: dev pomoć
  });

export default i18n;
