// START: Uvoz svih potrebnih podataka za modal
// START: perf(import) — dodaj useMemo i memo
import React, { memo, useMemo } from 'react';
// END: perf(import)
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// START: Import helper funkcije za slike
import { getCardImagePath } from '../utils/getCardImagePath';
// END: Import helper funkcije za slike
// END: Uvoz svih potrebnih podataka za modal

// START: i18n import
// START: perf(i18n) — koristimo i i18n.language za memo deps
import { useTranslation } from 'react-i18next';
// END: perf(i18n)
// END: i18n import

// START: SafeImage (expo-image) za iOS/WebP
import SafeImage from '../components/SafeImage';
// END: SafeImage

// START: helper – detekcija obrnute karte
const isCardReversed = (card) => {
  if (!card) return false;
  if (typeof card.reversed === 'boolean') return card.reversed;
  if (typeof card.isReversed === 'boolean') return card.isReversed;
  if (typeof card.obrnuto === 'boolean') return card.obrnuto;
  if (typeof card.upravno === 'boolean') return !card.upravno;
  if (typeof card.isUpright === 'boolean') return !card.isUpright;
  if (typeof card.orientation === 'string') return /revers|reverse|obrn/i.test(card.orientation);
  if (typeof card.polozaj === 'string') return /revers|obrn/i.test(card.polozaj);
  return false;
};
// END: helper – detekcija obrnute karte

const TarotCardModal = ({
  card,
  isOpen,
  onClose,
}) => {
  // START: guard — ako nema karte ili modal nije otvoren, ne renderuj ništa
  if (!card || !isOpen) return null;
  // END: guard

  // START: i18n hook (+ ns za karte/opise)
  const { t, i18n } = useTranslation(['common', 'cardMeanings', 'extendedMeanings']);
  // END: i18n hook

  // START: Ključ karte + i18n izvori (live switching) + memo za revers
  const cardKey = card.key;

  // memo: da izbegnemo re-kalkulaciju pri svakom renderu
  const reversed = useMemo(() => isCardReversed(card), [card]);

  // Naslov (ime karte)
  const title = useMemo(() => (
    t(`cards.${cardKey}.name`, {
      ns: 'cardMeanings',
      defaultValue: card.name || cardKey,
    })
  ), [cardKey, t, i18n.language]);

  // Opisi (extended)
  const symbolism = useMemo(() => t(`${cardKey}.symbolism`, { ns: 'extendedMeanings', defaultValue: '' }), [cardKey, t, i18n.language]);
  const upright = useMemo(() => t(`${cardKey}.uprightExtended`, { ns: 'extendedMeanings', defaultValue: '' }), [cardKey, t, i18n.language]);
  const reversedText = useMemo(() => t(`${cardKey}.reversedExtended`, { ns: 'extendedMeanings', defaultValue: '' }), [cardKey, t, i18n.language]);
  const daily = useMemo(() => t(`${cardKey}.daily`, { ns: 'extendedMeanings', defaultValue: '' }), [cardKey, t, i18n.language]);

  const hasText = (s) => typeof s === 'string' && s.trim().length > 0;
  // END: Ključ karte + i18n izvori (live switching)

  return (
    // START: Modal perf — statusBarTranslucent/hardwareAccelerated/presentationStyle
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
    >
      {/* END: Modal perf */}
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content}>
            {/* START: Prikaz slike karte preko helper funkcije (SafeImage) + perf props */}
            <SafeImage
              source={getCardImagePath(cardKey)}
              style={[styles.cardImage, reversed && { transform: [{ rotate: '180deg' }] }]}
              contentFit="contain"
              transition={150}
              cachePolicy="disk"
              recyclingKey={cardKey}
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
            {hasText(reversedText) && (
              <>
                <Text style={styles.sectionTitle}>{t('common:sections.reversed', { defaultValue: 'Reversed meaning' })}:</Text>
                <Text style={styles.description}>{reversedText}</Text>
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

// START: memo wrap — sprečava nepotrebne re-render-e kada parent menja state
export default memo(TarotCardModal);
// END: memo wrap

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
