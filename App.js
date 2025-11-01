// App.js
// START: globalni mute za logove (pre svih ostalih importova)
import { installConsoleMute } from "./src/utils/logger";
installConsoleMute({ keepWarnError: true });
// END: globalni mute za logove

import { NavigationContainer } from "@react-navigation/native";
import { navigationRef } from "./src/utils/navigationRef";
// START: Navigation reset import (CommonActions)
import { CommonActions } from "@react-navigation/native";
// END: Navigation reset import (CommonActions)
import { useRef } from "react";

import { useDukati } from "./src/context/DukatiContext";
// START: AdGate V1 import (ostavljamo, ali ne koristimo u ovom fajlu)
// import { recordRouteView } from "./src/utils/adService";
// END: AdGate V1 import
// START: AdGate V2 import (legacy linija – ostavljamo zakomentarisano)
// import { recordRouteViewV2 } from "./src/utils/adService";
// END: AdGate V2 import
// START: AdGate STRICT import (zakucan gate: nema reklama dok ne znamo plan)
import { recordRouteView } from "./src/utils/adService";
// END: AdGate STRICT import

import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect } from "react";
// START: Expo notifikacije – Platform import dopuna
import { Platform, SafeAreaView, StatusBar } from "react-native";
// END: Expo notifikacije – Platform import dopuna
// START: AdMob import fix - remove named initialize (v15 nema taj export)
import mobileAds from "react-native-google-mobile-ads";
// END: AdMob import fix
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { AuthProvider, useAuth } from "./src/context/AuthProvider";
import { DukatiProvider } from "./src/context/DukatiContext";
import { MusicProvider } from "./src/context/MusicProvider";
import { TreasureRefProvider } from "./src/context/TreasureRefContext";

import * as ExpoLinking from "expo-linking";
import * as Notifications from 'expo-notifications';
import UnaSpinner from "./src/components/UnaSpinner";

// START: push - import registracije i supabase
import { registerAndSavePushToken } from "./src/utils/pushNotifications";
import { supabase } from "./src/utils/supabaseClient";
// END: push - import registracije i supabase
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Expected static flag was missing']);

// ✅ SDK 53+: novi handler – rešava warning i dozvoljava baner/listu
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

// START: linking map fix – prebacujemo sa "auth/callback" na "auth"
const linking = {
  prefixes: [ExpoLinking.createURL("/"), "com.mare82.tarotmobile://"],
  config: {
    screens: {
      AuthConfirm: "auth",
      ResetPassword: "reset-password",
    },
  },
};
// END: linking map fix

function RootNavigator() {
  const { user, authLoading } = useAuth();

  if (authLoading) return <UnaSpinner />;

  console.log("[GATE] STACK user=" + (user?.id ?? "null"));

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
  const { recoveryActive } = useAuth(); // Recovery shield
  const navRef = navigationRef;
  const lastRouteRef = useRef(null);

  // Zapamti nameru recovery navigacije dok nav nije spremna
  const pendingRecoveryNavRef = useRef(false);

  // Deep-link → samo routing (bez getSessionFromUrl) – reset password & ostalo
  useEffect(() => {
    const processUrl = async (url) => {
      try {
        if (!url) return;
        console.log("[LINK] incoming url:", url);
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

    // Cold start
    ExpoLinking.getInitialURL().then((url) => processUrl(url));
    // Dok je app živ
    const sub = ExpoLinking.addEventListener("url", ({ url }) => processUrl(url));
    return () => sub.remove();
  }, []);

  // Supabase event – dodatna sigurnost za recovery scenario
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

  // START: STRICT gate – dok plan NIJE poznat, ne palimo ad logiku uopšte
  if (userPlan == null) {
    return (
      <NavigationContainer linking={linking} ref={navRef}>
        {children}
      </NavigationContainer>
    );
  }
  // END: STRICT gate – čekanje plana

  return (
    <NavigationContainer
      linking={linking}
      ref={navRef}
      onReady={() => {
        lastRouteRef.current = navRef.getCurrentRoute()?.name ?? null;
        // START: AdGate V2 – prvi ekran (legacy, ostaje kao referenca)
        // recordRouteViewV2(userPlan);
        // END: AdGate V2 – prvi ekran
        // START: AdGate STRICT – prvi ekran
        recordRouteView(userPlan);
        // END: AdGate STRICT – prvi ekran

        // Recovery pending trigger u onReady
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

        // Recovery shield – ako je aktivan recovery, ostani na ResetPassword
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
          // START: AdGate V2 – na svaku promenu rute (legacy, ostaje kao referenca)
          // recordRouteViewV2(userPlan);
          // END: AdGate V2
          // START: AdGate STRICT – na svaku promenu rute
          recordRouteView(userPlan);
          // END: AdGate STRICT
        }

        // Recovery shield – blokiraj skretanje sa ResetPassword dok traje recovery
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
  // START: AdMob init (v15 API)
  useEffect(() => {
    mobileAds()
      .initialize()
      .catch((e) => console.log('[ADMOB] init error:', e));
  }, []);
  // END: AdMob init

  // START: Expo notifikacije – Android kanal "alerts-high"
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    (async () => {
      try {
        await Notifications.setNotificationChannelAsync('alerts-high', {
          name: 'Alerts (High)',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
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
  // END: Expo notifikacije – Android kanal "alerts-high"

  // START: default kanal premešten u util – deaktivirano u App.js
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    return;
  }, []);
  // END: default kanal premešten u util – deaktivirano u App.js

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MusicProvider>
          <DukatiProvider>
            <TreasureRefProvider>
              {/* START: push - registracija tokena čim postoji user */}
              <RegisterPushOnLogin />
              {/* END: push - registracija tokena */}
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
  );
}

// START: push - pomoćna komponenta (ahimsa: ne remetimo App)
function RegisterPushOnLogin() {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.id) {
      registerAndSavePushToken({ supabase, userId: user.id });
    }
  }, [user?.id]);
  return null;
}
// END: push - pomoćna komponenta
