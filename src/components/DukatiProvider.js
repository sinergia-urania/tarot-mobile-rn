import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
// START: Uklonjeni Firebase importi
// import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
// import { db } from '../utils/firebase';
// END: Uklonjeni Firebase importi
import { useAuth } from "../context/AuthProvider";

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const [dukati, setDukati] = useState(0);
  const [onCoinAdd, setOnCoinAdd] = useState(null);

  // START: Auth kontekst
  const { user } = useAuth();
  // END: Auth kontekst

  // --- Funkcija za sync sa storage-om ---
  const syncDukati = useCallback(async (userId) => {
    try {
      // START: Placeholder za Supabase fetch
      // TODO: Ovde ubaciti Supabase upit za korisnika (dukati)
      // Trenutno koristi samo lokalnu AsyncStorage vrednost
      const stored = await AsyncStorage.getItem('dukati');
      const dukatiValue = stored !== null ? parseInt(stored, 10) : 0;
      setDukati(dukatiValue);
      // END: Placeholder za Supabase fetch
    } catch (e) {
      setDukati(0);
    }
  }, []);

  // --- Učitavanje pri promeni user-a (login/logout) ---
  useEffect(() => {
    if (user && user.uid) {
      syncDukati(user.uid);
    } else {
      setDukati(0);
      AsyncStorage.setItem('dukati', '0');
    }
  }, [user, syncDukati]);

  // --- Dodavanje dukata (samo lokalno, bez cloud-a) ---
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
      // START: Placeholder za Supabase update
      // TODO: Ubaciti Supabase update korisnika
      // END: Placeholder za Supabase update
    },
    [onCoinAdd]
  );

  // --- Oduzimanje dukata (samo lokalno) ---
  const oduzmiDukate = useCallback(
    async (kolicina) => {
      setDukati(prev => {
        const novi = Math.max(0, prev - kolicina);
        AsyncStorage.setItem('dukati', novi.toString());
        return novi;
      });
      // START: Placeholder za Supabase update
      // TODO: Ubaciti Supabase update korisnika
      // END: Placeholder za Supabase update
    },
    []
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
