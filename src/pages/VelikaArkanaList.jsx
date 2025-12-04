import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCardImagePath } from '../utils/getCardImagePath';
import TarotCardModal from './TarotCardModal';
// START: i18n (nazivi karata)
import { useTranslation } from 'react-i18next';
import cardMeanings from '../locales/sr/cardMeanings.json';
// END: i18n (nazivi karata)
// START: SafeImage (expo-image) — iOS/WebP safe
import SafeImage from '../components/SafeImage';
// END: SafeImage

const cardKeys = [
  'theFool', 'theMagician', 'theHighPriestess', 'theEmpress', 'theEmperor',
  'theHierophant', 'theLovers', 'theChariot', 'strength', 'theHermit',
  'wheelOfFortune', 'justice', 'theHangedMan', 'death', 'temperance',
  'theDevil', 'theTower', 'theStar', 'theMoon', 'theSun', 'judgement', 'theWorld'
];

const VelikaArkanaList = (props) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const { t } = useTranslation(['cardMeanings']);

  // START: memoizovan handler (manje re-rendera itema)
  const handleCardPress = useCallback((key) => {
    setSelectedCard({ key });
    if (props.onCardView) props.onCardView();
  }, [props?.onCardView]);
  // END: memoizovan handler

  // START: memoizovan keyExtractor (stabilan identitet)
  const keyExtractor = useCallback((item) => item, []);
  // END: memoizovan keyExtractor

  // START: memoizovan renderItem + stabilni props za sliku (cache/recycling)
  const renderItem = useCallback(({ item: key }) => (
    <TouchableOpacity
      key={key}
      style={styles.cardContainer}
      onPress={() => handleCardPress(key)}
      activeOpacity={0.7}
    >
      <SafeImage
        source={getCardImagePath(key)}
        style={styles.image}
        contentFit="contain"
        transition={120}
        cachePolicy="disk"
        recyclingKey={key}
      />
      <Text style={styles.name}>
        {t(`cardMeanings:cards.${key}.name`, {
          defaultValue: (cardMeanings?.cards?.[key]?.name) || key
        })}
      </Text>
    </TouchableOpacity>
  ), [handleCardPress, t]);
  // END: memoizovan renderItem + stabilni props za sliku

  return (
    <View style={styles.screen}>
      <FlatList
        data={cardKeys}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        // START: FlatList tuning (render & memory)
        initialNumToRender={9}
        windowSize={5}
        maxToRenderPerBatch={9}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
      // END: FlatList tuning
      />

      <TarotCardModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#191a22',
  },
  grid: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: 110,
    margin: 6,
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#facc15',
    padding: 6,
    elevation: 2,
  },
  image: {
    width: 90,
    height: 140,
    marginBottom: 6,
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  // START: Stil za grupnu ikonicu (po želji ubaci kasnije svoju ikonicu)
  groupIcon: {
    width: 40,
    height: 40,
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 6,
    opacity: 0.92,
  },
  // END: Stil za grupnu ikonicu
});

export default VelikaArkanaList;
