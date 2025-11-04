// START: TarotHeaderBanner.jsx - magijski red sa zvezdicama i animacijom (responsive)
import { CinzelDecorative_700Bold, useFonts } from '@expo-google-fonts/cinzel-decorative';
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export default function TarotHeaderBanner() {
  const { width } = useWindowDimensions();

  // Responsive pragovi
  const isVerySmall = width < 340;
  const isSmall = width < 380;
  const isPhablet = width >= 380 && width < 480;
  const isTablet = width >= 600;

  // Dinamički broj zvezdica levo/desno (ukupno 2*starCount)
  const starCount = isVerySmall ? 2 : isSmall ? 2 : isTablet ? 4 : 3;

  // Dinamička veličina zvezdica i fonta
  const starSize = isVerySmall ? 16 : isSmall ? 18 : isTablet ? 24 : 20;
  const titleFontSize = isVerySmall ? 16 : isSmall ? 18 : isTablet ? 24 : 20;
  const letterSpacing = isSmall ? 0.6 : 1;

  // Procena širine grupa zvezdica (3–8px margine ukupno po ikoni)
  const STAR_MX = isSmall ? 1 : 2;
  const starGroupWidth = starCount * (starSize + STAR_MX * 2);

  // Maksimalna širina naslova da stane u jedan red između zvezdica
  const sidePadding = 12; // malo “vazduha” levo/desno
  const maxTitleWidth = Math.max(80, width - (starGroupWidth * 2) - sidePadding * 2);

  // 9 animiranih vrednosti (stalna dužina da se broj hook-ova ne menja)
  const anims = useRef(Array.from({ length: 9 }, () => new Animated.Value(1))).current;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Učitaj custom font
  const [fontsLoaded] = useFonts({ CinzelDecorative_700Bold });
  if (!fontsLoaded) return null;

  // Izaberi prve starCount za levo i isto toliko za desno (ukupno 2*starCount)
  const leftAnims = anims.slice(0, starCount);
  const rightAnims = anims.slice(starCount, starCount * 2);

  return (
    <View style={styles.bannerWrapper}>
      <View style={styles.row}>
        {/* Leve zvezdice */}
        {leftAnims.map((anim, i) => (
          <Animated.View key={'left-star-' + i} style={{ opacity: anim }}>
            <Feather
              name="star"
              size={starSize}
              color="#FFD700"
              style={[styles.star, { marginHorizontal: STAR_MX }]}
            />
          </Animated.View>
        ))}

        {/* Naslov – fiksiramo maxWidth i držimo u jednom redu */}
        <Text
          numberOfLines={1}
          // adjustsFontSizeToFit pomaže na iOS; na Androidu ionako ručno skaliramo
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[
            styles.title,
            {
              fontFamily: 'CinzelDecorative_700Bold',
              fontSize: titleFontSize,
              letterSpacing,
              maxWidth: maxTitleWidth,
              marginHorizontal: 7,
            },
          ]}
        >
          Una Astro Tarot
        </Text>

        {/* Desne zvezdice */}
        {rightAnims.map((anim, i) => (
          <Animated.View key={'right-star-' + i} style={{ opacity: anim }}>
            <Feather
              name="star"
              size={starSize}
              color="#FFD700"
              style={[styles.star, { marginHorizontal: STAR_MX }]}
            />
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
    flexWrap: 'nowrap', // VAŽNO: jedan red, bez prelamanja
    width: '100%',
  },
  star: {
    textShadowColor: '#FFD700AA',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    color: '#9B59B6',
    // fontSize dinamički preko inline stila
    textShadowColor: '#BBB4FF55',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    // fontWeight ne koristimo – koristimo 700 varijantu iz google fonta
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
// END: TarotHeaderBanner.jsx - magijski red sa zvezdicama i animacijom (responsive)
