import { supabase } from './supabaseClient';

// Funkcija za registraciju
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

// Funkcija za login
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// Funkcija za Facebook login
export async function loginWithFacebook() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
  });
  if (error) throw error;
  return data;
}

// Funkcija za logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
// Funkcija za izmenu (update) displayName-a korisnika
export async function updateDisplayName(newDisplayName) {
  const { data, error } = await supabase.auth.updateUser({
    data: { displayName: newDisplayName },
  });
  if (error) throw error;
  return data;
}