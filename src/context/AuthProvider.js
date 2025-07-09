import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../utils/firebase";
// START: Firestore importi
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
// END: Firestore importi

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      // START: automatsko kreiranje users/{uid} u Firestore ako ne postoji
      if (firebaseUser && firebaseUser.uid) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              dukati: 0,
              status: 'free',
              createdAt: new Date().toISOString(),
              email: firebaseUser.email || '',
            });
          }
        } catch (e) {
          // možeš ovde logovati error ili ignorisati za basic fail-safe
        }
      }
      // END: automatsko kreiranje users/{uid}
    });
    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, authLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook za korišćenje Auth-a bilo gde:
export const useAuth = () => useContext(AuthContext);
