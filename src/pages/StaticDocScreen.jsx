// src/pages/StaticDocScreen.jsx
import { useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// START: haptics + click SFX
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
const _uiClick = require('../assets/sounds/hover-click.mp3');
let _uiPlayer;
const playUiClick = async () => {
    try {
        Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light);
        if (!_uiPlayer) {
            _uiPlayer = createAudioPlayer(_uiClick);
            _uiPlayer.loop = false;
            _uiPlayer.volume = 1;
        }
        await _uiPlayer.seekTo(0);
        _uiPlayer.play();
    } catch { }
};
// END: haptics + click SFX

/**
 * Prikaz statičnih dokumenata iz i18n: documents.{docId}.{title, updatedAt, body[], sourceUrl?}
 * - docId može doći kroz prop (docId) ili route.params.docId
 */
export default function StaticDocScreen(props) {
    const nav = useNavigation();
    const route = useRoute();
    const { t, i18n: i18next } = useTranslation(['documents', 'common']);

    const docId = props.docId || route.params?.docId || 'about';

    const title = t(`${docId}.title`, { ns: 'documents', defaultValue: '' });
    const updatedAt = t(`${docId}.updatedAt`, { ns: 'documents', defaultValue: '' });
    const body = t(`${docId}.body`, { ns: 'documents', returnObjects: true });

    // Eksplicitni URL iz i18n (ako postoji)
    const sourceUrl = t(`${docId}.sourceUrl`, { ns: 'documents', defaultValue: '' });

    // Auto-fallback na infohelm.org/<slug>-<lang>.html
    // START: infohelm hardening + analytics (configurable base)
    // Možeš prebaciti u .env: EXPO_PUBLIC_INFOHELM_BASE
    const INFOHELM_BASE = process?.env?.EXPO_PUBLIC_INFOHELM_BASE || 'https://infohelm.org';
    // END: infohelm hardening + analytics (configurable base)
    const SUPPORTED_LANGS = ['sr', 'en', 'fr', 'es', 'pt', 'de', 'hi'];
    // START: resolvedLanguage za precizniji izbor jezika u URL-u
    /* original:
    const shortLang = (i18next?.language || 'en').slice(0, 2);
    */
    const shortLang = (i18next?.resolvedLanguage || i18next?.language || 'en').slice(0, 2);
    // END: resolvedLanguage za precizniji izbor jezika u URL-u
    const langForUrl = SUPPORTED_LANGS.includes(shortLang) ? shortLang : 'en';

    const SLUGS = {
        privacy: 'privacy-policy',
        dataDeletion: 'data-deletion',
        terms: 'terms-of-service',
        // disclaimer: 'disclaimer', // dodaj ako postoji javna stranica
    };

    // jezici koji nemaju javnu stranicu za dati dokument → padamo na EN
    const MISSING_PER_LANG = {
        terms: new Set(['fr']),
    };

    // START: infohelm hardening + analytics (canonicalLang util)
    const canonicalLang = (lng) => (String(lng || '').slice(0, 2) || 'en');
    // END: infohelm hardening + analytics (canonicalLang util)

    const deriveUrl = (id) => {
        const slug = SLUGS[id];
        if (!slug) return '';
        const fallbackLang = MISSING_PER_LANG[id]?.has(langForUrl) ? 'en' : canonicalLang(langForUrl);
        return `${INFOHELM_BASE}/${slug}-${fallbackLang}.html`;
    };

    // START: normalizacija relativnih URL-ova (npr. "terms-of-service-en.html")
    /* Ako sourceUrl nema http/https, pretvori u puni URL prema INFOHELM_BASE.
       Ako sourceUrl nije definisan, koristi deriveUrl(docId). */
    // START: infohelm hardening + analytics (normalize + https + UTM)
    const normalizeUrl = (url) => {
        if (!url) return '';
        let href = String(url).trim();
        // dozvoli protocol-relative //example.com (forsiramo https)
        if (/^\/\//.test(href)) href = 'https:' + href;
        // ako je relativan path -> spoji sa INFOHELM_BASE
        if (!/^https?:\/\//i.test(href)) {
            href = `${INFOHELM_BASE}/${href.replace(/^\/+/, '')}`;
        }
        // enforce https
        href = href.replace(/^http:\/\//i, 'https://');
        return href;
    };

    const withUtm = (href) => {
        try {
            const u = new URL(href);
            if (!u.searchParams.get('utm_source')) {
                u.searchParams.set('utm_source', 'tarot_mobile');
                u.searchParams.set('utm_medium', 'app');
                u.searchParams.set('utm_campaign', 'static_docs');
                u.searchParams.set('utm_content', docId);
            }
            return u.toString();
        } catch {
            return href;
        }
    };

    const externalUrl = withUtm(normalizeUrl(sourceUrl) || deriveUrl(docId));
    // END: infohelm hardening + analytics (normalize + https + UTM)
    // END: normalizacija relativnih URL-ova

    // Sigurno zatvaranje (kao „Zatvori“ u drugim ekranima)
    const handleClose = async () => {
        try {
            await playUiClick();
            if (nav?.canGoBack?.()) nav.goBack();
            else nav.navigate('Home');
        } catch { }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            {!!updatedAt && (
                <Text style={styles.updatedAt}>
                    {t('labels.updatedAt', { ns: 'common', defaultValue: 'Ažurirano' })}: {updatedAt}
                </Text>
            )}

            {/* Zatvori ispod naslova (ne preklapa tekst) */}
            <View style={styles.closeRow}>
                <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={handleClose}
                    accessibilityLabel={t('buttons.close', { ns: 'common', defaultValue: 'Zatvori' })}
                    accessibilityRole="button"
                >
                    <Text style={styles.closeText}>
                        {t('buttons.close', { ns: 'common', defaultValue: 'Zatvori' })}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Otvori zvaničnu verziju na webu (ako imamo URL) */}
                {!!externalUrl && (
                    <TouchableOpacity
                        style={styles.webBtn}
                        // START: robustan open sa canOpenURL + tihi fallback
                        onPress={async () => {
                            await playUiClick();
                            try {
                                const ok = await Linking.canOpenURL(externalUrl);
                                if (ok) {
                                    await Linking.openURL(externalUrl);
                                } else {
                                    throw new Error('CANNOT_OPEN');
                                }
                            } catch (e) {
                                const fallback = withUtm(deriveUrl(docId));
                                if (fallback) {
                                    try {
                                        const ok2 = await Linking.canOpenURL(fallback);
                                        if (ok2) await Linking.openURL(fallback);
                                    } catch { }
                                }
                            }
                        }}
                        // END: robustan open sa canOpenURL + tihi fallback
                        accessibilityLabel={t('labels.openOnWeb', { ns: 'common', defaultValue: 'Otvori na webu' })}
                        accessibilityRole="link"
                    >
                        <Text style={styles.webBtnText}>
                            {t('labels.openOnWeb', { ns: 'common', defaultValue: 'Otvori na webu' })}
                        </Text>
                    </TouchableOpacity>
                )}

                {Array.isArray(body) ? (
                    body.map((p, i) => (
                        <Text key={i} style={styles.paragraph}>
                            {p}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.paragraph}>{String(body || '')}</Text>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#181818', paddingTop: 12 },

    title: {
        color: '#facc15',
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 2,
        letterSpacing: 1.1,
    },
    updatedAt: { color: '#aaa', fontSize: 13, textAlign: 'center', marginBottom: 8 },

    // Inline close dugme ispod naslova
    closeRow: { alignItems: 'center', marginTop: 6, marginBottom: 6 },
    closeBtn: {
        alignSelf: 'center',
        backgroundColor: '#232323',
        borderColor: '#facc15',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    closeText: { fontSize: 16, color: '#facc15', fontWeight: 'bold' },

    content: { paddingHorizontal: 18, paddingBottom: 30, paddingTop: 12 },
    paragraph: { color: '#fff', fontSize: 16, lineHeight: 24, marginBottom: 12 },

    // Web dugme
    webBtn: {
        alignSelf: 'center',
        backgroundColor: '#232323',
        borderColor: '#facc15',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginBottom: 12,
    },
    webBtnText: { color: '#facc15', fontWeight: 'bold' },
});
