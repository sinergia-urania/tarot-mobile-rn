// START: uklanjanje slidera i fiksni volume 20%
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { useMusic } from '../context/MusicProvider';

const SoundSettings = () => {
  const { setVolume } = useMusic();
  const { t } = useTranslation('common', { keyPrefix: 'soundControls' });

  const FIXED_VOLUME = 0.2;
  const [localMusicVolume, setLocalMusicVolume] = useState(FIXED_VOLUME);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        setLocalMusicVolume(FIXED_VOLUME);
        try {
          await AsyncStorage.setItem('musicVolume', JSON.stringify(FIXED_VOLUME));
        } catch { }
        try {
          await setVolume(FIXED_VOLUME);
        } catch { }
      } finally {
        isInitializedRef.current = true;
      }
    })();
  }, [setVolume]);

  return (
    <View style={styles.settingRow}>
      <Text style={styles.label}>🎵 {t('music')}</Text>

      {/* START: Slider uklonjen, prikazujemo samo vrednost */}
      <Text style={styles.percent}>{Math.round(localMusicVolume * 100)}%</Text>
      {/* END: Slider uklonjen */}
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
  percent: {
    color: '#c9ad6a',
    fontSize: 15,
    minWidth: 34,
    textAlign: 'right',
  },
});

export default SoundSettings;
// END: uklanjanje slidera i fiksni volume 20%
