import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCardImagePath } from '../utils/getCardImagePath';
import TarotCardModal from './TarotCardModal';
// START: Uvoz srpskih naziva iz JSON-a
import cardMeanings from '../locales/sr/cardMeanings.json';
// END: Uvoz srpskih naziva iz JSON-a
// START: i18n hook (cardMeanings)
import { useTranslation } from 'react-i18next';
// END: i18n hook (cardMeanings)

const cardKeys = [
  'theFool', 'theMagician', 'theHighPriestess', 'theEmpress', 'theEmperor',
  'theHierophant', 'theLovers', 'theChariot', 'strength', 'theHermit',
  'wheelOfFortune', 'justice', 'theHangedMan', 'death', 'temperance',
  'theDevil', 'theTower', 'theStar', 'theMoon', 'theSun', 'judgement', 'theWorld'
];

const VelikaArkanaList = (props) => {
  const [selectedCard, setSelectedCard] = useState(null);
  // START: init i18n
  const { t } = useTranslation(['cardMeanings']);
  // END: init i18n

  const handleCardPress = (key) => {
    setSelectedCard({ key });
    if (props.onCardView) props.onCardView();
  };

  const renderItem = ({ item: key }) => (
    <TouchableOpacity
      key={key}
      style={styles.cardContainer}
      onPress={() => handleCardPress(key)}
      activeOpacity={0.7}
    >
      <Image
        source={getCardImagePath(key)}
        style={styles.image}
        resizeMode="contain"
      />
      {/* START: naziv karte iz i18n (cardMeanings) sa fallback-om na lokalni sr JSON */}
      <Text style={styles.name}>
        {t(`cardMeanings:cards.${key}.name`, {
          defaultValue: (cardMeanings?.cards?.[key]?.name) || key
        })}
      </Text>
      {/* END: naziv karte iz i18n (cardMeanings) sa fallback-om */}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={cardKeys}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={3}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
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
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: 110,
    margin: 7,
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
  // START: Stil za grupnu ikonicu (dodaj svoju ikonicu kasnije)
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


