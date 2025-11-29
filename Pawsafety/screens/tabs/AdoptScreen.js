import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
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
  Alert,
  Platform,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { auth, db } from '../../services/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, deleteDoc, doc, limit } from 'firebase/firestore';

const AdoptScreen = () => {
  const { colors: COLORS } = useTheme();
  const { setIsVisible } = useTabBarVisibility();
  const navigation = useNavigation();
  const route = useRoute();
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pets, setPets] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppsVisible, setMyAppsVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All'); // All | Dogs | Cats
  const [selectedPet, setSelectedPet] = useState(null);
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

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

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

  const handleScroll = React.useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY.current;

    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Hide tab bar when scrolling down, show when scrolling up or at top
    if (currentScrollY <= 0) {
      setIsVisible(true);
    } else if (scrollDifference > 5) {
      setIsVisible(false);
    } else if (scrollDifference < -5) {
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;

    // Show tab bar after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      setIsVisible(true);
    }, 150);
  }, [setIsVisible]);

  const handleDeleteApplication = async (appId) => {
    try {
      await deleteDoc(doc(db, 'adoption_applications', appId));
      // The onSnapshot listener will automatically update the myApplications state
    } catch (error) {
      // Error handled - Alert already shown to user
      Alert.alert('Error', 'Failed to delete application. Please try again.');
    }
  };

  // Create styles using current theme colors and responsive values
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      backgroundColor: '#FFFFFF',
      paddingTop: Platform.OS === 'ios' 
        ? (isSmallDevice ? 45 : isTablet ? 60 : 50)
        : (isSmallDevice ? 12 : isTablet ? 20 : 15),
      paddingBottom: Platform.OS === 'android' 
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Platform.OS === 'android'
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
    },
    headerTitle: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 20 : isTablet ? 28 : 24)
        : (isSmallDevice ? 20 : isTablet ? 26 : 24),
      fontWeight: '700',
      color: '#050505',
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 0,
      gap: isSmallDevice ? SPACING.xs : SPACING.sm,
    },
    filterChip: {
      backgroundColor: '#e4e6eb',
      paddingHorizontal: isSmallDevice ? SPACING.sm : SPACING.md,
      paddingVertical: isSmallDevice ? SPACING.xs : SPACING.sm,
      borderRadius: isSmallDevice ? 12 : 15,
      borderWidth: 1,
      borderColor: '#e4e6eb',
      alignItems: 'center',
      minHeight: isSmallDevice ? 32 : 36,
      justifyContent: 'center',
      flex: 1,
    },
    filterChipActive: {
      backgroundColor: '#1877f2',
      borderColor: '#1877f2',
    },
    filterText: {
      fontSize: Platform.OS === 'android'
        ? (isSmallDevice ? 10 : isTablet ? 13 : 11)
        : (isSmallDevice ? 11 : isTablet ? 15 : 13),
      fontFamily: FONTS.family,
      color: '#050505',
      fontWeight: '600',
      textAlign: 'center',
    },
    filterTextActive: {
      color: '#ffffff',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: 0,
      paddingTop: SPACING.lg,
    },
    scrollViewContent: {
      paddingHorizontal: 0,
      paddingBottom: SPACING.xl,
    },
    // Facebook-style pet card (similar to report card)
    petCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    petHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
      justifyContent: 'space-between',
    },
    petHeaderInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    petHeaderDetails: {
      flex: 1,
    },
    petNameLabel: {
      fontSize: 12,
      color: '#65676b',
      marginBottom: 2,
      fontFamily: FONTS.family,
    },
    petName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      fontFamily: FONTS.family,
    },
    petType: {
      fontSize: 12,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    genderBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.mediumBlue || '#1877f2',
    },
    genderText: {
      fontSize: Platform.OS === 'android' ? FONTS.sizes.small - 4 : FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    petContent: {
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    detailsContainer: {
      marginBottom: 12,
    },
    detailText: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginBottom: 4,
      fontFamily: FONTS.family,
    },
    descriptionSection: {
      marginTop: 8,
      marginBottom: 8,
    },
    descriptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 4,
      fontFamily: FONTS.family,
    },
    petDescription: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      fontFamily: FONTS.family,
    },
    petImage: {
      width: '100%',
      height: 260,
      borderRadius: 8,
    },
    imagePlaceholder: {
      width: '100%',
      height: 260,
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    petActions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    adoptButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: isSmallDevice ? 12 : isTablet ? 16 : 14,
      minHeight: isSmallDevice ? 44 : isTablet ? 52 : 48,
      borderRadius: 8,
      backgroundColor: '#8B5CF6',
    },
    adoptButtonText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 15 : isTablet ? 18 : 16)
        : (isSmallDevice ? 15 : isTablet ? 17 : 16),
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 8,
      fontFamily: FONTS.family,
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
  }), [COLORS, isSmallDevice, isTablet, currentWidth, currentHeight]);

  const AdoptionCard = ({ pet, onPressAdopt }) => (
    <View style={styles.petCard}>
      {/* Header with pet info and gender badge */}
      <View style={styles.petHeader}>
        <View style={styles.petHeaderInfo}>
          <View style={styles.petHeaderDetails}>
            <Text style={styles.petNameLabel}>Name:</Text>
            <Text style={styles.petName} numberOfLines={1}>
              {capitalizeFirstLetter(pet.petName) || 'Unnamed Pet'}
            </Text>
          </View>
        </View>
        <View style={styles.genderBadge}>
          <Text style={styles.genderText}>{pet.gender === 'male' ? '♂ Male' : '♀ Female'}</Text>
        </View>
      </View>

      {/* Content with Details */}
      <View style={styles.petContent}>
        {/* Details Text */}
        <View style={styles.detailsContainer}>
          {pet.petType && (
            <Text style={styles.detailText}>Type: {pet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}</Text>
          )}
          {pet.breed && (
            <Text style={styles.detailText}>Breed: {pet.breed}</Text>
          )}
          {pet.gender && (
            <Text style={styles.detailText}>Gender: {pet.gender === 'male' ? '♂ Male' : '♀ Female'}</Text>
          )}
          {pet.location && (
            <Text style={styles.detailText}>Location: {pet.location}</Text>
          )}
          {pet.daysAtImpound !== undefined && pet.daysAtImpound !== null && pet.daysAtImpound !== '' && (
            <Text style={styles.detailText}>
              Days Sheltered: {pet.daysAtImpound} {Number(pet.daysAtImpound) === 1 ? 'day' : 'days'}
            </Text>
          )}
          {pet.vaccinated && (pet.vaccinatedDate || pet.vaccineDate || pet.vaccinationDate) && (
            <Text style={styles.detailText}>
              Vaccinated: {formatDate(pet.vaccinatedDate || pet.vaccineDate || pet.vaccinationDate)}
            </Text>
          )}
          {pet.dewormed && (pet.dewormedDate || pet.dewormDate) && (
            <Text style={styles.detailText}>
              Dewormed: {formatDate(pet.dewormedDate || pet.dewormDate)}
            </Text>
          )}
          {pet.antiRabies && (pet.antiRabiesDate || pet.antiRabiesVaccineDate) && (
            <Text style={styles.detailText}>
              Anti-Rabies: {formatDate(pet.antiRabiesDate || pet.antiRabiesVaccineDate)}
            </Text>
          )}
        </View>

        {pet.description ? (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionLabel}>More Details:</Text>
            <Text style={styles.petDescription} numberOfLines={3}>{pet.description}</Text>
          </View>
        ) : null}
        
        {/* Image */}
        {pet.imageUrl ? (
          <Image
            source={{ uri: pet.imageUrl }}
            style={styles.petImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialIcons name="pets" size={60} color="#9CA3AF" />
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.petActions}>
        <TouchableOpacity style={styles.adoptButton} onPress={onPressAdopt}>
          <MaterialIcons 
            name="favorite" 
            size={isSmallDevice ? 20 : isTablet ? 24 : 22} 
            color="#FFFFFF" 
          />
          <Text style={styles.adoptButtonText}>Adopt</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    // Optimized: Add limit to reduce Firebase reads
    const q = query(
      collection(db, 'adoptable_pets'), 
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to most recent 50 pets
    );
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
        // Error handled silently - will retry on next update
        setErrorMsg('Unable to load adoptable pets. Please try again later.');
      }
    );
    return unsubscribe;
  }, []);

  // My adoption applications (for current user)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Optimized: Add limit
    const q = query(
      collection(db, 'adoption_applications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50) // Limit to most recent 50 applications
    );
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyApplications(apps);
    });
    return unsub;
  }, [auth.currentUser?.uid]);

  // Listen for navigation params to open applications modal
  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.openApplications) {
        setMyAppsVisible(true);
        // Clear the param to prevent reopening on subsequent focuses
        navigation.setParams({ openApplications: undefined });
      }
    }, [route.params?.openApplications, navigation])
  );

  return (
    <View style={styles.container}>
      {/* Header - Facebook-style */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Adopt</Text>
          </View>
          <View style={styles.filtersContainer}>
            <FilterChip title="All" active={selectedFilter === 'All'} onPress={() => setSelectedFilter('All')} />
            <FilterChip title="Dogs" active={selectedFilter === 'Dogs'} onPress={() => setSelectedFilter('Dogs')} />
            <FilterChip title="Cats" active={selectedFilter === 'Cats'} onPress={() => setSelectedFilter('Cats')} />
          </View>
        </SafeAreaView>
      </View>

      {/* Adoption List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text, fontFamily: FONTS.family }}>{errorMsg}</Text>
          </View>
        )}

        {pets.length === 0 && !errorMsg && (
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text, fontFamily: FONTS.family }}>No adoptable pets yet.</Text>
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