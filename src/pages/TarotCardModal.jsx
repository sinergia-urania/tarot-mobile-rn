// START: Uvoz svih potrebnih podataka za modal
import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import cardMeanings from '../locales/sr/cardMeanings.json';
import extendedMeanings from '../locales/sr/extendedMeanings.json';
// START: Import helper funkcije za slike
import { getCardImagePath } from '../utils/getCardImagePath';
// END: Import helper funkcije za slike
// END: Uvoz svih potrebnih podataka za modal

const TarotCardModal = ({
  card,
  isOpen,
  onClose,
}) => {
  if (!card) return null;

  // START: Povuci podatke za prikaz iz JSON fajlova
  // card.key je npr. "theFool", "sevenOfPentacles" itd
  const cardKey = card.key;
  const cardData = cardMeanings.cards[cardKey] || {};
  const extended = extendedMeanings[cardKey] || {};
  // END: Povuci podatke za prikaz iz JSON fajlova

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content}>
            {/* START: Prikaz slike karte preko helper funkcije */}
            <Image
              source={getCardImagePath(cardKey)}
              style={styles.cardImage}
              resizeMode="contain"
            />
            {/* END: Prikaz slike karte preko helper funkcije */}
            <Text style={styles.title}>{cardData.name || card.name || cardKey}</Text>

            {/* START: Sekcija SIMBOLIKA */}
            {extended.symbolism && (
              <>
                <Text style={styles.sectionTitle}>Simbolika:</Text>
                <Text style={styles.description}>{extended.symbolism}</Text>
              </>
            )}
            {/* END: Sekcija SIMBOLIKA */}

            {/* START: Uspravno značenje */}
            {extended.uprightExtended && (
              <>
                <Text style={styles.sectionTitle}>Uspravno značenje:</Text>
                <Text style={styles.description}>{extended.uprightExtended}</Text>
              </>
            )}
            {/* END: Uspravno značenje */}

            {/* START: Obrnuto značenje */}
            {extended.reversedExtended && (
              <>
                <Text style={styles.sectionTitle}>Obrnuto značenje:</Text>
                <Text style={styles.description}>{extended.reversedExtended}</Text>
              </>
            )}
            {/* END: Obrnuto značenje */}

            {/* START: Značenje kao karta dana */}
            {extended.daily && (
              <>
                <Text style={styles.sectionTitle}>Značenje kao karta dana:</Text>
                <Text style={styles.description}>{extended.daily}</Text>
              </>
            )}
            {/* END: Značenje kao karta dana */}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30,30,30,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '93%',
    maxHeight: '93%',
    backgroundColor: '#191a22',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1.2,
    borderColor: '#b19942',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 2,
    padding: 8,
  },
  closeIcon: {
    fontSize: 28,
    color: '#e2c06b',
  },
  content: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 26,
  },
  cardImage: {
    width: 170,
    height: 290,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#b19942',
    backgroundColor: '#fffbe7',
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#ffe690',
    marginBottom: 9,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: '#3d3006',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffe690',
    textAlign: 'center',
    textShadowColor: '#3d3006',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 15,
    color: '#fffde3',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
});

export default TarotCardModal;
