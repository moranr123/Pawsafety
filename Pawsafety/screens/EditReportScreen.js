import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db, storage, auth } from '../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const EditReportScreen = ({ navigation, route }) => {
  const { colors: COLORS } = useTheme();
  const { report } = route.params;
  
  const [image, setImage] = useState(report.imageUrl ? { uri: report.imageUrl } : null);
  const [description, setDescription] = useState(report.description || '');
  const [location, setLocation] = useState(report.location || null);
  const [locationName, setLocationName] = useState(report.locationName || '');
  const [reportTime, setReportTime] = useState(report.reportTime || new Date());
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newImageSelected, setNewImageSelected] = useState(false);

  useEffect(() => {
    // Set initial location if available
    if (report.location) {
      setLocation(report.location);
    }
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to select an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setNewImageSelected(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0]);
      setNewImageSelected(true);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant location permissions to get your current location.');
      return;
    }

    const currentLocation = await Location.getCurrentPositionAsync({});
    const newLocation = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
    };
    
    setLocation(newLocation);
    setLocationModalVisible(true);
    
    // Get address from coordinates
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync(newLocation);
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const addressString = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        setLocationName(addressString);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleMapPress = async (event) => {
    const newLocation = event.nativeEvent.coordinate;
    setLocation(newLocation);
    
    // Get address from coordinates
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync(newLocation);
      if (reverseGeocode.length > 0) {
        const address = reverseGeocode[0];
        const addressString = [
          address.street,
          address.city,
          address.region,
          address.country
        ].filter(Boolean).join(', ');
        setLocationName(addressString);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const uploadImage = async (imageUri) => {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    const imageRef = ref(storage, `stray_reports/${Date.now()}_${Math.random()}`);
    await uploadBytes(imageRef, blob);
    return getDownloadURL(imageRef);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Please set the last seen location');
      return;
    }

    setLoading(true);

    try {
      let imageUrl = report.imageUrl;

      // Upload new image if selected
      if (newImageSelected && image) {
        // Delete old image if it exists
        if (report.imageUrl) {
          try {
            const oldImageRef = ref(storage, report.imageUrl);
            await deleteObject(oldImageRef);
          } catch (error) {
            // Error handled silently - continue with update
          }
        }
        
        imageUrl = await uploadImage(image.uri);
      }

      // Update the report in Firestore
      const reportRef = doc(db, 'stray_reports', report.id);
      await updateDoc(reportRef, {
        description: description.trim(),
        location: location,
        locationName: locationName,
        imageUrl: imageUrl,
        updatedAt: new Date(),
      });

      Alert.alert('Success', 'Report updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      // Error handled - Alert already shown
      Alert.alert('Error', 'Failed to update report. Please try again.');
    } finally {
      setLoading(false);
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
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : Math.max(0, (StatusBar.currentHeight || 0) - 24),
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      ...SHADOWS.light,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
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
    headerTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
    },
    formCard: {
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
    sectionTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.sm,
    },
    imageSection: {
      marginBottom: SPACING.xl,
    },
    imageContainer: {
      width: '100%',
      height: 220,
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: facebookBorder,
      borderStyle: 'dashed',
    },
    imageContainerWithPhoto: {
      borderStyle: 'solid',
      borderColor: facebookBlue,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
      borderRadius: 13,
    },
    imagePlaceholder: {
      alignItems: 'center',
    },
    placeholderIcon: {
      marginBottom: SPACING.sm,
    },
    placeholderText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '500',
      color: facebookSecondaryText,
      textAlign: 'center',
    },
    placeholderSubtext: {
      fontSize: 14,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      textAlign: 'center',
      marginTop: 4,
    },
    imageButtons: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    imageButton: {
      backgroundColor: facebookBlue,
      paddingVertical: SPACING.sm,
      borderRadius: 8,
      flex: 1,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    imageButtonSecondary: {
      backgroundColor: facebookInputBg,
      borderWidth: 1,
      borderColor: facebookBorder,
    },
    imageButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      marginLeft: SPACING.xs,
    },
    imageButtonTextSecondary: {
      color: facebookText,
    },
    inputSection: {
      marginBottom: SPACING.xl,
    },
    inputLabel: {
      fontSize: 16,
      fontFamily: 'SF Pro Display',
      fontWeight: '600',
      color: '#1E293B',
      marginBottom: SPACING.sm,
    },
    textInput: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      fontSize: 16,
      fontFamily: 'SF Pro Display',
      color: '#1E293B',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      minHeight: 120,
      textAlignVertical: 'top',
    },
    textInputFocused: {
      borderColor: COLORS.mediumBlue,
      backgroundColor: COLORS.white,
    },
    locationSection: {
      marginBottom: SPACING.xl,
    },
    locationButton: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 52,
    },
    locationButtonActive: {
      borderColor: COLORS.mediumBlue,
      backgroundColor: COLORS.white,
    },
    locationText: {
      fontSize: 16,
      fontFamily: 'SF Pro Display',
      color: '#1E293B',
      flex: 1,
      marginRight: SPACING.sm,
    },
    locationPlaceholder: {
      color: '#94A3B8',
    },
    timeSection: {
      marginBottom: SPACING.xl,
    },
    timeContainer: {
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      minHeight: 52,
      justifyContent: 'center',
    },
    timeText: {
      fontSize: 16,
      fontFamily: 'SF Pro Display',
      color: '#1E293B',
    },
    submitButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: 15,
      paddingVertical: SPACING.lg,
      alignItems: 'center',
      marginTop: SPACING.md,
      marginBottom: SPACING.xl,
      ...SHADOWS.medium,
      elevation: 5,
    },
    submitButtonDisabled: {
      backgroundColor: '#94A3B8',
    },
    submitButtonText: {
      color: COLORS.white,
      fontSize: 18,
      fontFamily: 'SF Pro Display',
      fontWeight: '700',
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    modalHeader: {
      backgroundColor: '#ffffff',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : Math.max(0, (StatusBar.currentHeight || 0) - 24),
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      ...SHADOWS.light,
    },
    modalHeaderContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
    },
    closeButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
    },
    map: {
      flex: 1,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    loadingContent: {
      backgroundColor: facebookCardBg,
      borderRadius: 12,
      padding: SPACING.xl,
      alignItems: 'center',
      minWidth: 150,
    },
    loadingText: {
      marginTop: SPACING.md,
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
    },
  }), []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Report</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.formCard}>
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>📷 Photo</Text>
            <View style={[
              styles.imageContainer, 
              image && styles.imageContainerWithPhoto
            ]}>
              {image ? (
                <Image source={image} style={styles.image} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons 
                    name="add-a-photo" 
                    size={48} 
                    color={facebookSecondaryText} 
                    style={styles.placeholderIcon}
                  />
                  <Text style={styles.placeholderText}>Add a photo</Text>
                  <Text style={styles.placeholderSubtext}>
                    Help others identify the pet
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.imageButtons}>
              <TouchableOpacity 
                style={styles.imageButton} 
                onPress={takePhoto}
              >
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.imageButton, styles.imageButtonSecondary]} 
                onPress={pickImage}
              >
                <MaterialIcons name="photo-library" size={20} color={facebookText} />
                <Text style={[styles.imageButtonText, styles.imageButtonTextSecondary]}>
                  Gallery
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.formCard}>
          <View style={styles.inputSection}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <Text style={styles.inputLabel}>Tell us about the pet</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the pet's appearance, behavior, condition..."
              placeholderTextColor={facebookSecondaryText}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Location Section */}
        <View style={styles.formCard}>
          <View style={styles.locationSection}>
            <Text style={styles.sectionTitle}>📍 Last Seen Location</Text>
            <Text style={styles.inputLabel}>Where did you find the pet?</Text>
            <TouchableOpacity 
              style={[
                styles.locationButton,
                locationName && styles.locationButtonActive
              ]}
              onPress={getCurrentLocation}
            >
              <Text style={[
                styles.locationText,
                !locationName && styles.locationPlaceholder
              ]}>
                {locationName || 'Tap to set location'}
              </Text>
              <MaterialIcons name="my-location" size={24} color={facebookBlue} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Section */}
        <View style={styles.formCard}>
          <View style={styles.timeSection}>
            <Text style={styles.sectionTitle}>⏰ Report Time</Text>
            <Text style={styles.inputLabel}>When was this reported</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {reportTime?.toDate ? 
                  reportTime.toDate().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 
                  new Date(reportTime).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[
            styles.submitButton,
            loading && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Updating Report...' : 'Update Report'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Pin Location</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setLocationModalVisible(false)}
              >
                <MaterialIcons name="close" size={20} color={facebookSecondaryText} />
              </TouchableOpacity>
            </View>
          </View>
          {location && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
            >
              <Marker
                coordinate={location}
                title="Last seen location"
              />
            </MapView>
          )}
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={facebookBlue} />
            <Text style={styles.loadingText}>Updating...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default EditReportScreen; 