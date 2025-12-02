import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image
} from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { logUserActivity } from '../services/userService';
import NotificationService from '../services/NotificationService';

const HomeScreen = () => {
  const { colors: COLORS } = useTheme();
  
  const handleLogout = async () => {
    try {
      // Log logout activity before signing out
      if (user?.uid) {
        // Remove push token
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.removeTokenFromFirestore(user.uid);
        } catch (e) {
          console.error('Error removing push token:', e);
        }

        await logUserActivity(
          user.uid,
          'Logged out of the mobile app',
          'logout',
          'User logged out from mobile application'
        );
      }
      
      await signOut(auth);
      // Navigation handled by auth state change
    } catch (error) {
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const user = auth.currentUser;
  
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      flex: 1,
      padding: SPACING.lg,
    },
    welcomeContainer: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
      marginTop: SPACING.lg,
    },
    logoImage: {
      width: 60,
      height: 60,
      marginBottom: SPACING.sm,
      resizeMode: 'contain',
    },
    appName: {
      fontSize: FONTS.sizes.xxxlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    welcomeText: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.xs,
    },
    emailText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.mediumBlue,
      fontWeight: FONTS.weights.medium,
    },
    cardContainer: {
      flex: 1,
    },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      ...SHADOWS.medium,
    },
    cardTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    cardDescription: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 22,
    },
    logoutButton: {
      backgroundColor: COLORS.error,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      marginTop: SPACING.lg,
    },
    logoutButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Image source={require('../assets/LogoBlue.png')} style={styles.logoImage} />
          <Text style={styles.appName}>PawSafety</Text>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.emailText}>{user?.email}</Text>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Pet Dashboard</Text>
            <Text style={styles.cardDescription}>
              Keep track of your pets, their health records, and safety information.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency Contacts</Text>
            <Text style={styles.cardDescription}>
              Quick access to veterinarians and emergency services in your area.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Safety Tips</Text>
            <Text style={styles.cardDescription}>
              Learn how to keep your pets safe in various situations and environments.
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};



export default HomeScreen; 