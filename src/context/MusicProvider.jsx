// START: stabilizacija audio moda i zaključavanje volume-a (20%)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from './AuthProvider';

const MUSIC_PATH = require('../assets/sounds/sinergija-audio.mp3');

const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const { user } = useAuth();
  const playerRef = useRef(null);

  // START: fiksni BGM volume (20%) – stabilnost u production
  const FIXED_VOLUME = 0.2;
  const FORCE_FIXED_VOLUME = true;
  const [musicVolume, setMusicVolume] = useState(FIXED_VOLUME);
  // END: fiksni BGM volume (20%)

  const [isPlaying, setIsPlaying] = useState(false);

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
        // START: fix syntax (spread opts)
        ...opts,
        // END: fix syntax (spread opts)
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

  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('musicVolume');
        if (m) setMusicVolume(JSON.parse(m));
      } catch { }

      // START: forsiraj 20% bez obzira na storage (da se ne vrati “problematična” vrednost)
      if (FORCE_FIXED_VOLUME) {
        try {
          await AsyncStorage.setItem('musicVolume', JSON.stringify(FIXED_VOLUME));
        } catch { }
        setMusicVolume(FIXED_VOLUME);
      }
      // END: forsiraj 20%
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await setMode('duckOthers');

        if (!playerRef.current) {
          const player = createAudioPlayer(MUSIC_PATH);
          player.loop = true;
          player.volume = musicVolume;
          playerRef.current = player;
        }
      } catch (e) {
        console.warn('[AUDIO] init error:', e?.message || String(e));
      }
    })();

    return () => {
      try {
        playerRef.current?.remove?.();
      } catch { }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;

    const shouldPlay = !!user && isPlaying;

    (async () => {
      try {
        if (shouldPlay) {
          if (!p.playing) {
            if (Platform.OS === 'android' && p.currentTime === 0) {
              await kickstartAndroidAudio(p);
            } else {
              p.play();
            }
          }
        } else {
          if (p.playing) p.pause();
        }
      } catch (e) {
        console.warn('Audio logic error:', e);
      }
    })();
  }, [user, isPlaying]);

  useEffect(() => {
    if (user) setIsPlaying(true);
  }, [user]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      p.volume = Math.max(0, Math.min(1, musicVolume));
    } catch { }
  }, [musicVolume]);

  const setVolume = async (v) => {
    // START: zaključan volume (20%) – ignoriši promene sa UI
    const clamped = Math.max(0, Math.min(1, v ?? 0));
    const next = FORCE_FIXED_VOLUME ? FIXED_VOLUME : clamped;
    setMusicVolume(next);
    try {
      await AsyncStorage.setItem('musicVolume', JSON.stringify(next));
    } catch { }
    // END: zaključan volume (20%)
  };

  const mute = () => setIsPlaying(false);
  const unmute = () => setIsPlaying(true);

  return (
    <MusicContext.Provider
      value={{
        musicVolume,
        setVolume,
        isPlaying,
        mute,
        unmute,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};
// END: stabilizacija audio moda i zaključavanje volume-a (20%)
