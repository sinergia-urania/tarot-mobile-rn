// src/components/SidebarMenu.jsx
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthProvider';
import MembershipModal from "../pages/MembershipModal";
import ProfilModal from './ProfilModal'; // prilagodi putanju ako treba

// START: DukatiContext centralizovan import
import { useDukati } from '../context/DukatiContext';
// END

// START: i18n import
import { useTranslation } from 'react-i18next';
// END: i18n import

// START: haptics + click SFX (isti osećaj kao na StaticDocScreen)
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

/* START: helperi – bezbedno otvaranje linkova za dokumente */
const INFOHELM_BASE = 'https://infohelm.org';
const SLUGS = {
  privacy: 'privacy-policy',
  dataDeletion: 'data-deletion',
  terms: 'terms-of-service',
  // disclaimer: 'disclaimer' // po potrebi
};
const deriveExternalUrl = (docId, lang2 = 'en') => {
  const slug = SLUGS[docId];
  if (!slug) return '';
  // specijalni fallback: Terms nema FR → preusmeri na EN
  const missingPerLang = { terms: new Set(['fr']) };
  const realLang = missingPerLang[docId]?.has(lang2) ? 'en' : lang2;
  return `${INFOHELM_BASE}/${slug}-${realLang}.html`;
};
/* END: helperi */

// START: i18n PravnaModal
const PravnaModal = ({ visible, onClose, navigation, openDoc }) => {
  const { t } = useTranslation(['common']);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sectionModal}>
        <Text style={styles.sectionTitle}>📜 {t('common:legal.title', { defaultValue: 'Pravna dokumenta' })}</Text>

        <TouchableOpacity
          onPress={async () => { await playUiClick(); onClose(); openDoc?.('disclaimer'); }}
          accessibilityLabel={t('common:legal.disclaimer', { defaultValue: 'Odricanje od odgovornosti' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:legal.disclaimer', { defaultValue: 'Odricanje od odgovornosti' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => { await playUiClick(); onClose(); openDoc?.('terms'); }}
          accessibilityLabel={t('common:legal.terms', { defaultValue: 'Uslovi korišćenja' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:legal.terms', { defaultValue: 'Uslovi korišćenja' })}</Text>
        </TouchableOpacity>

        {/* Politika privatnosti */}
        <TouchableOpacity
          onPress={async () => { await playUiClick(); onClose(); openDoc?.('privacy'); }}
          accessibilityLabel={t('common:legal.privacy', { defaultValue: 'Politika privatnosti' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:legal.privacy', { defaultValue: 'Politika privatnosti' })}</Text>
        </TouchableOpacity>

        {/* Brisanje podataka */}
        <TouchableOpacity
          onPress={async () => { await playUiClick(); onClose(); openDoc?.('dataDeletion'); }}
          accessibilityLabel={t('common:legal.dataDeletion', { defaultValue: 'Brisanje podataka' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:legal.dataDeletion', { defaultValue: 'Brisanje podataka' })}</Text>
        </TouchableOpacity>

        {/* Kontakt */}
        <TouchableOpacity
          onPress={async () => { await playUiClick(); onClose(); openDoc?.('contact'); }}
          accessibilityLabel={t('common:legal.contact', { defaultValue: 'Kontakt' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:legal.contact', { defaultValue: 'Kontakt' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sectionCloseBtn}
          onPress={async () => { await playUiClick(); onClose(); }}
          accessibilityLabel={t('common:buttons.close', { defaultValue: 'Zatvori' })}
          accessibilityRole="button"
        >
          <Text style={[styles.text, { color: '#facc15' }]}>{t('common:buttons.close', { defaultValue: 'Zatvori' })}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};
// END: i18n PravnaModal

const SidebarMenu = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user, profile, logout, fetchProfile } = useAuth();
  const {
    loading,
    dukati: contextDukati,
    userPlan,
    fetchDukatiSaServera,
    refreshUserPlan,
  } = useDukati();

  // START: i18n hook
  const { t, i18n } = useTranslation(['common']);
  // END: i18n hook

  const [activeSection, setActiveSection] = useState(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  // Reset sekcije na zatvaranje
  useEffect(() => {
    if (!visible) setActiveSection(null);
  }, [visible]);

  // Osveži profil/dukate/plan kad se meni otvori ili promeni user
  useEffect(() => {
    if (!visible) return;
    (async () => {
      try { await fetchProfile?.(); } catch { }
      try { await refreshUserPlan?.(); } catch { }
      try { await fetchDukatiSaServera?.(); } catch { }
    })();
  }, [visible, user?.id]);

  // START: centralna navigacija ka postojećim ekranima (bez "StaticDoc")
  const openDoc = async (docId) => {
    await playUiClick();
    onClose?.();
    if (docId === 'about') { navigation.navigate('OAplikaciji'); return; }
    if (docId === 'disclaimer') { navigation.navigate('Odricanje'); return; }
    if (docId === 'terms') { navigation.navigate('Uslovi'); return; }
    if (docId === 'contact') { navigation.navigate('Kontakt'); return; }
    const lang2 = (i18n?.language || 'en').slice(0, 2);
    const external = deriveExternalUrl(docId, lang2);
    if (external) Linking.openURL(external);
  };
  // END: centralna navigacija ka postojećim ekranima (bez "StaticDoc")

  const handleLogout = async () => {
    await playUiClick();
    setActiveSection(null);
    onClose?.();
    try {
      await logout();
    } finally {
      navigation.navigate('Home');
    }
  };

  const handleLogin = async () => {
    await playUiClick();
    onClose?.();
    navigation.navigate('Login');
  };

  const requireLogin = (fn) => async () => {
    await playUiClick();
    if (!user?.id) {
      onClose?.();
      navigation.navigate('Login');
      return;
    }
    fn?.();
  };

  const renderStatusBadge = () => {
    if (!user) return <Text style={styles.statusBadgeGuest}>🟢 {t('common:membership.packages.guest', { defaultValue: 'Gost' })}</Text>;
    if (userPlan === 'premium') return <Text style={styles.statusBadgePremium}>🟡 {t('common:membership.packages.premium', { defaultValue: 'Premium' })}</Text>;
    if (userPlan === 'pro') return <Text style={styles.statusBadgePro}>🔵 {t('common:membership.packages.pro', { defaultValue: 'Pro' })}</Text>;
    return <Text style={styles.statusBadgeFree}>⚪ {t('common:membership.packages.free', { defaultValue: 'Free' })}</Text>;
  };

  const renderUserBox = () => {
    if (loading && user) {
      return (
        <View style={styles.userBox}>
          <ActivityIndicator color="#facc15" size="small" style={{ marginVertical: 6 }} />
        </View>
      );
    }

    if (!user) {
      return (
        <View style={styles.userBox}>
          <Text style={styles.userName}>{t('common:membership.packages.guest', { defaultValue: 'Gost' })}</Text>
          <View style={styles.statusBox}>{renderStatusBadge()}</View>
          <Text style={{ color: "#aaa", marginTop: 5, fontSize: 14 }}>
            {t('common:messages.notLoggedInBlurb', {
              defaultValue: 'Niste prijavljeni. Prijavite se da biste koristili AI i skupljali dukate!'
            })}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.userBox}>
        <Text style={styles.userName}>{profile?.display_name || user?.email || t('common:labels.user', { defaultValue: 'Korisnik' })}</Text>
        <Text style={styles.dukati}>💰 {t('common:labels.coins', { defaultValue: 'Dukati' })}: {contextDukati ?? '-'}</Text>
        <View style={styles.statusBox}>{renderStatusBadge()}</View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1} />
      <View style={styles.menu}>
        {renderUserBox()}

        {/* 👤 Profil – traži login */}
        <TouchableOpacity
          style={styles.item}
          onPress={requireLogin(() => setActiveSection('profil'))}
          accessibilityLabel={t('common:home.menu.profile', { defaultValue: 'Profil' })}
          accessibilityRole="button"
        >
          <Text style={styles.text}>👤 {t('common:home.menu.profile', { defaultValue: 'Profil' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={async () => { await playUiClick(); onClose?.(); navigation.navigate('Podesavanja'); }}
          accessibilityLabel={t('common:home.menu.settings', { defaultValue: 'Podešavanja' })}
          accessibilityRole="button"
        >
          <Text style={styles.text}>⚙️ {t('common:home.menu.settings', { defaultValue: 'Podešavanja' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={async () => { await playUiClick(); onClose?.(); navigation.navigate('OAplikaciji'); }}
          accessibilityLabel={t('common:home.menu.about', { defaultValue: 'O aplikaciji' })}
          accessibilityRole="button"
        >
          <Text style={styles.text}>📖 {t('common:home.menu.about', { defaultValue: 'O aplikaciji' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={async () => { await playUiClick(); setActiveSection('podrzi'); }}
          accessibilityLabel={t('common:support.title', { defaultValue: 'Podrži aplikaciju' })}
          accessibilityRole="button"
        >
          <Text style={styles.text}>🌟 {t('common:support.title', { defaultValue: 'Podrži aplikaciju' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={async () => { await playUiClick(); setActiveSection('pravna'); }}
          accessibilityLabel={t('common:legal.title', { defaultValue: 'Pravna dokumenta' })}
          accessibilityRole="button"
        >
          <Text style={styles.text}>📜 {t('common:legal.title', { defaultValue: 'Pravna dokumenta' })}</Text>
        </TouchableOpacity>

        {/* 💎 Paketi – traži login */}
        <TouchableOpacity
          style={styles.item}
          onPress={requireLogin(() => setShowMembershipModal(true))}
          accessibilityLabel={t('common:home.menu.packagesAccess', { defaultValue: 'Pristup i paketi' })}
          accessibilityRole="button"
        >
          <Text style={[styles.text, { color: "#ffd700", fontWeight: "bold" }]}>💎 {t('common:home.menu.packagesAccess', { defaultValue: 'Pristup i paketi' })}</Text>
        </TouchableOpacity>

        {/* Prijava / Odjava */}
        {!user ? (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogin} accessibilityLabel={t('common:buttons.login', { defaultValue: 'Prijavi se' })} accessibilityRole="button">
            <Text style={[styles.text, { color: '#4ade80' }]}>{t('common:buttons.login', { defaultValue: 'Prijavi se' })}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} accessibilityLabel={t('common:buttons.logout', { defaultValue: 'Odjavi se' })} accessibilityRole="button">
            <Text style={[styles.text, { color: '#f87171' }]}>{t('common:buttons.logout', { defaultValue: 'Odjavi se' })}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={async () => { await playUiClick(); onClose?.(); }}
          accessibilityLabel={t('common:buttons.close', { defaultValue: 'Zatvori' })}
          accessibilityRole="button"
        >
          <Text style={[styles.text, { color: '#facc15' }]}>{t('common:buttons.close', { defaultValue: 'Zatvori' })}</Text>
        </TouchableOpacity>

        {/* MODALI */}
        <ProfilModal
          visible={activeSection === 'profil'}
          onClose={() => setActiveSection(null)}
          user={user}
          profile={profile}
          dukati={contextDukati ?? '-'}
          status={userPlan ?? 'free'}
          loading={loading}
          fetchProfile={fetchProfile}
          logout={logout}
        />

        <PodrziModal
          visible={activeSection === 'podrzi'}
          onClose={() => setActiveSection(null)}
        />

        <PravnaModal
          visible={activeSection === 'pravna'}
          onClose={() => setActiveSection(null)}
          navigation={navigation}
          openDoc={openDoc}
        />

        <MembershipModal
          visible={showMembershipModal}
          onClose={() => setShowMembershipModal(false)}
        />
      </View>
    </Modal>
  );
};

const PodrziModal = ({ visible, onClose }) => {
  const { t } = useTranslation(['common']);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.sectionModal}>
        <Text style={styles.sectionTitle}>🌟 {t('common:support.title', { defaultValue: 'Podrži aplikaciju' })}</Text>

        <TouchableOpacity
          onPress={async () => {
            await playUiClick();
            Linking.openURL('https://play.google.com/store/apps/details?id=com.mare82.tarotmobile');
          }}
          accessibilityLabel={t('common:support.rateUs', { defaultValue: 'Oceni nas' })}
          accessibilityRole="link"
        >
          <Text style={styles.sectionText}>- {t('common:support.rateUs', { defaultValue: 'Oceni nas' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            await playUiClick();
            try {
              await Share.share({
                message: t('common:support.shareMessage', {
                  defaultValue: 'Probaj Tarot AI aplikaciju! https://play.google.com/store/apps/details?id=com.mare82.tarotmobile'
                })
              });
            } catch { }
          }}
          accessibilityLabel={t('common:support.shareToFriends', { defaultValue: 'Podeli prijateljima' })}
          accessibilityRole="button"
        >
          <Text style={styles.sectionText}>- {t('common:support.shareToFriends', { defaultValue: 'Podeli prijateljima' })}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sectionCloseBtn}
          onPress={async () => { await playUiClick(); onClose?.(); }}
          accessibilityLabel={t('common:buttons.close', { defaultValue: 'Zatvori' })}
          accessibilityRole="button"
        >
          <Text style={[styles.text, { color: '#facc15' }]}>{t('common:buttons.close', { defaultValue: 'Zatvori' })}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 260,
    height: '100%',
    backgroundColor: 'black',
    paddingVertical: 36,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    elevation: 8,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  userBox: {
    marginBottom: 24,
    alignItems: 'flex-start',
    borderBottomColor: '#232323',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
  },
  dukati: {
    color: '#facc15',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusBox: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeFree: {
    color: '#fff',
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  statusBadgePremium: {
    color: '#fff',
    backgroundColor: '#eab308',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  statusBadgePro: {
    color: '#fff',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  statusBadgeGuest: {
    color: '#fff',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  item: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  text: {
    color: '#fff',
    fontSize: 17,
  },
  logoutBtn: {
    marginTop: 28,
    alignItems: 'center',
  },
  closeBtn: {
    marginTop: 8,
    alignItems: 'center',
  },
  // --- Stilovi za sekcione modale ---
  sectionModal: {
    position: 'absolute',
    top: 56,
    left: 28,
    width: 240,
    minHeight: 300,
    backgroundColor: '#171717',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    elevation: 12,
    alignItems: 'flex-start',
  },
  sectionTitle: {
    color: '#facc15',
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 14,
  },
  sectionCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#333',
  },
});

export default SidebarMenu;
