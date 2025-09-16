import React, { useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Image
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const LoadingScreen = () => {
  const { colors: COLORS } = useTheme();
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    logoImage: {
      width: 80,
      height: 80,
      marginBottom: SPACING.lg,
      resizeMode: 'contain',
    },
    appName: {
      fontSize: FONTS.sizes.title,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xxl,
    },
    loader: {
      marginBottom: SPACING.lg,
    },
    loadingText: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontWeight: FONTS.weights.medium,
    },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image source={require('../assets/LogoBlue.png')} style={styles.logoImage} />
        <Text style={styles.appName}>PawSafety</Text>
        <ActivityIndicator 
          size="large" 
          color={COLORS.darkPurple} 
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
};



export default LoadingScreen; 