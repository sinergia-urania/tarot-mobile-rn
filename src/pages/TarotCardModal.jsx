// START: Uvoz svih potrebnih podataka za modal
import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// START: (uklonjeno) Lokalni SR JSON-ovi — prelazimo na i18n za live switching
// import cardMeanings from '../locales/sr/cardMeanings.json';
// import extendedMeanings from '../locales/sr/extendedMeanings.json';
// END: (uklonjeno)
// START: Import helper funkcije za slike
import { getCardImagePath } from '../utils/getCardImagePath';
// END: Import helper funkcije za slike
// END: Uvoz svih potrebnih podataka za modal

// START: i18n import
import { useTranslation } from 'react-i18next';
// END: i18n import

const TarotCardModal = ({
  card,
  isOpen,
  onClose,
}) => {
  if (!card) return null;

  // START: i18n hook (+ ns za karte/opise)
  const { t } = useTranslation(['common', 'cardMeanings', 'extendedMeanings']);
  // END: i18n hook

  // START: Ključ karte + i18n izvori (live switching)
  // card.key je npr. "theFool", "sevenOfPentacles" itd
  const cardKey = card.key;

  // Naslov (ime karte)
  const title = t(`cards.${cardKey}.name`, {
    ns: 'cardMeanings',
    defaultValue: card.name || cardKey,
  });

  // Opisi (extended)
  const symbolism = t(`${cardKey}.symbolism`, { ns: 'extendedMeanings', defaultValue: '' });
  const upright = t(`${cardKey}.uprightExtended`, { ns: 'extendedMeanings', defaultValue: '' });
  const reversed = t(`${cardKey}.reversedExtended`, { ns: 'extendedMeanings', defaultValue: '' });
  const daily = t(`${cardKey}.daily`, { ns: 'extendedMeanings', defaultValue: '' });

  // Helper: prikaži sekciju samo ako ima teksta (sprečava React dev warninge)
  const hasText = (s) => typeof s === 'string' && s.trim().length > 0;
  // END: Ključ karte + i18n izvori (live switching)

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

            {/* Naslov karte (i18n) */}
            <Text style={styles.title}>{title}</Text>

            {/* START: Sekcija SIMBOLIKA (i18n) */}
            {hasText(symbolism) && (
              <>
                <Text style={styles.sectionTitle}>{t('common:sections.symbolism', { defaultValue: 'Symbolism' })}:</Text>
                <Text style={styles.description}>{symbolism}</Text>
              </>
            )}
            {/* END: Sekcija SIMBOLIKA */}

            {/* START: Uspravno značenje (i18n) */}
            {hasText(upright) && (
              <>
                <Text style={styles.sectionTitle}>{t('common:sections.upright', { defaultValue: 'Upright meaning' })}:</Text>
                <Text style={styles.description}>{upright}</Text>
              </>
            )}
            {/* END: Uspravno značenje */}

            {/* START: Obrnuto značenje (i18n) */}
            {hasText(reversed) && (
              <>
                <Text style={styles.sectionTitle}>{t('common:sections.reversed', { defaultValue: 'Reversed meaning' })}:</Text>
                <Text style={styles.description}>{reversed}</Text>
              </>
            )}
            {/* END: Obrnuto značenje */}

            {/* START: Značenje kao karta dana (i18n) */}
            {hasText(daily) && (
              <>
                <Text style={styles.sectionTitle}>{t('common:sections.daily', { defaultValue: 'Meaning as Card of the Day' })}:</Text>
                <Text style={styles.description}>{daily}</Text>
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
