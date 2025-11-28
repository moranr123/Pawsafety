import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../services/firebase';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import NotificationService from '../../services/NotificationService';

const SettingsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);

  // Load push notification preference on mount
  useEffect(() => {
    const loadPushNotificationPreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('PUSH_NOTIFICATIONS_ENABLED');
        if (savedPreference !== null) {
          setPushNotificationsEnabled(savedPreference === 'true');
        }
      } catch (error) {
        // Error handled silently - use default value
      }
    };
    loadPushNotificationPreference();
  }, []);

  // Create styles using current theme colors
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.lg,
      paddingTop: 50,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      ...SHADOWS.light,
      position: 'relative',
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'SF Pro Display',
      fontWeight: '700',
      color: COLORS.white,
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    section: {
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
      marginLeft: SPACING.xs,
    },
    settingsItem: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.xs,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...SHADOWS.light,
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    itemIcon: {
      fontSize: FONTS.sizes.xlarge,
      marginRight: SPACING.md,
    },
    itemText: {
      flex: 1,
    },
    itemTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
    },
    itemSubtitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: 2,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    arrow: {
      fontSize: FONTS.sizes.xlarge,
      color: COLORS.secondaryText,
      marginLeft: SPACING.sm,
    },
    bottomSpacing: {
      height: 100,
    },
  }), [COLORS]);

  const togglePushNotifications = async (value) => {
    try {
      setPushNotificationsEnabled(value);
      // Save preference to AsyncStorage
      await AsyncStorage.setItem('PUSH_NOTIFICATIONS_ENABLED', value.toString());
      
      // Update NotificationService preference
      const notificationService = NotificationService.getInstance();
      notificationService.setPushNotificationsEnabled(value);
      
      Alert.alert(
        'Push Notifications',
        `Push notifications ${value ? 'enabled' : 'disabled'}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update push notification preference. Please try again.');
    }
  };

  const handleAppVersionPress = () => {
    const version = '1.0.0';
    const buildNumber = '1';
    Alert.alert(
      'App Version',
      `PawSafety\n\nVersion: ${version}\nBuild: ${buildNumber}\n\n© 2024 PawSafety. All rights reserved.`,
      [{ text: 'OK' }]
    );
  };

  const handleAboutPawSafety = () => {
    Alert.alert(
      'About PawSafety',
      'PawSafety is a comprehensive pet safety and management application designed to help pet owners keep their furry friends safe and connected.\n\nOur mission is to provide a platform that helps reunite lost pets with their owners and create a community of pet lovers who care for each other.\n\nFeatures:\n• Pet Registration\n• Lost & Found Reports\n• Pet Scanning\n• Adoption Services\n• Emergency Contacts',
      [{ text: 'OK' }]
    );
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const SettingsSection = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingsItem = ({ title, subtitle, icon, onPress, showArrow = true, rightComponent }) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemIcon}>{icon}</Text>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.itemRight}>
        {rightComponent}
        {showArrow && <Text style={styles.arrow}>›</Text>}
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <SettingsSection title="App Preferences">
          <SettingsItem
            icon="🔔"
            title="Push Notifications"
            subtitle="Receive notifications about your pets and reports"
            showArrow={false}
            rightComponent={
              <Switch 
                value={pushNotificationsEnabled} 
                onValueChange={togglePushNotifications}
                trackColor={{ false: COLORS.gray, true: COLORS.mediumBlue }} 
              />
            }
          />
        </SettingsSection>



        <SettingsSection title="About">
          <SettingsItem
            icon="ℹ️"
            title="App Version"
            subtitle="1.0.0"
            showArrow={true}
            onPress={handleAppVersionPress}
          />
          <SettingsItem
            icon="🏢"
            title="About PawSafety"
            subtitle="Our mission and team"
            onPress={handleAboutPawSafety}
          />
        </SettingsSection>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};



export default SettingsScreen; 