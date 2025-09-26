import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';

export default function UnaSpinner() {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(barAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    ).start();
  }, []);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['10%', '100%'],
  });

  return (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#0B1026', // splash boja ili po tvom ukusu
    }}>
      <Image
        source={require('../../assets/una.png')} 

        style={{
          width: 400,
          height: 400,
          borderRadius: 250,
          borderWidth: 7,
          borderColor: '#A685FF',
        }}
      />
      <View style={{
        width: 300,
        height: 26,
        backgroundColor: '#2a203a',
        borderRadius: 13,
        marginTop: 48,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFA50033',
        shadowColor: '#FFA500',
        shadowOpacity: 0.8,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 16,
      }}>
        <Animated.View style={{
          height: 26,
          width: barWidth,
          backgroundColor: 'orange',
          borderRadius: 13,
          shadowColor: '#FF9800',
          shadowOpacity: 0.9,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 20,
        }} />
      </View>
    </View>
  );
}


