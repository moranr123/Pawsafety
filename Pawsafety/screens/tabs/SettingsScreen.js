import React, { useMemo } from 'react';
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
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS, isDarkMode, toggleTheme } = useTheme();

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
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
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
    profileCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.medium,
    },
    profileImagePlaceholder: {
      width: 60,
      height: 60,
      backgroundColor: COLORS.lightBlue,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    profileEmoji: {
      fontSize: 30,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    profileEmail: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.sm,
    },
    editProfileButton: {
      alignSelf: 'flex-start',
    },
    editProfileText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.mediumBlue,
      fontWeight: FONTS.weights.medium,
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
    logoutSection: {
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
    },
    logoutButton: {
      backgroundColor: COLORS.error,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.medium,
    },
    logoutIcon: {
      fontSize: FONTS.sizes.xlarge,
      marginRight: SPACING.sm,
    },
    logoutText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    bottomSpacing: {
      height: 100,
    },
  }), [COLORS]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  const toggleDarkMode = () => {
    toggleTheme();
    Alert.alert(
      'Dark Mode',
      `Dark mode ${!isDarkMode ? 'enabled' : 'disabled'}!`,
      [{ text: 'OK' }]
    );
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

  const ProfileCard = () => (
    <View style={styles.profileCard}>
      <View style={styles.profileImagePlaceholder}>
        <Text style={styles.profileEmoji}>👤</Text>
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.profileName}>{user?.displayName || 'Pet Lover'}</Text>
        <Text style={styles.profileEmail}>{user?.email}</Text>
        <TouchableOpacity style={styles.editProfileButton}>
          <Text style={styles.editProfileText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        <ProfileCard />

        <SettingsSection title="App Preferences">
          <SettingsItem
            icon="🌙"
            title="Dark Mode"
            subtitle="Switch to dark theme"
            showArrow={false}
            rightComponent={
              <Switch 
                value={isDarkMode} 
                onValueChange={toggleDarkMode}
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
            showArrow={false}
          />
          <SettingsItem
            icon="🏢"
            title="About PawSafety"
            subtitle="Our mission and team"
            onPress={() => Alert.alert('About', 'About PawSafety would open here')}
          />
        </SettingsSection>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};



export default SettingsScreen; 