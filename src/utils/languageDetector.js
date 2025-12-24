// src/utils/languageDetector.js
// Custom language detector za i18next koji čita iz AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

const LANGUAGE_STORAGE_KEY = '@app_language';
const SUPPORTED_LANGS = ['sr', 'en', 'fr', 'es', 'pt', 'de', 'hi', 'tr', 'id'];

/**
 * Custom language detector za i18next
 * Prioritet:
 * 1. AsyncStorage (korisnikov izbor)
 * 2. Jezik telefona (ako je podržan)
 * 3. 'en' kao fallback
 */
const languageDetector = {
    type: 'languageDetector',
    async: true, // VAŽNO: mora biti async
    
    detect: async (callback) => {
        try {
            // 1) Pokušaj učitati sačuvani jezik iz AsyncStorage
            const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
            
            if (savedLanguage && SUPPORTED_LANGS.includes(savedLanguage)) {
                console.log('[i18n] Loaded language from storage:', savedLanguage);
                callback(savedLanguage);
                return;
            }
            
            // 2) Ako nema sačuvanog, koristi jezik telefona
            const deviceLang = Localization.getLocales()?.[0]?.languageCode?.slice(0, 2);
            
            if (deviceLang && SUPPORTED_LANGS.includes(deviceLang)) {
                console.log('[i18n] Using device language:', deviceLang);
                callback(deviceLang);
                return;
            }
            
            // 3) Fallback na engleski
            console.log('[i18n] Fallback to English');
            callback('en');
            
        } catch (error) {
            console.warn('[i18n] Language detection error:', error);
            callback('en');
        }
    },
    
    init: () => {},
    
    cacheUserLanguage: async (language) => {
        try {
            await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch (error) {
            console.warn('[i18n] Failed to cache language:', error);
        }
    },
};

export default languageDetector;
