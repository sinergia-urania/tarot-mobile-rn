

// START: Nova podešavanja - obrnutih karata, notifikacije, jezik
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
// START: Test zvuk (muzika)
import { useMusic } from '../context/MusicProvider';
// END: Test zvuk (muzika)

import { Alert, Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'; // START: Dodato Alert
// START: push - dodato: import Notifications za lokalni/remote test
import * as Notifications from 'expo-notifications';
// END: push - import
// START: auto-jezik - import RNLocalize
import * as RNLocalize from 'react-native-localize';
// END: auto-jezik - import RNLocalize
// START: token sa projectId
import Constants from 'expo-constants';
// END: token sa projectId
import SoundSettings from '../components/SoundSettings';
import { useAuth } from '../context/AuthProvider'; // ili odakle već vučeš user podatke
// START: Import supabase za ON/OFF notifikacije
import { supabase } from '../utils/supabaseClient';
// ...ostale import-e ostavi
import { registerForPushNotificationsAsync } from '../utils/pushNotifications'; // Dodaj na vrh

// START: i18n hook + runtime promena jezika
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
// END: i18n hook + runtime promena jezika

// START: Debug UI preklopnik (sakrivanje test dugmadi)
const SHOW_DEBUG = process.env.EXPO_PUBLIC_DEBUG_UI === '1';
// END: Debug UI preklopnik (sakrivanje test dugmadi)

// START: push receipts helpers
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
// END: push receipts helpers

// START: Dropdown modal helper — DODAT FR
const LANGUAGES = [
  { code: 'sr', label: '🇷🇸 Srpski' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' }, // START: FR dodato
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'hi', label: '🇮🇳 हिन्दी' },
];
// END: Dropdown modal helper — DODAT FR

// START: auto-jezik - mapiranja i helper — DODAT FR
const SUPPORTED_LANGS = ['en', 'sr', 'es', 'pt', 'de', 'hi', 'fr'];

const REGION_LANG_MAP = {
  sr: new Set(['RS', 'BA', 'HR', 'ME']), // Srbija, BiH, Hrvatska, CG
  hi: new Set(['IN']),                   // Indija → hindi
  de: new Set(['DE', 'AT', 'CH', 'LI', 'LU']), // nemačko govorno područje
  es: new Set([
    'ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'UY', 'PY', 'BO',
    'CR', 'SV', 'GT', 'HN', 'NI', 'PA', 'DO', 'PR'
  ]),
  pt: new Set(['PT', 'BR', 'AO', 'MZ', 'GW', 'CV', 'ST', 'TL']),
  fr: new Set(['FR', 'BE', 'CH', 'LU', 'MC']), // START: FR govorno područje (bez CA da ne preglasamo EN)
  // engleski — velika lista zemalja gde je engleski primarni / široko korišćen
  en: new Set([
    'US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'SG', 'PH', 'MY', 'HK',
    'ZA', 'NG', 'KE', 'GH', 'JM', 'TT', 'BZ', 'MT'
  ]),
};

const suggestLanguageFromDevice = () => {
  try {
    const loc = RNLocalize.getLocales()?.[0];
    const languageCode = loc?.languageCode?.toLowerCase();
    const countryCode = loc?.countryCode?.toUpperCase();

    // 1) Jezik uređaja je već tačno jedan od podržanih?
    if (languageCode && SUPPORTED_LANGS.includes(languageCode)) {
      return languageCode;
    }

    // 2) Mapiranje po zemlji (govorno područje)
    if (countryCode) {
      for (const [lang, set] of Object.entries(REGION_LANG_MAP)) {
        if (set.has(countryCode)) return lang;
      }
    }

    // 3) Fallback — engleski
    return 'en';
  } catch {
    return 'en';
  }
};
// END: auto-jezik - mapiranja i helper — DODAT FR

const Podesavanja = () => {
  const navigation = useNavigation();
  // START: i18n hook
  const { t } = useTranslation(['common']);
  // END: i18n hook
  // START: Test zvuk (muzika) hook
  const { testMusic } = useMusic();
  // END: Test zvuk (muzika) hook

  const { user, refreshUser, profile, fetchProfile } = useAuth();
  // Switch/ceker stanja, default ON
  const [notifications, setNotifications] = useState(user?.notifications_enabled ?? true);
  const [notifSaving, setNotifSaving] = useState(false);

  // Ostala stanja
  const [reversed, setReversed] = useState(true);

  // --- OVO JE NAJBOLJE MESTO ZA upisiPushToken ---
  // START: token sa projectId (stabilnije za dev-build)
  const upisiPushToken = async () => {
    console.log(">>>> Ulazim u upisiPushToken");
    let token = null;

    try {
      // 1) Dozvole
      let { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        status = req?.status;
      }
      if (status !== 'granted') {
        Alert.alert(t('common:push.titleTest', { defaultValue: 'Push test' }), t('common:push.permDenied', { defaultValue: 'Dozvole za notifikacije nisu odobrene.' }));
        return;
      }

      // 2) ProjectId → Expo token (ExponentPushToken[...])
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId ??
        Constants?.expoConfig?.projectId ??
        undefined;

      const { data: expoToken } = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = expoToken;
      console.log(">>>> Dobijen token (expo):", token, "projectId=", projectId);
    } catch (e) {
      console.log('[PUSH] token error:', e);
    }

    // 3) Fallback – tvoj util (ako nešto pođe po zlu)
    if (!token) {
      try {
        token = await registerForPushNotificationsAsync();
        console.log(">>>> Fallback token:", token);
      } catch { }
    }

    // 4) Guard
    if (!token) {
      Alert.alert(t('common:push.titleTest', { defaultValue: 'Push test' }), t('common:push.noToken', { defaultValue: 'Nema tokena (proveri dozvole/FCM).' }));
      return;
    }

    const userId = user?.id;
    console.log(">>>> userId:", userId);
    if (!userId) {
      Alert.alert(t('common:push.titleTest', { defaultValue: 'Push test' }), t('common:push.noUserId', { defaultValue: 'Nema user id!' }));
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);
    if (error) {
      Alert.alert(t('common:push.titleTest', { defaultValue: 'Push test' }), t('common:push.tokenWriteFail', { defaultValue: 'Token NIJE upisan!' }) + '\n' + error.message);
      console.log("Supabase error:", error);
    } else {
      Alert.alert(t('common:push.titleTest', { defaultValue: 'Push test' }), t('common:push.tokenWriteOk', { defaultValue: 'Token JE upisan!' }));
      console.log("Supabase OK!");
      if (fetchProfile) fetchProfile();
    }
  };
  // END: token sa projectId (stabilnije za dev-build)
  // --- KRAJ ---

  // START: push - lokalni i remote test iz app-a (prebačeno na t())
  const testLocalNotif = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('common:push.localTitle', { defaultValue: 'LOKALNO ✅' }),
        body: t('common:push.localBody', { defaultValue: 'Lokalna notifikacija (foreground/pozadina)' }),
        sound: "default"
      },
      trigger: null, // odmah
    });
  };

  // START: remote test sa ticket/receipt proverom
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
      if (id) {
        Alert.alert('Remote test', t('common:push.sentMinimize', { defaultValue: 'Poslato ✔️ — minimizuj app odmah da vidiš baner.' }));
      } else {
        Alert.alert('Remote test', t('common:push.notAccepted', { defaultValue: 'Push nije prihvaćen:' }) + '\n' + JSON.stringify(json));
      }
    } catch (e) {
      Alert.alert('Remote test', t('common:push.sendError', { defaultValue: 'Greška pri slanju: ' }) + (e?.message || e));
    }
  };

  // END: remote test sa ticket/receipt proverom

  // END: push - lokalni i remote test

  // START: Debug – permisije + kanali
  /* START: debug notifikacija – permisije i kanali */
  const debugNotifikacije = async () => {
    try {
      const perms = await Notifications.getPermissionsAsync();
      const channels = await Notifications.getNotificationChannelsAsync();
      console.log('[NOTIF][perms]', perms);
      console.log('[NOTIF][channels]', channels);
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
  /* END: debug notifikacija – permisije i kanali */
  // END: Debug – permisije + kanali

  // START: Lokalni test u pozadini (5s delay na alerts-high)
  /* START: lokalni test notifikacije – pozadina na alerts-high */
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
  /* END: lokalni test notifikacije – pozadina na alerts-high */
  // END: Lokalni test u pozadini

  // START: pomoćno dugme – prikaži FCM token uređaja
  const showFcmToken = async () => {
    const devTok = await Notifications.getDevicePushTokenAsync();
    Alert.alert(t('common:push.fcmTitle', { defaultValue: 'FCM token (uređaj)' }), devTok?.data || "(nema)");
  };
  // END: pomoćno dugme

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

    if (newValue) {
      await upisiPushToken();
    } else {
      // await supabase.from('profiles').update({ expo_push_token: null }).eq('id', userId);
    }
  };

  // Jezik dropdown
  const [langModal, setLangModal] = useState(false);
  // START: auto-jezik - inicijalna vrednost iz profila ili sa uređaja
  // const [language, setLanguage] = useState('sr'); // (zadržano radi istorije)
  const [language, setLanguage] = useState(profile?.language || suggestLanguageFromDevice());
  // END: auto-jezik - inicijalna vrednost

  // START: auto-jezik - sync sa profilom (kad se profil učita/izmeni)
  useEffect(() => {
    if (profile?.language) setLanguage(profile.language);
  }, [profile?.language]);
  // END: auto-jezik - sync sa profilom

  // START: auto-jezik - prvi upis auto-izbora u profil (device_locale)
  useEffect(() => {
    if (user?.id && !profile?.language) {
      const deviceTag = RNLocalize.getLocales()?.[0]?.languageTag;
      const langToSave = language || 'en';
      supabase
        .from('profiles')
        .update({ language: langToSave, device_locale: deviceTag })
        .eq('id', user.id);
    }
  }, [user?.id, profile?.language, language]);
  // END: auto-jezik - prvi upis auto-izbora u profil

  const languageLabel = LANGUAGES.find(l => l.code === language)?.label || 'Jezik';

  // START: Guard za neregistrovanog korisnika u Podesavanja
  if (!user || !user.id) {
    return (
      <View style={styles.container}>
        {/* START: i18n poruka za neulogovanog */}
        <Text style={{ color: '#fff', fontSize: 18, marginTop: 50, textAlign: 'center' }}>
          {t('common:messages.notLoggedInSettings', { defaultValue: 'Niste prijavljeni. Prijavite se da biste pristupili podešavanjima.' })}
        </Text>
        {/* END: i18n poruka za neulogovanog */}
      </View>
    );
  }
  // END: Guard za neregistrovanog korisnika

  return (
    <View style={styles.container}>
      {/* Back dugme (strelica) */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      {/* START: i18n naslov ekrana */}
      <Text style={styles.title}>{t('common:titles.settings', { defaultValue: 'Podešavanja' })}</Text>
      {/* END: i18n naslov ekrana */}
      <View style={styles.section}>
        {/* START: i18n labela za ime */}
        <Text style={styles.label}>{t('common:labels.currentName', { defaultValue: 'Trenutno ime:' })}</Text>
        {/* END: i18n labela za ime */}
        <Text style={styles.displayName}>
          {profile?.display_name
            || user?.email?.split("@")[0]
            // START: i18n fallback za ime
            || t('common:messages.nameNotSet', { defaultValue: 'Niste uneli ime' })}
          {/* END: i18n fallback za ime */}
        </Text>
      </View>

      <View style={styles.section}>
        {/* START: i18n naslov sekcije Zvuk */}
        <Text style={styles.sectionTitle}>{t('common:titles.sound', { defaultValue: 'Zvuk' })}</Text>
        {/* END: i18n naslov sekcije Zvuk */}
        <SoundSettings />

        {/* START: Debug UI gate – test dugmad i alati */}
        {SHOW_DEBUG && (
          <>
            <TouchableOpacity style={{ backgroundColor: '#facc15', padding: 12, borderRadius: 7, marginTop: 30 }} onPress={upisiPushToken}>
              <Text style={{ color: '#232323', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnWriteToken', { defaultValue: 'Test push token upis' })}</Text>
            </TouchableOpacity>

            {/* START: push test dugmad */}
            <TouchableOpacity style={{ backgroundColor: '#2e7d32', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testLocalNotif}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnLocal', { defaultValue: 'Test notifikacija (lokalno)' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#1565c0', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testRemoteNotif}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnRemote', { defaultValue: 'Test notifikacija (remote)' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#444', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={showFcmToken}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnShowFcm', { defaultValue: 'Prikaži FCM token (device)' })}</Text>
            </TouchableOpacity>
            {/* END: push test dugmad */}

            {/* START: nova debug/test dugmad */}
            {/* START: Debug notifikacije (permisije + kanali) */}
            <TouchableOpacity style={{ backgroundColor: '#8b5cf6', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={debugNotifikacije}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnDebug', { defaultValue: 'Debug notifikacije' })}</Text>
            </TouchableOpacity>
            {/* END: Debug notifikacije */}

            {/* START: Lokalni test u pozadini */}
            <TouchableOpacity style={{ backgroundColor: '#0ea5e9', padding: 12, borderRadius: 7, marginTop: 10 }} onPress={testLokalnoPozadina}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>{t('common:push.btnLocalBg', { defaultValue: 'Test lokalno (pozadina)' })}</Text>
            </TouchableOpacity>
            {/* END: Lokalni test u pozadini */}
            {/* END: nova debug/test dugmad */}

            {/* START: Test zvuk (muzika) – forsirano puštanje pozadinske muzike */}
            <TouchableOpacity
              style={{ backgroundColor: '#8e24aa', padding: 12, borderRadius: 7, marginTop: 10 }}
              onPress={() => { try { testMusic(); } catch { } }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Test zvuk (muzika)</Text>
            </TouchableOpacity>
            {/* END: Test zvuk (muzika) */}
          </>
        )}
        {/* END: Debug UI gate – test dugmad i alati */}

        {/* START: Switch za Notifikacije */}
        <View style={styles.toggleRow}>
          {/* START: i18n labela notifikacija */}
          <Text style={styles.toggleText}>{t('common:labels.notifications', { defaultValue: 'Notifikacije' })}</Text>
          {/* END: i18n labela notifikacija */}
          <Switch
            value={notifications}
            onValueChange={handleToggleNotifications}
            thumbColor={notifications ? "#facc15" : "#333"}
            trackColor={{ false: "#444", true: "#facc15" }}
            disabled={notifSaving}
          />
        </View>
        {/* END: Switch za Notifikacije */}

        {/* START: Jezik dropdown */}
        <TouchableOpacity
          style={styles.langDropdown}
          onPress={() => setLangModal(true)}
        >
          {/* START: i18n labela Jezik */}
          <Text style={styles.toggleText}>{t('common:labels.language', { defaultValue: 'Jezik:' })}</Text>
          {/* END: i18n labela Jezik */}
          <Text style={styles.selectedLang}>{languageLabel} ▼</Text>
        </TouchableOpacity>
        {/* END: Jezik dropdown */}

        {/* Modal za izbor jezika */}
        <Modal
          visible={langModal}
          transparent
          animationType="fade"
          onRequestClose={() => setLangModal(false)}
        >
          <View style={styles.langModalBg}>
            <View style={styles.langModalBox}>
              {/* START: i18n naslov modala za jezik */}
              <Text style={styles.sectionTitle}>{t('common:titles.selectLanguage', { defaultValue: 'Izaberi jezik' })}</Text>
              {/* END: i18n naslov modala za jezik */}
              {LANGUAGES.map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={styles.langOption}
                  onPress={async () => {
                    // 1) Lokalno stanje UI-a
                    setLanguage(lang.code);
                    setLangModal(false);

                    // 2) Promeni runtime jezik odmah
                    try { i18n.changeLanguage(lang.code); } catch { }

                    // 3) Upis izbora u profil (fallback: 'en')
                    try {
                      if (user?.id) {
                        await supabase
                          .from('profiles')
                          .update({ language: lang.code || 'en' })
                          .eq('id', user.id);
                      }
                    } catch (e) {
                      // opciono: Alert o grešci
                      // Alert.alert('Greška', 'Nije moguće sačuvati jezik.');
                    }
                  }}
                >
                  <Text style={styles.selectedLang}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setLangModal(false)}>
                {/* START: i18n dugme Zatvori */}
                <Text style={[styles.selectedLang, { color: '#facc15', marginTop: 16 }]}>
                  {t('common:buttons.close', { defaultValue: 'Zatvori' })}
                </Text>
                {/* END: i18n dugme Zatvori */}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* KRAJ: Modal za izbor jezika */}

      </View>
    </View>
  );
};

// START: i18n-FR friendly StyleSheet (zameni ceo blok)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 20,
  },
  backBtn: {
    position: 'absolute',
    top: 28,
    left: 18,
    zIndex: 2,
    padding: 6,
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 26,
    color: '#facc15',
    fontWeight: 'bold',
  },
  title: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    letterSpacing: 1.3,
    marginTop: 8,
    // START: FR – duži naslovi ne smeju da iskoče
    textAlign: 'center',
    maxWidth: '92%',
    flexWrap: 'wrap',
    lineHeight: 32,
    // END: FR – duži naslovi ne smeju da iskoče
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
    // START: FR – dozvoli prelom ako je label duži (npr. “Paramètres de notification”)
    flexWrap: 'wrap',
    lineHeight: 24,
    // END: FR
  },
  // Stilovi za switch redove
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
    // START: FR – neka tekst može da se skupi i ne gura Switch van ekrana
    flexShrink: 1,
    maxWidth: '75%',
    paddingRight: 12,
    lineHeight: 20,
    // END: FR
  },
  // Dropdown jezik
  langDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: '#232323',
    padding: 10,
    borderRadius: 8,
    // START: FR – dozvoli malo “disanja” za duže oznake
    gap: 8,
    // END: FR
  },
  selectedLang: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: 'bold',
    // START: FR – ako je label dugačak (“Français”), neka se ne preklapa
    flexShrink: 1,
    // END: FR
  },
  // Modal za izbor jezika
  langModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.56)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langModalBox: {
    // START: FR – širi i responzivniji modal da stanu duži nazivi
    minWidth: 280,
    width: '90%',
    maxWidth: 360,
    // END: FR
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
    // START: FR – malo horizontalnog paddinga za estetiku
    paddingHorizontal: 12,
    // END: FR
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
});
// END: i18n-FR friendly StyleSheet (zameni ceo blok)

export default Podesavanja;
// END: Nova podešavanja - obrnutih karata, notifikacije, jezik
