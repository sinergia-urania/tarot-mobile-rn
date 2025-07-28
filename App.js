import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StatusBar } from "react-native";
import './i18n';
import { AuthProvider } from "./src/context/AuthProvider";
import { MusicProvider } from "./src/context/MusicProvider";
import AuthConfirmScreen from './src/pages/AuthConfirmScreen';
import CardGroupList from "./src/pages/CardGroupList";
import Kontakt from "./src/pages/Kontakt";
import LoginScreen from "./src/pages/LoginScreen";
import OAplikaciji from "./src/pages/OAplikaciji";
import Odricanje from "./src/pages/Odricanje";
import PitanjeIzbor from "./src/pages/PitanjeIzbor";
import Podesavanja from "./src/pages/Podesavanja";
import ProfilScreen from "./src/pages/ProfilScreen";
import TarotCardModal from "./src/pages/TarotCardModal";
import TarotHome from "./src/pages/TarotHome";
import TarotMeaning from "./src/pages/TarotMeaning";
import Uslovi from "./src/pages/Uslovi";
import VelikaArkanaList from "./src/pages/VelikaArkanaList";
// Novi ekrani
import { useAuth } from "./src/context/AuthProvider";
import { DukatiProvider, useDukati } from "./src/context/DukatiContext";
import DaNeOdgovor from "./src/pages/DaNeOdgovor";
import IzborKarata from "./src/pages/IzborKarata";
import OdgovorAI from "./src/pages/OdgovorAI";
import TarotOtvaranja from "./src/pages/TarotOtvaranja";



// DODATO: TreasureRefProvider za globalni ref sanduka
import { TreasureRefProvider } from "./src/context/TreasureRefContext";

import mobileAds from 'react-native-google-mobile-ads';
import Toast from "react-native-toast-message";
import { registerForPushNotificationsAsync } from "./src/utils/pushNotifications";
import { supabase } from "./src/utils/supabaseClient";
mobileAds().initialize();


const linking = {
  prefixes: ['com.mare82.tarotmobile://'],
  config: {
    screens: {
      AuthConfirm: 'auth/callback',
    },
  },
};

const Stack = createStackNavigator();

function AppContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const { user, authLoading } = useAuth();

  // START: automatska dodela mesečnih dukata kada korisnik uđe u app
  const { dodeliMesecneDukate } = useDukati();

  useEffect(() => {
    if (user && dodeliMesecneDukate) {
      dodeliMesecneDukate();
    }
  }, [user]);
  // END: automatska dodela
  useEffect(() => {
  const upisiPushToken = async () => {
    if (!user?.id) return;

    // Proveri da li korisnik ima uključen notifications_enabled
    const { data, error } = await supabase
      .from('profiles')
      .select('notifications_enabled')
      .eq('id', user.id)
      .single();

    if (error) {
      console.log("PUSH: greška pri dohvatanju notifications_enabled:", error);
      return;
    }

    if (data.notifications_enabled) {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("PUSH: nije dobijen token");
        return;
      }
      const { error: upisError } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', user.id);

      if (upisError) {
        console.log("PUSH: Greška pri upisu tokena:", upisError.message);
      } else {
        console.log("PUSH: Token uspešno upisan!");
      }
    } else {
      console.log("PUSH: notifikacije su isključene za ovog korisnika");
    }
  };

  upisiPushToken();
}, [user?.id]);


  if (authLoading) return <ActivityIndicator size="large" color="#a21caf" style={{ flex: 1 }} />;

  return (
    <NavigationContainer linking={linking}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0d0d19" }}>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen
            name="Home"
          >
            {props => (
              <TarotHome
                {...props}
                onOpenModal={() => setModalOpen(true)}
              />
            )}
          </Stack.Screen>
          <Stack.Screen name="TarotOtvaranja" component={TarotOtvaranja} />
          <Stack.Screen name="PitanjeIzbor" component={PitanjeIzbor} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AuthConfirm" component={AuthConfirmScreen} />
          <Stack.Screen name="IzborKarata" component={IzborKarata} />
          <Stack.Screen name="DaNeOdgovor" component={DaNeOdgovor} />
          <Stack.Screen name="OdgovorAI" component={OdgovorAI} />
          <Stack.Screen name="Uslovi" component={Uslovi} options={{ headerShown: false }} />
          <Stack.Screen name="Kontakt" component={Kontakt} options={{ headerShown: false }} />
          <Stack.Screen name="OAplikaciji" component={OAplikaciji} options={{ headerShown: false }} />
          <Stack.Screen name="Odricanje" component={Odricanje} options={{ headerShown: false, title: "Odricanje od odgovornosti" }} />
          <Stack.Screen name="ZnacenjeKarata" component={TarotMeaning} />
          <Stack.Screen name="TarotCardModal" component={TarotCardModal} />
          <Stack.Screen name="VelikaArkanaList" component={VelikaArkanaList} />
          <Stack.Screen name="CardGroupList" component={CardGroupList} />
          <Stack.Screen name="Profil" component={ProfilScreen} />
          <Stack.Screen name="Podesavanja" component={Podesavanja} />
        </Stack.Navigator>
        {/* START: Toast global */}
        <Toast />
        {/* END: Toast global */}
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MusicProvider>
        <DukatiProvider>
          <TreasureRefProvider>
            <AppContent />
          </TreasureRefProvider>
        </DukatiProvider>
      </MusicProvider>
    </AuthProvider>
  );
}
