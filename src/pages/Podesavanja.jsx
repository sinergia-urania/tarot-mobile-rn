// START: Dodavanje Back dugmeta (strelica) u Podesavanja.jsx

import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SoundSettings from '../components/SoundSettings';

const Podesavanja = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Back dugme (strelica) */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Podešavanja</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zvuk</Text>
        <SoundSettings />
      </View>

      {/* Ovde možeš kasnije dodati još sekcija za temu, obaveštenja, itd. */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    padding: 20,
  },
  // START: stil za back dugme
  backBtn: {
    position: 'absolute',
    top: 28,
    left: 18,
    zIndex: 2,
    padding: 6,
    borderRadius: 18,
  },
  backIcon: {
    fontSize: 26,
    color: '#facc15',
    fontWeight: 'bold',
  },
  // END: stil za back dugme
  title: {
    color: '#facc15',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    alignSelf: 'center',
    letterSpacing: 1.3,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#222127',
    borderRadius: 14,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#c9ad6a',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    color: '#fffbe7',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 1.1,
  },
});

export default Podesavanja;

// END: Dodavanje Back dugmeta (strelica) u Podesavanja.jsx
