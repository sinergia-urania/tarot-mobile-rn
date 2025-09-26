// src/components/TarotHeader.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDukati } from '../context/DukatiContext';
import { useMusic } from '../context/MusicProvider';
import { useTreasureRef } from '../context/TreasureRefContext';
import TarotHeaderBanner from './TarotHeaderBanner';

// START: i18n import
import { useTranslation } from 'react-i18next';
// END: i18n import

// START: i18n runtime (za trenutnu promenu jezika iz headera)
import i18n from '../../i18n';
// END: i18n runtime

const getLangShort = (code) => {
  if (!code) return 'SR';
  return code.slice(0, 2).toUpperCase();
};

// START: jezici - lista i modal helper
const LANGUAGES = [
  { code: 'sr', label: '🇷🇸 Srpski' },
  { code: 'en', label: '🇬🇧 English' },
  // START: Dodato – francuski
  { code: 'fr', label: '🇫🇷 Français' },
  // END: Dodato – francuski
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
];
// END: jezici - lista i modal helper

const SoundMasterToggle = () => {
  const { isPlaying, mute, unmute } = useMusic();
  // START: i18n hook (accessibility)
  const { t } = useTranslation(['common']);
  // END: i18n hook (accessibility)
  return (
    <TouchableOpacity
      style={styles.soundButton}
      onPress={isPlaying ? mute : unmute}
      accessibilityLabel={isPlaying ? t('common:accessibility.soundOff') : t('common:accessibility.soundOn')}
    >
      <Text style={styles.soundIcon}>{isPlaying ? '🔊' : '🔇'}</Text>
    </TouchableOpacity>
  );
};

const DukatiTreasure = React.forwardRef(({ onPress }, ref) => {
  const { dukati, loading, fetchDukatiSaServera } = useDukati();
  const scale = useRef(new Animated.Value(1)).current;
  const prevDukati = useRef(dukati);
  const { t } = useTranslation(['common']);

  useEffect(() => {
    if (prevDukati.current !== dukati) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 170, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      prevDukati.current = dukati;
    }
  }, [dukati]);

  return (
    <TouchableOpacity
      ref={ref}
      style={styles.treasureBox}
      onPress={fetchDukatiSaServera}
      accessibilityLabel={t('common:accessibility.coins')}
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

const TarotHeader = ({
  onMenu,
  showMenu = true,
  showBack = false,
  onBack,
  onHome,
  // START: sinhronizacija sa i18n – bez defaulta, čita se iz hook-a
  /* PRETHODNO:
    // START: default sa i18n.language (da bedž prati runtime jezik)
    currentLanguage = i18n?.language || 'sr',
    // END: default sa i18n.language
  */
  currentLanguage,
  // END: sinhronizacija sa i18n
  onSelectLanguage,
  isHome,
  onTreasurePress,
  swapTreasureMenu = false,
}) => {
  // START: sinhronizacija jezika – koristimo reaktivan i18n iz hook-a
  const { t, i18n: i18next } = useTranslation(['common']);
  const langToShow = i18next?.language || currentLanguage || 'sr';
  // END: sinhronizacija jezika – koristimo reaktivan i18n iz hook-a

  // Lokalni modal za header jezik
  const [langModal, setLangModal] = useState(false);

  const handlePickLanguage = async (lang) => {
    try { i18n.changeLanguage(lang.code); } catch { }
    try { onSelectLanguage?.(lang); } catch { }
    setLangModal(false);
  };

  return (
    <>
      <TarotHeaderBanner />
      <View style={styles.header}>
        {!swapTreasureMenu ? (
          <>
            <DukatiTreasure ref={useTreasureRef()} onPress={onTreasurePress} />
            {showMenu && (
              <TouchableOpacity
                onPress={onMenu}
                style={styles.iconButton}
                accessibilityLabel={t('common:accessibility.menu')}
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
                accessibilityLabel={t('common:accessibility.menu')}
              >
                <Icon name="menu" size={36} color="#facc15" />
              </TouchableOpacity>
            )}
            <DukatiTreasure ref={useTreasureRef()} onPress={onTreasurePress} />
          </>
        )}

        {showBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconButton}
            accessibilityLabel={t('common:accessibility.back')}
          >
            <Icon name="arrow-left" size={36} color="#facc15" />
          </TouchableOpacity>
        )}

        <View style={styles.center}>
          {!isHome && (
            <TouchableOpacity
              onPress={onHome}
              style={styles.iconButton}
              accessibilityLabel={t('common:accessibility.home')}
            >
              <Icon name="home" size={36} color="#facc15" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.right}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setLangModal(true)}
            accessibilityLabel={t('common:accessibility.language')}
          >
            {/* START: bedž sada prati runtime promenu iz Podesavanja */}
            <Text style={styles.langText}>{getLangShort(langToShow)} ▼</Text>
            {/* END: bedž sada prati runtime promenu iz Podesavanja */}
          </TouchableOpacity>
          <SoundMasterToggle />
        </View>
      </View>

      {/* Modal za izbor jezika u headeru */}
      <Modal
        visible={langModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModal(false)}
      >
        <View style={styles.langModalBg}>
          <View style={styles.langModalBox}>
            <Text style={styles.langTitle}>
              {t('common:titles.selectLanguage', { defaultValue: 'Izaberi jezik' })}
            </Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.langOption}
                onPress={() => handlePickLanguage(lang)}
              >
                <Text style={styles.langOptionText}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setLangModal(false)} style={{ marginTop: 12 }}>
              <Text style={[styles.langOptionText, { color: '#facc15', fontWeight: 'bold' }]}>
                {t('common:buttons.close', { defaultValue: 'Zatvori' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: 36,
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
  langModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langModalBox: {
    minWidth: 260,
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#facc15',
  },
  langTitle: {
    color: '#fffbe7',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1.05,
    textAlign: 'center',
  },
  langOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderBottomColor: '#393939',
    borderBottomWidth: 1,
  },
  langOptionText: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TarotHeader;
