// DukatiIndicator.jsx – migrirano za React Native!
import React, { forwardRef, useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useDukati } from '../context/DukatiContext';

const DukatiIndicator = forwardRef((props, ref) => {
  const { dukati } = useDukati();

  useEffect(() => {
    console.log('DukatiIndicator mounted, ref:', ref);
  }, []);

  return (
    <View ref={ref} style={styles.container}>
      <Image
        source={require('../assets/icons/treasure.png')}
        style={styles.icon}
        resizeMode="contain"
      />
      <Text style={styles.text}>{dukati}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // koristi marginRight na ikonici za širu kompatibilnost
  },
  icon: {
    width: 32,
    height: 32,
    marginRight: 4,
  },
  text: {
    color: '#facc15', // zlatna boja
    fontWeight: '600',
    fontSize: 18,
  },
});

export default DukatiIndicator;
