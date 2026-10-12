import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

// Ege Üniversitesi ve Ege MYO logolarını yan yana gösteren ortak bileşen.
// size: her bir logonun genişliği/yüksekliği (kare).
export default function LogoLockup({ size = 56, style }) {
  return (
    <View style={[styles.row, style]}>
      <Image
        source={require('../../assets/logos/ege-universitesi.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <View style={{ width: size * 0.18 }} />
      <Image
        source={require('../../assets/logos/ege-myo.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
