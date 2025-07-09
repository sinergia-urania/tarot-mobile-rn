// START: povezivanje slidera sa globalnom muzikom

import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useMusic } from '../context/MusicProvider';

const SoundSettings = () => {
  const { musicVolume, setVolume } = useMusic(); // global!
  const [sfxVolume, setSfxVolume] = useState(0.5);

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
        <Text style={styles.label}>🎵 Muzika</Text>
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
        <Text style={styles.label}>🔔 Efekti</Text>
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
