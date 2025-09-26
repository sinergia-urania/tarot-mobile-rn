// START: Nova util funkcija getKartaDanaSmart + Firestore helpers + _izabranaDanas flag
// START: Uklonjeni Firestore importi
// import { doc, getDoc, setDoc } from 'firebase/firestore';
// import { db } from './firebase'; // prilagodi putanju!
// END: Uklonjeni Firestore importi

import AsyncStorage from '@react-native-async-storage/async-storage';

// START: Uklonjene Firestore helper funkcije (upisiKartuDanaFirestore, procitajKartuDanaFirestore)
// Sve sada ide preko AsyncStorage ili će kasnije ići Supabase
// END: Uklonjene Firestore helper funkcije

/**
 * Pametni handler za izvlačenje karte dana.
 * Sada koristi isključivo AsyncStorage za oba slučaja.
 * Kada pređeš na Supabase, možeš proširiti logiku za cloud sync.
 */
export const getKartaDanaSmart = async (userId, generisiKartu) => {
  const danas = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const storageKey = userId ? `karta_dana_${userId}_${danas}` : `karta_dana_${danas}`;

  try {
    const stored = await AsyncStorage.getItem(storageKey);
    if (stored) {
      const karta = JSON.parse(stored);
      return { ...karta, _izabranaDanas: true };
    } else {
      const novaKarta = generisiKartu();
      await AsyncStorage.setItem(storageKey, JSON.stringify(novaKarta));
      return novaKarta;
    }
  } catch (error) {
    return generisiKartu();
  }
  // TODO: Kada dodaš Supabase, ovde možeš proširiti sa cloud logikom
};
// END: Nova util funkcija getKartaDanaSmart (bez Firestore)


