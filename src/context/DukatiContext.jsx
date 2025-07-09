// START: DukatiContext za React Native
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const DukatiContext = createContext();

export const DukatiProvider = ({ children }) => {
  const [dukati, setDukati] = useState(0);

  // Učitavanje vrednosti iz AsyncStorage pri mountovanju
  useEffect(() => {
    const loadDukati = async () => {
      try {
        const stored = await AsyncStorage.getItem('dukati');
        if (stored !== null) {
          setDukati(parseInt(stored, 10));
        }
      } catch (error) {
        console.warn('Greška prilikom učitavanja dukata:', error);
      }
    };
    loadDukati();
  }, []);

  // Čuvanje dukata pri svakoj promeni
  useEffect(() => {
    const saveDukati = async () => {
      try {
        await AsyncStorage.setItem('dukati', dukati.toString());
      } catch (error) {
        console.warn('Greška prilikom čuvanja dukata:', error);
      }
    };
    saveDukati();
  }, [dukati]);

  const dodajDukate = (kolicina) => setDukati(prev => prev + kolicina);

  return (
    <DukatiContext.Provider value={{ dukati, dodajDukate }}>
      {children}
    </DukatiContext.Provider>
  );
};

export const useDukati = () => useContext(DukatiContext);
// END: DukatiContext za React Native
