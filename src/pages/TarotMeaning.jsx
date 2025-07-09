import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SidebarMenu from '../components/SidebarMenu'; // DODATO!
import TarotHeader from '../components/TarotHeader';
import CardGroupList from './CardGroupList';
import VelikaArkanaList from './VelikaArkanaList';

const groupMap = {
  velika: { label: 'Velika Arkana', icon: require('../assets/icons/major.webp') },
  stapovi: { label: 'Štapovi', icon: require('../assets/icons/wands.webp') },
  pehari: { label: 'Pehari', icon: require('../assets/icons/cups.webp') },
  macevi: { label: 'Mačevi', icon: require('../assets/icons/swords.webp') },
  zlatnici: { label: 'Zlatnici', icon: require('../assets/icons/pentacles.webp') },
};

const wandKeys = [ 'aceOfWands', 'twoOfWands', 'threeOfWands', 'fourOfWands', 'fiveOfWands',
  'sixOfWands', 'sevenOfWands', 'eightOfWands', 'nineOfWands', 'tenOfWands',
  'pageOfWands', 'knightOfWands', 'queenOfWands', 'kingOfWands'
 ];
const cupKeys = [ 'aceOfCups', 'twoOfCups', 'threeOfCups', 'fourOfCups', 'fiveOfCups',
  'sixOfCups', 'sevenOfCups', 'eightOfCups', 'nineOfCups', 'tenOfCups',
  'pageOfCups', 'knightOfCups', 'queenOfCups', 'kingOfCups'
];
const swordKeys = [ 
  'aceOfSwords', 'twoOfSwords', 'threeOfSwords', 'fourOfSwords', 'fiveOfSwords',
  'sixOfSwords', 'sevenOfSwords', 'eightOfSwords', 'nineOfSwords', 'tenOfSwords',
  'pageOfSwords', 'knightOfSwords', 'queenOfSwords', 'kingOfSwords'
 ];
const pentacleKeys = [ 
  'aceOfPentacles', 'twoOfPentacles', 'threeOfPentacles', 'fourOfPentacles', 'fiveOfPentacles',
  'sixOfPentacles', 'sevenOfPentacles', 'eightOfPentacles', 'nineOfPentacles', 'tenOfPentacles',
  'pageOfPentacles', 'knightOfPentacles', 'queenOfPentacles', 'kingOfPentacles'
];

const TarotMeaning = () => {
  const [selectedGroup, setSelectedGroup] = useState('velika');
  const [sidebarOpen, setSidebarOpen] = useState(false); // DODATO!
  const navigation = useNavigation();
  const route = useRoute();

  const generateCardList = (keys) =>
    keys.map((key) => ({
      key,
      name: key,
    }));

  const renderGroup = () => {
    switch (selectedGroup) {
      case 'velika':
        return <VelikaArkanaList />;
      case 'stapovi':
        return <CardGroupList cards={generateCardList(wandKeys)} />;
      case 'pehari':
        return <CardGroupList cards={generateCardList(cupKeys)} />;
      case 'macevi':
        return <CardGroupList cards={generateCardList(swordKeys)} />;
      case 'zlatnici':
        return <CardGroupList cards={generateCardList(pentacleKeys)} />;
      default:
        return (
          <Text style={styles.notImplemented}>
            Još nije implementirano: {groupMap[selectedGroup].label}
          </Text>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#181818' }}>
      {/* Header fiksiran na vrhu */}
      <TarotHeader
        showBack={route.name !== 'Home'}
        onBack={() => navigation.goBack()}
        onHome={() => navigation.navigate('Home')}
        onMenu={() => setSidebarOpen(true)} // ISPRAVLJENO!
      />

      {/* Ikonice grupe odmah ispod zaglavlja */}
      <View style={styles.iconBarWrapper}>
        <ScrollView
          horizontal
          contentContainerStyle={styles.navBarContent}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(groupMap).map(([key, { icon }]) => (
            <TouchableOpacity
              key={key}
              onPress={() => setSelectedGroup(key)}
              style={[
                styles.iconButton,
                selectedGroup === key && styles.iconButtonSelected
              ]}
              activeOpacity={0.7}
            >
              <Image source={icon} style={styles.iconImg} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Naziv grupe */}
      <Text style={styles.groupTitle}>
        {groupMap[selectedGroup].label}
      </Text>

      {/* Sadržaj (grid sa kartama) */}
      <View style={{ flex: 1 }}>
        {renderGroup()}
      </View>

      {/* SIDEBAR MENU je ovde, kao na TarotHome! */}
      <SidebarMenu visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  iconBarWrapper: {
    backgroundColor: '#181818',
    borderBottomColor: '#c9ad6a',
    borderBottomWidth: 1,
    minHeight: 54,
    paddingTop: 0,
    paddingBottom: 0,
    justifyContent: 'center',
  },
  navBarContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 54,
  },
  iconButton: {
    marginHorizontal: 5,
    opacity: 0.5,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 1,
    backgroundColor: 'transparent',
  },
  iconButtonSelected: {
    opacity: 1,
    borderColor: '#c9ad6a',
    backgroundColor: '#2c2206',
  },
  iconImg: {
    width: 60,
    height: 60,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d8b33c',
    backgroundColor: '#fffbe7',
  },
  groupTitle: {
    color: '#fffbe7',
    fontSize: 22,
    textAlign: 'center',
    fontWeight: 'bold',
    paddingVertical: 10,
    letterSpacing: 1.5,
    backgroundColor: 'transparent',
  },
  notImplemented: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 17,
    marginTop: 40,
  },
});

export default TarotMeaning;
