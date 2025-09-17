import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../services/firebase';

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
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
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
      console.error('Error requesting permissions:', error);
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
      console.error('Camera error:', error);
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
      console.error('Image picker error:', error);
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

  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const addressString = address[0] 
        ? `${address[0].street || ''} ${address[0].name || ''}, ${address[0].city || ''}`
        : 'Current Location';

      setLocation(location.coords);
      setLocationName(addressString);
      setShowLocationModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
      console.error('Location error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleManualLocation = () => {
    Alert.prompt(
      'Enter Location',
      'Please enter the location where you saw the pet:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Set Location', 
          onPress: (locationText) => {
            if (locationText && locationText.trim()) {
              setLocationName(locationText.trim());
              setLocation({ latitude: 0, longitude: 0 }); // Placeholder coordinates
              setShowLocationModal(false);
            }
          }
        }
      ],
      'plain-text'
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
      await addDoc(collection(db, 'stray_reports'), {
        imageUrl,
        location,
        locationName,
        reportTime: serverTimestamp(),
        description,
        status: reportType, // Use the selected report type
        userId: (auth.currentUser && auth.currentUser.uid) || null,
      });
      Alert.alert(
        'Report Submitted',
        'Your stray pet report has been submitted successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to submit report');
      console.error('Submit error:', error);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    backButton: {
      marginRight: SPACING.md,
    },
    scrollView: {
      flex: 1,
      padding: SPACING.lg,
    },
    formContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
    },
    formHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xl,
    },
    formTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
      textAlign: 'center',
    },
    section: {
      marginBottom: SPACING.xl,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
    },
    reportTypeContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    reportTypeButton: {
      flex: 1,
      minWidth: '30%',
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      borderWidth: 2,
      borderColor: COLORS.lightBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reportTypeButtonActive: {
      backgroundColor: COLORS.mediumBlue,
      borderColor: COLORS.darkPurple,
    },
    reportTypeText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.secondaryText,
      textAlign: 'center',
    },
    reportTypeTextActive: {
      color: COLORS.white,
      fontWeight: FONTS.weights.bold,
    },
    photoContainer: {
      minHeight: 150,
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      borderWidth: 2,
      borderColor: COLORS.lightBlue,
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    photoContainerWithImages: {
      borderStyle: 'solid',
      borderColor: COLORS.mediumBlue,
      minHeight: 120,
      padding: SPACING.sm,
    },
    addPhotoButton: {
      alignItems: 'center',
      padding: SPACING.lg,
    },
    addPhotoText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
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
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
    },
    inputLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    textInput: {
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      backgroundColor: COLORS.white,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      padding: SPACING.md,
      justifyContent: 'space-between',
    },
    locationButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: location ? COLORS.text : COLORS.secondaryText,
      flex: 1,
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.white,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      padding: SPACING.md,
    },
    timeText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      flex: 1,
    },
    submitButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      marginTop: SPACING.xl,
      ...SHADOWS.medium,
    },
    submitButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.xl,
      width: width - SPACING.lg * 2,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    modalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    locationOptions: {
      marginBottom: SPACING.lg,
    },
    locationOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
    },
    locationOptionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginLeft: SPACING.md,
      flex: 1,
    },
    locationOptionDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginLeft: SPACING.md,
      flex: 1,
    },
    locationInfo: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginTop: SPACING.md,
    },
    locationInfoTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    locationInfoText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
    },
    modalButton: {
      backgroundColor: COLORS.mediumBlue,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    modalButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
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

  }), [COLORS, width, location, selectedImages.length]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stray Pet Report Form */}
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Stray Pet Report Form</Text>
          </View>
          
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
                  <MaterialIcons name="camera-alt" size={40} color={COLORS.secondaryText} />
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
                        <MaterialIcons name="close" size={16} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedImages.length < 6 && (
                    <TouchableOpacity
                      style={[styles.imageContainer, { backgroundColor: COLORS.lightBlue, justifyContent: 'center', alignItems: 'center' }]}
                      onPress={showImagePickerOptions}
                    >
                      <MaterialIcons name="add" size={30} color={COLORS.secondaryText} />
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
              <MaterialIcons name="location-pin" size={24} color={COLORS.mediumBlue} />
            </TouchableOpacity>
          </View>

          {/* Time Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Seen</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {reportTime.toLocaleDateString()} at {reportTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </Text>
              <MaterialIcons name="access-time" size={24} color={COLORS.mediumBlue} />
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
                placeholderTextColor={COLORS.secondaryText}
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
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <MapView
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
                    pinColor={COLORS.mediumBlue}
                  />
                )}
              </MapView>
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoTitle}>Selected Location:</Text>
              <Text style={styles.locationInfoText}>{locationName || 'Tap on the map to select a location'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { marginTop: 10, backgroundColor: COLORS.darkPurple }]}
              onPress={() => setShowLocationModal(false)}
              disabled={!location}
            >
              <Text style={styles.modalButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StrayReportScreen;
