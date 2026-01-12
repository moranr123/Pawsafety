import React, { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
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
  StatusBar,
  Dimensions,
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState({ hour: 9, minute: 0, period: 'AM' });
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

  // Helper functions for date picker
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const formatSelectedDateTime = () => {
    if (!appForm.preferredDate) return 'Tap to select date and time';
    return appForm.preferredDate;
  };

  const handleDateConfirm = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    let hour = selectedTime.hour;
    if (selectedTime.period === 'PM' && hour !== 12) {
      hour += 12;
    } else if (selectedTime.period === 'AM' && hour === 12) {
      hour = 0;
    }
    
    const dateTime = new Date(year, month, day, hour, selectedTime.minute);
    const formattedDate = dateTime.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = dateTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    setAppForm({ ...appForm, preferredDate: `${formattedDate} at ${formattedTime}` });
    setShowDatePicker(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Close date picker when adopt form closes
  useEffect(() => {
    if (!applyVisible) {
      setShowDatePicker(false);
    }
  }, [applyVisible]);

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
    bottomSpacing: {
      height: 20,
    },
    // Adoption Application Modal Styles
    applyModalOverlay: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    applyModalContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    applyModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: SPACING.lg,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + SPACING.md,
      paddingBottom: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EB',
    },
    applyModalTitleContainer: {
      flex: 1,
      marginRight: SPACING.md,
    },
    applyModalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
    },
    applyModalSubtitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: '#65676B',
      marginTop: SPACING.xs,
    },
    applyModalCloseButton: {
      padding: SPACING.xs,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    applyModalContent: {
      padding: SPACING.lg,
      maxHeight: '80%',
    },
    input: {
      borderWidth: 1,
      borderColor: '#E4E6EB',
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginTop: SPACING.xs,
      marginBottom: SPACING.sm,
      backgroundColor: '#F0F2F5',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#050505',
    },
    inputFocused: {
      borderColor: '#1877F2',
      backgroundColor: '#FFFFFF',
    },
    label: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: '#050505',
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    sectionHeader: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
      marginTop: SPACING.md,
      marginBottom: SPACING.sm
    },
    sectionCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: '#E4E6EB',
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    chipRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
      flexWrap: 'wrap',
    },
    chipChoice: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E4E6EB',
      backgroundColor: '#F0F2F5',
    },
    chipChoiceActive: {
      backgroundColor: '#1877F2',
      borderColor: '#1877F2'
    },
    chipChoiceText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#65676B',
    },
    chipChoiceTextActive: {
      color: '#FFFFFF',
      fontWeight: FONTS.weights.semibold,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#E4E6EB',
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#1877F2',
      borderColor: '#1877F2'
    },
    checkboxText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#050505',
      lineHeight: 20,
    },
    applyModalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: SPACING.lg,
      gap: SPACING.sm,
      paddingTop: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: '#E4E6EB',
    },
    applyModalCancelButton: {
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      backgroundColor: '#F0F2F5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E4E6EB',
    },
    applyModalCancelText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: '#050505',
    },
    applyModalSubmitButton: {
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      backgroundColor: '#1877F2',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    applyModalSubmitButtonDisabled: {
      backgroundColor: '#BCC0C4',
      shadowOpacity: 0,
      elevation: 0,
      opacity: 0.6,
    },
    applyModalSubmitText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    applyModalSubmitTextDisabled: {
      color: '#FFFFFF',
      opacity: 0.8,
    },
    // Date Picker Styles
    datePickerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#E4E6EB',
      borderRadius: 8,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginTop: SPACING.xs,
      marginBottom: SPACING.sm,
      backgroundColor: '#F0F2F5',
    },
    datePickerText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#050505',
      flex: 1,
    },
    datePickerPlaceholder: {
      color: '#65676B',
    },
    datePickerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    datePickerOverlayInside: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: isSmallDevice ? SPACING.sm : SPACING.lg,
    },
    datePickerOverlayTouchable: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    datePickerContainer: {
      backgroundColor: '#FFFFFF',
      borderRadius: isSmallDevice ? 15 : 20,
      width: isSmallDevice ? '95%' : isTablet ? '70%' : '90%',
      maxWidth: isTablet ? 600 : 500,
      maxHeight: isSmallDevice ? '90%' : '85%',
      minHeight: isSmallDevice ? 350 : 400,
      overflow: 'hidden',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    datePickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: isSmallDevice ? SPACING.md : SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EB',
    },
    datePickerTitle: {
      fontSize: isSmallDevice ? FONTS.sizes.large : FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
      flex: 1,
    },
    datePickerCloseButton: {
      padding: SPACING.xs,
      minWidth: isSmallDevice ? 36 : 40,
      minHeight: isSmallDevice ? 36 : 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    datePickerContent: {
      flexGrow: 0,
      maxHeight: isSmallDevice ? 300 : 400,
    },
    datePickerSection: {
      padding: isSmallDevice ? SPACING.md : SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EB',
    },
    datePickerSectionTitle: {
      fontSize: isSmallDevice ? FONTS.sizes.small + 1 : FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
      marginBottom: SPACING.md,
    },
    datePickerRow: {
      flexDirection: isSmallDevice ? 'row' : 'row',
      gap: isSmallDevice ? SPACING.xs : SPACING.sm,
      flexWrap: 'nowrap',
    },
    datePickerColumn: {
      flex: 1,
    },
    datePickerLabel: {
      fontSize: isSmallDevice ? FONTS.sizes.xsmall : FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: '#65676B',
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    datePickerScroll: {
      height: isSmallDevice ? 150 : isTablet ? 220 : 200,
      flexGrow: 0,
    },
    datePickerOption: {
      paddingVertical: isSmallDevice ? SPACING.xs : SPACING.sm,
      paddingHorizontal: isSmallDevice ? SPACING.xs / 2 : SPACING.xs,
      borderRadius: 8,
      marginBottom: SPACING.xs,
      backgroundColor: '#F0F2F5',
      alignItems: 'center',
    },
    datePickerOptionActive: {
      backgroundColor: '#1877F2',
    },
    datePickerOptionText: {
      fontSize: isSmallDevice ? FONTS.sizes.xsmall : FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#65676B',
      fontWeight: FONTS.weights.medium,
    },
    datePickerOptionTextActive: {
      color: '#FFFFFF',
      fontWeight: FONTS.weights.bold,
    },
    datePickerFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      padding: isSmallDevice ? SPACING.md : SPACING.lg,
      gap: isSmallDevice ? SPACING.xs : SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: '#E4E6EB',
    },
    datePickerCancelButton: {
      paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
      paddingHorizontal: isSmallDevice ? SPACING.md : SPACING.xl,
      backgroundColor: '#F0F2F5',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E4E6EB',
      minWidth: isSmallDevice ? 70 : 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePickerCancelText: {
      fontSize: isSmallDevice ? FONTS.sizes.small : FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: '#050505',
    },
    datePickerConfirmButton: {
      paddingVertical: isSmallDevice ? SPACING.sm : SPACING.md,
      paddingHorizontal: isSmallDevice ? SPACING.md : SPACING.xl,
      backgroundColor: '#1877F2',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      minWidth: isSmallDevice ? 70 : 100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    datePickerConfirmText: {
      fontSize: isSmallDevice ? FONTS.sizes.small : FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
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
    // Applications History Modal Styles
    applicationsModalOverlay: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    applicationsModalContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    applicationsModalHeader: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: SPACING.lg,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + SPACING.md,
      paddingBottom: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#E4E6EB',
    },
    applicationsModalHeaderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    applicationsModalTitleContainer: {
      flex: 1,
      marginRight: SPACING.md,
    },
    applicationsModalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
    },
    applicationsModalSubtitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#65676B',
      marginTop: SPACING.xs,
    },
    applicationsModalCloseButton: {
      backgroundColor: '#F0F2F5',
      borderRadius: RADIUS.full,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    applicationsModalContent: {
      flex: 1,
      backgroundColor: '#F0F2F5',
      paddingHorizontal: SPACING.md,
    },
    applicationsModalScrollContent: {
      padding: SPACING.lg,
      paddingBottom: SPACING.xl,
    },
    // Application Card Styles
    applicationCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: '#E4E6EB',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      position: 'relative',
    },
    applicationPetName: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
      marginBottom: SPACING.sm,
    },
    applicationInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.md,
      gap: SPACING.xs,
    },
    applicationInfoText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#65676B',
    },
    applicationFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    applicationStatusBadge: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.small,
    },
    applicationStatusBadgeApproved: {
      backgroundColor: '#D4EDDA',
    },
    applicationStatusBadgeDeclined: {
      backgroundColor: '#F8D7DA',
    },
    applicationStatusBadgeReview: {
      backgroundColor: '#FFF3CD',
    },
    applicationStatusBadgeSubmitted: {
      backgroundColor: '#E7E3FF',
    },
    applicationStatusText: {
      fontSize: FONTS.sizes.xsmall,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    applicationStatusTextApproved: {
      color: '#155724',
    },
    applicationStatusTextDeclined: {
      color: '#721C24',
    },
    applicationStatusTextReview: {
      color: '#856404',
    },
    applicationStatusTextSubmitted: {
      color: '#4C3A99',
    },
    applicationDate: {
      fontSize: FONTS.sizes.xsmall,
      fontFamily: FONTS.family,
      color: '#65676B',
    },
    applicationsEmptyState: {
      paddingVertical: SPACING.xxl * 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    applicationsEmptyTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#050505',
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    applicationsEmptyDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#65676B',
      textAlign: 'center',
      paddingHorizontal: SPACING.xl,
      lineHeight: 20,
    },
    appMenuButton: {
      position: 'absolute',
      top: SPACING.md,
      right: SPACING.md,
      backgroundColor: '#F0F2F5',
      borderRadius: RADIUS.full,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    appMenuDropdown: {
      position: 'absolute',
      top: 50,
      right: SPACING.md,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.medium,
      padding: SPACING.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 20,
      minWidth: 140,
      borderWidth: 1,
      borderColor: '#E4E6EB',
    },
    appMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
      gap: SPACING.sm,
    },
    appMenuItemText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#050505',
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

  // Memoized handler for adopt button press
  const handleAdoptPress = useCallback((pet) => {
    setSelectedPet(pet);
    const user = auth.currentUser;
    setAppForm((prev) => ({
      ...prev,
      fullName: prev.fullName || (user?.displayName || ''),
      email: prev.email || (user?.email || ''),
    }));
    setApplyVisible(true);
  }, []);

  const AdoptionCard = memo(({ pet, onPressAdopt }) => {
    const [imageError, setImageError] = useState(false);
    
    return (
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
              <View>
                <Text style={styles.detailText}>
                  Vaccinated: {formatDate(pet.vaccinatedDate || pet.vaccineDate || pet.vaccinationDate)}
                </Text>
                {pet.vaccinatedPlace && (
                  <Text style={[styles.detailText, { fontSize: 11, color: COLORS.textSecondary, marginLeft: 8 }]}>
                    📍 {pet.vaccinatedPlace}
                  </Text>
                )}
              </View>
            )}
            {pet.dewormed && (pet.dewormedDate || pet.dewormDate) && (
              <View>
                <Text style={styles.detailText}>
                  Dewormed: {formatDate(pet.dewormedDate || pet.dewormDate)}
                </Text>
                {pet.dewormedPlace && (
                  <Text style={[styles.detailText, { fontSize: 11, color: COLORS.textSecondary, marginLeft: 8 }]}>
                    📍 {pet.dewormedPlace}
                  </Text>
                )}
              </View>
            )}
            {pet.antiRabies && (pet.antiRabiesDate || pet.antiRabiesVaccineDate) && (
              <View>
                <Text style={styles.detailText}>
                  Anti-Rabies: {formatDate(pet.antiRabiesDate || pet.antiRabiesVaccineDate)}
                </Text>
                {pet.antiRabiesPlace && (
                  <Text style={[styles.detailText, { fontSize: 11, color: COLORS.textSecondary, marginLeft: 8 }]}>
                    📍 {pet.antiRabiesPlace}
                  </Text>
                )}
              </View>
            )}
          </View>

          {pet.description ? (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionLabel}>More Details:</Text>
              <Text style={styles.petDescription} numberOfLines={3}>{pet.description}</Text>
            </View>
          ) : null}
          
          {/* Image */}
          {pet.imageUrl && !imageError ? (
            <Image
              source={{ uri: pet.imageUrl }}
              style={styles.petImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImageError(true)}
              transition={200}
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
  }, (prevProps, nextProps) => {
    // Custom comparison: only re-render if pet data actually changed
    return (
      prevProps.pet.id === nextProps.pet.id &&
      prevProps.pet.imageUrl === nextProps.pet.imageUrl &&
      prevProps.pet.petName === nextProps.pet.petName &&
      prevProps.pet.breed === nextProps.pet.breed &&
      prevProps.pet.gender === nextProps.pet.gender &&
      prevProps.pet.petType === nextProps.pet.petType &&
      prevProps.pet.description === nextProps.pet.description &&
      prevProps.pet.location === nextProps.pet.location &&
      prevProps.pet.daysAtImpound === nextProps.pet.daysAtImpound &&
      prevProps.pet.vaccinated === nextProps.pet.vaccinated &&
      prevProps.pet.dewormed === nextProps.pet.dewormed &&
      prevProps.pet.antiRabies === nextProps.pet.antiRabies &&
      prevProps.pet.vaccinatedDate === nextProps.pet.vaccinatedDate &&
      prevProps.pet.vaccinatedPlace === nextProps.pet.vaccinatedPlace &&
      prevProps.pet.dewormedDate === nextProps.pet.dewormedDate &&
      prevProps.pet.dewormedPlace === nextProps.pet.dewormedPlace &&
      prevProps.pet.antiRabiesDate === nextProps.pet.antiRabiesDate &&
      prevProps.pet.antiRabiesPlace === nextProps.pet.antiRabiesPlace
    );
  });

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
              onPressAdopt={() => handleAdoptPress(p)}
            />
          ))}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* My Applications Modal */}
      <Modal
        visible={myAppsVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setMyAppsVisible(false)}
        statusBarTranslucent={true}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.applicationsModalOverlay}>
          <View style={styles.applicationsModalContainer}>
            {/* Header */}
            <View style={styles.applicationsModalHeader}>
              <View style={styles.applicationsModalHeaderContent}>
                <View style={styles.applicationsModalTitleContainer}>
                  <Text style={styles.applicationsModalTitle}>My Applications</Text>
                  <Text style={styles.applicationsModalSubtitle}>Track your application status</Text>
                </View>
                <TouchableOpacity
                  style={styles.applicationsModalCloseButton}
                  onPress={() => setMyAppsVisible(false)}
                >
                  <MaterialIcons name="close" size={24} color="#050505" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            <View style={styles.applicationsModalContent}>
              <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={styles.applicationsModalScrollContent}
                showsVerticalScrollIndicator={false}
              >
              {myApplications.length === 0 ? (
                <View style={styles.applicationsEmptyState}>
                  <MaterialIcons name="description" size={64} color="#65676B" />
                  <Text style={styles.applicationsEmptyTitle}>No Applications Yet</Text>
                  <Text style={styles.applicationsEmptyDescription}>
                    You have not submitted any applications yet. Browse available pets and apply to adopt!
                  </Text>
                </View>
              ) : (
                myApplications.map((app) => (
                  <View key={app.id} style={styles.applicationCard}>
                    {/* Three-dot menu */}
                    <TouchableOpacity 
                      style={styles.appMenuButton}
                      onPress={() => setMenuVisible(menuVisible === app.id ? null : app.id)}
                    >
                      <MaterialIcons name="more-horiz" size={20} color="#65676B" />
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
                          <MaterialIcons name="delete" size={18} color="#E74C3C" />
                          <Text style={[styles.appMenuItemText, { color: '#E74C3C' }]}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.appMenuItem}
                          onPress={() => setMenuVisible(null)}
                        >
                          <MaterialIcons name="close" size={18} color="#65676B" />
                          <Text style={styles.appMenuItemText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    {/* Pet Name */}
                    <Text style={styles.applicationPetName}>
                      {app.petName || app.petBreed || 'Pet'}
                    </Text>
                    
                    {/* Preferred Date */}
                    <View style={styles.applicationInfoRow}>
                      <MaterialIcons name="calendar-today" size={16} color="#65676B" />
                      <Text style={styles.applicationInfoText}>
                        Preferred Date: {app.preferredDate || 'N/A'}
                      </Text>
                    </View>
                    
                    {/* Status and Date */}
                    <View style={styles.applicationFooter}>
                      <View style={[
                        styles.applicationStatusBadge,
                        app.status === 'Approved' && styles.applicationStatusBadgeApproved,
                        app.status === 'Declined' && styles.applicationStatusBadgeDeclined,
                        app.status === 'Under Review' && styles.applicationStatusBadgeReview,
                        (!app.status || app.status === 'Submitted') && styles.applicationStatusBadgeSubmitted
                      ]}>
                        <Text style={[
                          styles.applicationStatusText,
                          app.status === 'Approved' && styles.applicationStatusTextApproved,
                          app.status === 'Declined' && styles.applicationStatusTextDeclined,
                          app.status === 'Under Review' && styles.applicationStatusTextReview,
                          (!app.status || app.status === 'Submitted') && styles.applicationStatusTextSubmitted
                        ]}>
                          {app.status || 'Submitted'}
                        </Text>
                      </View>
                      <Text style={styles.applicationDate}>
                        {app.createdAt?.toDate ? app.createdAt.toDate().toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        }) : ''}
                      </Text>
                    </View>
                  </View>
                ))
              )}
              </ScrollView>
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
        statusBarTranslucent={true}
      >
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.applyModalOverlay}>
          <View style={styles.applyModalContainer}>
            <View style={styles.applyModalHeader}>
              <View style={styles.applyModalTitleContainer}>
                <Text style={styles.applyModalTitle}>Apply to Adopt</Text>
                <Text style={styles.applyModalSubtitle} numberOfLines={2}>
                  {selectedPet?.petName || 'This pet'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.applyModalCloseButton}
                onPress={() => setApplyVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#65676B" />
              </TouchableOpacity>
            </View>
            {showDatePicker && (
              <View style={styles.datePickerOverlayInside}>
                <TouchableOpacity 
                  activeOpacity={1}
                  style={styles.datePickerOverlayTouchable}
                  onPress={() => setShowDatePicker(false)}
                />
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>Select Date & Time</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.datePickerCloseButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <MaterialIcons name="close" size={24} color="#65676B" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.datePickerContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                    {/* Date Selection */}
                    <View style={styles.datePickerSection}>
                      <Text style={styles.datePickerSectionTitle}>Date</Text>
                      <View style={styles.datePickerRow}>
                        {/* Month Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Month</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                              <TouchableOpacity
                                key={index}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedDate.getMonth() === index && styles.datePickerOptionActive
                                ]}
                                onPress={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setMonth(index);
                                  const daysInMonth = getDaysInMonth(newDate.getFullYear(), index);
                                  if (newDate.getDate() > daysInMonth) {
                                    newDate.setDate(daysInMonth);
                                  }
                                  setSelectedDate(newDate);
                                }}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedDate.getMonth() === index && styles.datePickerOptionTextActive
                                ]}>
                                  {month.substring(0, 3)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Day Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Day</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {Array.from({ length: getDaysInMonth(selectedDate.getFullYear(), selectedDate.getMonth()) }, (_, i) => i + 1).map((day) => (
                              <TouchableOpacity
                                key={day}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedDate.getDate() === day && styles.datePickerOptionActive
                                ]}
                                onPress={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setDate(day);
                                  setSelectedDate(newDate);
                                }}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedDate.getDate() === day && styles.datePickerOptionTextActive
                                ]}>
                                  {day}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Year Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Year</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                              <TouchableOpacity
                                key={year}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedDate.getFullYear() === year && styles.datePickerOptionActive
                                ]}
                                onPress={() => {
                                  const newDate = new Date(selectedDate);
                                  newDate.setFullYear(year);
                                  const daysInMonth = getDaysInMonth(year, newDate.getMonth());
                                  if (newDate.getDate() > daysInMonth) {
                                    newDate.setDate(daysInMonth);
                                  }
                                  setSelectedDate(newDate);
                                }}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedDate.getFullYear() === year && styles.datePickerOptionTextActive
                                ]}>
                                  {year}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>

                    {/* Time Selection */}
                    <View style={styles.datePickerSection}>
                      <Text style={styles.datePickerSectionTitle}>Time</Text>
                      <View style={styles.datePickerRow}>
                        {/* Hour Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Hour</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                              <TouchableOpacity
                                key={hour}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedTime.hour === hour && styles.datePickerOptionActive
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, hour })}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedTime.hour === hour && styles.datePickerOptionTextActive
                                ]}>
                                  {hour}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Minute Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Minute</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {[0, 15, 30, 45].map((minute) => (
                              <TouchableOpacity
                                key={minute}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedTime.minute === minute && styles.datePickerOptionActive
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, minute })}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedTime.minute === minute && styles.datePickerOptionTextActive
                                ]}>
                                  {minute.toString().padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* AM/PM Selector */}
                        <View style={styles.datePickerColumn}>
                          <Text style={styles.datePickerLabel}>Period</Text>
                          <ScrollView 
                            style={styles.datePickerScroll} 
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled={true}
                            contentContainerStyle={{ paddingVertical: SPACING.xs }}
                          >
                            {['AM', 'PM'].map((period) => (
                              <TouchableOpacity
                                key={period}
                                activeOpacity={0.7}
                                style={[
                                  styles.datePickerOption,
                                  selectedTime.period === period && styles.datePickerOptionActive
                                ]}
                                onPress={() => setSelectedTime({ ...selectedTime, period })}
                              >
                                <Text style={[
                                  styles.datePickerOptionText,
                                  selectedTime.period === period && styles.datePickerOptionTextActive
                                ]}>
                                  {period}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    </View>
                  </ScrollView>

                  <View style={styles.datePickerFooter}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.datePickerCancelButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.datePickerConfirmButton}
                      onPress={handleDateConfirm}
                    >
                      <Text style={styles.datePickerConfirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            <ScrollView 
              style={styles.applyModalContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: SPACING.lg }}
            >

              <Text style={styles.sectionHeader}>Contact</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput 
                  value={appForm.fullName} 
                  onChangeText={(t) => setAppForm({ ...appForm, fullName: t })} 
                  style={styles.input}
                  placeholder="Enter your full name (e.g., Juan Dela Cruz)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Phone</Text>
                <TextInput 
                  keyboardType="phone-pad" 
                  value={appForm.phone} 
                  onChangeText={(t) => setAppForm({ ...appForm, phone: t })} 
                  style={styles.input}
                  placeholder="Enter your phone number (e.g., 09123456789)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Email</Text>
                <TextInput 
                  keyboardType="email-address" 
                  value={appForm.email} 
                  onChangeText={(t) => setAppForm({ ...appForm, email: t })} 
                  style={styles.input}
                  placeholder="Enter your email address (e.g., name@example.com)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Address</Text>
                <TextInput 
                  value={appForm.address} 
                  onChangeText={(t) => setAppForm({ ...appForm, address: t })} 
                  style={styles.input}
                  placeholder="Enter your complete address (street, city, province)"
                  placeholderTextColor="#65676B"
                />
              </View>

              <Text style={styles.sectionHeader}>Household</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Adults</Text>
                    <TextInput 
                      keyboardType="numeric" 
                      value={appForm.adults} 
                      onChangeText={(t) => setAppForm({ ...appForm, adults: t })} 
                      style={styles.input}
                      placeholder="Number of adults (e.g., 2)"
                      placeholderTextColor="#65676B"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Children</Text>
                    <TextInput 
                      keyboardType="numeric" 
                      value={appForm.children} 
                      onChangeText={(t) => setAppForm({ ...appForm, children: t })} 
                      style={styles.input}
                      placeholder="Number of children (e.g., 1)"
                      placeholderTextColor="#65676B"
                    />
                  </View>
                </View>
                <Text style={styles.label}>Residence Type</Text>
                <View style={styles.chipRow}>
                  {['house', 'apartment', 'other'].map((opt) => (
                    <TouchableOpacity key={opt} onPress={() => setAppForm({ ...appForm, residenceType: opt })} style={[styles.chipChoice, appForm.residenceType === opt && styles.chipChoiceActive]}>
                      <Text style={[styles.chipChoiceText, appForm.residenceType === opt && styles.chipChoiceTextActive]}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </Text>
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
                      <Text style={[styles.chipChoiceText, appForm.landlordApproval === k && styles.chipChoiceTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionHeader}>Experience</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Past pets / training experience</Text>
                <TextInput 
                  multiline 
                  value={appForm.experience} 
                  onChangeText={(t) => setAppForm({ ...appForm, experience: t })} 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe your experience with pets, training, or care (e.g., I had 2 dogs for 5 years, completed basic obedience training...)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Current pets</Text>
                <TextInput 
                  multiline 
                  value={appForm.currentPets} 
                  onChangeText={(t) => setAppForm({ ...appForm, currentPets: t })} 
                  style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="List any current pets you have (e.g., 1 cat, 2 dogs)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Lifestyle (time at home, travel, budget)</Text>
                <TextInput 
                  multiline 
                  value={appForm.lifestyle} 
                  onChangeText={(t) => setAppForm({ ...appForm, lifestyle: t })} 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Describe your lifestyle: time spent at home, travel frequency, monthly budget for pet care (e.g., Work from home, travel 2x/year, budget ₱3000/month)"
                  placeholderTextColor="#65676B"
                />
              </View>

              <Text style={styles.sectionHeader}>Vet & References</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Vet Clinic Name</Text>
                <TextInput 
                  value={appForm.vetName} 
                  onChangeText={(t) => setAppForm({ ...appForm, vetName: t })} 
                  style={styles.input}
                  placeholder="Enter your veterinarian's clinic name (e.g., Animal Care Clinic)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>Vet Phone</Text>
                <TextInput 
                  keyboardType="phone-pad" 
                  value={appForm.vetPhone} 
                  onChangeText={(t) => setAppForm({ ...appForm, vetPhone: t })} 
                  style={styles.input}
                  placeholder="Enter veterinarian's phone number (e.g., 09123456789)"
                  placeholderTextColor="#65676B"
                />
                <Text style={styles.label}>References (names/phones)</Text>
                <TextInput 
                  multiline 
                  value={appForm.references} 
                  onChangeText={(t) => setAppForm({ ...appForm, references: t })} 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Enter 2-3 references with names and phone numbers (e.g., Maria Santos - 09123456789, John Doe - 09987654321)"
                  placeholderTextColor="#65676B"
                />
              </View>

              <Text style={styles.sectionHeader}>Scheduling</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Preferred date/time</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.datePickerButton}
                  onPress={() => {
                    // Initialize date/time from existing preferredDate if available
                    if (appForm.preferredDate) {
                      try {
                        const dateMatch = appForm.preferredDate.match(/(\w+)\s+(\d+),?\s+(\d+)/);
                        const timeMatch = appForm.preferredDate.match(/(\d+):(\d+)\s+(AM|PM)/i);
                        if (dateMatch && timeMatch) {
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                          const month = monthNames.indexOf(dateMatch[1]);
                          const day = parseInt(dateMatch[2]);
                          const year = parseInt(dateMatch[3]);
                          let hour = parseInt(timeMatch[1]);
                          const minute = parseInt(timeMatch[2]);
                          const period = timeMatch[3].toUpperCase();
                          
                          if (period === 'PM' && hour !== 12) hour += 12;
                          if (period === 'AM' && hour === 12) hour = 0;
                          
                          setSelectedDate(new Date(year, month, day));
                          setSelectedTime({ hour: hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour), minute, period });
                        }
                      } catch (e) {
                        // If parsing fails, use current date/time
                        setSelectedDate(new Date());
                        setSelectedTime({ hour: 9, minute: 0, period: 'AM' });
                      }
                    } else {
                      setSelectedDate(new Date());
                      setSelectedTime({ hour: 9, minute: 0, period: 'AM' });
                    }
                    // Ensure modal opens
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={[
                    styles.datePickerText,
                    !appForm.preferredDate && styles.datePickerPlaceholder
                  ]}>
                    {formatSelectedDateTime()}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#1877F2" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionHeader}>Acknowledgements</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.xs }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeTerms: !appForm.agreeTerms })} style={[styles.checkbox, appForm.agreeTerms && styles.checkboxChecked]}>
                    {appForm.agreeTerms && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={[styles.checkboxText, { marginLeft: SPACING.sm, flex: 1 }]}>I understand adoption responsibilities and agree to the terms.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: SPACING.md }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeData: !appForm.agreeData })} style={[styles.checkbox, appForm.agreeData && styles.checkboxChecked]}>
                    {appForm.agreeData && <MaterialIcons name="check" size={14} color="#FFFFFF" />}
                  </TouchableOpacity>
                  <Text style={[styles.checkboxText, { marginLeft: SPACING.sm, flex: 1 }]}>I consent to the processing of my data for this application.</Text>
                </View>
              </View>

              <View style={styles.applyModalButtons}>
                <TouchableOpacity onPress={() => setApplyVisible(false)} style={styles.applyModalCancelButton}>
                  <Text style={styles.applyModalCancelText}>Cancel</Text>
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
                  style={[
                    styles.applyModalSubmitButton,
                    (!appForm.agreeTerms || !appForm.agreeData) && styles.applyModalSubmitButtonDisabled
                  ]}
                  disabled={!appForm.agreeTerms || !appForm.agreeData}
                >
                  <Text style={[
                    styles.applyModalSubmitText,
                    (!appForm.agreeTerms || !appForm.agreeData) && styles.applyModalSubmitTextDisabled
                  ]}>
                    Submit
                  </Text>
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