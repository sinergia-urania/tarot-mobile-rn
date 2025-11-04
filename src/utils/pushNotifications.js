// START: push - util bez globalnog handlera (handler ostaje u App.js)
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// END: push - importi

// START: helper – samo proveri/traži dozvole, bez registracije tokena
export async function ensurePushPermissions() {
  try {
    const { status: existingStatus, ios } = await Notifications.getPermissionsAsync();
    // START: iOS – 'provisional' je dovoljno za prikaz obaveštenja
    const grantedLike =
      existingStatus === 'granted' ||
      existingStatus === 'authorized' ||
      existingStatus === 'provisional';
    if (grantedLike) return true;

    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    const final =
      req.status === 'granted' ||
      req.status === 'authorized' ||
      req.status === 'provisional';
    return final === true;
    // END: iOS – 'provisional'
  } catch {
    return false;
  }
}
// END: helper – samo proveri/traži dozvole, bez registracije tokena

export async function registerForPushNotificationsAsync() {
  try {
    // Ne blokiramo na isDevice — u dev buildovima zna da vrati false iako je fizički telefon
    if (!Device.isDevice) {
      console.warn('[PUSH] Device.isDevice === false (dev build edge-case); nastavljam dalje.');
    }

    // START: Android 8+ – kreiraj oba kanala (edge funkcije koriste 'alerts-high')
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts-high', {
        name: 'High priority',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
    // END: Android kanali

    // Dozvole (Android 13+ runtime permission, iOS sa alert/badge/sound)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    const hasExistingGrant =
      existingStatus === 'granted' ||
      existingStatus === 'authorized' ||
      existingStatus === 'provisional';

    if (!hasExistingGrant) {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = status;
    }

    const isGranted =
      finalStatus === 'granted' ||
      finalStatus === 'authorized' ||
      finalStatus === 'provisional';

    if (!isGranted) {
      alert('Niste dozvolili notifikacije.');
      return null;
    }

    // projectId je preporučen u EAS okruženju
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      Constants?.expoConfig?.extra?.projectId ??
      null;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return token;
  } catch (e) {
    console.warn('[PUSH] token error:', e?.message || e);
    return null;
  }
}

// Helper: registruj i odmah sačuvaj token u Supabase (uz izbegavanje suvišnih UPDATE-ova)
export async function registerAndSavePushToken({ supabase, userId }) {
  const token = await registerForPushNotificationsAsync();
  if (!supabase || !userId) return token;

  try {
    // Proveri trenutno stanje dozvola (za UI flag)
    const perms = await Notifications.getPermissionsAsync();
    const enabled =
      perms.status === 'granted' ||
      perms.status === 'authorized' ||
      perms.status === 'provisional';

    // Učitaj postojeće vrednosti da ne pišemo uvek UPDATE
    const { data: prof, error: selErr } = await supabase
      .from('profiles')
      .select('expo_push_token, notifications_enabled')
      .eq('id', userId)
      .single();
    if (selErr) {
      console.warn('[PUSH] select profile error:', selErr?.message);
    }

    const shouldUpdate =
      (token && token !== prof?.expo_push_token) ||
      (enabled !== prof?.notifications_enabled);

    if (shouldUpdate) {
      await supabase
        .from('profiles')
        .update({
          expo_push_token: token ?? prof?.expo_push_token ?? null,
          notifications_enabled: enabled,
        })
        .eq('id', userId);
    }
  } catch (e) {
    console.warn('[PUSH] supabase update error:', e?.message || e);
  }

  return token;
}
