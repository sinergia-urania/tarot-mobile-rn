// START: obavezni side-effect importi (moraju biti PRVI!)
import 'react-native-gesture-handler';
import 'react-native-get-random-values';
import 'react-native-reanimated';
// END: obavezni side-effect importi

// START: globalni mute za logove (pre svih ostalih importova)
import { installConsoleMute } from "./src/utils/logger";
installConsoleMute({ keepWarnError: true });
// END: globalni mute za logove

import { CommonActions, NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useRef } from "react";
import { LogBox, Platform, SafeAreaView, StatusBar } from "react-native";
import { navigationRef } from "./src/utils/navigationRef";

import { useDukati } from "./src/context/DukatiContext";
import { recordRouteView } from "./src/utils/adService";

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import mobileAds from "react-native-google-mobile-ads";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./src/context/AuthProvider";
import { DukatiProvider } from "./src/context/DukatiContext";
import { MusicProvider } from "./src/context/MusicProvider";
import { TreasureRefProvider } from "./src/context/TreasureRefContext";

import * as ExpoLinking from "expo-linking";
import * as Notifications from 'expo-notifications';
// START: tap response hook za notifikacije
import { useLastNotificationResponse } from 'expo-notifications';
// END: tap response hook za notifikacije
import UnaSpinner from "./src/components/UnaSpinner";

// START: push - registracija i supabase
import { registerAndSavePushToken } from "./src/utils/pushNotifications";
import { supabase } from "./src/utils/supabaseClient";
// END: push - registracija i supabase

// START: ATT (iOS) – pre AdMob init-a
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
// END: ATT (iOS)

LogBox.ignoreLogs(['Expected static flag was missing']);

// ✅ SDK 53+: handler (prikazuje alert i u foreground-u)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // START: push – prikaži alert i zvuk i u foreground-u
    shouldShowAlert: true,
    shouldPlaySound: true,
    // END: push – prikaži alert i zvuk i u foreground-u
    shouldSetBadge: false,
  }),
});

// START: Notifications handler (SDK 51+) – bez deprecated polja + MAX prioritet (override prethodnog)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,     // iOS heads-up
    shouldShowList: true,       // iOS Notification Center
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.MAX, // Android heads-up
  }),
});
// END: Notifications handler (SDK 51+) – bez deprecated polja + MAX prioritet (override prethodnog)

// Ekrani
import ArhivaOtvaranja from "./src/pages/ArhivaOtvaranja";
import AuthConfirmScreen from "./src/pages/AuthConfirmScreen";
import CardGroupList from "./src/pages/CardGroupList";
import DaNeOdgovor from "./src/pages/DaNeOdgovor";
import DetaljOtvaranja from "./src/pages/DetaljOtvaranja";
import IzborKarata from "./src/pages/IzborKarata";
import Kontakt from "./src/pages/Kontakt";
import LoginScreen from "./src/pages/LoginScreen";
import OAplikaciji from "./src/pages/OAplikaciji";
import OdgovorAI from "./src/pages/OdgovorAI";
import PitanjeIzbor from "./src/pages/PitanjeIzbor";
import Podesavanja from "./src/pages/Podesavanja";
import ResetPasswordScreen from "./src/pages/ResetPasswordScreen";
import TarotCardModal from "./src/pages/TarotCardModal";
import TarotHome from "./src/pages/TarotHome";
import TarotMeaning from "./src/pages/TarotMeaning";
import TarotOtvaranja from "./src/pages/TarotOtvaranja";
import Uslovi from "./src/pages/Uslovi";
import VelikaArkanaList from "./src/pages/VelikaArkanaList";

const Stack = createStackNavigator();

// START: linking map – auth bez /callback + dodato "Home: home"
const linking = {
  prefixes: [ExpoLinking.createURL("/"), "com.mare82.tarotmobile://", "una://"],
  config: {
    screens: {
      // START: dodato mapiranje za Home
      // (nije obavezno jer više ne koristimo URL iz push-a, ali ostaje korisno)
      Home: "home",
      // END: dodato mapiranje za Home
      AuthConfirm: "auth",
      ResetPassword: "reset-password",
    },
  },
};
// END: linking map

function RootNavigator() {
  const { user, authLoading } = useAuth();

  if (authLoading) return <UnaSpinner />;

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      {/* App rute */}
      <Stack.Screen name="Home" component={TarotHome} />
      <Stack.Screen name="TarotOtvaranja" component={TarotOtvaranja} />
      <Stack.Screen name="PitanjeIzbor" component={PitanjeIzbor} />
      <Stack.Screen name="IzborKarata" component={IzborKarata} />
      <Stack.Screen name="OdgovorAI" component={OdgovorAI} />
      <Stack.Screen name="DaNeOdgovor" component={DaNeOdgovor} />
      <Stack.Screen name="ArhivaOtvaranja" component={ArhivaOtvaranja} />
      <Stack.Screen name="DetaljOtvaranja" component={DetaljOtvaranja} />
      <Stack.Screen name="ZnacenjeKarata" component={TarotMeaning} />
      <Stack.Screen name="VelikaArkanaList" component={VelikaArkanaList} />
      <Stack.Screen name="TarotCardModal" component={TarotCardModal} />
      <Stack.Screen name="CardGroupList" component={CardGroupList} />
      <Stack.Screen name="Podesavanja" component={Podesavanja} />
      <Stack.Screen name="Uslovi" component={Uslovi} />
      <Stack.Screen name="Kontakt" component={Kontakt} />
      <Stack.Screen name="OAplikaciji" component={OAplikaciji} />

      {/* Pomoćni ekrani */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="AuthConfirm"
        component={AuthConfirmScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// START: Nav wrapper sa globalnim interstitial gate-om (STRICT)
function NavWithAdGate({ linking, children }) {
  const { userPlan } = useDukati();
  const { recoveryActive } = useAuth();
  const navRef = navigationRef;
  const lastRouteRef = useRef(null);
  const pendingRecoveryNavRef = useRef(false);

  useEffect(() => {
    const processUrl = async (url) => {
      try {
        if (!url) return;
        const isRecovery =
          /[?#&]type=recovery\b/i.test(url) ||
          /\brecovery\b/i.test(url) ||
          /reset-password/i.test(url);

        if (isRecovery) {
          if (navRef.isReady()) {
            navRef.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
              })
            );
          } else {
            pendingRecoveryNavRef.current = true;
          }
        }
      } catch (e) {
        console.log("[AUTH] processUrl catch:", e?.message || e);
      }
    };

    ExpoLinking.getInitialURL().then((url) => processUrl(url));
    const sub = ExpoLinking.addEventListener("url", ({ url }) => processUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (navRef.isReady()) {
          navRef.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
            })
          );
        } else {
          pendingRecoveryNavRef.current = true;
        }
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Dok plan NIJE poznat, ne palimo ad logiku
  if (userPlan == null) {
    return (
      <NavigationContainer linking={linking} ref={navRef}>
        {children}
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer
      linking={linking}
      ref={navRef}
      onReady={() => {
        lastRouteRef.current = navRef.getCurrentRoute()?.name ?? null;
        recordRouteView(userPlan);

        if (pendingRecoveryNavRef.current) {
          pendingRecoveryNavRef.current = false;
          try {
            navRef.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
              })
            );
          } catch { }
        }

        try {
          if (recoveryActive) {
            const cur = navRef.getCurrentRoute()?.name;
            if (cur !== "ResetPassword") {
              navRef.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
                })
              );
            }
          }
        } catch { }
      }}
      onStateChange={() => {
        const current = navRef.getCurrentRoute()?.name ?? null;
        if (current && current !== lastRouteRef.current) {
          lastRouteRef.current = current;
          recordRouteView(userPlan);
        }

        try {
          if (recoveryActive) {
            const cur = navRef.getCurrentRoute()?.name;
            if (cur !== "ResetPassword") {
              navRef.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "ResetPassword", params: { preventAutoRedirect: true } }],
                })
              );
            }
          }
        } catch { }
      }}
    >
      {children}
    </NavigationContainer>
  );
}
// END: Nav wrapper sa globalnim interstitial gate-om (STRICT)

export default function App() {
  // AdMob init + ATT prompt (iOS) PRE init-a
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'ios') {
          const { status } = await getTrackingPermissionsAsync();
          if (status !== 'granted') {
            await requestTrackingPermissionsAsync();
          }
        }
      } catch (e) {
        if (__DEV__) console.log('[ATT] warn:', e?.message || e);
      }
      try {
        await mobileAds().initialize();
      } catch (e) {
        console.log('[ADMOB] init error:', e?.message || e);
      }
    })();
  }, []);

  // Android: kreiraj 'alerts-high' (MAX) kanal za push iz edge funkcija
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('alerts-high', {
          name: 'Alerts (High)',
          // START: push – MAX za pouzdan heads-up
          importance: Notifications.AndroidImportance.MAX,
          sound: 'default',
          // END: push – MAX za pouzdan heads-up
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
          enableVibrate: true,
          enableLights: true,
        });
      } catch (e) {
        console.log('[NOTIF] channel error:', e?.message || e);
      }
    })();
  }, []);

  // START: tap na notifikaciju → uvek vodi na Home (TarotHome)
  const lastResponse = useLastNotificationResponse();
  useEffect(() => {
    if (!lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const data = lastResponse.notification?.request?.content?.data ?? {};
    // PRETHODNO: koristili smo URL ili action za različite rute
    /*
    const url = typeof data?.url === 'string' ? data.url : null;
    if (url) {
      ExpoLinking.openURL(url).catch(() => {});
      return;
    }
    const action = String(data?.action || '');
    if (action === 'open_card_of_day') { ... } else if (action === 'open_monthly_bonus') { ... }
    */

    // START: override – uvek vodi na Home, prosledimo info radi analitike
    if (navigationRef?.isReady?.()) {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: 'Home',
          params: { fromPush: true, deeplink: String(data?.action || 'push') }
        })
      );
    }
    // END: override – uvek vodi na Home
  }, [lastResponse]);
  // END: tap na notifikaciju → uvek vodi na Home (TarotHome)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <MusicProvider>
            <DukatiProvider>
              <TreasureRefProvider>
                {/* push token registracija čim postoji user */}
                <RegisterPushOnLogin />
                <NavWithAdGate linking={linking}>
                  <SafeAreaView style={{ flex: 1, backgroundColor: "#0d0d19" }}>
                    <StatusBar barStyle="light-content" />
                    <RootNavigator />
                    <Toast />
                  </SafeAreaView>
                </NavWithAdGate>
              </TreasureRefProvider>
            </DukatiProvider>
          </MusicProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Pomoćna komponenta – ne remeti App
function RegisterPushOnLogin() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) {
      registerAndSavePushToken({ supabase, userId: user.id });
    }
  }, [user?.id]);
  return null;
}
