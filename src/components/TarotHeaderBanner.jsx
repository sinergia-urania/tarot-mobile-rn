// START: TarotHeaderBanner.jsx - magijski red sa zvezdicama i animacijom
import { CinzelDecorative_700Bold, useFonts } from '@expo-google-fonts/cinzel-decorative';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export default function TarotHeaderBanner() {
  // Kreiramo 9 animated value za zvezdice (za fade loop, svaka u različitoj fazi)
  const anims = Array.from({ length: 9 }).map(() => useRef(new Animated.Value(1)).current);

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 1200 + i * 110,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1200 + i * 80,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  // Učitavanje fonta
  let [fontsLoaded] = useFonts({
    CinzelDecorative_700Bold,
  });

  if (!fontsLoaded) {
    return null; // ili placeholder
  }

  return (
    <View style={styles.bannerWrapper}>
      <View style={styles.row}>
         {/* 3 zvezdice levo */}
         {anims.slice(0, 3).map((anim, i) => (
        <Animated.View key={'left-star-' + i} style={{ opacity: anim }}>
          <Feather name="star" size={22} color="#FFD700" style={styles.star} />
        </Animated.View>
        ))}
        {/* Naslov */}
        <Text
          style={[
            styles.title,
            { fontFamily: 'CinzelDecorative_700Bold' }
          ]}
        >
          AI Tarot Una
        </Text>
        {/* Desne 3 zvezdice */}
        {anims.slice(3, 6).map((anim, i) => (
          <Animated.View key={'mid-star-' + i} style={{ opacity: anim }}>
            <Feather name="star" size={22} color="#FFD700" style={styles.star} />
          </Animated.View>
        ))}
        
       
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrapper: {
    width: '100%',
    backgroundColor: 'black',
    paddingTop: 1,
    paddingBottom: 0,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  star: {
    marginHorizontal: 1.5,
    textShadowColor: '#FFD700AA',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: '#9B59B6',
    fontSize: 22,
    marginHorizontal: 7,
    letterSpacing: 1,
    fontWeight: 'bold',
    textShadowColor: '#BBB4FF55',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  msg: {
    color: '#FFD700',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
    letterSpacing: 0.2,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
// END: TarotHeaderBanner.jsx - magijski red sa zvezdicama i animacijom
