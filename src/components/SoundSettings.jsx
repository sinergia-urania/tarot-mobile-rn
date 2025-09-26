// START: povezivanje slidera sa globalnom muzikom

import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMusic } from '../context/MusicProvider';
// START: i18n za labele zvuka (sa keyPrefix)
import { useTranslation } from 'react-i18next';
// END: i18n za labele zvuka

const SoundSettings = () => {
  const { musicVolume, setVolume } = useMusic(); // global!
  const [sfxVolume, setSfxVolume] = useState(0.5);

  // START: t() sa eksplicitnim namespace + keyPrefix = 'soundControls'
  // sada pozivamo t('music') i t('effects') bez rizika da promašimo putanju
  const { t } = useTranslation('common', { keyPrefix: 'soundControls' });
  // END: t() sa eksplicitnim namespace + keyPrefix

  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem('sfxVolume');
      if (s) setSfxVolume(JSON.parse(s));
    })();
  }, []);

  const handleMusic = async (value) => {
    setVolume(value); // koristi context!
  };
  const handleSfx = async (value) => {
    setSfxVolume(value);
    await AsyncStorage.setItem('sfxVolume', JSON.stringify(value));
  };

  return (
    <View>
      <View style={styles.settingRow}>
        {/* START: i18n - Muzika */}
        <Text style={styles.label}>🎵 {t('music')}</Text>
        {/* END: i18n - Muzika */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={musicVolume}
          onValueChange={handleMusic}
          minimumTrackTintColor="#c9ad6a"
          maximumTrackTintColor="#888"
          thumbTintColor="#facc15"
        />
        <Text style={styles.percent}>{Math.round(musicVolume * 100)}%</Text>
      </View>

      <View style={styles.settingRow}>
        {/* START: i18n - Efekti */}
        <Text style={styles.label}>🔔 {t('effects')}</Text>
        {/* END: i18n - Efekti */}
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          value={sfxVolume}
          onValueChange={handleSfx}
          minimumTrackTintColor="#c9ad6a"
          maximumTrackTintColor="#888"
          thumbTintColor="#facc15"
        />
        <Text style={styles.percent}>{Math.round(sfxVolume * 100)}%</Text>
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
// END: povezivanje slidera sa globalnom muzikom
