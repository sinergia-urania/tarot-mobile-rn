// START: React Native/Expo Supabase client sa AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ozssorzirdwyqgbixgri.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96c3NvcnppcmR3eXFnYml4Z3JpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODY5OTgsImV4cCI6MjA2NzY2Mjk5OH0.X_fbqvwYegOaI1cuPniRiEJY0WJ2bkKusYqRSupa_MA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// END: React Native/Expo Supabase client sa AsyncStorage
