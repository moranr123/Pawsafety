import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  RefreshControl,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { auth, db } from '../../services/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';

const AdoptScreen = () => {
  const { colors: COLORS } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [pets, setPets] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppsVisible, setMyAppsVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All'); // All | Dogs | Cats
  const [selectedPet, setSelectedPet] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null); // { petId: string } | null
  const [appForm, setAppForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    adults: '',
    children: '',
    residenceType: 'house',
    landlordApproval: false,
    experience: '',
    currentPets: '',
    lifestyle: '',
    vetName: '',
    vetPhone: '',
    references: '',
    preferredDate: '',
    agreeTerms: false,
    agreeData: false,
  });

  // Helper function to format dates
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Date not available';
    
    try {
      // If it's a Firestore timestamp
      if (dateValue && typeof dateValue === 'object' && dateValue.seconds) {
        return new Date(dateValue.seconds * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      // If it's already a string, format it nicely
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
        return dateValue; // Return as-is if it can't be parsed
      }
      
      // If it's a regular Date object or timestamp
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return 'Date not available';
    } catch (error) {
      return 'Date not available';
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleDeleteApplication = async (appId) => {
    try {
      await deleteDoc(doc(db, 'adoption_applications', appId));
      // The onSnapshot listener will automatically update the myApplications state
    } catch (error) {
      console.error('Error deleting application:', error);
      Alert.alert('Error', 'Failed to delete application. Please try again.');
    }
  };

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
    filtersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.xs,
    },
    filterChip: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      flex: 1,
      alignItems: 'center',
      minHeight: 36,
      justifyContent: 'center',
    },
    filterChipActive: {
      backgroundColor: COLORS.white,
      borderColor: COLORS.white,
    },
    filterText: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: COLORS.white,
      fontWeight: FONTS.weights.semiBold,
      textAlign: 'center',
    },
    filterTextActive: {
      color: COLORS.darkPurple,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    petCard: {
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.md,
      minHeight: 200,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      ...SHADOWS.medium,
    },
    cardBackgroundImage: {
      borderRadius: RADIUS.medium,
    },
    placeholderBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.lightBlue,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: RADIUS.medium,
    },
    petEmoji: {
      fontSize: 60,
    },
    darkOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: RADIUS.medium,
    },
    petContent: {
      position: 'absolute',
      bottom: SPACING.md,
      left: SPACING.md,
      right: SPACING.md,
      zIndex: 2,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    petName: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    petType: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: '#FFFFFF',
      opacity: 0.95,
      marginBottom: SPACING.xs,
    },
    genderBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    genderText: {
      fontSize: FONTS.sizes.medium,
      color: '#FFFFFF',
    },
    petBreed: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    petLocation: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: SPACING.xs,
    },
    petDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      lineHeight: 18,
      marginBottom: SPACING.md,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    adoptButton: {
      backgroundColor: '#8B5CF6',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginRight: SPACING.xs,
    },
    adoptButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    detailsButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginLeft: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    detailsButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    ctaCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderWidth: 1,
      borderColor: COLORS.lightBlue,
      ...SHADOWS.light,
    },
    ctaIcon: {
      fontSize: FONTS.sizes.xlarge,
      marginRight: SPACING.md,
    },
    ctaContent: {
      flex: 1,
    },
    ctaTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    ctaText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 18,
      marginBottom: SPACING.sm,
    },
    ctaButton: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      alignSelf: 'flex-start',
    },
    ctaButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    myAppsContainer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      alignItems: 'flex-end',
    },
    myAppsButton: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      ...SHADOWS.light,
    },
    myAppsButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      textAlign: 'center',
    },
    bottomSpacing: {
      height: 100,
    },
    input: {
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: '#fff'
    },
    label: {
      fontSize: FONTS.sizes.small,
      color: '#334155',
      marginTop: 8
    },
    sectionHeader: {
      fontSize: FONTS.sizes.medium,
      fontWeight: '700',
      color: '#0f172a',
      marginTop: 8,
      marginBottom: 6
    },
    sectionCard: {
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      marginTop: 8,
      marginBottom: 8
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      marginBottom: 8
    },
    chipChoice: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      backgroundColor: '#fff'
    },
    chipChoiceActive: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#94a3b8',
      backgroundColor: '#fff'
    },
    checkboxChecked: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple
    },
    menuButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      zIndex: 10,
    },
    menuDropdown: {
      position: 'absolute',
      top: 50,
      right: SPACING.sm,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 20,
      minWidth: 120,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
    },
    menuItemText: {
      marginLeft: SPACING.xs,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#374151',
    },
    appMenuButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      backgroundColor: '#f9fafb',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      zIndex: 10,
    },
    appMenuDropdown: {
      position: 'absolute',
      top: 40,
      right: SPACING.sm,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 20,
      minWidth: 120,
    },
    appMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
    },
    appMenuItemText: {
      marginLeft: SPACING.xs,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#374151',
    },
    // Modern Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      width: '95%',
      height: '90%',
      borderRadius: 24,
      ...SHADOWS.heavy,
    },
    modernHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 16,
    },
    headerContent: {
      flex: 1,
    },
    modalCloseButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
    },
    modernTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 4,
    },
    modernSubtitle: {
      fontSize: 16,
      color: '#6B7280',
      fontWeight: '400',
    },
    modernScrollView: {
      flex: 1,
      paddingBottom: 20,
    },
    heroImageContainer: {
      position: 'relative',
      height: 280,
      marginHorizontal: 24,
      marginBottom: 24,
      borderRadius: 20,
      overflow: 'hidden',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroPlaceholderText: {
      fontSize: 16,
      color: '#9CA3AF',
      marginTop: 8,
      fontWeight: '500',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: 20,
    },
    heroPetName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    heroBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    heroBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    heroBadgeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    petDetailsColumn: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
      overflow: 'hidden',
    },
    petDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    petDetailItemLast: {
      borderBottomWidth: 0,
    },
    petDetailIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    petDetailContent: {
      flex: 1,
    },
    petDetailLabel: {
      fontSize: 12,
      color: '#6B7280',
      fontWeight: '500',
      marginBottom: 4,
    },
    petDetailValue: {
      fontSize: 16,
      color: '#111827',
      fontWeight: '600',
    },
    medicalCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
    },
    medicalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 16,
      textAlign: 'center',
    },
    medicalGrid: {
      gap: 12,
    },
    medicalItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FFFFFF',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      minHeight: 60,
    },
    medicalItemActive: {
      borderColor: '#10B981',
      backgroundColor: '#F0FDF4',
    },
    medicalItemContent: {
      flex: 1,
      marginLeft: 12,
    },
    medicalLabel: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '500',
    },
    medicalLabelActive: {
      color: '#059669',
      fontWeight: '600',
    },
    dateContainer: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      alignSelf: 'flex-start',
    },
    dateText: {
      fontSize: 13,
      color: '#374151',
      fontWeight: '600',
      textAlign: 'center',
    },
    medicalStatus: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '600',
      marginTop: 2,
    },
    medicalStatusActive: {
      color: '#10B981',
    },
    temperamentCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
    },
    temperamentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    temperamentTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
      marginLeft: 8,
    },
    temperamentText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 20,
    },
    descriptionCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
    },
    descriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    descriptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
      marginLeft: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 20,
    },
    modernActionContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 20,
      paddingBottom: 34,
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    modernCloseBtn: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modernCloseBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
    },
    modernAdoptBtn: {
      flex: 1,
      backgroundColor: '#8B5CF6',
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    modernAdoptBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    // Medical Section Styles
    medicalSection: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.light,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    treatmentContainer: {
      gap: SPACING.md,
    },
    treatmentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    treatmentInfo: {
      flex: 1,
      marginLeft: SPACING.md,
    },
    treatmentLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    treatmentStatus: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.xs,
    },
    treatmentStatusActive: {
      color: '#4CAF50',
      fontWeight: FONTS.weights.medium,
    },
    treatmentDate: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontStyle: 'italic',
    },
    // Medical Info Card Styles (for adoption cards)
    medicalInfoCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: RADIUS.medium,
      padding: SPACING.sm,
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    medicalTitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: '#FFFFFF',
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    medicalBadges: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.xs,
    },
    medicalBadge: {
      flex: 1,
      alignItems: 'center',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      minHeight: 40,
      justifyContent: 'center',
    },
    medicalBadgeActive: {
      backgroundColor: 'rgba(76, 175, 80, 0.3)',
      borderWidth: 1,
      borderColor: 'rgba(76, 175, 80, 0.6)',
    },
    medicalBadgeInactive: {
      backgroundColor: 'rgba(158, 158, 158, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(158, 158, 158, 0.4)',
    },
    medicalBadgeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#FFFFFF',
      opacity: 0.8,
    },
    medicalBadgeTextActive: {
      opacity: 1,
      color: '#FFFFFF',
    },
    medicalDate: {
      fontSize: 10,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      opacity: 0.9,
      marginTop: 2,
      textAlign: 'center',
    },
    upperLeftInfo: {
      position: 'absolute',
      top: SPACING.md,
      left: SPACING.md,
      zIndex: 2,
    },
    upperRightInfo: {
      position: 'absolute',
      top: SPACING.md,
      right: SPACING.md,
      zIndex: 2,
    },
  }), [COLORS]);

  const AdoptionCard = ({ pet, onPressDetails, onPressAdopt }) => (
    <ImageBackground 
      source={pet.imageUrl ? { uri: pet.imageUrl } : null}
      style={styles.petCard}
      imageStyle={styles.cardBackgroundImage}
    >
      {!pet.imageUrl && (
        <View style={styles.placeholderBackground}>
          <Text style={styles.petEmoji}>{pet.petType === 'dog' ? '🐕' : '🐱'}</Text>
        </View>
      )}
      
      <View style={styles.darkOverlay} />
      
      {/* Pet name and type at upper left */}
      <View style={styles.upperLeftInfo}>
        <Text style={styles.petName}>{pet.petName}</Text>
        <Text style={styles.petType}>{pet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}</Text>
      </View>
      
      {/* Gender badge at upper right */}
      <View style={styles.upperRightInfo}>
        <View style={styles.genderBadge}>
          <Text style={styles.genderText}>{pet.gender === 'male' ? '♂' : '♀'}</Text>
        </View>
      </View>
      
      {/* Action buttons at bottom */}
      <View style={styles.petContent}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.adoptButton} onPress={onPressAdopt}>
            <Text style={styles.adoptButtonText}>❤️ Adopt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailsButton} onPress={onPressDetails}>
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );

  const FilterChip = ({ title, active = false, onPress, style }) => (
    <TouchableOpacity 
      style={[styles.filterChip, active && styles.filterChipActive, style]} 
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    const q = query(collection(db, 'adoptable_pets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ready = items.filter(p => p.readyForAdoption !== false);
        setPets(ready);
        setErrorMsg('');
        // Push-like local notifications for new pets
        // If desired, you can compare previous ids and Alert user
      },
      (error) => {
        console.log('AdoptScreen onSnapshot error:', error);
        setErrorMsg('Unable to load adoptable pets. Please try again later.');
      }
    );
    return unsubscribe;
  }, []);

  // My adoption applications (for current user)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'adoption_applications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyApplications(apps);
    });
    return unsub;
  }, [auth.currentUser?.uid]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.filtersContainer}>
          <FilterChip title="All" active={selectedFilter === 'All'} onPress={() => setSelectedFilter('All')} />
          <FilterChip title="Dogs" active={selectedFilter === 'Dogs'} onPress={() => setSelectedFilter('Dogs')} />
          <FilterChip title="Cats" active={selectedFilter === 'Cats'} onPress={() => setSelectedFilter('Cats')} />
        </View>
      </View>

      {/* My Applications Button */}
      <View style={styles.myAppsContainer}>
        <TouchableOpacity style={styles.myAppsButton} onPress={() => setMyAppsVisible(true)}>
          <Text style={styles.myAppsButtonText}>My Applications</Text>
        </TouchableOpacity>
      </View>

      {/* Adoption List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.darkPurple]}
            tintColor={COLORS.darkPurple}
          />
        }
      >
        {!!errorMsg && (
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, backgroundColor: COLORS.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text }}>{errorMsg}</Text>
          </View>
        )}

        {pets.length === 0 && !errorMsg && (
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, backgroundColor: COLORS.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text }}>No adoptable pets yet.</Text>
          </View>
        )}

        {pets
          .filter((p) => {
            const type = (p.petType || '').toLowerCase();
            if (selectedFilter === 'All') return true;
            if (selectedFilter === 'Dogs') return type !== 'cat'; // default to dog when type unknown
            if (selectedFilter === 'Cats') return type === 'cat';
            return true;
          })
          .map((p) => (
            <AdoptionCard
              key={p.id}
              pet={p}
              onPressDetails={() => { setSelectedPet(p); setDetailsVisible(true); }}
              onPressAdopt={() => {
                setSelectedPet(p);
                const user = auth.currentUser;
                setAppForm((prev) => ({
                  ...prev,
                  fullName: prev.fullName || (user?.displayName || ''),
                  email: prev.email || (user?.email || ''),
                }));
                setApplyVisible(true);
              }}
            />
          ))}

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaIcon}>🏠</Text>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Can't Adopt Right Now?</Text>
            <Text style={styles.ctaText}>Consider fostering or volunteering at local shelters. Every bit of help makes a difference!</Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modern Header */}
            <View style={styles.modernHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.modernTitle}>Pet Details</Text>
                <Text style={styles.modernSubtitle}>Meet your new companion</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setDetailsVisible(false)}
                style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modernScrollView}>
              {/* Hero Image Section */}
              <View style={styles.heroImageContainer}>
                {selectedPet?.imageUrl ? (
                  <Image 
                    source={{ uri: selectedPet.imageUrl }} 
                    style={styles.heroImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <MaterialIcons name="pets" size={60} color="#9CA3AF" />
                    <Text style={styles.heroPlaceholderText}>No Photo Available</Text>
                  </View>
                )}
              </View>

              {/* Pet Details Column */}
              <View style={styles.petDetailsColumn}>
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="pets" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Name</Text>
                    <Text style={styles.petDetailValue}>{selectedPet?.petName || 'Unnamed Pet'}</Text>
                  </View>
                </View>
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="category" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Type</Text>
                    <Text style={styles.petDetailValue}>
                      {selectedPet?.petType ? 
                        (selectedPet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat') : 
                        'Pet'
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="category" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Breed</Text>
                    <Text style={styles.petDetailValue}>{selectedPet?.breed || 'Unknown'}</Text>
                  </View>
                </View>
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons 
                      name={selectedPet?.gender === 'male' ? 'male' : 'female'} 
                      size={20} 
                      color={selectedPet?.gender === 'male' ? '#3B82F6' : '#EC4899'} 
                    />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Gender</Text>
                    <Text style={styles.petDetailValue}>
                      {selectedPet?.gender ? 
                        (selectedPet.gender === 'male' ? 'Male' : 'Female') : 
                        'Unknown'
                      }
                    </Text>
                  </View>
                </View>
                
                {selectedPet?.location && (
                  <View style={[styles.petDetailItem, (!selectedPet?.daysAtImpound || selectedPet?.daysAtImpound === '') && styles.petDetailItemLast]}>
                    <View style={styles.petDetailIcon}>
                      <MaterialIcons name="location-on" size={20} color="#EF4444" />
                    </View>
                    <View style={styles.petDetailContent}>
                      <Text style={styles.petDetailLabel}>Location</Text>
                      <Text style={styles.petDetailValue}>{selectedPet.location}</Text>
                    </View>
                  </View>
                )}
                
                  <View style={[styles.petDetailItem, styles.petDetailItemLast]}>
                    <View style={styles.petDetailIcon}>
                    <MaterialIcons name="schedule" size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Days Sheltered</Text>
                    <Text style={styles.petDetailValue}>
                      {selectedPet?.daysAtImpound && 
                       selectedPet.daysAtImpound !== '' && 
                       selectedPet.daysAtImpound !== null && 
                       selectedPet.daysAtImpound !== undefined &&
                       Number(selectedPet.daysAtImpound) >= 0 ? (
                        `${selectedPet.daysAtImpound} ${Number(selectedPet.daysAtImpound) === 1 ? 'day' : 'days'}`
                      ) : (
                        'Not specified'
                      )}
                    </Text>
                    </View>
                  </View>
              </View>


              {/* Medical Status */}
              <View style={styles.medicalCard}>
                <Text style={styles.medicalTitle}>Health Status</Text>
                <View style={styles.medicalGrid}>
                  <View style={[styles.medicalItem, selectedPet?.vaccinated && styles.medicalItemActive]}>
                    <MaterialIcons 
                      name="vaccines" 
                      size={20} 
                      color={selectedPet?.vaccinated ? "#10B981" : "#9CA3AF"} 
                    />
                    <View style={styles.medicalItemContent}>
                      <Text style={[styles.medicalLabel, selectedPet?.vaccinated && styles.medicalLabelActive]}>
                        Vaccinated
                      </Text>
                      {selectedPet?.vaccinated && (
                        <View style={styles.dateContainer}>
                          <Text style={styles.dateText}>
                            {formatDate(selectedPet.vaccinatedDate || selectedPet.vaccineDate || selectedPet.vaccinationDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.medicalStatus, selectedPet?.vaccinated && styles.medicalStatusActive]}>
                      {selectedPet?.vaccinated ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={[styles.medicalItem, selectedPet?.dewormed && styles.medicalItemActive]}>
                    <MaterialIcons 
                      name="healing" 
                      size={20} 
                      color={selectedPet?.dewormed ? "#10B981" : "#9CA3AF"} 
                    />
                    <View style={styles.medicalItemContent}>
                      <Text style={[styles.medicalLabel, selectedPet?.dewormed && styles.medicalLabelActive]}>
                        Dewormed
                      </Text>
                      {selectedPet?.dewormed && (
                        <View style={styles.dateContainer}>
                          <Text style={styles.dateText}>
                            {formatDate(selectedPet.dewormedDate || selectedPet.dewormDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.medicalStatus, selectedPet?.dewormed && styles.medicalStatusActive]}>
                      {selectedPet?.dewormed ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={[styles.medicalItem, selectedPet?.antiRabies && styles.medicalItemActive]}>
                    <MaterialIcons 
                      name="local-hospital" 
                      size={20} 
                      color={selectedPet?.antiRabies ? "#10B981" : "#9CA3AF"} 
                    />
                    <View style={styles.medicalItemContent}>
                      <Text style={[styles.medicalLabel, selectedPet?.antiRabies && styles.medicalLabelActive]}>
                        Anti-rabies
                      </Text>
                      {selectedPet?.antiRabies && (
                        <View style={styles.dateContainer}>
                          <Text style={styles.dateText}>
                            {formatDate(selectedPet.antiRabiesDate || selectedPet.antiRabiesVaccineDate)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.medicalStatus, selectedPet?.antiRabies && styles.medicalStatusActive]}>
                      {selectedPet?.antiRabies ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Temperament */}
              {selectedPet?.temperament && (
                <View style={styles.temperamentCard}>
                  <View style={styles.temperamentHeader}>
                    <MaterialIcons name="psychology" size={20} color="#8B5CF6" />
                    <Text style={styles.temperamentTitle}>Temperament</Text>
                  </View>
                  <Text style={styles.temperamentText}>{selectedPet.temperament}</Text>
                </View>
              )}

              {/* Description */}
              {selectedPet?.description && (
                <View style={styles.descriptionCard}>
                  <View style={styles.descriptionHeader}>
                    <MaterialIcons name="description" size={20} color="#6366F1" />
                    <Text style={styles.descriptionTitle}>About</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedPet.description}</Text>
                </View>
              )}
            </ScrollView>

            {/* Modern Action Buttons */}
            <View style={styles.modernActionContainer}>
              <TouchableOpacity
                onPress={() => {
                  setDetailsVisible(false);
                  setApplyVisible(true);
                }}
                style={styles.modernAdoptBtn}
              >
                <MaterialIcons name="favorite" size={20} color="#FFFFFF" />
                <Text style={styles.modernAdoptBtnText}>Adopt Me</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* My Applications Modal */}
      <Modal
        visible={myAppsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMyAppsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '85%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ fontSize: FONTS.sizes.large, fontWeight: '700' }}>My Applications</Text>
              <Text style={{ color: '#64748b', marginTop: 4 }}>Track your application status</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {myApplications.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b' }}>You have not submitted any applications yet.</Text>
                </View>
              ) : (
                myApplications.map((app) => (
                  <View key={app.id} style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10, position: 'relative' }}>
                    {/* Three-dot menu */}
                    <TouchableOpacity 
                      style={styles.appMenuButton}
                      onPress={() => setMenuVisible(menuVisible === app.id ? null : app.id)}
                    >
                      <MaterialIcons name="more-horiz" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    
                    {/* Menu dropdown */}
                    {menuVisible === app.id && (
                      <View style={styles.appMenuDropdown}>
                        <TouchableOpacity 
                          style={styles.appMenuItem}
                          onPress={() => {
                            Alert.alert(
                              'Delete Application',
                              'Are you sure you want to delete this application? This action cannot be undone.',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Delete', 
                                  style: 'destructive',
                                  onPress: () => {
                                    handleDeleteApplication(app.id);
                                    setMenuVisible(null);
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <MaterialIcons name="delete" size={16} color="#dc2626" />
                          <Text style={styles.appMenuItemText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.appMenuItem}
                          onPress={() => setMenuVisible(null)}
                        >
                          <MaterialIcons name="close" size={16} color="#6b7280" />
                          <Text style={styles.appMenuItemText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <Text style={{ fontWeight: '700', fontSize: 16 }}>{app.petName || app.petBreed || 'Pet'}</Text>
                    <Text style={{ marginTop: 2, color: '#475569' }}>Preferred: {app.preferredDate || 'N/A'}</Text>
                    <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: app.status === 'Approved' ? '#dcfce7' : app.status === 'Declined' ? '#fee2e2' : app.status === 'Under Review' ? '#fef3c7' : '#ede9fe' }}>
                        <Text style={{ color: '#111827', fontWeight: '700', fontSize: 12 }}>{app.status || 'Submitted'}</Text>
                      </View>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>{app.createdAt?.toDate ? app.createdAt.toDate().toLocaleString() : ''}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => setMyAppsVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#ef4444', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Apply to Adopt Modal */}
      <Modal
        visible={applyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setApplyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: FONTS.sizes.large, fontWeight: '700', marginBottom: 10 }}>Apply to Adopt</Text>
              <Text style={{ marginBottom: 16, color: '#555' }}>{selectedPet?.petName || 'This pet'}</Text>

              <Text style={styles.sectionHeader}>Contact</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput value={appForm.fullName} onChangeText={(t) => setAppForm({ ...appForm, fullName: t })} style={styles.input} />
                <Text style={styles.label}>Phone</Text>
                <TextInput keyboardType="phone-pad" value={appForm.phone} onChangeText={(t) => setAppForm({ ...appForm, phone: t })} style={styles.input} />
                <Text style={styles.label}>Email</Text>
                <TextInput keyboardType="email-address" value={appForm.email} onChangeText={(t) => setAppForm({ ...appForm, email: t })} style={styles.input} />
                <Text style={styles.label}>Address</Text>
                <TextInput value={appForm.address} onChangeText={(t) => setAppForm({ ...appForm, address: t })} style={styles.input} />
              </View>

              <Text style={styles.sectionHeader}>Household</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Adults</Text>
                    <TextInput keyboardType="numeric" value={appForm.adults} onChangeText={(t) => setAppForm({ ...appForm, adults: t })} style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Children</Text>
                    <TextInput keyboardType="numeric" value={appForm.children} onChangeText={(t) => setAppForm({ ...appForm, children: t })} style={styles.input} />
                  </View>
                </View>
                <Text style={styles.label}>Residence Type</Text>
                <View style={styles.chipRow}>
                  {['house', 'apartment', 'other'].map((opt) => (
                    <TouchableOpacity key={opt} onPress={() => setAppForm({ ...appForm, residenceType: opt })} style={[styles.chipChoice, appForm.residenceType === opt && styles.chipChoiceActive]}>
                      <Text style={{ color: appForm.residenceType === opt ? '#fff' : '#0f172a' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Landlord Approval</Text>
                <View style={styles.chipRow}>
                  {[
                    { k: true, label: 'Yes' },
                    { k: false, label: 'No' }
                  ].map(({ k, label }) => (
                    <TouchableOpacity key={label} onPress={() => setAppForm({ ...appForm, landlordApproval: k })} style={[styles.chipChoice, appForm.landlordApproval === k && styles.chipChoiceActive]}>
                      <Text style={{ color: appForm.landlordApproval === k ? '#fff' : '#0f172a' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionHeader}>Experience</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Past pets / training experience</Text>
                <TextInput multiline value={appForm.experience} onChangeText={(t) => setAppForm({ ...appForm, experience: t })} style={[styles.input, { height: 80 }]} />
                <Text style={styles.label}>Current pets</Text>
                <TextInput multiline value={appForm.currentPets} onChangeText={(t) => setAppForm({ ...appForm, currentPets: t })} style={[styles.input, { height: 60 }]} />
                <Text style={styles.label}>Lifestyle (time at home, travel, budget)</Text>
                <TextInput multiline value={appForm.lifestyle} onChangeText={(t) => setAppForm({ ...appForm, lifestyle: t })} style={[styles.input, { height: 80 }]} />
              </View>

              <Text style={styles.sectionHeader}>Vet & References</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Vet Clinic Name</Text>
                <TextInput value={appForm.vetName} onChangeText={(t) => setAppForm({ ...appForm, vetName: t })} style={styles.input} />
                <Text style={styles.label}>Vet Phone</Text>
                <TextInput keyboardType="phone-pad" value={appForm.vetPhone} onChangeText={(t) => setAppForm({ ...appForm, vetPhone: t })} style={styles.input} />
                <Text style={styles.label}>References (names/phones)</Text>
                <TextInput multiline value={appForm.references} onChangeText={(t) => setAppForm({ ...appForm, references: t })} style={[styles.input, { height: 80 }]} />
              </View>

              <Text style={styles.sectionHeader}>Scheduling</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Preferred date/time</Text>
                <TextInput value={appForm.preferredDate} onChangeText={(t) => setAppForm({ ...appForm, preferredDate: t })} style={styles.input} />
              </View>

              <Text style={styles.sectionHeader}>Acknowledgements</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeTerms: !appForm.agreeTerms })} style={[styles.checkbox, appForm.agreeTerms && styles.checkboxChecked]} />
                  <Text style={{ marginLeft: 8, flex: 1 }}>I understand adoption responsibilities and agree to the terms.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeData: !appForm.agreeData })} style={[styles.checkbox, appForm.agreeData && styles.checkboxChecked]} />
                  <Text style={{ marginLeft: 8, flex: 1 }}>I consent to the processing of my data for this application.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                <TouchableOpacity onPress={() => setApplyVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 8 }}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!selectedPet) return;
                    if (!appForm.fullName || !appForm.phone || !appForm.email || !appForm.address || !appForm.agreeTerms || !appForm.agreeData) {
                      Alert.alert('Missing Information', 'Please fill in required fields and accept the acknowledgements.');
                      return;
                    }
                    try {
                      await addDoc(collection(db, 'adoption_applications'), {
                        petId: selectedPet.id,
                        petName: selectedPet.petName || null,
                        petBreed: selectedPet.breed || null,
                        userId: auth.currentUser?.uid || null,
                        applicant: {
                          fullName: appForm.fullName,
                          phone: appForm.phone,
                          email: appForm.email,
                          address: appForm.address,
                        },
                        household: {
                          adults: appForm.adults,
                          children: appForm.children,
                          residenceType: appForm.residenceType,
                          landlordApproval: !!appForm.landlordApproval,
                        },
                        experience: appForm.experience,
                        currentPets: appForm.currentPets,
                        lifestyle: appForm.lifestyle,
                        vet: { name: appForm.vetName, phone: appForm.vetPhone },
                        references: appForm.references,
                        preferredDate: appForm.preferredDate,
                        agreeTerms: !!appForm.agreeTerms,
                        agreeData: !!appForm.agreeData,
                        status: 'Submitted',
                        createdAt: serverTimestamp(),
                      });
                      setApplyVisible(false);
                      setAppForm({
                        fullName: '', phone: '', email: '', address: '', adults: '', children: '', residenceType: 'house', landlordApproval: false,
                        experience: '', currentPets: '', lifestyle: '', vetName: '', vetPhone: '', references: '', preferredDate: '', agreeTerms: false, agreeData: false,
                      });
                      Alert.alert('Application Submitted', 'Your adoption application has been sent. We will contact you soon.');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to submit application. Please try again later.');
                    }
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: COLORS.darkPurple, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff' }}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AdoptScreen; 