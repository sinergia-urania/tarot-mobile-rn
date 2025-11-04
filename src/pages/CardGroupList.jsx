import React, { useCallback, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCardImagePath } from '../utils/getCardImagePath';
import TarotCardModal from './TarotCardModal';
// START: i18n
import { useTranslation } from 'react-i18next';
import cardMeanings from '../locales/sr/cardMeanings.json';
// END: i18n
// START: SafeImage (expo-image) za karte
import SafeImage from '../components/SafeImage';
// END: SafeImage

const CardGroupList = ({ cards, title, groupIcon, onCardView }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const { t } = useTranslation(['cardMeanings']);

  // START: memo handler
  const handleCardPress = useCallback((item) => {
    setSelectedCard(item);
    if (onCardView) onCardView();
  }, [onCardView]);
  // END: memo handler

  // START: memo keyExtractor
  const keyExtractor = useCallback((it) => it.key, []);
  // END: memo keyExtractor

  // START: memo renderItem + SafeImage props
  const renderItem = useCallback(({ item }) => (
    <TouchableOpacity style={styles.cardContainer} onPress={() => handleCardPress(item)}>
      <SafeImage
        source={getCardImagePath(item.key)}
        style={styles.cardImage}
        contentFit="contain"
        transition={120}
        cachePolicy="disk"
        recyclingKey={item.key}
      />
      <Text style={styles.cardTitle}>
        {t(`cardMeanings:cards.${item.key}.name`, {
          defaultValue: (cardMeanings?.cards?.[item.key]?.name) ?? item.key
        })}
      </Text>
    </TouchableOpacity>
  ), [handleCardPress, t]);
  // END: memo renderItem + SafeImage props

  return (
    <View style={styles.screen}>
      {/* Ikonica grupe (ostaje RN Image jer je mala i retko se menja) */}
      {groupIcon && (
        <Image source={groupIcon} style={styles.groupIcon} />
      )}

      <Text style={styles.groupTitle}>{title}</Text>

      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.cardsList}
        showsVerticalScrollIndicator={false}
        // START: FlatList tuning
        initialNumToRender={9}
        windowSize={5}
        maxToRenderPerBatch={9}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      // END: FlatList tuning
      />

      {selectedCard && (
        <TarotCardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          isOpen={!!selectedCard}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#191a22',
  },
  groupIcon: {
    width: 44,
    height: 44,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 3,
    opacity: 0.97,
  },
  groupTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#facc15',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 7,
    letterSpacing: 1,
  },
  cardsList: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    alignItems: 'center',
  },
  cardContainer: {
    alignItems: 'center',
    margin: 7,
    padding: 4,
    backgroundColor: '#18181b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#facc15',
    elevation: 2,
    width: 110,
  },
  cardImage: {
    width: 75,
    height: 130,
    borderRadius: 10,
    marginBottom: 3,
    borderWidth: 2,
    borderColor: '#ecd899',
    backgroundColor: '#fffbe7',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#85760b',
    textAlign: 'center',
    width: 80,
  },
});

export default CardGroupList;
