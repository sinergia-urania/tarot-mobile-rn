import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDukati } from '../context/DukatiContext';
import FlyingCoin from './FlyingCoin';

const { width, height } = Dimensions.get('window');

const AdRewardModal = ({ onClose, dukatiRef }) => {
  const { dodajDukate } = useDukati();
  const [coinAnim, setCoinAnim] = useState(null);

  const handleSimulateAd = () => {
    // Animiraj iz centra modala do fiksirane pozicije (npr. gore desno)
    setCoinAnim({
      start: { x: width / 2 - 16, y: height / 2 - 16 },
      end: { x: width - 64, y: 60 }, // prilagodi prema poziciji dukata
    });
  };

  const handleCoinComplete = async () => {
    dodajDukate(10);
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/bling.mp3')
      );
      await sound.playAsync();
    } catch (e) {
      // ignoriši ako zvuk ne radi
    }
    setCoinAnim(null);
    onClose();
  };

  return (
    <Modal transparent visible animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Simulacija reklame</Text>
          <Text style={styles.desc}>Zamisli da si pogledao/la reklamu 🎥</Text>
          <TouchableOpacity style={styles.button} onPress={handleSimulateAd}>
            <Text style={styles.buttonText}>Osvoji 10 dukata</Text>
          </TouchableOpacity>
        </View>
        {coinAnim && (
          <FlyingCoin
            start={coinAnim.start}
            end={coinAnim.end}
            onComplete={handleCoinComplete}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#fde68a',
    padding: 24,
    borderRadius: 18,
    alignItems: 'center',
    width: 320,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 22,
    color: '#222',
    marginBottom: 14,
  },
  desc: {
    fontSize: 16,
    marginBottom: 16,
    color: '#222',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#facc15',
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#222',
    fontSize: 17,
  },
});

export default AdRewardModal;
