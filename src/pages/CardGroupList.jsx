import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCardImagePath } from '../utils/getCardImagePath';
import TarotCardModal from './TarotCardModal';
// START: Dodaj import za imena karata iz JSON-a
import cardMeanings from '../locales/sr/cardMeanings.json';
// END: Dodaj import za imena karata iz JSON-a
// START: i18n hook (cardMeanings)
import { useTranslation } from 'react-i18next';
// END: i18n hook (cardMeanings)

const CardGroupList = ({ cards, title, groupIcon, onCardView }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  // START: init i18n
  const { t } = useTranslation(['cardMeanings']);
  // END: init i18n

  // START: Pravi grid sa 3 kolone + poziv parent handlera
  const handleCardPress = (item) => {
    setSelectedCard(item);
    if (onCardView) onCardView();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.cardContainer} onPress={() => handleCardPress(item)}>
      <Image source={getCardImagePath(item.key)} style={styles.cardImage} />
      {/* START: naziv karte preko i18n (cardMeanings) sa fallback-om na lokalni sr JSON */}
      <Text style={styles.cardTitle}>
        {t(`cardMeanings:cards.${item.key}.name`, {
          defaultValue: (cardMeanings?.cards?.[item.key]?.name) ?? item.key
        })}
      </Text>
      {/* END: naziv karte preko i18n (cardMeanings) sa fallback-om */}
    </TouchableOpacity>
  );
  // END: Pravi grid sa 3 kolone + poziv parent handlera

  return (
    <View style={styles.screen}>
      {/* START: Ikonica grupe odmah ispod headera (opciono) */}
      {groupIcon && (
        <Image source={groupIcon} style={styles.groupIcon} />
      )}
      {/* END: Ikonica grupe */}

      <Text style={styles.groupTitle}>{title}</Text>
      <FlatList
        data={cards}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        numColumns={3}
        contentContainerStyle={styles.cardsList}
        showsVerticalScrollIndicator={false}
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


