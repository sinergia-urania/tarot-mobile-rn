// START: Migracija na expo-audio (novi API) + Android kickstart
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
// Ključni importi iz novog modula
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const MUSIC_PATH = require('../assets/sounds/sinergija-audio.mp3');

const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const playerRef = useRef(null);
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [isPlaying, setIsPlaying] = useState(true);

  // --- helpers: setovanje audio moda + Android kickstart ---
  // START: Helper za podešavanje audio moda (cross-platform)
  const setMode = async (mode = 'duckOthers', opts = {}) => {
    try {
      // expo-audio ključevi (unificirani za iOS/Android)
      await setAudioModeAsync({
        playsInSilentMode: true,            // i u iOS "silent"
        allowsRecording: false,
        interruptionModeAndroid: mode,      // 'duckOthers' | 'doNotMix' | 'mixWithOthers'
        interruptionMode: mode,             // iOS
        shouldDuckAndroid: mode !== 'doNotMix',
        shouldPlayInBackground: false,      // možeš dići na true po potrebi
        shouldRouteThroughEarpiece: false,  // uvek preko loudspeaker-a
        ...opts,
      });
    } catch (e) {
      console.log('[AUDIO mode] err:', e?.message || String(e));
    }
  };
  // END: Helper za podešavanje audio moda

  // START: Android kickstart – stabilizuje audio fokus/rutiranje
  const kickstartAndroidAudio = async (player) => {
    if (Platform.OS !== 'android' || !player) return;
    try {
      // 1) agresivno uzmi fokus
      await setMode('doNotMix');
      // 2) “prodrmaj” audio putanju
      const prevVol = Math.max(0, Math.min(1, player.volume ?? musicVolume));
      player.volume = 0.0001;
      await player.seekTo(0);
      player.play();
      await new Promise((r) => setTimeout(r, 160)); // kratka “aktivacija” rute
      player.volume = prevVol;
      // 3) vrati civilizovan režim
      await setMode('duckOthers');
    } catch (e) {
      console.log('[AUDIO kickstart] err:', e?.message || String(e));
    }
  };
  // END: Android kickstart

  // Učitaj sačuvan volumen (persist)
  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('musicVolume');
        if (m) setMusicVolume(JSON.parse(m));
      } catch { }
    })();
  }, []);

  // Inicijalizacija moda i plejera – jednom
  useEffect(() => {
    (async () => {
      try {
        await setMode('duckOthers'); // osnovni režim

        if (!playerRef.current) {
          const player = createAudioPlayer(MUSIC_PATH);
          player.loop = true;
          player.volume = musicVolume;
          playerRef.current = player;

          if (isPlaying) {
            if (Platform.OS === 'android') {
              await kickstartAndroidAudio(player);
            } else {
              player.play();
            }
          }
        }
      } catch (e) {
        console.warn('[AUDIO] init error:', e?.message || String(e));
      }
    })();

    // cleanup – obavezno ukloni player
    return () => {
      try { playerRef.current?.remove?.(); } catch { }
      playerRef.current = null;
    };
  }, []);

  // Reaguj na promenu jačine
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.volume = Math.max(0, Math.min(1, musicVolume)); } catch { }
  }, [musicVolume]);

  // Reaguj na play/pause
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying) {
        // uvek reset na početak (expo-audio ne resetuje automatski)
        p.seekTo?.(0)?.catch?.(() => { });
        if (Platform.OS === 'android') {
          kickstartAndroidAudio(p);
        } else {
          p.play();
        }
      } else {
        p.pause();
      }
    } catch { }
  }, [isPlaying]);

  // API
  const setVolume = async (v) => {
    const clamped = Math.max(0, Math.min(1, v ?? 0));
    setMusicVolume(clamped);
    try { await AsyncStorage.setItem('musicVolume', JSON.stringify(clamped)); } catch { }
  };
  const mute = () => setIsPlaying(false);
  const unmute = () => setIsPlaying(true);

  // Test dugme – forsira puštanje (koristi se u Podešavanjima)
  const testMusic = async () => {
    try {
      await setMode('duckOthers');

      let p = playerRef.current;
      if (!p) {
        p = createAudioPlayer(MUSIC_PATH);
        p.loop = true;
        playerRef.current = p;
      }
      p.volume = musicVolume;
      await p.seekTo(0);

      if (Platform.OS === 'android') {
        await kickstartAndroidAudio(p);
      } else {
        p.play();
      }
      setIsPlaying(true);
    } catch (e) {
      console.warn('[AUDIO test] error:', e?.message || String(e));
    }
  };

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
// END: Migracija na expo-audio (novi API) + Android kickstart
