// START: povezivanje slidera sa globalnom muzikom + logaritamska kriva + debounce + fix za 0

import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useMusic } from '../context/MusicProvider';

const SoundSettings = () => {
  const { setVolume } = useMusic(); // ✅ Samo setVolume, NIKADA ne čitamo musicVolume!

  // ✅ FIX: Default volume 25% (slatka sredina)
  const [localMusicVolume, setLocalMusicVolume] = useState(0.25);

  const { t } = useTranslation('common', { keyPrefix: 'soundControls' });

  // ✅ Debounce timeout ref
  const musicTimeoutRef = useRef(null);

  // ✅ Flag da sprečimo update tokom mount-a
  const isInitializedRef = useRef(false);

  // ✅ Load saved volume from storage (samo jednom na mount)
  useEffect(() => {
    (async () => {
      try {
        const savedMusic = await AsyncStorage.getItem('musicVolume');

        if (savedMusic) {
          const parsed = JSON.parse(savedMusic);
          setLocalMusicVolume(parsed);
        }

        // ✅ Označimo da smo inicijalizovali
        isInitializedRef.current = true;
      } catch (err) {
        console.warn('[SoundSettings] Load error:', err);
        isInitializedRef.current = true;
      }
    })();
  }, []); // ✅ Samo jednom!

  // ✅ Bolja logaritamska kriva koja rešava problem kod 0
  const applyLogarithmicCurve = (value) => {
    if (value === 0) {
      return 0; // Tačno 0 - potpuno tiho
    } else if (value < 0.05) {
      // Linearno za 0-5% (izbegava skokove blizu nule)
      return value * 0.2; // 5% → 1%
    } else {
      // Logaritamska kriva za 5-100%
      // Exponenta 2.2 daje prirodniji osećaj
      return Math.pow(value, 2.2);
    }
  };

  // ✅ Debounced music handler
  const handleMusic = useCallback((value) => {
    // Odmah update UI (nema povratnog loop-a!)
    setLocalMusicVolume(value);

    // Debounce backend update
    if (musicTimeoutRef.current) {
      clearTimeout(musicTimeoutRef.current);
    }

    musicTimeoutRef.current = setTimeout(async () => {
      const logarithmicValue = applyLogarithmicCurve(value);

      // ✅ Setuj volume samo ako smo inicijalizovali
      if (isInitializedRef.current) {
        await setVolume(logarithmicValue);
      }

      // ✅ Sačuvaj RAW vrednost (pre logaritma) da slider ostane konzistentan
      await AsyncStorage.setItem('musicVolume', JSON.stringify(value));
    }, 100); // ✅ Povećan debounce sa 50ms na 100ms za stabilnost
  }, [setVolume]);

  // ✅ Cleanup timeout
  useEffect(() => {
    return () => {
      if (musicTimeoutRef.current) clearTimeout(musicTimeoutRef.current);
    };
  }, []);

  return (
    <View>
      {/* Samo Music Slider - Effects slider uklonjen */}
      <View style={styles.settingRow}>
        <Text style={styles.label}>🎵 {t('music')}</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={localMusicVolume}
          onValueChange={handleMusic}
          step={0.01} // ✅ Fine-grained control
          minimumTrackTintColor="#c9ad6a"
          maximumTrackTintColor="#888"
          thumbTintColor="#facc15"
        />
        <Text style={styles.percent}>{Math.round(localMusicVolume * 100)}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    justifyContent: 'space-between',
  },
  label: {
    color: '#fffbe7',
    fontSize: 18,
    minWidth: 82,
    marginRight: 8,
  },
  slider: {
    width: 160,
    height: 38,
  },
  percent: {
    color: '#c9ad6a',
    fontSize: 15,
    minWidth: 34,
    textAlign: 'right',
  },
});

export default SoundSettings;
// END: povezivanje slidera sa globalnom muzikom + logaritamska kriva + debounce + fix za 0
