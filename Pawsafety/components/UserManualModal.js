import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const UserManualModal = ({ visible, onClose }) => {
  const { colors: COLORS } = useTheme();

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.xlarge,
      width: width * 0.9,
      maxHeight: '85%',
      ...SHADOWS.heavy,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightBlue,
      backgroundColor: COLORS.darkPurple,
      borderTopLeftRadius: RADIUS.xlarge,
      borderTopRightRadius: RADIUS.xlarge,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      flex: 1,
    },
    closeButton: {
      padding: SPACING.sm,
      borderRadius: RADIUS.medium,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    content: {
      padding: SPACING.lg,
    },
    welcomeSection: {
      backgroundColor: COLORS.lightBlue + '20',
      padding: SPACING.md,
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.lg,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.mediumBlue,
    },
    welcomeText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 22,
    },
    section: {
      marginBottom: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.large,
      backgroundColor: COLORS.darkPurple + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    subsection: {
      marginBottom: SPACING.md,
      paddingLeft: SPACING.md,
    },
    subsectionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    description: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
      marginBottom: SPACING.xs,
    },
    featureList: {
      marginLeft: SPACING.md,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.xs,
    },
    bullet: {
      fontSize: FONTS.sizes.medium,
      color: COLORS.mediumBlue,
      marginRight: SPACING.xs,
      fontWeight: FONTS.weights.bold,
    },
    featureText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      flex: 1,
      lineHeight: 20,
    },
    tipBox: {
      backgroundColor: COLORS.golden + '15',
      padding: SPACING.md,
      borderRadius: RADIUS.medium,
      marginTop: SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.golden,
    },
    tipTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    tipText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
    },
    divider: {
      height: 1,
      backgroundColor: COLORS.lightBlue,
      marginVertical: SPACING.md,
    },
    footer: {
      padding: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightBlue,
    },
    footerButton: {
      backgroundColor: COLORS.darkPurple,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.medium,
      alignItems: 'center',
    },
    footerButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.white,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialIcons name="help" size={28} color={COLORS.white} style={{ marginRight: SPACING.sm }} />
            <Text style={styles.headerTitle}>User Manual</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text style={styles.welcomeText}>
                Welcome to PawSafety! This comprehensive guide will help you navigate and make the most of all the features available in the app.
              </Text>
            </View>

            {/* Home Screen Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="home" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Home Screen</Text>
              </View>
              <Text style={styles.description}>
                Your central hub for quick actions and recent activity.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700' }}>Quick Actions:</Text> Register pets, file reports, view your pets, access pet care guides, and manage your reports
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700' }}>Recent Reports:</Text> View the latest stray, lost, and found pet reports in your community
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    <Text style={{ fontWeight: '700' }}>Notifications:</Text> Stay updated with adoption applications, pet transfers, and registration status
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* My Pets Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="pets" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>My Pets</Text>
              </View>
              <Text style={styles.description}>
                Manage and track all your registered pets in one place.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    View detailed information about each pet including photos, breed, age, and health status
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Generate and share QR codes for quick pet identification
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Report pets as lost or found with location tracking
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Transfer pet ownership to another user
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Update pet status (healthy, pregnant, deceased)
                  </Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>💡 Pro Tip</Text>
                <Text style={styles.tipText}>
                  Save your pet's QR code to your phone gallery for quick access during emergencies!
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Reports Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="report" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Reports</Text>
              </View>
              <Text style={styles.description}>
                View and manage community reports of stray, lost, and found pets.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Filter reports by status: Stray, Lost, Found, or All
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    View report details including location, photos, and description
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Get directions to the reported location using maps
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Contact the reporter for more information
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Scan Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="qr-code-scanner" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>QR Code Scanner</Text>
              </View>
              <Text style={styles.description}>
                Quickly identify pets using their QR code tags.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Scan a pet's QR code to view their information
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Access owner contact information for lost pets
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Quickly verify pet ownership and registration
                  </Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>📱 How to Scan</Text>
                <Text style={styles.tipText}>
                  Tap the center Scan button in the bottom navigation, then point your camera at the QR code on the pet's tag.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Adopt Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="favorite" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Adoption</Text>
              </View>
              <Text style={styles.description}>
                Browse and apply to adopt pets looking for loving homes.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    View available pets with photos and detailed information
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Submit adoption applications with your information
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Track your application status through notifications
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Contact shelters directly through the app
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* File Report Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="add-location" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>File a Report</Text>
              </View>
              <Text style={styles.description}>
                Report stray, lost, or found pets to help reunite them with their families.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Upload photos of the pet
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Add location information using GPS or manual entry
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Provide detailed descriptions to help identification
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Track and update your reports in "My Reports"
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Register Pet Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="app-registration" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Register a Pet</Text>
              </View>
              <Text style={styles.description}>
                Register your pet to keep track of their information and generate a unique QR code.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Add pet photos, name, breed, age, and other details
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Submit for approval by administrators
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Receive a unique QR code upon approval
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Track registration status via notifications
                  </Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>⚠️ Important</Text>
                <Text style={styles.tipText}>
                  Ensure all information is accurate as it will be used for pet identification and emergency contact purposes.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Settings & Profile */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="account-circle" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Profile & Settings</Text>
              </View>
              <Text style={styles.description}>
                Access your profile from the notification icon on the home screen.
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    View and update your account information
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Toggle between light and dark mode
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Manage notification preferences
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Sign out of your account
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Support Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <MaterialIcons name="support-agent" size={24} color={COLORS.darkPurple} />
                </View>
                <Text style={styles.sectionTitle}>Need Help?</Text>
              </View>
              <Text style={styles.description}>
                If you encounter any issues or have questions:
              </Text>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Check this user manual by tapping the question mark icon
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Review the Pet Care Guide for helpful tips
                  </Text>
                </View>
                <View style={styles.featureItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.featureText}>
                    Contact your local animal control or shelter
                  </Text>
                </View>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipTitle}>🌟 Thank You!</Text>
                <Text style={styles.tipText}>
                  Thank you for using PawSafety and helping keep our community's pets safe!
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerButton}>
              <Text style={styles.footerButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UserManualModal;

