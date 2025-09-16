import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  TextInput,
  Dimensions
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { auth, db, storage } from '../services/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const MyPetsScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPetQR, setSelectedPetQR] = useState(null);
  const [showReportLostModal, setShowReportLostModal] = useState(false);
  const [selectedPetForReport, setSelectedPetForReport] = useState(null);
  const [reportForm, setReportForm] = useState({
    lastSeenLocation: '',
    coordinates: null,
    timeLost: '',
    lostDate: new Date(),
    description: ''
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995, // Default to Philippines coordinates
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState({
    hours: new Date().getHours(),
    minutes: new Date().getMinutes(),
    period: new Date().getHours() >= 12 ? 'PM' : 'AM'
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    petName: '',
    petType: 'dog',
    petGender: 'male',
    breed: '',
    description: '',
    ownerFullName: '',
    contactNumber: '',
    petImage: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const qrRef = useRef(null);
  const user = auth.currentUser;



  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'pets'),
      where('userId', '==', user.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const petList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setPets(petList);
      setLoading(false);
    });

    // Listen for user notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Show alert for new notifications
          Alert.alert(
            notification.title,
            notification.message,
            [
              {
                text: 'OK',
                onPress: async () => {
                  // Mark notification as read
                  try {
                    await updateDoc(doc(db, 'notifications', change.doc.id), {
                      read: true
                    });
                  } catch (error) {
                    console.error('Error marking notification as read:', error);
                  }
                }
              }
            ]
          );
        }
      });
    });
    
    return () => {
      unsubscribe();
      unsubscribeNotifications();
    };
  }, [user]);

  const handleDeletePet = (petId, petName) => {
    Alert.alert(
      'Delete Pet',
      `Are you sure you want to remove ${petName} from your pets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the pet
              await deleteDoc(doc(db, 'pets', petId));
              
              // Also delete any corresponding stray reports
              const strayReportsQuery = query(
                collection(db, 'stray_reports'),
                where('petId', '==', petId)
              );
              
              const strayReportsSnapshot = await getDocs(strayReportsQuery);
              const deletePromises = strayReportsSnapshot.docs.map(docSnapshot => 
                deleteDoc(doc(db, 'stray_reports', docSnapshot.id))
              );
              
              await Promise.all(deletePromises);
              
              Alert.alert('Success', `${petName} has been removed from your pets.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete pet. Please try again.');
            }
          }
        }
      ]
    );
  };



  const handleReportLost = (pet) => {
    setSelectedPetForReport(pet);
    setReportForm({
      lastSeenLocation: '',
      coordinates: null,
      timeLost: '',
      lostDate: new Date(),
      description: ''
    });
    setTempDate(new Date());
    setTempTime({
      hours: new Date().getHours(),
      minutes: new Date().getMinutes(),
      period: new Date().getHours() >= 12 ? 'PM' : 'AM'
    });
    setShowReportLostModal(true);
  };

  const handleLocationModalOpen = async () => {
    setShowLocationModal(true);
    
    // Get user's current location as default
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const newRegion = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setMapRegion(newRegion);
        
        // Optionally set as default selection
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        let locationName = 'Current Location';
        if (address && address.length > 0) {
          const addr = address[0];
          locationName = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim() || 'Current Location';
        }
        
        setReportForm(prev => ({
          ...prev,
          lastSeenLocation: locationName,
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          }
        }));
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to pin your current location.');
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      let locationName = 'Current Location';
      if (address && address.length > 0) {
        const addr = address[0];
        locationName = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim() || 'Current Location';
      }

      setReportForm(prev => ({
        ...prev,
        lastSeenLocation: locationName,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        }
      }));

      Alert.alert('Location Set', `Location set to: ${locationName}`);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location. Please try again or enter manually.');
    }
    setIsGettingLocation(false);
  };

  const handleMapLocationSelect = async (coordinate) => {
    const { latitude, longitude } = coordinate;
    setMapRegion({
      ...mapRegion,
      latitude,
      longitude,
    });
    
    try {
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      let locationName = 'Selected Location';
      if (address && address.length > 0) {
        const addr = address[0];
        locationName = `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim() || 'Selected Location';
      }
      
      setReportForm(prev => ({
        ...prev,
        lastSeenLocation: locationName,
        coordinates: { latitude, longitude }
      }));
    } catch (error) {
      console.error('Error getting address:', error);
      setReportForm(prev => ({
        ...prev,
        lastSeenLocation: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`,
        coordinates: { latitude, longitude }
      }));
    }
  };

  const formatDateTime = (date, time) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    const hour12 = time.period === 'AM' ? 
      (time.hours === 0 ? 12 : time.hours) : 
      (time.hours > 12 ? time.hours - 12 : time.hours === 0 ? 12 : time.hours);
    const timeStr = `${hour12}:${time.minutes.toString().padStart(2, '0')} ${time.period}`;
    return `${dateStr} at ${timeStr}`;
  };

  const handleDateTimeConfirm = () => {
    const formattedDateTime = formatDateTime(tempDate, tempTime);
    setReportForm(prev => ({ ...prev, timeLost: formattedDateTime, lostDate: tempDate }));
    setShowDateTimeModal(false);
  };

  const handleSubmitLostReport = async () => {
    if (!reportForm.lastSeenLocation.trim() || !reportForm.timeLost.trim()) {
      Alert.alert('Missing Information', 'Please select the last seen location and time when the pet was lost.');
      return;
    }

    setIsSubmittingReport(true);
    
    try {
      let imageUrl = '';
      // Upload the pet image to Firebase Storage if it exists
      if (selectedPetForReport.petImage) {
        const response = await fetch(selectedPetForReport.petImage);
        const blob = await response.blob();
        const imageRef = ref(storage, `lost_pet_reports/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Create a lost pet report in stray_reports collection
      await addDoc(collection(db, 'stray_reports'), {
        imageUrl,
        location: reportForm.coordinates,
        locationName: reportForm.lastSeenLocation,
        reportTime: serverTimestamp(),
        timeLost: reportForm.timeLost,
        description: reportForm.description || `Lost pet: ${selectedPetForReport.petName} (${selectedPetForReport.breed}). ${selectedPetForReport.description || 'No additional description.'}`,
        status: 'Lost',
        userId: user.uid,
        petId: selectedPetForReport.id,
        petName: selectedPetForReport.petName,
        petType: selectedPetForReport.petType,
        breed: selectedPetForReport.breed,
        ownerName: selectedPetForReport.ownerFullName,
        contactNumber: selectedPetForReport.contactNumber,
      });

      // Update the pet status to mark as lost
      await updateDoc(doc(db, 'pets', selectedPetForReport.id), {
        status: 'lost',
        lostReportedAt: serverTimestamp(),
        lastSeenLocation: reportForm.lastSeenLocation,
        lastSeenCoordinates: reportForm.coordinates,
        timeLost: reportForm.timeLost
      });

      setShowReportLostModal(false);
      setSelectedPetForReport(null);
      
      Alert.alert(
        'Report Submitted',
        `${selectedPetForReport.petName} has been reported as lost. The report is now visible to others who might help find your pet.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error reporting pet as lost:', error);
      Alert.alert('Error', 'Failed to report pet as lost. Please try again.');
    }
    
    setIsSubmittingReport(false);
  };

   const handleMarkFound = (pet) => {
     Alert.alert(
       'Mark Pet as Found',
       `Great news! Mark ${pet.petName} as found?`,
       [
         { text: 'Cancel', style: 'cancel' },
         {
           text: 'Mark Found',
           onPress: async () => {
             try {
               // Update the pet status to remove lost status
               await updateDoc(doc(db, 'pets', pet.id), {
                 status: 'safe',
                 foundAt: serverTimestamp()
               });

               // Find and update the corresponding stray report status to "Found"
               const strayReportsQuery = query(
                 collection(db, 'stray_reports'),
                 where('petId', '==', pet.id),
                 where('status', '==', 'Lost')
               );
               
               const strayReportsSnapshot = await getDocs(strayReportsQuery);
               const updatePromises = strayReportsSnapshot.docs.map(docSnapshot => 
                 updateDoc(doc(db, 'stray_reports', docSnapshot.id), {
                   status: 'Found',
                   foundAt: serverTimestamp(),
                   foundBy: 'owner'
                 })
               );
               
               await Promise.all(updatePromises);

               Alert.alert(
                 'Pet Marked as Found',
                 `${pet.petName} has been marked as found and safe! The lost pet report has been updated.`,
                 [{ text: 'OK' }]
               );
             } catch (error) {
               console.error('Error marking pet as found:', error);
               Alert.alert('Error', 'Failed to update pet status. Please try again.');
             }
           }
         }
       ]
     );
   };

   const handleEditPet = (pet) => {
     setSelectedPetForEdit(pet);
     setEditForm({
       petName: pet.petName || '',
       petType: pet.petType || 'dog',
       petGender: pet.petGender || 'male',
       breed: pet.breed || '',
       description: pet.description || '',
       ownerFullName: pet.ownerFullName || '',
       contactNumber: pet.contactNumber || '',
       petImage: pet.petImage || ''
     });
     setShowEditModal(true);
   };

   const handleSubmitEdit = async () => {
     if (!selectedPetForEdit) return;
     
     // Validate required fields
     if (!editForm.petName.trim() || !editForm.breed.trim() || 
         !editForm.ownerFullName.trim() || !editForm.contactNumber.trim()) {
       Alert.alert('Missing Information', 'Please fill in all required fields.');
       return;
     }

     setIsSubmittingEdit(true);
     
     try {
       await updateDoc(doc(db, 'pets', selectedPetForEdit.id), {
         petName: editForm.petName.trim(),
         petType: editForm.petType,
         petGender: editForm.petGender,
         breed: editForm.breed.trim(),
         description: editForm.description.trim(),
         ownerFullName: editForm.ownerFullName.trim(),
         contactNumber: editForm.contactNumber.trim(),
         petImage: editForm.petImage,
         updatedAt: serverTimestamp()
       });

       Alert.alert('Success', `${editForm.petName}'s information has been updated!`);
       setShowEditModal(false);
       setSelectedPetForEdit(null);
       setEditForm({
         petName: '',
         petType: 'dog',
         petGender: 'male',
         breed: '',
         description: '',
         ownerFullName: '',
         contactNumber: '',
         petImage: ''
       });
     } catch (error) {
       console.error('Error updating pet:', error);
       Alert.alert('Error', 'Failed to update pet information. Please try again.');
     } finally {
       setIsSubmittingEdit(false);
     }
   };

   const handleDownloadQR = async (pet) => {
     try {
       // Request media library permissions
       const { status } = await MediaLibrary.requestPermissionsAsync();
       if (status !== 'granted') {
         Alert.alert('Permission Required', 'Please grant permission to save images to your gallery.');
         return;
       }

       // Add a small delay to ensure QR code is fully rendered
       await new Promise(resolve => setTimeout(resolve, 500));

       // Capture the QR code view as image
       const uri = await captureRef(qrRef.current, {
         format: 'png',
         quality: 1.0,
         result: 'tmpfile',
         height: 280,
         width: 280,
       });

       // Save to media library
       await MediaLibrary.saveToLibraryAsync(uri);
       
       Alert.alert(
         'QR Code Saved',
         `${pet.petName}'s QR code has been saved to your gallery!`,
         [{ text: 'OK' }]
       );
     } catch (error) {
       console.error('Error downloading QR code:', error);
       Alert.alert('Error', 'Failed to save QR code. Please try again.');
     }
   };

  const generateQRData = (pet) => {
    // Create human-readable text for QR code scanning
    const petInfo = `🐾 PET INFORMATION 🐾

Pet Name: ${pet.petName}
Type: ${pet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}
Gender: ${pet.petGender === 'male' ? '♂️ Male' : '♀️ Female'}
Breed: ${pet.breed}
${pet.description ? `Description: ${pet.description}` : ''}

👤 OWNER CONTACT:
Name: ${pet.ownerFullName}
Phone: ${pet.contactNumber}

Pet ID: ${pet.id}
Registered: ${pet.registeredDate ? new Date(pet.registeredDate).toLocaleDateString() : 'N/A'}

📱 If found, please contact the owner above.
Thank you for helping reunite pets with their families! ❤️`;

    return petInfo;
  };

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
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    editButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
    },
    editPetButton: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: 20,
      padding: SPACING.sm,
      marginLeft: SPACING.sm,
    },
    statsContainer: {
      marginLeft: 'auto',
    },
    statsText: {
      color: COLORS.lightBlue,
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    content: {
      paddingBottom: SPACING.xl,
    },
    petCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
    },
    petHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightBlue,
    },
    petImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.lightBlue,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
      overflow: 'hidden',
    },
    petPhoto: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    petEmoji: {
      fontSize: 30,
    },
    petInfo: {
      flex: 1,
    },
    petNameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
      flexWrap: 'wrap',
    },
    petName: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginRight: SPACING.sm,
    },
    lostBadge: {
      backgroundColor: '#FF8C00',
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: RADIUS.small,
    },
    lostBadgeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
    pendingBadge: {
      backgroundColor: '#FFA500',
      paddingHorizontal: SPACING.xs,
      paddingVertical: 2,
      borderRadius: RADIUS.small,
      marginLeft: SPACING.xs,
    },
    pendingBadgeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },

    petBreed: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    petDetails: {
      padding: SPACING.lg,
      paddingTop: 0,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.sm,
    },
    detailLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontWeight: FONTS.weights.medium,
    },
    detailValue: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      fontWeight: FONTS.weights.medium,
      flex: 1,
      textAlign: 'right',
    },
    description: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 20,
      marginTop: SPACING.sm,
    },
    actionButtons: {
      flexDirection: 'row',
      padding: SPACING.lg,
      paddingTop: 0,
      gap: SPACING.md,
    },
    actionButton: {
      flex: 1,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.light,
    },
    qrButton: {
      backgroundColor: COLORS.mediumBlue,
    },
    lostButton: {
      backgroundColor: '#FF8C00', // Orange color for warning/lost
    },
    foundButton: {
      backgroundColor: '#4CAF50', // Green color for found/success
    },
    deleteButton: {
      backgroundColor: COLORS.error,
    },
    actionButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
    },
    addPetButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      ...SHADOWS.medium,
    },
    addPetButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      marginLeft: SPACING.sm,
      textAlign: 'center',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    emptyIcon: {
      fontSize: 60,
      marginBottom: SPACING.md,
    },
    emptyTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    loadingText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.md,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.xl,
      alignItems: 'center',
      marginHorizontal: SPACING.lg,
      minWidth: 320,
      maxWidth: 350,
    },
    modalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    qrContainer: {
      padding: SPACING.lg,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.lg,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: SPACING.lg,
      justifyContent: 'center',
      width: '100%',
    },
    modalButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.medium,
      minWidth: 120,
      ...SHADOWS.light,
    },
    downloadButton: {
      backgroundColor: COLORS.mediumBlue,
    },
    closeButton: {
      backgroundColor: COLORS.secondaryText,
    },
    modalButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
      flexShrink: 0,
    },
    // Report Lost Modal Styles
    reportModalContent: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      maxHeight: '85%',
      width: '90%',
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      ...SHADOWS.medium,
    },
    reportModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    reportModalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    modalCloseButton: {
      padding: SPACING.xs,
    },
    reportFormContainer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      maxHeight: 400,
    },
    formField: {
      marginBottom: SPACING.lg,
    },
    formLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    formInput: {
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      backgroundColor: COLORS.white,
      minHeight: 48,
    },
    locationInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    locationInput: {
      flex: 1,
    },
    pinLocationButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.small,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.light,
    },
    coordinatesText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.xs,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    reportModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      gap: SPACING.md,
    },
    cancelButton: {
      backgroundColor: COLORS.lightGray,
      flex: 1,
    },
    submitButton: {
      backgroundColor: COLORS.darkPurple,
      flex: 1,
    },
    // Map and DateTime Selection Buttons
    mapSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      padding: SPACING.md,
      backgroundColor: COLORS.white,
      gap: SPACING.sm,
    },
    mapSelectButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: reportForm.lastSeenLocation ? COLORS.text : COLORS.secondaryText,
      flex: 1,
    },
    dateTimeSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      padding: SPACING.md,
      backgroundColor: COLORS.white,
      gap: SPACING.sm,
    },
    dateTimeSelectButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: reportForm.timeLost ? COLORS.text : COLORS.secondaryText,
      flex: 1,
    },
    // Map Modal Styles
    mapModalContent: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      maxHeight: '90%',
      width: '95%',
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      ...SHADOWS.medium,
    },
    mapModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    mapModalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    mapContainer: {
      width: '100%',
      height: 300,
      margin: SPACING.lg,
      borderRadius: RADIUS.medium,
      overflow: 'hidden',
      ...SHADOWS.medium,
    },
    map: {
      width: '100%',
      height: 300,
    },
    locationInfo: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    locationInfoTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    locationInfoText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    confirmLocationButton: {
      backgroundColor: COLORS.darkPurple,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    // Date Time Modal Styles
    dateTimeModalContent: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      maxHeight: '85%',
      width: '90%',
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      ...SHADOWS.medium,
    },
    dateTimeModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    dateTimeModalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    dateTimeContainer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      maxHeight: 400,
    },
    dateSection: {
      marginBottom: SPACING.lg,
    },
    timeSection: {
      marginBottom: SPACING.lg,
    },
    dateTimeLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    datePickerContainer: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    dateButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      alignItems: 'center',
    },
    activeDateButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    dateButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    activeDateButtonText: {
      color: COLORS.white,
    },
    selectedDateText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.xs,
    },
    timePickerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    timeInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    timeLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    timeInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    timeButton: {
      padding: SPACING.xs,
    },
    timeValue: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 40,
      textAlign: 'center',
      paddingVertical: SPACING.sm,
    },
    periodContainer: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    periodButton: {
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    activePeriodButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    periodButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    activePeriodButtonText: {
      color: COLORS.white,
    },
    selectedTimeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    dateTimeModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      gap: SPACING.md,
    },
    confirmButton: {
      backgroundColor: COLORS.darkPurple,
      flex: 1,
    },
    // Custom Modal Styles (using absolute positioning instead of Modal component)
    customModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
      elevation: 999999, // For Android
    },
    customMapModalContent: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      width: '95%',
      maxHeight: '90%',
      ...SHADOWS.medium,
      elevation: 1000000, // For Android
      zIndex: 1000000,
    },
    customDateTimeModalContent: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      width: '90%',
      maxHeight: '85%',
      ...SHADOWS.medium,
      elevation: 1000000, // For Android
      zIndex: 1000000,
    },
    customModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    customModalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    customMapContainer: {
      width: '100%',
      height: 300,
      margin: SPACING.lg,
      borderRadius: RADIUS.medium,
      overflow: 'hidden',
      ...SHADOWS.medium,
    },
    customMap: {
      width: '100%',
      height: 300,
    },
    customLocationInfo: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    customLocationInfoTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    customLocationInfoText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    customModalButton: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.medium,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    customConfirmButton: {
      backgroundColor: COLORS.darkPurple,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    customCancelButton: {
      backgroundColor: COLORS.lightGray,
      flex: 1,
    },
    customModalButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
    },
    // Date Time Picker Styles
    customDateTimeContainer: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      maxHeight: 400,
    },
    customDateSection: {
      marginBottom: SPACING.lg,
    },
    customTimeSection: {
      marginBottom: SPACING.lg,
    },
    customDateTimeLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    customDatePickerContainer: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    customDateButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      alignItems: 'center',
    },
    customActiveDateButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    customDateButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    customActiveDateButtonText: {
      color: COLORS.white,
    },
    customSelectedDateText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.xs,
    },
    customTimePickerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    customTimeInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    customTimeLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    customTimeInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    customTimeButton: {
      padding: SPACING.xs,
    },
    customTimeValue: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 40,
      textAlign: 'center',
      paddingVertical: SPACING.sm,
    },
    customPeriodContainer: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    customPeriodButton: {
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    customActivePeriodButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    customPeriodButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    customActivePeriodButtonText: {
      color: COLORS.white,
    },
    customSelectedTimeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    customDateTimeModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      gap: SPACING.md,
    },
    // Centered Modal Styles
    modalBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
    },
    centeredMapModal: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      width: '90%',
      maxHeight: '85%',
      ...SHADOWS.medium,
    },
    centeredDateTimeModal: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      width: '85%',
      maxHeight: '80%',
      ...SHADOWS.medium,
    },
    centeredModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    centeredModalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    // Map Styles
    centeredMapContainer: {
      height: 300,
      margin: SPACING.lg,
      borderRadius: RADIUS.medium,
      overflow: 'hidden',
      ...SHADOWS.medium,
    },
    centeredMap: {
      flex: 1,
    },
    centeredBottomSection: {
      backgroundColor: COLORS.white,
      padding: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
    },
    centeredLocationInfo: {
      marginBottom: SPACING.lg,
    },
    centeredLocationInfoTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    centeredLocationInfoText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    // DateTime Styles
    centeredContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      maxHeight: 300,
    },
    centeredSection: {
      marginBottom: SPACING.lg,
    },
    centeredSectionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    centeredDatePickerContainer: {
      flexDirection: 'row',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    centeredDateButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      backgroundColor: COLORS.white,
    },
    centeredActiveDateButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    centeredDateButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
    },
    centeredActiveDateButtonText: {
      color: COLORS.white,
    },
    centeredSelectedText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
    },
    // Custom Date Picker Styles
    centeredCustomDateContainer: {
      marginTop: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    centeredCustomDateLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    centeredDateInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.xs,
    },
    centeredDateInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    centeredDateInputLabel: {
      fontSize: FONTS.sizes.xsmall,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    centeredDateInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
      paddingHorizontal: SPACING.xs,
    },
    centeredDateInputButton: {
      padding: SPACING.xs,
    },
    centeredDateInputValue: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 30,
      textAlign: 'center',
      paddingHorizontal: SPACING.xs,
    },
    centeredTimePickerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      marginBottom: SPACING.sm,
    },
    centeredTimeInputGroup: {
      flex: 1,
      alignItems: 'center',
    },
    centeredTimeLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    centeredTimeInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    centeredTimeButton: {
      padding: SPACING.xs,
    },
    centeredTimeValue: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 40,
      textAlign: 'center',
      paddingVertical: SPACING.sm,
    },
    centeredPeriodContainer: {
      flexDirection: 'row',
      gap: SPACING.xs,
    },
    centeredPeriodButton: {
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
    },
    centeredActivePeriodButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    centeredPeriodButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
    },
    centeredActivePeriodButtonText: {
      color: COLORS.white,
    },
    centeredSelectedTimeText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.darkPurple,
      textAlign: 'center',
      marginTop: SPACING.sm,
      padding: SPACING.sm,
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.small,
    },
    // Bottom Buttons
    centeredBottomButtons: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      gap: SPACING.sm,
      backgroundColor: COLORS.white,
    },
    centeredCancelButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      backgroundColor: COLORS.white,
    },
    centeredCancelButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
    },
    centeredConfirmButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      ...SHADOWS.light,
    },
    centeredButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
    // Edit Modal Styles
    centeredEditModal: {
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.large,
      width: '90%',
      maxHeight: '85%',
      ...SHADOWS.medium,
    },
    centeredEditContent: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      maxHeight: 400,
    },
    editFormGroup: {
      marginBottom: SPACING.md,
    },
    editFormLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    editFormInput: {
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      backgroundColor: COLORS.white,
    },
    editFormTextArea: {
      height: 80,
      textAlignVertical: 'top',
    },
    editFormRadioGroup: {
      flexDirection: 'row',
      gap: SPACING.sm,
    },
    editFormRadioButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      alignItems: 'center',
      backgroundColor: COLORS.white,
    },
    editFormActiveRadioButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
    },
    editFormRadioText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
    },
    editFormActiveRadioText: {
      color: COLORS.white,
    },
    disabledButton: {
      opacity: 0.6,
    },
  }), [COLORS, reportForm.lastSeenLocation, reportForm.timeLost]);

  const PetCard = ({ pet }) => {
    const [imageError, setImageError] = useState(false);
    
    return (
      <View style={styles.petCard}>
        <View style={styles.petHeader}>
          <View style={styles.petImage}>
            {pet.petImage && pet.petImage !== 'placeholder' && !imageError ? (
              <Image 
                source={{ uri: pet.petImage }} 
                style={styles.petPhoto}
                resizeMode="cover"
                onError={() => {
                  console.log('Failed to load pet image for:', pet.petName);
                  setImageError(true);
                }}
              />
            ) : (
              <Text style={styles.petEmoji}>
                {pet.petType === 'dog' ? '🐕' : '🐱'}
              </Text>
            )}
          </View>
          <View style={styles.petInfo}>
            <View style={styles.petNameContainer}>
              <Text style={styles.petName}>{pet.petName}</Text>
              {pet.status === 'lost' && (
                <View style={styles.lostBadge}>
                  <Text style={styles.lostBadgeText}>LOST</Text>
                </View>
              )}
              {pet.registrationStatus === 'pending' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING</Text>
                </View>
              )}
            </View>
            <Text style={styles.petBreed}>{pet.breed}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editPetButton}
            onPress={() => handleEditPet(pet)}
          >
            <MaterialIcons name="edit" size={20} color={COLORS.darkPurple} />
          </TouchableOpacity>
        </View>
      
      <View style={styles.petDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{pet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Gender:</Text>
          <Text style={styles.detailValue}>{pet.petGender === 'male' ? '♂️ Male' : '♀️ Female'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Owner:</Text>
          <Text style={styles.detailValue}>{pet.ownerFullName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Contact:</Text>
          <Text style={styles.detailValue}>{pet.contactNumber}</Text>
        </View>
        {pet.description && (
          <Text style={styles.description}>{pet.description}</Text>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.qrButton]} 
          onPress={() => setSelectedPetQR(pet)}
        >
          <Text style={styles.actionButtonText}>QR Code</Text>
        </TouchableOpacity>
        {pet.status === 'lost' ? (
          <TouchableOpacity 
            style={[styles.actionButton, styles.foundButton]} 
            onPress={() => handleMarkFound(pet)}
          >
            <Text style={styles.actionButtonText}>Mark Found</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.actionButton, styles.lostButton]} 
            onPress={() => handleReportLost(pet)}
          >
            <Text style={styles.actionButtonText}>Report Lost</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]} 
          onPress={() => handleDeletePet(pet.id, pet.petName)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <>
    {!showLocationModal && !showDateTimeModal && (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Pets</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {pets.length} {pets.length === 1 ? 'Pet' : 'Pets'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.mediumBlue} />
              <Text style={styles.loadingText}>Loading your pets...</Text>
            </View>
          ) : pets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🐾</Text>
              <Text style={styles.emptyTitle}>No Pets Registered</Text>
              <Text style={styles.emptyText}>
                You haven't registered any pets yet. Register your first pet to get started with QR codes and safety features.
              </Text>
              <TouchableOpacity 
                style={styles.addPetButton}
                onPress={() => navigation.navigate('RegisterPet')}
              >
                <Text style={styles.addPetButtonText}>🐕 Register Your First Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {pets.map((pet) => (
                <PetCard key={pet.id} pet={pet} />
              ))}
              
              <TouchableOpacity 
                style={styles.addPetButton}
                onPress={() => navigation.navigate('RegisterPet')}
              >
                <Text style={styles.addPetButtonText}>➕ Add Another Pet</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={selectedPetQR !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedPetQR(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedPetQR?.petName}'s QR Code
            </Text>
            
            {selectedPetQR && (
              <View style={styles.qrContainer} ref={qrRef} collapsable={false}>
                <QRCode
                  value={generateQRData(selectedPetQR)}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                  enableLinearGradient={false}
                  logoBackgroundColor="transparent"
                />
              </View>
            )}
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.downloadButton]}
                onPress={() => handleDownloadQR(selectedPetQR)}
              >
                <MaterialIcons name="download" size={20} color={COLORS.white} />
                <Text 
                  style={[styles.modalButtonText, { marginLeft: SPACING.sm }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
                  Download
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setSelectedPetQR(null)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Lost Form Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReportLostModal}
        onRequestClose={() => setShowReportLostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reportModalContent}>
            <View style={styles.reportModalHeader}>
              <Text style={styles.reportModalTitle}>
                Report {selectedPetForReport?.petName} as Lost
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReportLostModal(false)}
              >
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reportFormContainer}>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Last Seen Location *</Text>
                <TouchableOpacity
                  style={styles.mapSelectButton}
                  onPress={handleLocationModalOpen}
                >
                  <MaterialIcons name="place" size={24} color={COLORS.darkPurple} />
                  <Text style={styles.mapSelectButtonText}>
                    {reportForm.lastSeenLocation || 'Tap to pin location on map'}
                  </Text>
                </TouchableOpacity>
                {reportForm.coordinates && (
                  <Text style={styles.coordinatesText}>
                    📍 Coordinates: {reportForm.coordinates.latitude.toFixed(6)}, {reportForm.coordinates.longitude.toFixed(6)}
                  </Text>
                )}
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Date & Time When Pet Was Lost *</Text>
                <TouchableOpacity
                  style={styles.dateTimeSelectButton}
                  onPress={() => setShowDateTimeModal(true)}
                >
                  <MaterialIcons name="schedule" size={24} color={COLORS.darkPurple} />
                  <Text style={styles.dateTimeSelectButtonText}>
                    {reportForm.timeLost || 'Tap to set date & time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Additional Description</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={reportForm.description}
                  onChangeText={(text) => setReportForm(prev => ({ ...prev, description: text }))}
                  placeholder="Any additional details that might help others identify or find your pet..."
                  placeholderTextColor={COLORS.secondaryText}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.reportModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReportLostModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, isSubmittingReport && { opacity: 0.7 }]}
                onPress={handleSubmitLostReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Simple Test Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 10,
            width: 300,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>
              TEST MODAL IS WORKING!
            </Text>
            <Text style={{ marginBottom: 20 }}>
              showLocationModal: {showLocationModal ? 'TRUE' : 'FALSE'}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4741A6',
                padding: 10,
                borderRadius: 5
              }}
              onPress={() => {
                setShowLocationModal(false);
                Alert.alert('Debug', 'Modal closed!');
              }}
            >
              <Text style={{ color: 'white' }}>Close Test Modal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Map Location Modal - Temporarily Hidden */}
      {false && (
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.mapModalContent}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>Pin Last Seen Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {/* Temporary simplified version for debugging */}
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Map Modal is Working!</Text>
              <Text style={styles.debugText}>
                showLocationModal: {showLocationModal ? 'true' : 'false'}
              </Text>
              <TouchableOpacity
                style={styles.debugButton}
                onPress={handleGetCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.debugButtonText}>Get Current Location</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoTitle}>Selected Location:</Text>
              <Text style={styles.locationInfoText}>
                {reportForm.lastSeenLocation || 'No location selected yet'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmLocationButton]}
              onPress={() => setShowLocationModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Simple DateTime Test Modal */}
      <Modal
        visible={showDateTimeModal}
        transparent={true}
        animationType="fade"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 10,
            width: 300,
            alignItems: 'center'
          }}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>
              DATETIME TEST MODAL!
            </Text>
            <Text style={{ marginBottom: 20 }}>
              showDateTimeModal: {showDateTimeModal ? 'TRUE' : 'FALSE'}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#4741A6',
                padding: 10,
                borderRadius: 5
              }}
              onPress={() => {
                setShowDateTimeModal(false);
                Alert.alert('Debug', 'DateTime modal closed!');
              }}
            >
              <Text style={{ color: 'white' }}>Close DateTime Modal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Date Time Picker Modal */}
      {false && (
      <Modal
        visible={showDateTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateTimeModalContent}>
            <View style={styles.dateTimeModalHeader}>
              <Text style={styles.dateTimeModalTitle}>Set Date & Time</Text>
              <TouchableOpacity onPress={() => setShowDateTimeModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            
            {/* Temporary simplified version for debugging */}
            <View style={styles.debugContainer}>
              <Text style={styles.debugText}>Date Time Modal is Working!</Text>
              <Text style={styles.debugText}>
                showDateTimeModal: {showDateTimeModal ? 'true' : 'false'}
              </Text>
              <Text style={styles.debugText}>
                Current temp date: {tempDate.toDateString()}
              </Text>
              <Text style={styles.debugText}>
                Current temp time: {tempTime.hours}:{tempTime.minutes.toString().padStart(2, '0')} {tempTime.period}
              </Text>
            </View>

            <View style={styles.dateTimeModalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDateTimeModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  const formattedDateTime = formatDateTime(tempDate, tempTime);
                  setReportForm(prev => ({ ...prev, timeLost: formattedDateTime, lostDate: tempDate }));
                  setShowDateTimeModal(false);
                }}
              >
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

    </View>
    )}

    {/* Location Map Modal - Centered Modal */}
    {showLocationModal && (
      <View style={styles.modalBackdrop}>
        <View style={styles.centeredMapModal}>
          <View style={styles.centeredModalHeader}>
            <Text style={styles.centeredModalTitle}>Pin Last Seen Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.centeredMapContainer}>
            <MapView
              style={styles.centeredMap}
              region={mapRegion}
              onPress={(e) => handleMapLocationSelect(e.nativeEvent.coordinate)}
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {reportForm.coordinates && (
                <Marker
                  coordinate={reportForm.coordinates}
                  draggable
                  onDragEnd={(e) => handleMapLocationSelect(e.nativeEvent.coordinate)}
                  title="Last Seen Location"
                  description={reportForm.lastSeenLocation}
                  pinColor={COLORS.mediumBlue}
                />
              )}
            </MapView>
          </View>
          
          <View style={styles.centeredBottomSection}>
            <View style={styles.centeredLocationInfo}>
              <Text style={styles.centeredLocationInfoTitle}>Selected Location:</Text>
              <Text style={styles.centeredLocationInfoText}>
                {reportForm.lastSeenLocation || 'Tap on the map to select a location'}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.centeredConfirmButton}
              onPress={() => setShowLocationModal(false)}
              disabled={!reportForm.coordinates}
            >
              <Text style={styles.centeredButtonText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}

    {/* Custom Date Time Picker Modal - Centered Modal */}
    {showDateTimeModal && (
      <View style={styles.modalBackdrop}>
        <View style={styles.centeredDateTimeModal}>
          <View style={styles.centeredModalHeader}>
            <Text style={styles.centeredModalTitle}>Set Date & Time</Text>
            <TouchableOpacity onPress={() => setShowDateTimeModal(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.centeredContent}>
            {/* Date Picker */}
            <View style={styles.centeredSection}>
              <Text style={styles.centeredSectionTitle}>Date</Text>
              
              {/* Quick Date Buttons */}
              <View style={styles.centeredDatePickerContainer}>
                <TouchableOpacity
                  style={styles.centeredDateButton}
                  onPress={() => {
                    const yesterday = new Date(tempDate);
                    yesterday.setDate(yesterday.getDate() - 1);
                    setTempDate(yesterday);
                  }}
                >
                  <Text style={styles.centeredDateButtonText}>Yesterday</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.centeredDateButton, styles.centeredActiveDateButton]}
                  onPress={() => setTempDate(new Date())}
                >
                  <Text style={[styles.centeredDateButtonText, styles.centeredActiveDateButtonText]}>Today</Text>
                </TouchableOpacity>
              </View>
              
              {/* Custom Date Picker */}
              <View style={styles.centeredCustomDateContainer}>
                <Text style={styles.centeredCustomDateLabel}>Or pick specific date:</Text>
                <View style={styles.centeredDateInputContainer}>
                  <View style={styles.centeredDateInputGroup}>
                    <Text style={styles.centeredDateInputLabel}>Month</Text>
                    <View style={styles.centeredDateInputWrapper}>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="remove" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                      <Text style={styles.centeredDateInputValue}>
                        {tempDate.toLocaleString('default', { month: 'short' })}
                      </Text>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="add" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.centeredDateInputGroup}>
                    <Text style={styles.centeredDateInputLabel}>Day</Text>
                    <View style={styles.centeredDateInputWrapper}>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setDate(newDate.getDate() - 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="remove" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                      <Text style={styles.centeredDateInputValue}>
                        {tempDate.getDate()}
                      </Text>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setDate(newDate.getDate() + 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="add" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.centeredDateInputGroup}>
                    <Text style={styles.centeredDateInputLabel}>Year</Text>
                    <View style={styles.centeredDateInputWrapper}>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(newDate.getFullYear() - 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="remove" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                      <Text style={styles.centeredDateInputValue}>
                        {tempDate.getFullYear()}
                      </Text>
                      <TouchableOpacity
                        style={styles.centeredDateInputButton}
                        onPress={() => {
                          const newDate = new Date(tempDate);
                          newDate.setFullYear(newDate.getFullYear() + 1);
                          setTempDate(newDate);
                        }}
                      >
                        <MaterialIcons name="add" size={16} color={COLORS.darkPurple} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
              
              <Text style={styles.centeredSelectedText}>
                Selected: {tempDate.toDateString()}
              </Text>
            </View>

            {/* Time Picker */}
            <View style={styles.centeredSection}>
              <Text style={styles.centeredSectionTitle}>Time</Text>
              <View style={styles.centeredTimePickerContainer}>
                <View style={styles.centeredTimeInputGroup}>
                  <Text style={styles.centeredTimeLabel}>Hour</Text>
                  <View style={styles.centeredTimeInputContainer}>
                    <TouchableOpacity
                      style={styles.centeredTimeButton}
                      onPress={() => setTempTime(prev => ({ 
                        ...prev, 
                        hours: prev.hours > 1 ? prev.hours - 1 : 12 
                      }))}
                    >
                      <MaterialIcons name="remove" size={20} color={COLORS.darkPurple} />
                    </TouchableOpacity>
                    <Text style={styles.centeredTimeValue}>
                      {tempTime.hours.toString().padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.centeredTimeButton}
                      onPress={() => setTempTime(prev => ({ 
                        ...prev, 
                        hours: prev.hours < 12 ? prev.hours + 1 : 1 
                      }))}
                    >
                      <MaterialIcons name="add" size={20} color={COLORS.darkPurple} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.centeredTimeInputGroup}>
                  <Text style={styles.centeredTimeLabel}>Minute</Text>
                  <View style={styles.centeredTimeInputContainer}>
                    <TouchableOpacity
                      style={styles.centeredTimeButton}
                      onPress={() => setTempTime(prev => ({ 
                        ...prev, 
                        minutes: prev.minutes > 0 ? prev.minutes - 1 : 59 
                      }))}
                    >
                      <MaterialIcons name="remove" size={20} color={COLORS.darkPurple} />
                    </TouchableOpacity>
                    <Text style={styles.centeredTimeValue}>
                      {tempTime.minutes.toString().padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      style={styles.centeredTimeButton}
                      onPress={() => setTempTime(prev => ({ 
                        ...prev, 
                        minutes: prev.minutes < 59 ? prev.minutes + 1 : 0 
                      }))}
                    >
                      <MaterialIcons name="add" size={20} color={COLORS.darkPurple} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.centeredTimeInputGroup}>
                  <Text style={styles.centeredTimeLabel}>Period</Text>
                  <View style={styles.centeredPeriodContainer}>
                    <TouchableOpacity
                      style={[
                        styles.centeredPeriodButton,
                        tempTime.period === 'AM' && styles.centeredActivePeriodButton
                      ]}
                      onPress={() => setTempTime(prev => ({ ...prev, period: 'AM' }))}
                    >
                      <Text style={[
                        styles.centeredPeriodButtonText,
                        tempTime.period === 'AM' && styles.centeredActivePeriodButtonText
                      ]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.centeredPeriodButton,
                        tempTime.period === 'PM' && styles.centeredActivePeriodButton
                      ]}
                      onPress={() => setTempTime(prev => ({ ...prev, period: 'PM' }))}
                    >
                      <Text style={[
                        styles.centeredPeriodButtonText,
                        tempTime.period === 'PM' && styles.centeredActivePeriodButtonText
                      ]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={styles.centeredSelectedTimeText}>
                Selected: {formatDateTime(tempDate, tempTime)}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.centeredBottomButtons}>
            <TouchableOpacity
              style={styles.centeredCancelButton}
              onPress={() => setShowDateTimeModal(false)}
            >
              <Text style={styles.centeredCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.centeredConfirmButton}
              onPress={handleDateTimeConfirm}
            >
              <Text style={styles.centeredButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}

    {/* Edit Pet Modal */}
    {showEditModal && selectedPetForEdit && (
      <View style={styles.modalBackdrop}>
        <View style={styles.centeredEditModal}>
          <View style={styles.centeredModalHeader}>
            <Text style={styles.centeredModalTitle}>Edit {selectedPetForEdit.petName}</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.centeredEditContent}>
            {/* Pet Name */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Pet Name</Text>
              <TextInput
                style={styles.editFormInput}
                value={editForm.petName}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, petName: text }))}
                placeholder="Enter pet name"
                placeholderTextColor={COLORS.secondaryText}
              />
            </View>

            {/* Pet Type */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Pet Type</Text>
              <View style={styles.editFormRadioGroup}>
                <TouchableOpacity
                  style={[
                    styles.editFormRadioButton,
                    editForm.petType === 'dog' && styles.editFormActiveRadioButton
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, petType: 'dog' }))}
                >
                  <Text style={[
                    styles.editFormRadioText,
                    editForm.petType === 'dog' && styles.editFormActiveRadioText
                  ]}>🐕 Dog</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editFormRadioButton,
                    editForm.petType === 'cat' && styles.editFormActiveRadioButton
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, petType: 'cat' }))}
                >
                  <Text style={[
                    styles.editFormRadioText,
                    editForm.petType === 'cat' && styles.editFormActiveRadioText
                  ]}>🐱 Cat</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pet Gender */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Gender</Text>
              <View style={styles.editFormRadioGroup}>
                <TouchableOpacity
                  style={[
                    styles.editFormRadioButton,
                    editForm.petGender === 'male' && styles.editFormActiveRadioButton
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, petGender: 'male' }))}
                >
                  <Text style={[
                    styles.editFormRadioText,
                    editForm.petGender === 'male' && styles.editFormActiveRadioText
                  ]}>♂️ Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.editFormRadioButton,
                    editForm.petGender === 'female' && styles.editFormActiveRadioButton
                  ]}
                  onPress={() => setEditForm(prev => ({ ...prev, petGender: 'female' }))}
                >
                  <Text style={[
                    styles.editFormRadioText,
                    editForm.petGender === 'female' && styles.editFormActiveRadioText
                  ]}>♀️ Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Breed */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Breed</Text>
              <TextInput
                style={styles.editFormInput}
                value={editForm.breed}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, breed: text }))}
                placeholder="Enter breed"
                placeholderTextColor={COLORS.secondaryText}
              />
            </View>

            {/* Description */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Description</Text>
              <TextInput
                style={[styles.editFormInput, styles.editFormTextArea]}
                value={editForm.description}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                placeholder="Enter description (optional)"
                placeholderTextColor={COLORS.secondaryText}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Owner Name */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Owner Name</Text>
              <TextInput
                style={styles.editFormInput}
                value={editForm.ownerFullName}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, ownerFullName: text }))}
                placeholder="Enter owner name"
                placeholderTextColor={COLORS.secondaryText}
              />
            </View>

            {/* Contact Number */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Contact Number</Text>
              <TextInput
                style={styles.editFormInput}
                value={editForm.contactNumber}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, contactNumber: text }))}
                placeholder="Enter contact number"
                placeholderTextColor={COLORS.secondaryText}
                keyboardType="phone-pad"
              />
            </View>
          </ScrollView>

          <View style={styles.centeredBottomButtons}>
            <TouchableOpacity
              style={styles.centeredCancelButton}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.centeredCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.centeredConfirmButton, isSubmittingEdit && styles.disabledButton]}
              onPress={handleSubmitEdit}
              disabled={isSubmittingEdit}
            >
              {isSubmittingEdit ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.centeredButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )}
    </>
  );
};

export default MyPetsScreen; 