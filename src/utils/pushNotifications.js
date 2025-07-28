// START: registerForPushNotificationsAsync util
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export async function registerForPushNotificationsAsync() {
  let token;
  if (Constants.isDevice) {
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
    token = (await Notifications.getExpoPushTokenAsync()).data;
    alert('Tvoj Expo push token: ' + token); 
  } else {
    alert('Push notifikacije rade samo na pravom uređaju!');
    return null;
  }
  return token;
}
// END: registerForPushNotificationsAsync util
