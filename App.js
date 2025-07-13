// START: Dodavanje MusicProvider za globalnu muziku
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useState } from "react";
import { SafeAreaView, StatusBar } from "react-native";
import LoginScreen from "./src/pages/LoginScreen";
import ProfilScreen from "./src/pages/ProfilScreen";

import { ActivityIndicator } from "react-native";
import './i18n';
import { DukatiProvider } from "./src/components/DukatiProvider";
import IzborKarataModal from "./src/components/IzborKarataModal";
import { MusicProvider } from "./src/context/MusicProvider";
import CardGroupList from "./src/pages/CardGroupList";
import Kontakt from "./src/pages/Kontakt";
import OAplikaciji from "./src/pages/OAplikaciji";
import Odricanje from "./src/pages/Odricanje";
import PitanjeIzbor from "./src/pages/PitanjeIzbor";
import Podesavanja from "./src/pages/Podesavanja";
import TarotCardModal from "./src/pages/TarotCardModal";
import TarotHome from "./src/pages/TarotHome";
import TarotMeaning from "./src/pages/TarotMeaning";
import Uslovi from "./src/pages/Uslovi";
import VelikaArkanaList from "./src/pages/VelikaArkanaList";
import { allCardKeys } from "./src/utils/allCardKeys";

// END: Uvoz MusicProvider
import { AuthProvider } from "./src/context/AuthProvider";
// START: Novi ekrani za intuitivna i kompleksna otvaranja
import DaNeOdgovor from "./src/pages/DaNeOdgovor";
import IzborKarata from "./src/pages/IzborKarata";

import OdgovorAI from "./src/pages/OdgovorAI";
// END: Novi ekrani

// START: Dodata ruta za stranicu svih otvaranja
import TarotOtvaranja from "./src/pages/TarotOtvaranja";
// END: Dodata ruta za stranicu svih otvaranja
import { useAuth } from "./src/context/AuthProvider";

const Stack = createStackNavigator();




function AppContent() {
  const [modalOpen, setModalOpen] = useState(false);
 const { user, authLoading } = useAuth();

  if (authLoading) return <ActivityIndicator size="large" color="#a21caf" style={{ flex: 1 }} />;
  
  return (
    
    <DukatiProvider>
      {/* START: MusicProvider obavija sve */}
      <MusicProvider>
        <NavigationContainer>
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
                // Ako koristiš TarotHeader u TarotHome, ne treba options
              >
                {props => (
                  <TarotHome
                    {...props}
                    onOpenModal={() => setModalOpen(true)}
                  />
                )}
              </Stack.Screen>

              {/* --- Dodata ruta za Sva otvaranja (prikaži sve vrste otvaranja) --- */}
              <Stack.Screen
                name="TarotOtvaranja"
                component={TarotOtvaranja}
              />

              <Stack.Screen
                name="PitanjeIzbor"
                component={PitanjeIzbor}
              />
              <Stack.Screen name="Login" component={LoginScreen} />


              {/* --- Kraj: Dodata ruta za Sva otvaranja --- */}

              {/* --- Registrovane nove rute za otvaranja --- */}
              <Stack.Screen
                name="IzborKarata"
                component={IzborKarata}
              />
              <Stack.Screen
                name="DaNeOdgovor"
                component={DaNeOdgovor}
            
              />
              <Stack.Screen
                name="OdgovorAI"
                component={OdgovorAI}
              />
              <Stack.Screen name="Uslovi" component={Uslovi} options={{ headerShown: false }} />
              <Stack.Screen name="Kontakt" component={Kontakt} options={{ headerShown: false }} />
              <Stack.Screen name="OAplikaciji" component={OAplikaciji} options={{ headerShown: false }} />
              <Stack.Screen name="Odricanje" component={Odricanje} options={{ headerShown: false, title: "Odricanje od odgovornosti" }} />

              {/* --- Kraj novih ruta --- */}

              {/* --- Stare rute ostaju ispod --- */}
              <Stack.Screen
                name="ZnacenjeKarata"
                component={TarotMeaning}
              />
              <Stack.Screen
                name="TarotCardModal"
                component={TarotCardModal}
              />
              <Stack.Screen
                name="VelikaArkanaList"
                component={VelikaArkanaList}
              />
              <Stack.Screen
                name="CardGroupList"
                component={CardGroupList}
              />
                <Stack.Screen
                name="Profil"
                component={ProfilScreen}
              />
              <Stack.Screen
                name="Podesavanja"
                component={Podesavanja}
              />
            </Stack.Navigator>

            {/* MODAL za izbor karata (popup, ne ruta!) */}
            <IzborKarataModal
              visible={modalOpen}
              onClose={() => setModalOpen(false)}
              allCardKeys={allCardKeys}
              layoutTemplate={["", "", ""]}
              pitanje={"Probno pitanje"}
              tip={""}
            />
          </SafeAreaView>
        </NavigationContainer>
      </MusicProvider>
      {/* END: MusicProvider obavija sve */}
    </DukatiProvider>
    
   );
  }
    export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


// END: Dodavanje MusicProvider za globalnu muziku
