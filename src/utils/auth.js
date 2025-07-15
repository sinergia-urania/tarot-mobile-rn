import { Linking } from 'react-native';
import { supabase } from './supabaseClient';

// Funkcija za registraciju korisnika
export async function register(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { displayName },
    },
  });
  if (error) throw error;
  return data;
}

// Funkcija za login korisnika
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// START: Ispravan Facebook login (NE FUNKCIONIŠE, ostavljeno radi reference)
// Prilikom poziva, Supabase otvara Facebook login automatski.
export async function loginWithFacebook() {
  // Supabase vraća URL koji možeš otvoriti u browseru
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: 'com.mare82.tarotmobile://auth/callback', // obavezno!
    },
  });
  if (error) {
    console.log('FB login greška:', error);
    alert('Greška: ' + error.message);
    return;
  }
  if (data?.url) {
    // Ovo forsira otvaranje auth URL-a u browseru
    Linking.openURL(data.url);
  } else {
    alert('Nije moguće otvoriti Facebook login!');
  }
}
// END: Ispravan Facebook login (NE FUNKCIONIŠE, ostavljeno radi reference)


// START: Google login za Supabase (Expo/React Native)
// START: Google login sa Linking.openURL workaround-om
// START: Ispravan mobilni Google login (deep link redirect)
export async function loginWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'com.mare82.tarotmobile://auth/callback',
    },
  });
  if (error) {
    console.log('Google login greška:', error);
    alert('Greška: ' + error.message);
    return;
  }
  if (data?.url) {
    Linking.openURL(data.url);
  } else {
    alert('Nije moguće otvoriti Google login!');
  }
}
// END: Ispravan mobilni Google login (deep link redirect)
