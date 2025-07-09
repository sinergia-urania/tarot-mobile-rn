
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAt-sQcpW-EN0FR6WOZOrLjWFbYbZupoRk",
  authDomain: "ai-tarot-project-1dc3d.firebaseapp.com",
  projectId: "ai-tarot-project-1dc3d",
  storageBucket: "ai-tarot-project-1dc3d.appspot.com",
  messagingSenderId: "910070111203",
  appId: "1:910070111203:web:5040e2900cba32d79c9ed6",
  measurementId: "G-16GTS51QMT"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

