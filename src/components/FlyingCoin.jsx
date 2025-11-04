import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

const FlyingCoin = ({ start, end, onComplete }) => {
  // Odvojene vrednosti za X i Y → potpuno kompatibilno sa native driver-om
  const x = useRef(new Animated.Value(start.x)).current;
  const y = useRef(new Animated.Value(start.y)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset pre svakog leta
    x.setValue(start.x);
    y.setValue(start.y);
    opacity.setValue(1);
    scale.setValue(1);

    // Lepši easing, isti tajming
    const anim = Animated.parallel([
      Animated.timing(x, {
        toValue: end.x,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: end.y,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Sekvenca za opacity (1.3s vidljiv, pa 0.5s fade-out)
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // Blagi “umanjujući” efekat
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]);

    anim.start(onComplete);
    // Cleanup: ako ekran ode, prekini animaciju da ne curi
    return () => anim.stop();
    // Precizan dependency niz da reaguje na promenu kooridinata
  }, [start.x, start.y, end.x, end.y, onComplete, x, y, opacity, scale]);

  return (
    <Animated.View
      style={[
        styles.coin,
        {
          transform: [
            { translateX: x },
            { translateY: y },
            { scale },
          ],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.coinText}>💰</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  coin: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  coinText: {
    fontSize: 32,
  },
});

export default FlyingCoin;
