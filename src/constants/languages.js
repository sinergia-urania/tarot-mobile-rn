// src/constants/languages.js

// START: shared language constants (JS)
import * as RNLocalize from 'react-native-localize';

export const LANGUAGES = [
    { code: 'sr', label: '🇷🇸 Srpski' },
    { code: 'en', label: '🇬🇧 English' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'pt', label: '🇵🇹 Português' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'hi', label: '🇮🇳 हिन्दी' },
    { code: 'tr', label: '🇹🇷 Türkçe' },
    { code: 'id', label: '🇮🇩 Bahasa Indonesia' },
];

export const SUPPORTED_LANGS = ['sr', 'en', 'fr', 'es', 'pt', 'de', 'hi', 'tr', 'id'];

export const REGION_LANG_MAP = {
    sr: new Set(['RS', 'BA', 'HR', 'ME']),
    hi: new Set(['IN']),
    de: new Set(['DE', 'AT', 'CH', 'LI', 'LU']),
    es: new Set([
        'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO',
        'CR', 'SV', 'GT', 'HN', 'NI', 'PA', 'DO', 'PR'
    ]),
    pt: new Set(['PT', 'BR', 'AO', 'MZ', 'GW', 'CV', 'ST', 'TL']),
    fr: new Set(['FR', 'BE', 'CH', 'LU', 'MC']),
    en: new Set([
        'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'PH', 'MY', 'HK',
        'ZA', 'NG', 'KE', 'GH', 'JM', 'TT', 'BZ', 'MT'
    ]),
};

export const getBaseLang = (code) =>
    (code ? String(code).split('-')[0].toLowerCase() : 'en');

export const getLangShort = (code) =>
    (code ? getBaseLang(code).toUpperCase() : 'EN');

export const suggestLanguageFromDevice = () => {
    try {
        const loc = RNLocalize.getLocales()?.[0];
        const languageCode = getBaseLang(loc?.languageCode);
        const countryCode = loc?.countryCode?.toUpperCase();

        if (languageCode && SUPPORTED_LANGS.includes(languageCode)) return languageCode;

        if (countryCode) {
            for (const [lang, set] of Object.entries(REGION_LANG_MAP)) {
                if (set.has(countryCode)) return lang;
            }
        }

        return 'en';
    } catch {
        return 'en';
    }
};
// END: shared language constants (JS)
