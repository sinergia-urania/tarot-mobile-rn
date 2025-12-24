// File: src/context/MusicProvider.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
// 👇 Uvozimo Auth da bi znali da li je korisnik ulogovan
import { useAuth } from './AuthProvider';

// ⚠️ PROVERI PUTANJU DO ZVUKA U ODNOSU NA OVAJ FAJL!
// Ako je fajl u src/context, a assets u korenu, verovatno ti treba ../../assets
const MUSIC_PATH = require('../assets/sounds/sinergija-audio.mp3');

const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const { user } = useAuth(); // <--- 1. Pratimo korisnika
  const playerRef = useRef(null);
  const [musicVolume, setMusicVolume] = useState(0.25);
  // Default je false, čekamo login da bi upalili
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Helpers ---
  const setMode = async (mode = 'duckOthers', opts = {}) => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        interruptionModeAndroid: mode,
        interruptionMode: mode,
        shouldDuckAndroid: mode !== 'doNotMix',
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
        ...opts,
      });
    } catch (e) {
      console.log('[AUDIO mode] err:', e?.message || String(e));
    }
  };

  const kickstartAndroidAudio = async (player) => {
    if (Platform.OS !== 'android' || !player) return;
    try {
      await setMode('doNotMix');
      const currentVol = player.volume;
      player.volume = 0;
      await player.seekTo(0);
      player.play();
      await new Promise((r) => setTimeout(r, 160));
      player.volume = currentVol;
      await setMode('duckOthers');
    } catch (e) {
      console.log('[AUDIO kickstart] err:', e?.message || String(e));
    }
  };

  // 1. Učitaj sačuvan volume
  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('musicVolume');
        if (m) setMusicVolume(JSON.parse(m));
      } catch { }
    })();
  }, []);

  // 2. Inicijalizacija plejera (SAMO JEDNOM, BEZ PUŠTANJA)
  useEffect(() => {
    (async () => {
      try {
        await setMode('duckOthers');

        if (!playerRef.current) {
          const player = createAudioPlayer(MUSIC_PATH);
          player.loop = true;
          player.volume = musicVolume;
          playerRef.current = player;

          // ❌ OVDE VIŠE NE ZOVEMO play()!
          // Čekamo da useEffect ispod odradi posao kad vidi User-a.
        }
      } catch (e) {
        console.warn('[AUDIO] init error:', e?.message || String(e));
      }
    })();

    return () => {
      try { playerRef.current?.remove?.(); } catch { }
      playerRef.current = null;
    };
  }, []);

  // 3. LOGIKA: User Login + Mute/Unmute
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;

    // Muzika svira SAMO ako smo ulogovani (user postoji) I ako je dugme uključeno (isPlaying)
    const shouldPlay = !!user && isPlaying;

    (async () => {
      try {
        if (shouldPlay) {
          if (!p.playing) {
            // Ako treba da svira, a ne svira -> PLAY
            if (Platform.OS === 'android' && p.currentTime === 0) {
              await kickstartAndroidAudio(p);
            } else {
              p.play();
            }
          }
        } else {
          if (p.playing) {
            // Ako ne treba da svira (Login ekran ili Mute), a svira -> PAUSE
            p.pause();
          }
        }
      } catch (e) { console.warn('Audio logic error:', e); }
    })();
  }, [user, isPlaying]); // <--- Okida se na promenu usera ili dugmeta

  // 4. Automatski upali dugme kad se uloguješ (da ne moraš ručno)
  useEffect(() => {
    if (user) {
      setIsPlaying(true);
    }
    // Ne gasimo na logout, da bi pamtio stanje ako treba,
    // ali gornji useEffect će svakako pauzirati zvuk jer nema usera.
  }, [user]);

  // 5. Volume kontrola
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.volume = Math.max(0, Math.min(1, musicVolume)); } catch { }
  }, [musicVolume]);

  // API
  const setVolume = async (v) => {
    const clamped = Math.max(0, Math.min(1, v ?? 0));
    setMusicVolume(clamped);
    try { await AsyncStorage.setItem('musicVolume', JSON.stringify(clamped)); } catch { }
  };

  const mute = () => setIsPlaying(false);
  const unmute = () => setIsPlaying(true);

  const testMusic = async () => { /* ... */ };

  return (
    <MusicContext.Provider
      value={{
        musicVolume, setVolume,
        isPlaying, mute, unmute,
        testMusic,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};
