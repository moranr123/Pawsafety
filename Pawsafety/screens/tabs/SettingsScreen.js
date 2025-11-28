import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../../services/firebase';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileImage } from '../../contexts/ProfileImageContext';
import NotificationService from '../../services/NotificationService';

const SettingsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const { profileImage } = useProfileImage();
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);

  // Load push notification preference on mount
  useEffect(() => {
    const loadPushNotificationPreference = async () => {
      try {
        if (!user?.uid) return;
        // Use user-specific storage key
        const storageKey = `PUSH_NOTIFICATIONS_ENABLED_${user.uid}`;
        const savedPreference = await AsyncStorage.getItem(storageKey);
        if (savedPreference !== null) {
          setPushNotificationsEnabled(savedPreference === 'true');
        }
      } catch (error) {
        // Error handled silently - use default value
      }
    };
    loadPushNotificationPreference();
  }, [user?.uid]);

  // Create styles using Facebook-style design
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f0f2f5',
    },
    header: {
      backgroundColor: '#ffffff',
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    section: {
      marginTop: 8,
      backgroundColor: '#ffffff',
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderTopColor: '#e4e6eb',
      borderBottomColor: '#e4e6eb',
    },
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#f0f2f5',
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: '#65676b',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    settingsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      backgroundColor: '#ffffff',
    },
    settingsItemLast: {
      borderBottomWidth: 0,
    },
    itemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    itemIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    itemText: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '400',
      color: '#050505',
      lineHeight: 20,
    },
    itemSubtitle: {
      fontSize: 13,
      color: '#65676b',
      marginTop: 2,
      lineHeight: 18,
    },
    itemRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    arrow: {
      marginLeft: 8,
    },
    bottomSpacing: {
      height: 20,
    },
  }), []);

  const togglePushNotifications = async (value) => {
    try {
      if (!user?.uid) {
        Alert.alert('Error', 'User not logged in.');
        return;
      }
      setPushNotificationsEnabled(value);
      // Save preference to AsyncStorage with user-specific key
      const storageKey = `PUSH_NOTIFICATIONS_ENABLED_${user.uid}`;
      await AsyncStorage.setItem(storageKey, value.toString());
      
      // Update NotificationService preference
      const notificationService = NotificationService.getInstance();
      notificationService.setPushNotificationsEnabled(value, user.uid);
      
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
      {title && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );

  const SettingsItem = ({ title, subtitle, icon, iconName, onPress, showArrow = true, rightComponent, isLast = false }) => (
    <TouchableOpacity 
      style={[styles.settingsItem, isLast && styles.settingsItemLast]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.itemLeft}>
        <View style={styles.itemIcon}>
          {iconName ? (
            <MaterialIcons name={iconName} size={20} color="#1877f2" />
          ) : icon ? (
            <Text style={{ fontSize: 20 }}>{icon}</Text>
          ) : null}
        </View>
        <View style={styles.itemText}>
          <Text style={styles.itemTitle}>{title}</Text>
          {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.itemRight}>
        {rightComponent}
        {showArrow && !rightComponent && (
          <MaterialIcons name="chevron-right" size={24} color="#bcc0c4" style={styles.arrow} />
        )}
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
        >
          <MaterialIcons name="arrow-back" size={24} color="#050505" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Preferences Section */}
        <SettingsSection title="Preferences">
          <SettingsItem
            iconName="notifications"
            title="Push Notifications"
            subtitle="Receive notifications about your pets and reports"
            showArrow={false}
            rightComponent={
              <Switch 
                value={pushNotificationsEnabled} 
                onValueChange={togglePushNotifications}
                trackColor={{ false: '#ccd0d5', true: '#42b72a' }}
                thumbColor={pushNotificationsEnabled ? '#ffffff' : '#f4f3f4'}
              />
            }
            isLast={true}
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title="About">
          <SettingsItem
            iconName="info"
            title="App Version"
            subtitle="1.0.0"
            showArrow={true}
            onPress={handleAppVersionPress}
            isLast={false}
          />
          <SettingsItem
            iconName="business"
            title="About PawSafety"
            subtitle="Our mission and team"
            onPress={handleAboutPawSafety}
            isLast={true}
          />
        </SettingsSection>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};



export default SettingsScreen; 