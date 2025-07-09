import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

const FlyingCoin = ({ start, end, onComplete }) => {
  const position = useRef(new Animated.ValueXY({ x: start.x, y: start.y })).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    position.setValue({ x: start.x, y: start.y });
    opacity.setValue(1);
    scale.setValue(1);

    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: end.x, y: end.y },
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.8,
        duration: 1800,
        useNativeDriver: true,
      }),
    ]).start(onComplete);
  }, [start, end]);

  return (
    <Animated.View
      style={[
        styles.coin,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
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
