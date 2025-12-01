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

const { width, height } = Dimensions.get('window');

const UserManualModal = ({ visible, onClose }) => {
  const { colors: COLORS } = useTheme();

  const hp = (percentage) => (height * percentage) / 100;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    modalContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.xlarge,
      width: '90%',
      maxWidth: 500,
      maxHeight: hp(80),
      ...SHADOWS.heavy,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.mediumBlue,
    },
    headerTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.darkPurple,
      flex: 1,
    },
    closeButton: {
      padding: SPACING.xs,
      marginLeft: SPACING.md,
    },
    content: {
      padding: SPACING.lg,
      maxHeight: hp(60),
    },
    sectionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.darkPurple,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
    },
    sectionContent: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 20,
      marginBottom: SPACING.md,
    },
    lastUpdated: {
      fontSize: FONTS.sizes.xsmall,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontStyle: 'italic',
      marginTop: SPACING.lg,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    footerButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      margin: SPACING.lg,
      alignItems: 'center',
    },
    footerButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>User Manual</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            <Text style={styles.sectionTitle}>Welcome to PawSafety</Text>
            <Text style={styles.sectionContent}>
              PawSafety is a comprehensive pet management and community safety platform designed to help pet owners protect, track, and care for their beloved animals. This guide will help you navigate all the features and make the most of your PawSafety experience.
            </Text>

            <Text style={styles.sectionTitle}>1. Home Screen</Text>
            <Text style={styles.sectionContent}>
              Your central hub for quick actions and community engagement.
              {'\n\n'}• Create Posts: Share photos and updates with the community by tapping "What's on your mind?"
              {'\n'}• Quick Actions: Register pets and file reports directly from the home screen
              {'\n'}• Social Feed: View announcements and posts from the community, sorted by newest first
              {'\n'}• Notifications: Access notifications via the bell icon in the top right to stay updated with adoption applications, pet transfers, registration status, and social interactions
              {'\n'}• User Manual: Access this guide anytime by tapping the help icon (?) next to the notification icon
              {'\n'}• Menu: Tap the menu icon (☰) in the top left to access friends, profiles, and other features
            </Text>

            <Text style={styles.sectionTitle}>2. My Pets</Text>
            <Text style={styles.sectionContent}>
              Manage and track all your registered pets in one convenient location.
              {'\n\n'}• View detailed information about each pet including photos, breed, age, and health status
              {'\n'}• Generate and share QR codes for quick pet identification during emergencies
              {'\n'}• Report pets as lost or found with location tracking to help reunite them with their families
              {'\n'}• Transfer pet ownership to another user when needed
              {'\n'}• Update pet status (healthy, pregnant, deceased) to keep records current
              {'\n\n'}💡 Pro Tip: Save your pet's QR code to your phone gallery for quick access during emergencies!
            </Text>

            <Text style={styles.sectionTitle}>3. Reports</Text>
            <Text style={styles.sectionContent}>
              View and manage community reports of stray, lost, and found pets to help reunite them with their families.
              {'\n\n'}• Filter Reports: Filter by status - Stray, Lost, Found, or view All reports
              {'\n'}• View Details: See location, photos, description, date, and time of each report
              {'\n'}• Get Directions: Use maps to navigate to the reported location
              {'\n'}• Contact Reporter: Send direct messages or comment on reports to get more information
              {'\n'}• File Reports: Quickly file new reports using the "File a Report" quick action on the home screen
            </Text>

            <Text style={styles.sectionTitle}>4. QR Code Scanner</Text>
            <Text style={styles.sectionContent}>
              Quickly identify pets using their QR code tags for instant access to owner information.
              {'\n\n'}• Scan a pet's QR code to view their complete information
              {'\n'}• Access owner contact information for lost pets
              {'\n'}• Quickly verify pet ownership and registration status
              {'\n\n'}📱 How to Scan: Tap the center Scan button in the bottom navigation, then point your camera at the QR code on the pet's tag.
            </Text>

            <Text style={styles.sectionTitle}>5. Adoption</Text>
            <Text style={styles.sectionContent}>
              Browse and apply to adopt pets looking for loving homes from local shelters and rescue organizations.
              {'\n\n'}• View available pets with photos and detailed information
              {'\n'}• Submit adoption applications with your information
              {'\n'}• Track your application status through notifications
              {'\n'}• Contact shelters directly through the app
            </Text>

            <Text style={styles.sectionTitle}>6. File a Report</Text>
            <Text style={styles.sectionContent}>
              Report stray, lost, or found pets to help reunite them with their families and keep the community safe.
              {'\n\n'}• Upload photos of the pet for better identification
              {'\n'}• Add location information using GPS or manual entry
              {'\n'}• Provide detailed descriptions to help identification
              {'\n'}• Track and update your reports in "My Reports"
            </Text>

            <Text style={styles.sectionTitle}>7. Register a Pet</Text>
            <Text style={styles.sectionContent}>
              Register your pet to keep track of their information and generate a unique QR code for identification.
              {'\n\n'}• Add pet photos, name, breed, age, and other important details
              {'\n'}• Submit for approval by administrators
              {'\n'}• Receive a unique QR code upon approval
              {'\n'}• Track registration status via notifications
              {'\n\n'}⚠️ Important: Ensure all information is accurate as it will be used for pet identification and emergency contact purposes.
            </Text>

            <Text style={styles.sectionTitle}>8. Social Features</Text>
            <Text style={styles.sectionContent}>
              Connect with other pet owners and build your community network.
              {'\n\n'}• Add Friends: Find and connect with other pet owners in your community
              {'\n'}• Create Posts: Share photos, updates, and stories about your pets
              {'\n'}• Interact: Like, comment, and engage with posts from friends and community members
              {'\n'}• Messages: Send direct messages to other users about reports, pets, or general inquiries
              {'\n'}• Friend Requests: Accept or decline friend requests through notifications
            </Text>

            <Text style={styles.sectionTitle}>9. Profile & Settings</Text>
            <Text style={styles.sectionContent}>
              Access your profile and settings from the menu icon (☰) or notification panel on the home screen.
              {'\n\n'}• View and update your account information and profile picture
              {'\n'}• Toggle between light and dark mode for comfortable viewing
              {'\n'}• Manage notification preferences and stay informed
              {'\n'}• View your activity history and manage your profiles
              {'\n'}• Sign out of your account securely
            </Text>

            <Text style={styles.sectionTitle}>10. Need Help?</Text>
            <Text style={styles.sectionContent}>
              If you encounter any issues or have questions:
              {'\n\n'}• User Manual: Access this guide anytime by tapping the help icon (?) in the top right corner of the home screen, next to the notification icon
              {'\n'}• Pet Care Guide: Review helpful tips and information about pet care and safety
              {'\n'}• Community Support: Reach out to other users through messages or comments on posts
              {'\n'}• Local Resources: Contact your local animal control, shelter, or veterinary services for immediate assistance
              {'\n\n'}🌟 Thank you for using PawSafety and helping keep our community's pets safe! Your participation makes a difference.
            </Text>

            <Text style={styles.lastUpdated}>
              Last updated: {new Date().toLocaleDateString()}
            </Text>
          </ScrollView>
          <TouchableOpacity
            style={styles.footerButton}
            onPress={onClose}
          >
            <Text style={styles.footerButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default UserManualModal;
