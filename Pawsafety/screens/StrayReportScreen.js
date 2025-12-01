import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../services/firebase';
import NotificationService from '../services/NotificationService';

const { width } = Dimensions.get('window');

const StrayReportScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const [selectedImages, setSelectedImages] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [reportTime, setReportTime] = useState(new Date());
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState(route?.params?.initialType || 'Stray');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const hasShownInstructionToday = useRef(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995, // Default to Philippines coordinates
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // Request camera and location permissions
    requestPermissions();
  }, []);

  // Check if user should see instruction manual today (once per day per account)
  useEffect(() => {
    const checkDailyInstruction = async () => {
      try {
        // Skip if we've already shown the instruction today in this session
        if (hasShownInstructionToday.current) {
          return;
        }

        const user = auth.currentUser;
        if (!user) return; // No user logged in

        // Use user-specific storage key
        const storageKey = `PAW_FILE_REPORT_INSTRUCTION_LAST_SHOWN_${user.uid}`;
        const lastShownDate = await AsyncStorage.getItem(storageKey);
        const today = new Date().toDateString();
        
        // Show instruction if it hasn't been shown today for this user
        if (lastShownDate !== today) {
          hasShownInstructionToday.current = true;
          setShowInstructionModal(true);
        }
      } catch (error) {
        // Error handled silently
      }
    };
    
    // Only check on initial load, not on every re-render
    checkDailyInstruction();
  }, []); // Empty dependency array ensures this only runs once

  // Handle instruction modal close and mark as shown for today
  const handleInstructionClose = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setShowInstructionModal(false);
        return;
      }

      const today = new Date().toDateString();
      const storageKey = `PAW_FILE_REPORT_INSTRUCTION_LAST_SHOWN_${user.uid}`;
      await AsyncStorage.setItem(storageKey, today);
      setShowInstructionModal(false);
    } catch (error) {
      // Error handled silently
      setShowInstructionModal(false);
    }
  };

  useEffect(() => {
    const fetchAndSetLocation = async () => {
      if (showLocationModal) {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setMapRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          const address = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          const addressString = address[0]
            ? `${address[0].street || ''} ${address[0].name || ''}, ${address[0].city || ''}`
            : `Lat: ${loc.coords.latitude.toFixed(4)}, Lng: ${loc.coords.longitude.toFixed(4)}`;
          setLocationName(addressString);
        } catch (error) {
          // fallback to Manila
          setMapRegion({
            latitude: 14.5995,
            longitude: 120.9842,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          setLocation({ latitude: 14.5995, longitude: 120.9842 });
          setLocationName('Manila, Philippines');
        }
      }
    };
    fetchAndSetLocation();
  }, [showLocationModal]);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos');
      }
      if (locationStatus !== 'granted') {
        Alert.alert('Permission needed', 'Location permission is required to pin location');
      }
    } catch (error) {
      // Error handled - Alert already shown
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImages(prev => [...prev, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open camera');
      // Error handled - Alert already shown
    }
  };

  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImages(prev => [...prev, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
      // Error handled - Alert already shown
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImagePicker },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const submitReport = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('Missing Photo', 'Please add at least one photo of the pet');
      return;
    }
    if (!location) {
      Alert.alert('Missing Location', 'Please set the last seen location');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please add a description');
      return;
    }

    try {
      let imageUrl = '';
      // Upload the first image to Firebase Storage
      if (selectedImages[0]?.uri) {
        const storage = getStorage();
        const response = await fetch(selectedImages[0].uri);
        const blob = await response.blob();
        const imageRef = ref(storage, `stray_reports/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }
      // Save report to Firestore
      const reportRef = await addDoc(collection(db, 'stray_reports'), {
        imageUrl,
        location,
        locationName,
        reportTime: serverTimestamp(),
        description,
        status: reportType, // Use the selected report type
        userId: (auth.currentUser && auth.currentUser.uid) || null,
      });

      // If this is a "Found Pet" report, notify users with active lost pet reports
      if (reportType === 'Found' && location) {
        // Run notification check asynchronously (don't block the UI)
        notifyLostPetOwners(location, locationName, description, imageUrl, reportRef.id).catch(() => {
          // Error handled silently - notification is optional
        });
      }

      Alert.alert(
        'Report Submitted',
        'Your stray pet report has been submitted successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
      // Error handled - Alert already shown
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Notify users with active lost pet reports
  const notifyLostPetOwners = async (foundLocation, foundLocationName, foundDescription, foundImageUrl, reportId) => {
    try {
      // Query for active lost pet reports
      const lostReportsQuery = query(
        collection(db, 'stray_reports'),
        where('status', '==', 'Lost')
      );
      
      const lostReportsSnapshot = await getDocs(lostReportsQuery);
      const notificationService = NotificationService.getInstance();
      const maxDistance = 10; // 10 km radius
      const notifiedUsers = new Set(); // Track users already notified to avoid duplicates

      lostReportsSnapshot.forEach((doc) => {
        const lostReport = { id: doc.id, ...doc.data() };
        
        // Skip if no location data
        if (!lostReport.location || !lostReport.location.latitude || !lostReport.location.longitude) {
          return;
        }

        // Skip if this is the same user reporting
        if (lostReport.userId === auth.currentUser?.uid) {
          return;
        }

        // Calculate distance between found location and lost pet location
        const distance = calculateDistance(
          foundLocation.latitude,
          foundLocation.longitude,
          lostReport.location.latitude,
          lostReport.location.longitude
        );

        // If within 10km radius, send notification
        if (distance <= maxDistance && !notifiedUsers.has(lostReport.userId)) {
          notifiedUsers.add(lostReport.userId);
          
          // Create notification for the lost pet owner
          notificationService.createNotification({
            userId: lostReport.userId,
            title: '🔍 Found Pet Alert',
            body: `A pet matching your lost pet report has been found nearby (${distance.toFixed(1)} km away). Check the details!`,
            type: 'found_pet',
            data: {
              reportId: reportId,
              lostReportId: lostReport.id,
              distance: distance.toFixed(1),
              location: foundLocation,
              locationName: foundLocationName,
            },
          }).catch(() => {
            // Error handled silently - notification creation may fail
          });
        }
      });
    } catch (error) {
      // Error handled silently - notifications are optional
    }
  };

  // Facebook color scheme
  const facebookBlue = '#1877F2';
  const facebookBackground = '#F0F2F5';
  const facebookCardBg = '#FFFFFF';
  const facebookText = '#050505';
  const facebookSecondaryText = '#65676B';
  const facebookBorder = '#E4E6EB';
  const facebookInputBg = '#F0F2F5';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: facebookBackground,
    },
    header: {
      backgroundColor: '#ffffff',
      paddingTop: Platform.OS === 'ios' ? 50 : Math.max(0, (StatusBar.currentHeight || 0) - 24),
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      ...SHADOWS.light,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
      marginRight: SPACING.md,
    },
    helpButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
    },
    scrollView: {
      flex: 1,
      padding: SPACING.md,
    },
    formContainer: {
      backgroundColor: facebookCardBg,
      borderRadius: 10,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    formTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
      textAlign: 'center',
    },
    section: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.sm,
    },
    reportTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    reportTypeButton: {
      flex: 1,
      minWidth: '30%',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.sm,
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: facebookBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportTypeButtonActive: {
      backgroundColor: facebookBlue,
      borderColor: facebookBlue,
    },
    reportTypeText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      textAlign: 'center',
    },
    reportTypeTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    photoContainer: {
      minHeight: 150,
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: facebookBorder,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    photoContainerWithImages: {
      borderStyle: 'solid',
      borderColor: facebookBlue,
      minHeight: 120,
      padding: SPACING.sm,
    },
    addPhotoButton: {
      alignItems: 'center',
      padding: SPACING.lg,
    },
    addPhotoText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginTop: SPACING.sm,
    },
    imagesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    imageContainer: {
      width: (width - SPACING.lg * 2 - SPACING.sm * 2) / 3,
      height: 100,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.small,
      overflow: 'hidden',
      position: 'relative',
    },
    selectedImage: {
      width: '100%',
      height: '100%',
    },
    removeImageButton: {
      position: 'absolute',
      top: 5,
      right: 5,
      backgroundColor: COLORS.error,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inputContainer: {
      marginBottom: SPACING.md,
    },
    inputLabel: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    textInput: {
      borderWidth: 1,
      borderColor: facebookBorder,
      borderRadius: 8,
      padding: SPACING.md,
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      backgroundColor: facebookCardBg,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: facebookCardBg,
      borderWidth: 1,
      borderColor: facebookBorder,
      borderRadius: 8,
      padding: SPACING.md,
      justifyContent: 'space-between',
    },
    locationButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: location ? facebookText : facebookSecondaryText,
      flex: 1,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: facebookCardBg,
      borderWidth: 1,
      borderColor: facebookBorder,
      borderRadius: 8,
      padding: SPACING.md,
    },
    timeText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      flex: 1,
    },
    submitButton: {
      backgroundColor: facebookBlue,
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginTop: SPACING.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    submitButtonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '700',
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: facebookCardBg,
      borderRadius: 20,
      padding: SPACING.md,
      width: width - SPACING.md * 2,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: facebookBorder,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: facebookText,
    },
    locationInfo: {
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      padding: SPACING.md,
      marginTop: SPACING.md,
    },
    locationInfoTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    locationInfoText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 20,
    },
    modalButton: {
      backgroundColor: facebookBlue,
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '700',
    },
    mapContainer: {
      width: '100%',
      height: 350,
      borderRadius: RADIUS.medium,
      overflow: 'hidden',
      marginBottom: SPACING.md,
      ...SHADOWS.medium,
    },
    map: {
      width: '100%',
      height: 350,
    },
    // Instruction Modal Styles
    instructionModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    instructionModalContent: {
      backgroundColor: facebookCardBg,
      borderRadius: 20,
      padding: SPACING.md,
      marginHorizontal: SPACING.md,
      maxHeight: '90%',
      width: '90%',
      maxWidth: 500,
      ...SHADOWS.heavy,
    },
    instructionModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: facebookBorder,
    },
    instructionModalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: facebookText,
      flex: 1,
    },
    instructionCloseButton: {
      padding: SPACING.sm,
    },
    instructionScrollView: {
      maxHeight: 400,
    },
    instructionContent: {
      paddingBottom: SPACING.md,
    },
    instructionSubtitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      textAlign: 'center',
      marginBottom: SPACING.md,
      lineHeight: 22,
    },
    stepContainer: {
      flexDirection: 'row',
      marginBottom: SPACING.md,
      alignItems: 'flex-start',
    },
    stepNumber: {
      backgroundColor: facebookBlue,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    stepNumberText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    stepDescription: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 20,
    },
    tipContainer: {
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    tipTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    tipText: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 20,
    },
    noteContainer: {
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      padding: SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: '#F9CE69',
      marginBottom: SPACING.md,
    },
    noteTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    noteText: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 20,
    },
    reportTypesContainer: {
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    reportTypesTitle: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.md,
    },
    reportTypeItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: SPACING.md,
    },
    reportTypeEmoji: {
      fontSize: FONTS.sizes.large,
      marginRight: SPACING.sm,
      marginTop: 2,
    },
    reportTypeInfo: {
      flex: 1,
    },
    reportTypeName: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.xs,
    },
    reportTypeDesc: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      lineHeight: 18,
    },
    instructionGotItButton: {
      backgroundColor: facebookBlue,
      borderRadius: 8,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      alignItems: 'center',
      marginTop: SPACING.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    instructionGotItButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#FFFFFF',
    },

  }), [COLORS, width, location, selectedImages.length]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Report Form</Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => setShowInstructionModal(true)}
          >
            <MaterialIcons name="help-outline" size={24} color="#050505" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stray Pet Report Form */}
        <View style={styles.formContainer}>
          
          {/* Report Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Type *</Text>
            <View style={styles.reportTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'Stray' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('Stray')}
              >
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'Stray' && styles.reportTypeTextActive
                ]}>
                  🐾 Stray Pet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'Found' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('Found')}
              >
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'Found' && styles.reportTypeTextActive
                ]}>
                  🔍 Found Pet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reportTypeButton,
                  reportType === 'Incident' && styles.reportTypeButtonActive
                ]}
                onPress={() => setReportType('Incident')}
              >
                <Text style={[
                  styles.reportTypeText,
                  reportType === 'Incident' && styles.reportTypeTextActive
                ]}>
                  🚨 Incident Report
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos *</Text>
            <TouchableOpacity
              style={[
                styles.photoContainer,
                selectedImages.length > 0 && styles.photoContainerWithImages
              ]}
              onPress={showImagePickerOptions}
            >
              {selectedImages.length === 0 ? (
                <View style={styles.addPhotoButton}>
                  <MaterialIcons name="camera-alt" size={40} color={facebookSecondaryText} />
                  <Text style={styles.addPhotoText}>Tap to add photos</Text>
                </View>
              ) : (
                <View style={styles.imagesGrid}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.selectedImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <MaterialIcons name="close" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedImages.length < 6 && (
                    <TouchableOpacity
                      style={[styles.imageContainer, { backgroundColor: facebookInputBg, justifyContent: 'center', alignItems: 'center' }]}
                      onPress={showImagePickerOptions}
                    >
                      <MaterialIcons name="add" size={30} color={facebookSecondaryText} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Last Seen Location *</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowLocationModal(true)}
            >
              <Text style={styles.locationButtonText}>
                {locationName || 'Tap to set location'}
              </Text>
              <MaterialIcons name="location-pin" size={24} color={facebookBlue} />
            </TouchableOpacity>
          </View>

          {/* Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Seen</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {reportTime.toLocaleDateString()} at {reportTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <MaterialIcons name="access-time" size={24} color={facebookBlue} />
            </View>
          </View>

          {/* Pet Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pet Description</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the pet's appearance, condition, behavior, size, color, type, any visible injuries..."
                placeholderTextColor={facebookSecondaryText}
                multiline
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton} onPress={submitReport}>
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pin Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <MaterialIcons name="close" size={24} color={facebookText} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                region={mapRegion}
                onPress={async (e) => {
                  const { latitude, longitude } = e.nativeEvent.coordinate;
                  setMapRegion({
                    ...mapRegion,
                    latitude,
                    longitude,
                  });
                  setLocation({ latitude, longitude });
                  try {
                    const address = await Location.reverseGeocodeAsync({ latitude, longitude });
                    const addressString = address[0]
                      ? `${address[0].street || ''} ${address[0].name || ''}, ${address[0].city || ''}`
                      : `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
                    setLocationName(addressString);
                  } catch {
                    setLocationName(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
                  }
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {location && (
                  <Marker
                    coordinate={location}
                    draggable
                    onDragEnd={async (e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setMapRegion({
                        ...mapRegion,
                        latitude,
                        longitude,
                      });
                      setLocation({ latitude, longitude });
                      try {
                        const address = await Location.reverseGeocodeAsync({ latitude, longitude });
                        const addressString = address[0]
                          ? `${address[0].street || ''} ${address[0].name || ''}, ${address[0].city || ''}`
                          : `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
                        setLocationName(addressString);
                      } catch {
                        setLocationName(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
                      }
                    }}
                    title="Selected Location"
                    description={locationName}
                    pinColor={facebookBlue}
                  />
                )}
              </MapView>
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoTitle}>Selected Location:</Text>
              <Text style={styles.locationInfoText}>{locationName || 'Tap on the map to select a location'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 10 }]}
              onPress={() => setShowLocationModal(false)}
              disabled={!location}
            >
              <Text style={styles.modalButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Instruction Modal */}
      <Modal
        visible={showInstructionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInstructionModal(false)}
      >
        <View style={styles.instructionModalOverlay}>
          <View style={styles.instructionModalContent}>
            <View style={styles.instructionModalHeader}>
              <Text style={styles.instructionModalTitle}>📋 How to File a Report</Text>
              <TouchableOpacity
                style={styles.instructionCloseButton}
                onPress={handleInstructionClose}
              >
                <MaterialIcons name="close" size={24} color={facebookSecondaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.instructionScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionSubtitle}>
                  Follow these simple steps to file a pet report:
                </Text>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📝 Select Report Type</Text>
                    <Text style={styles.stepDescription}>
                      • Choose the appropriate report type:{'\n'}
                      • 🐾 Stray Pet - for lost or wandering pets{'\n'}
                      • 🔍 Found Pet - for pets you found{'\n'}
                      • 🚨 Incident Report - for pet-related incidents
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📸 Add Photos</Text>
                    <Text style={styles.stepDescription}>
                      • Take clear photos of the pet (required){'\n'}
                      • Include multiple angles if possible{'\n'}
                      • Tap the photo area to add from camera or gallery{'\n'}
                      • You can add up to 6 photos
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📍 Set Location</Text>
                    <Text style={styles.stepDescription}>
                      • Tap "Tap to set location" to open the map{'\n'}
                      • Pin the exact location where you saw the pet{'\n'}
                      • You can drag the marker to adjust the position{'\n'}
                      • Or enter location manually if needed
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📝 Add Description</Text>
                    <Text style={styles.stepDescription}>
                      • Describe the pet's appearance in detail{'\n'}
                      • Include size, color, breed, condition{'\n'}
                      • Mention any injuries or special markings{'\n'}
                      • Add behavior observations if relevant
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>5</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>✅ Submit Report</Text>
                    <Text style={styles.stepDescription}>
                      • Review all information before submitting{'\n'}
                      • Tap "Submit Report" to send your report{'\n'}
                      • Your report will be visible to other users{'\n'}
                      • You can view your reports in "My Reports"
                    </Text>
                  </View>
                </View>

                <View style={styles.tipContainer}>
                  <Text style={styles.tipTitle}>💡 Tips for Better Reports:</Text>
                  <Text style={styles.tipText}>
                    • Take photos in good lighting{'\n'}
                    • Be as specific as possible in descriptions{'\n'}
                    • Include landmarks in location descriptions{'\n'}
                    • Report immediately for better chances of reunion{'\n'}
                    • Check "My Reports" for updates on your submissions
                  </Text>
                </View>

                <View style={styles.noteContainer}>
                  <Text style={styles.noteTitle}>📋 Important Notes:</Text>
                  <Text style={styles.noteText}>
                    • All fields marked with * are required{'\n'}
                    • Your report will be public and visible to other users{'\n'}
                    • Location data helps others find the pet{'\n'}
                    • You can edit or delete your reports later{'\n'}
                    • Contact information is not shared publicly
                  </Text>
                </View>

                <View style={styles.reportTypesContainer}>
                  <Text style={styles.reportTypesTitle}>📋 Report Types Explained:</Text>
                  <View style={styles.reportTypeItem}>
                    <Text style={styles.reportTypeEmoji}>🐾</Text>
                    <View style={styles.reportTypeInfo}>
                      <Text style={styles.reportTypeName}>Stray Pet</Text>
                      <Text style={styles.reportTypeDesc}>For pets that appear lost or wandering without an owner</Text>
                    </View>
                  </View>
                  <View style={styles.reportTypeItem}>
                    <Text style={styles.reportTypeEmoji}>🔍</Text>
                    <View style={styles.reportTypeInfo}>
                      <Text style={styles.reportTypeName}>Found Pet</Text>
                      <Text style={styles.reportTypeDesc}>For pets you have found and are helping to reunite with their owner</Text>
                    </View>
                  </View>
                  <View style={styles.reportTypeItem}>
                    <Text style={styles.reportTypeEmoji}>🚨</Text>
                    <View style={styles.reportTypeInfo}>
                      <Text style={styles.reportTypeName}>Incident Report</Text>
                      <Text style={styles.reportTypeDesc}>For pet-related incidents, accidents, or concerning situations</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.instructionGotItButton}
              onPress={handleInstructionClose}
            >
              <Text style={styles.instructionGotItButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default StrayReportScreen;
