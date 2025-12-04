// src/pages/Podesavanja.jsx
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import * as RNLocalize from 'react-native-localize';
import i18n from '../../i18n';
import SoundSettings from '../components/SoundSettings';
import { useAuth } from '../context/AuthProvider';
import { useMusic } from '../context/MusicProvider';
import { registerForPushNotificationsAsync } from '../utils/pushNotifications';
import { supabase } from '../utils/supabaseClient';
// START: centralni handler za jezik (i18n + Supabase)
import useChangeLanguage from '../hooks/useChangeLanguage';
// END: centralni handler

// ⬇️ zajedničke konstante/helperi za jezike
import {
  LANGUAGES as SHARED_LANGUAGES,
  SUPPORTED_LANGS,
  getBaseLang,
} from '../constants/languages';

const SHOW_DEBUG = process.env.EXPO_PUBLIC_DEBUG_UI === '1';

async function sendExpoPushAndGetTicket({ token, payload }) {
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, ...payload }),
  });
  const json = await res.json();
  const ticket = json?.data?.id || json?.data?.[0]?.id;
  return { json, ticket };
}

async function fetchExpoReceipts(ticketIds) {
  const res = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ticketIds }),
  });
  return res.json();
}

// Govorna područja za auto-jezik (dopunjeno TR/ID)
const REGION_LANG_MAP = {
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
  tr: new Set(['TR']),
  id: new Set(['ID']),
};

// Auto-predlog jezika sa uređaja (koristi SUPPORTED_LANGS iz shared fajla)
const suggestLanguageFromDevice = () => {
  try {
    const loc = RNLocalize.getLocales()?.[0];
    const languageCode = loc?.languageCode?.toLowerCase();
    const countryCode = loc?.countryCode?.toUpperCase();

    if (languageCode && SUPPORTED_LANGS.includes(languageCode)) {
      return languageCode;
    }
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

const Podesavanja = () => {
  const navigation = useNavigation();
  const { t } = useTranslation(['common']);
  const { testMusic } = useMusic();

  const { user, refreshUser, profile, fetchProfile } = useAuth();
  const [notifications, setNotifications] = useState(user?.notifications_enabled ?? true);
  const [notifSaving, setNotifSaving] = useState(false);

  const [savingAll, setSavingAll] = useState(false); // ⬅️ novo: indikator za "Sačuvaj"

  const upisiPushToken = async () => {
    let token = null;
    try {
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req?.status;
      }
      if (status !== 'granted') {
        Alert.alert(
          t('common:push.titleTest', { defaultValue: 'Push test' }),
          t('common:push.permDenied', { defaultValue: 'Dozvole za notifikacije nisu odobrene.' })
        );
        return;
      }
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        Constants?.expoConfig?.projectId ??
        undefined;

      const { data: expoToken } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = expoToken;
    } catch { }

    if (!token) {
      try { token = await registerForPushNotificationsAsync(); } catch { }
    }
    if (!token) {
      Alert.alert(
        t('common:push.titleTest', { defaultValue: 'Push test' }),
        t('common:push.noToken', { defaultValue: 'Nema tokena (proveri dozvole/FCM).' })
      );
      return;
    }

    const userId = user?.id;
    if (!userId) {
      Alert.alert(
        t('common:push.titleTest', { defaultValue: 'Push test' }),
        t('common:push.noUserId', { defaultValue: 'Nema user id!' })
      );
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      Alert.alert(
        t('common:push.titleTest', { defaultValue: 'Push test' }),
        t('common:push.tokenWriteFail', { defaultValue: 'Token NIJE upisan!' }) + '\n' + error.message
      );
    } else {
      if (fetchProfile) fetchProfile();
    }
  };

  const testLocalNotif = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('common:push.localTitle', { defaultValue: 'LOKALNO ✅' }),
        body: t('common:push.localBody', { defaultValue: 'Lokalna notifikacija (foreground/pozadina)' }),
        sound: "default"
      },
      trigger: null,
    });
  };

  const testRemoteNotif = async () => {
    const token = profile?.expo_push_token;
    if (!token) {
      Alert.alert('Remote test', t('common:push.profileNoToken', { defaultValue: "Nema tokena u profilu. Pritisni prvo 'Test push token upis'." }));
      return;
    }
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: token,
          title: t('common:push.remoteTitle', { defaultValue: 'REMOTE ✅' }),
          body: t('common:push.remoteBody', { defaultValue: 'Expo push (odmah po slanju)' }),
          sound: "default",
          channelId: "alerts-high",
          priority: "high",
        }),
      });
      const json = await res.json();
      const id = json?.data?.id || json?.data?.[0]?.id;
      if (!id) {
        Alert.alert('Remote test', t('common:push.notAccepted', { defaultValue: 'Push nije prihvaćen:' }) + '\n' + JSON.stringify(json));
      }
    } catch (e) {
      Alert.alert('Remote test', t('common:push.sendError', { defaultValue: 'Greška pri slanju: ' }) + (e?.message || e));
    }
  };

  const debugNotifikacije = async () => {
    try {
      const perms = await Notifications.getPermissionsAsync();
      const channels = await Notifications.getNotificationChannelsAsync();
      const msg =
        `status=${perms?.status}, granted=${perms?.granted}\n` +
        (channels || [])
          .map(c => `${c.id} (name=${c.name}) importance=${c.importance} sound=${c.sound || 'default'}`)
          .join('\n');
      Alert.alert(t('common:push.debugTitle', { defaultValue: 'Debug notifikacija' }), msg || 'n/a');
    } catch (e) {
      Alert.alert('Debug', e?.message || String(e));
    }
  };

  const testLokalnoPozadina = async () => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('common:push.localBgTitle', { defaultValue: 'LOCAL 🔔' }),
          body: t('common:push.localBgBody', { defaultValue: 'Pozadinski lokalni test' }),
          sound: 'default'
        },
        trigger: { seconds: 5, channelId: 'alerts-high' },
      });
      Alert.alert('Local test', t('common:push.scheduled5s', { defaultValue: 'Zakazano za 5s — minimizuj app sada.' }));
    } catch (e) {
      Alert.alert('Local test', e?.message || String(e));
    }
  };

  const showFcmToken = async () => {
    const devTok = await Notifications.getDevicePushTokenAsync();
    Alert.alert(t('common:push.fcmTitle', { defaultValue: 'FCM token (uređaj)' }), devTok?.data || "(nema)");
  };

  const handleToggleNotifications = async (newValue) => {
    setNotifications(newValue);
    setNotifSaving(true);
    const userId = user?.id;
    if (!userId) {
      setNotifSaving(false);
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({ notifications_enabled: newValue })
      .eq('id', userId);
    if (error) {
      Alert.alert(t('common:errors.genericTitle', { defaultValue: 'Greška' }), t('common:errors.updateNotifFail', { defaultValue: 'Nije moguće ažurirati notifikacije.' }));
      setNotifications(!newValue);
    }
    setNotifSaving(false);
    if (refreshUser) refreshUser();
    if (newValue) await upisiPushToken();
  };

  const [langModal, setLangModal] = useState(false);
  // START: centralni handler
  const { changeLanguage } = useChangeLanguage();
  // END: centralni handler

  // Inicijalni jezik: profil ili auto sa uređaja
  const initialLang = getBaseLang(profile?.language || suggestLanguageFromDevice());
  const [language, setLanguage] = useState(initialLang);

  // Sync sa profilom kada se učita/izmeni
  useEffect(() => {
    if (profile?.language) setLanguage(getBaseLang(profile.language));
  }, [profile?.language]);

  // START: osluškuj promenu jezika i iz Header-a (ili bilo gde)
  useEffect(() => {
    const handler = (lng) => setLanguage(getBaseLang(lng || 'en'));
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);
  // END: osluškuj promenu jezika i iz Header-a (ili bilo gde)

  // Prvi upis auto-izbora u profil (ako je prazan)
  useEffect(() => {
    if (user?.id && !profile?.language) {
      const deviceTag = RNLocalize.getLocales()?.[0]?.languageTag;
      const langToSave = getBaseLang(language || 'en');
      supabase
        .from('profiles')
        .update({ language: langToSave, device_locale: deviceTag })
        .eq('id', user.id);
    }
  }, [user?.id, profile?.language, language]);

  const baseLang = getBaseLang(language);
  const languageLabel =
    SHARED_LANGUAGES.find(l => getBaseLang(l.code) === baseLang)?.label || 'Jezik';

  // ⬇️ centralni "Sačuvaj sve" — idempotentno potvrđuje jezik + notifikacije
  const saveAllSettings = async () => {
    if (!user?.id) return;
    setSavingAll(true);
    try {
      const updates = {
        notifications_enabled: !!notifications,
        language: baseLang,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;

      if (notifications) {
        await upisiPushToken(); // osiguraj token upis ako je uključeno
      }
      if (fetchProfile) await fetchProfile();

      Alert.alert(
        t('common:messages.successTitle', { defaultValue: 'Uspeh!' }),
        t('common:messages.profileSaved', { defaultValue: 'Profil je sačuvan!' })
      );
    } catch (e) {
      Alert.alert(
        t('common:errors.genericTitle', { defaultValue: 'Greška' }),
        t('common:errors.updateNotifFail', { defaultValue: 'Nije moguće ažurirati notifikacije.' })
      );
    } finally {
      setSavingAll(false);
    }
  };

  if (!user || !user.id) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#fff', fontSize: 18, marginTop: 50, textAlign: 'center' }}>
          {t('common:messages.notLoggedInSettings', { defaultValue: 'Niste prijavljeni. Prijavite se da biste pristupili podešavanjima.' })}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Naslov */}
      <Text style={styles.title}>{t('common:titles.settings', { defaultValue: 'Podešavanja' })}</Text>

      {/* Sekcija: ime */}
      <View style={styles.section}>
        <Text style={styles.label}>{t('common:labels.currentName', { defaultValue: 'Trenutno ime:' })}</Text>
        <Text style={styles.displayName}>
          {profile?.display_name
            || user?.email?.split("@")[0]
            || t('common:messages.nameNotSet', { defaultValue: 'Niste uneli ime' })}
        </Text>
      </View>

      {/* Sekcija: zvuk + notifikacije + jezik */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('common:titles.sound', { defaultValue: 'Zvuk' })}</Text>
        <SoundSettings />

        {SHOW_DEBUG && (
          <>
            <TouchableOpacity style={{ backgroundColor: '#facc15', padding: 12, borderRadius: 7, marginTop: 30 }} onPress={upisiPushToken}>
              <Text style={{ color: '#232323', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnWriteToken', { defaultValue: 'Test push token upis' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#2e7d32', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testLocalNotif}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnLocal', { defaultValue: 'Test notifikacija (lokalno)' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#1565c0', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testRemoteNotif}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnRemote', { defaultValue: 'Test notifikacija (remote)' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#444', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={showFcmToken}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnShowFcm', { defaultValue: 'Prikaži FCM token (device)' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#8b5cf6', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={debugNotifikacije}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnDebug', { defaultValue: 'Debug notifikacije' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#0ea5e9', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testLokalnoPozadina}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnLocalBg', { defaultValue: 'Test lokalno (pozadina)' })}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: '#8e24aa', padding: 12, borderRadius: 7, marginTop: 10 }}
              onPress={() => { try { testMusic(); } catch { } }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Test zvuk (muzika)</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>{t('common:labels.notifications', { defaultValue: 'Notifikacije' })}</Text>
          <Switch
            value={notifications}
            onValueChange={handleToggleNotifications}
            thumbColor={notifications ? "#facc15" : "#333"}
            trackColor={{ false: "#444", true: "#facc15" }}
            disabled={notifSaving}
          />
        </View>

        {/* Jezik dropdown (koristi shared listu) */}
        <TouchableOpacity
          style={styles.langDropdown}
          onPress={() => setLangModal(true)}
        >
          <Text style={styles.toggleText}>{t('common:labels.language', { defaultValue: 'Jezik:' })}</Text>
          <Text style={styles.selectedLang}>{languageLabel} ▼</Text>
        </TouchableOpacity>

        {/* Modal za izbor jezika */}
        <Modal
          visible={langModal}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModal(false)}
        >
          <View style={styles.langModalBg}>
            <View style={styles.langModalBox}>
              <Text style={styles.sectionTitle}>{t('common:titles.selectLanguage', { defaultValue: 'Izaberi jezik' })}</Text>

              {SHARED_LANGUAGES.map(lang => {
                const isSelected = getBaseLang(lang.code) === baseLang;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langOption, isSelected && { backgroundColor: '#1f2937' }]}
                    onPress={async () => {
                      const next = getBaseLang(lang.code);
                      setLanguage(next);
                      setLangModal(false);
                      // START: jedan izvor istine – zajednički handler
                      try { await changeLanguage(next); }
                      catch { try { i18n.changeLanguage(next); } catch { } }
                      // END: jedan izvor istine – zajednički handler
                    }}
                  >
                    <Text style={styles.selectedLang}>
                      {lang.label}{isSelected ? '  ✓' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity onPress={() => setLangModal(false)}>
                <Text style={[styles.selectedLang, { color: '#facc15', marginTop: 16 }]}>
                  {t('common:buttons.close', { defaultValue: 'Zatvori' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ⬇️ SAČUVAJ — u tamnom okviru, odmah ispod jezika */}
        <TouchableOpacity
          style={styles.sectionCloseBtn}
          onPress={saveAllSettings}
          accessibilityRole="button"
          accessibilityLabel={t('common:buttons.saveProfile', { defaultValue: 'Sačuvaj profil' })}
          disabled={savingAll}
          testID="settings-save-bottom"
        >
          <Text style={{ color: savingAll ? '#bfbfbf' : '#facc15', fontWeight: 'bold' }}>
            {savingAll
              ? t('common:messages.loading', { defaultValue: 'Čekaj...' })
              : t('common:buttons.saveProfile', { defaultValue: 'Sačuvaj profil' })}
          </Text>
        </TouchableOpacity>

        {/* ⬇️ ZATVORI — ispod Sačuvaj */}
        <TouchableOpacity
          style={styles.sectionCloseBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('common:buttons.close', { defaultValue: 'Zatvori' })}
          testID="settings-close-bottom"
        >
          <Text style={{ color: '#facc15', fontWeight: 'bold' }}>
            {t('common:buttons.close', { defaultValue: 'Zatvori' })}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 20,
  },
  title: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    letterSpacing: 1.3,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '92%',
    flexWrap: 'wrap',
    lineHeight: 32,
  },
  section: {
    backgroundColor: '#222127',
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#c9ad6a',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    color: '#fffbe7',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1.1,
    flexWrap: 'wrap',
    lineHeight: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
    flexShrink: 1,
    maxWidth: '75%',
    paddingRight: 12,
    lineHeight: 20,
  },
  langDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: '#232323',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  selectedLang: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  langModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langModalBox: {
    minWidth: 280,
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#232323',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  langOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderBottomColor: '#393939',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },
  label: {
    color: "#facc15",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  displayName: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 6,
    fontWeight: "600",
  },
  // zajednički “tamni okvir” CTA
  sectionCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#333',
  },
});

export default Podesavanja;
