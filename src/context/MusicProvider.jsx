import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const MUSIC_PATH = require('../assets/sounds/sinergija-audio.mp3');
const MusicContext = createContext();
export const useMusic = () => useContext(MusicContext);

export const MusicProvider = ({ children }) => {
  const musicRef = useRef(null);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(true);

  // Učitaj volume na mount
  useEffect(() => {
    (async () => {
      try {
        const m = await AsyncStorage.getItem('musicVolume');
        if (m) setMusicVolume(JSON.parse(m));
        
      } catch (e) {
        
      }
    })();
  }, []);

  // Prva inicijalizacija zvuka — SAMO JEDNOM
  useEffect(() => {
    async function initMusic() {
      try {
        if (!musicRef.current) {
          
          await Audio.setAudioModeAsync({
            staysActiveInBackground: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
          });
          const { sound } = await Audio.Sound.createAsync(
            MUSIC_PATH,
            {
              volume: musicVolume,
              isLooping: true,
              shouldPlay: true, // <<< UVEK odmah pusti pesmu!
            }
          );
          musicRef.current = sound;
          // Nema više if (isPlaying) — odmah playAsync!
          await sound.playAsync();
          
        }
      } catch (e) {
        
      }
    }
    initMusic();
    return () => {
      
      if (musicRef.current) {
        musicRef.current.unloadAsync();
        musicRef.current = null;
      }
    };
  }, []); // <<< SAMO NA MOUNT!

  // Promena jačine i pauza/play — koristi POSTOJEĆU pesmu
  useEffect(() => {
    const setProps = async () => {
      try {
        if (musicRef.current) {
          await musicRef.current.setVolumeAsync(musicVolume);
          const status = await musicRef.current.getStatusAsync();
          if (isPlaying && !status.isPlaying) {
            await musicRef.current.playAsync();
            
          }
          if (!isPlaying && status.isPlaying) {
            await musicRef.current.pauseAsync();
            
          }
        }
      } catch (e) {
        
      }
    };
    setProps();
  }, [musicVolume, isPlaying]);

  const setVolume = async (v) => {
    setMusicVolume(v);
    await AsyncStorage.setItem('musicVolume', JSON.stringify(v));
    
  };
  const mute = () => setIsPlaying(false);
  const unmute = () => setIsPlaying(true);

  return (
    <MusicContext.Provider value={{
      musicVolume, setVolume,
      isPlaying, mute, unmute
    }}>
      {children}
    </MusicContext.Provider>
  );
};
