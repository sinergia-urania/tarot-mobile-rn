// START: Nova util funkcija getKartaDanaSmart + Firestore helpers + _izabranaDanas flag
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase'; // prilagodi putanju!

/**
 * Upisuje kartu dana u Firestore pod ključem: "karte_dana/userId_YYYY-MM-DD"
 */
export const upisiKartuDanaFirestore = async (userId, datum, karta) => {
  if (!userId) return; // fallback za guest
  const docRef = doc(db, "karte_dana", `${userId}_${datum}`);
  await setDoc(docRef, {
    userId,
    datum,
    karta,
    timestamp: Date.now(),
  });
};

/**
 * Vraća kartu dana za userId i datum, ili null ako nema.
 */
export const procitajKartuDanaFirestore = async (userId, datum) => {
  if (!userId) return null;
  const docRef = doc(db, "karte_dana", `${userId}_${datum}`);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().karta;
  }
  return null;
};

/**
 * Pametni handler za izvlačenje karte dana.
 * Prvo proverava Firestore (za ulogovanog korisnika), onda AsyncStorage kao fallback,
 * za gosta koristi samo AsyncStorage.
 * Dodaje flag _izabranaDanas: true ako je već izabrana!
 */
export const getKartaDanaSmart = async (userId, generisiKartu) => {
  const danas = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  if (!userId) {
    // GOST – samo AsyncStorage
    const storageKey = `karta_dana_${danas}`;
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
  } else {
    // ULOGOVAN – prvo Firestore, pa fallback na AsyncStorage
    const storageKey = `karta_dana_${userId}_${danas}`;
    try {
      // Prvo Firestore
      const docRef = doc(db, 'karte_dana', storageKey);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const podatak = snap.data();
        await AsyncStorage.setItem(storageKey, JSON.stringify(podatak.karta));
        return { ...podatak.karta, _izabranaDanas: true };
      } else {
        // Nema u bazi – generiši novu, upiši i u cloud i lokalno
        const novaKarta = generisiKartu();
        await setDoc(docRef, {
          userId,
          datum: danas,
          karta: novaKarta,
          timestamp: Date.now(),
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(novaKarta));
        return novaKarta;
      }
    } catch (error) {
      // Ako je problem sa netom/Firebase, fallback na lokalno!
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
      } catch (err2) {
        return generisiKartu();
      }
    }
  }
};
// END: Nova util funkcija getKartaDanaSmart + Firestore helpers + _izabranaDanas flag
