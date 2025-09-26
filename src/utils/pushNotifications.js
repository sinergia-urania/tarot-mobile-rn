// START: push - util bez globalnog handlera (handler ostaje u App.js)
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
// END: push - importi

// START: helper – samo proveri/traži dozvole, bez registracije tokena
export async function ensurePushPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
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

    // Android 8+ zahteva kanal pre nego što prva notifikacija stigne
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        // START: smanji heads-up intenzitet (pre je bilo MAX)
        importance: Notifications.AndroidImportance.DEFAULT,
        // END: smanji heads-up intenzitet
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Dozvole (Android 13+ runtime permission)
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Niste dozvolili notifikacije.');
      return null;
    }

    // projectId je preporučen u EAS okruženju
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

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
    const enabled = perms.status === 'granted';

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
