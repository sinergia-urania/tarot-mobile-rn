import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
// START: Importi za auth i firestore
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from "../context/AuthProvider";
import { db } from '../utils/firebase';
// END: Importi za auth i firestore

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const [dukati, setDukati] = useState(0);
  const [onCoinAdd, setOnCoinAdd] = useState(null);

  // START: Auth kontekst
  const { user } = useAuth();
  // END: Auth kontekst

  // --- Funkcija za sync sa Firestore ---
  const syncDukatiFromFirestore = useCallback(async (userId) => {
    try {
      const docRef = doc(db, 'users', userId);
      const userSnap = await getDoc(docRef);
      let dukatiValue = 0;

      if (userSnap.exists()) {
        const data = userSnap.data();
        dukatiValue = typeof data.dukati === 'number' ? data.dukati : 0;
      } else {
        // Prvi put – kreiraj user doc sa dukatima
        await setDoc(docRef, { dukati: 0 }, { merge: true });
      }
      setDukati(dukatiValue);
      await AsyncStorage.setItem('dukati', dukatiValue.toString());
    } catch (e) {
      // fallback na lokalno
      const stored = await AsyncStorage.getItem('dukati');
      if (stored !== null) setDukati(parseInt(stored, 10));
    }
  }, []);

  // --- Učitavanje iz Firestore kad se user promeni (login/logout) ---
  useEffect(() => {
    if (user && user.uid) {
      syncDukatiFromFirestore(user.uid);
    } else {
      setDukati(0);
      AsyncStorage.setItem('dukati', '0');
    }
  }, [user, syncDukatiFromFirestore]);

  // --- Dodavanje dukata (i u cloud i lokalno) ---
  const dodajDukate = useCallback(
    async (kolicina, animacijaPodaci) => {
      setDukati(prev => {
        const novi = prev + kolicina;
        if (onCoinAdd && typeof onCoinAdd === 'function') {
          onCoinAdd(animacijaPodaci);
        }
        AsyncStorage.setItem('dukati', novi.toString());
        return novi;
      });

      if (user && user.uid) {
        try {
          const docRef = doc(db, 'users', user.uid);
          await updateDoc(docRef, {
            dukati: (dukati || 0) + kolicina
          });
        } catch (e) {
          // fallback na lokalno
        }
      }
    },
    [user, dukati, onCoinAdd]
  );

  // --- Oduzimanje dukata ---
  const oduzmiDukate = useCallback(
    async (kolicina) => {
      setDukati(prev => {
        const novi = Math.max(0, prev - kolicina);
        AsyncStorage.setItem('dukati', novi.toString());
        return novi;
      });

      if (user && user.uid) {
        try {
          const docRef = doc(db, 'users', user.uid);
          await updateDoc(docRef, {
            dukati: Math.max(0, (dukati || 0) - kolicina)
          });
        } catch (e) {
          // fallback na lokalno
        }
      }
    },
    [user, dukati]
  );

  // Podesi callback za animaciju
  const setCoinAnimation = (cb) => setOnCoinAdd(() => cb);

  return (
    <DukatiContext.Provider value={{
      dukati,
      dodajDukate,
      oduzmiDukate,
      setCoinAnimation
    }}>
      {children}
    </DukatiContext.Provider>
  );
};

export const useDukati = () => useContext(DukatiContext);
