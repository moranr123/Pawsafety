import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { auth, db, storage } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, addDoc, updateDoc, serverTimestamp, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getResponsiveDimensions } from '../utils/responsive';

const { width } = Dimensions.get('window');


// Memoized PetCard component to prevent unnecessary re-renders
const PetCard = memo(({ pet, onUpdateStatus, onEditPet, onReportLost, onMarkFound, onShowQR, styles }) => {
  const [imageError, setImageError] = useState(false);
  
  return (
    <View style={styles.petCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.profilePlaceholder}>
            <Text style={{ fontSize: 20 }}>{pet.petType === 'dog' ? '🐕' : '🐱'}</Text>
          </View>
          <View style={styles.userDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.userName}>{pet.petName}</Text>
              {pet.registrationStatus === 'pending' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.postTime}>
              {pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1)} • {pet.breed || 'Mixed Breed'}
            </Text>
          </View>
        </View>
      </View>

      {/* Pet Image */}
      {pet.petImage && !imageError ? (
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: pet.petImage }} 
            style={styles.singleImage} 
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        </View>
      ) : null}

      {/* Content */}
      <View style={styles.content}>
        {pet.description && (
          <Text style={styles.postText}>{pet.description}</Text>
        )}
        <Text style={styles.ownerInfo}>
          Owner: {pet.ownerFullName || 'Unknown'}
        </Text>
        
        {/* Status Button */}
        {pet.registrationStatus === 'registered' && (
          <TouchableOpacity 
            style={styles.statusButton} 
            onPress={() => onUpdateStatus(pet.id, pet.petName)}
          >
            <Text style={styles.statusButtonText}>🕊️ Mark Deceased</Text>
          </TouchableOpacity>
        )}
        {pet.registrationStatus === 'pending' && (
          <View style={styles.pendingStatusContainer}>
            <Text style={styles.pendingStatusText}>
              ⏳ Your pet registration is pending approval. You'll receive a notification once it's reviewed.
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {(pet.registrationStatus === 'registered' || pet.transferredFrom === 'impound') ? (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onShowQR(pet)}
          >
            <MaterialIcons name="qr-code" size={20} color="#65676b" />
            <Text style={styles.actionText}>QR Code</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionButton} 
            disabled={true}
          >
            <MaterialIcons name="qr-code" size={20} color="#bcc0c4" />
            <Text style={[styles.actionText, { color: '#bcc0c4' }]}>QR Pending</Text>
          </TouchableOpacity>
        )}
        {pet.status === 'lost' ? (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onMarkFound(pet)}
          >
            <MaterialIcons name="check-circle" size={20} color="#65676b" />
            <Text style={styles.actionText}>Mark Found</Text>
          </TouchableOpacity>
        ) : (pet.registrationStatus === 'registered' || pet.transferredFrom === 'impound') ? (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => onReportLost(pet)}
          >
            <MaterialIcons name="report-problem" size={20} color="#65676b" />
            <Text style={styles.actionText}>Report Lost</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionButton} 
            disabled={true}
          >
            <MaterialIcons name="report-problem" size={20} color="#bcc0c4" />
            <Text style={[styles.actionText, { color: '#bcc0c4' }]}>Report Lost</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => onEditPet(pet)}
        >
          <MaterialIcons name="edit" size={20} color="#65676b" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const MyPetsScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  
  // Post card style for pet cards
  const modernPetCardStyles = StyleSheet.create({
    petCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: 0,
      marginTop: SPACING.md,
      borderRadius: 10,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      marginBottom: SPACING.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      justifyContent: 'space-between',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 2,
    },
    postTime: {
      fontSize: 12,
      color: '#65676b',
    },
    imageContainer: {
      marginBottom: 12,
    },
    singleImage: {
      width: '85%',
      height: 300,
      maxHeight: 400,
      borderRadius: 8,
      alignSelf: 'center',
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    postText: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginBottom: 12,
      fontFamily: FONTS.family,
    },
    ownerInfo: {
      fontSize: 13,
      color: '#65676b',
      marginBottom: 8,
    },
    statusButton: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#EF4444',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
    statusButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#EF4444',
      textAlign: 'center',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#65676b',
      marginLeft: 6,
    },
    pendingBadge: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    pendingBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#D97706',
    },
    pendingStatusContainer: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#F59E0B',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    pendingStatusText: {
      fontSize: 13,
      color: '#D97706',
      textAlign: 'center',
      lineHeight: 18,
    },
  });
  const [pets, setPets] = useState([]);
  const [loadingMorePets, setLoadingMorePets] = useState(false);
  const [hasMorePets, setHasMorePets] = useState(true);
  const lastPetDoc = useRef(null);
  const PETS_PER_PAGE = 20;
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



  // Load pets with pagination
  const loadPets = async (isInitial = false) => {
    if (!user || loadingMorePets) return;

    try {
      if (isInitial) {
        setLoading(true);
        lastPetDoc.current = null;
        setHasMorePets(true);
      } else {
        setLoadingMorePets(true);
      }

      let petsQuery;
      if (isInitial || !lastPetDoc.current) {
        petsQuery = query(
          collection(db, 'pets'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(PETS_PER_PAGE)
        );
      } else {
        petsQuery = query(
          collection(db, 'pets'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastPetDoc.current),
          limit(PETS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(petsQuery);
      
      if (snapshot.empty) {
        setHasMorePets(false);
        if (isInitial) {
          setPets([]);
        }
        setLoading(false);
        setLoadingMorePets(false);
        return;
      }

      const petList = snapshot.docs
        .map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }))
        // Filter out archived pets (treat undefined/null as not archived)
        .filter(pet => pet.archived !== true);

      if (isInitial) {
        setPets(petList);
      } else {
        setPets(prev => [...prev, ...petList]);
      }

      lastPetDoc.current = snapshot.docs[snapshot.docs.length - 1];
      setHasMorePets(snapshot.docs.length === PETS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching pets:', error);
      // If orderBy fails, fallback to simple query without orderBy
      if (error.code === 'failed-precondition') {
        try {
          let fallbackQuery;
          if (isInitial || !lastPetDoc.current) {
            fallbackQuery = query(
              collection(db, 'pets'),
              where('userId', '==', user.uid),
              limit(PETS_PER_PAGE)
            );
          } else {
            // Can't paginate without orderBy, so just load initial
            fallbackQuery = query(
              collection(db, 'pets'),
              where('userId', '==', user.uid),
              limit(PETS_PER_PAGE)
            );
            lastPetDoc.current = null;
          }
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const petList = fallbackSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(pet => pet.archived !== true);
          
          if (isInitial) {
            setPets(petList);
          } else {
            setPets(prev => [...prev, ...petList]);
          }
          
          if (fallbackSnapshot.docs.length < PETS_PER_PAGE) {
            setHasMorePets(false);
          }
        } catch (fallbackError) {
          console.error('Error with fallback query:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
      setLoadingMorePets(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (!user) return;
    loadPets(true);
  }, [user]);

  // Load more pets when scrolling near bottom
  const handleLoadMorePets = () => {
    if (!loadingMorePets && hasMorePets && user) {
      loadPets(false);
    }
  };


  const handleArchivePet = (petId, petName) => {
    Alert.alert(
      'Archive Pet',
      `Are you sure you want to archive ${petName}? The pet will be moved to your archived pets but can be restored later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'default',
          onPress: async () => {
            try {
              // Archive the pet by setting archived flag
              await updateDoc(doc(db, 'pets', petId), {
                archived: true,
                archivedAt: serverTimestamp()
              });
              
              Alert.alert('Success', `${petName} has been archived. You can restore it from the Archived Pets screen.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to archive pet. Please try again.');
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
      // Error handled - Alert already shown
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
      // Error handled - Alert already shown
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
      // Error handled silently
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
      // Error handled - Alert already shown
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
               // Error handled - Alert already shown
               Alert.alert('Error', 'Failed to update pet status. Please try again.');
             }
           }
         }
       ]
     );
   };

   const handleEditPet = useCallback((pet) => {
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
   }, []);

   const handleImagePicker = async (source) => {
     try {
       let result;
       
       if (source === 'camera') {
         const { status } = await ImagePicker.requestCameraPermissionsAsync();
         if (status !== 'granted') {
           Alert.alert('Permission Required', 'Camera permission is required to take photos.');
           return;
         }
         result = await ImagePicker.launchCameraAsync({
           mediaTypes: ImagePicker.MediaTypeOptions.Images,
           allowsEditing: true,
           aspect: [1, 1],
           quality: 0.8,
         });
       } else {
         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
         if (status !== 'granted') {
           Alert.alert('Permission Required', 'Photo library permission is required to select images.');
           return;
         }
         result = await ImagePicker.launchImageLibraryAsync({
           mediaTypes: ImagePicker.MediaTypeOptions.Images,
           allowsEditing: true,
           aspect: [1, 1],
           quality: 0.8,
         });
       }

       if (!result.canceled && result.assets[0]) {
         setEditForm(prev => ({ ...prev, petImage: result.assets[0].uri }));
       }
     } catch (error) {
       // Error handled - Alert already shown
       Alert.alert('Error', 'Failed to select image. Please try again.');
     }
   };

   const selectImage = () => {
     Alert.alert(
       'Select Pet Photo',
       'Choose how you want to update your pet\'s photo',
       [
         { text: 'Camera', onPress: () => handleImagePicker('camera') },
         { text: 'Photo Library', onPress: () => handleImagePicker('library') },
         { text: 'Cancel', style: 'cancel' }
       ]
     );
   };

  const handleUpdatePetStatus = useCallback(async (petId, petName) => {
    // Show confirmation dialog for marking pet as deceased
    Alert.alert(
      'Mark Pet as Deceased',
      `Are you sure you want to mark "${petName}" as deceased? This will archive the pet and notify the Agricultural Dashboard administrator.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, Mark as Deceased',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the pet to get its details for the notification
              const pet = pets.find(p => p.id === petId);
              
              if (!pet) {
                Alert.alert('Error', 'Pet not found. Please try again.');
                return;
              }
              
              // Create admin notification BEFORE archiving the pet
              const notificationData = {
                type: 'pet_deceased',
                title: 'Pet Marked as Deceased',
                message: `Pet "${pet.petName || 'Unknown Pet'}" (${pet.petType || 'Unknown Type'}) has been marked as deceased by ${pet.ownerFullName || 'Unknown Owner'}. The pet record has been archived.`,
                petId: petId,
                petName: pet.petName,
                ownerName: pet.ownerFullName,
                petType: pet.petType,
                petStatus: 'deceased',
                read: false,
                createdAt: serverTimestamp()
              };
              
              try {
                await addDoc(collection(db, 'admin_notifications'), notificationData);
              } catch (notificationError) {
                // Error handled silently - pet will still be archived
              }
              
              // Archive the pet instead of deleting it
              await updateDoc(doc(db, 'pets', petId), {
                archived: true,
                archivedAt: serverTimestamp(),
                status: 'deceased'
              });
              // Pet archived successfully
              
              Alert.alert(
                'Pet Marked as Deceased', 
                `${petName} has been marked as deceased and archived. You can view it in the Archived Pets screen. The Agricultural Dashboard has been notified.`
              );
            } catch (error) {
              // Error handled - Alert already shown
              Alert.alert('Error', 'Failed to mark pet as deceased. Please try again.');
            }
          }
        }
      ]
    );
  }, [pets]);

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
       let imageUrl = editForm.petImage;
       
       // If a new image was selected, upload it to Firebase Storage
       if (editForm.petImage && editForm.petImage.startsWith('file://')) {
         const response = await fetch(editForm.petImage);
         const blob = await response.blob();
         const imageRef = ref(storage, `pet-images/${selectedPetForEdit.id}_${Date.now()}.jpg`);
         await uploadBytes(imageRef, blob);
         imageUrl = await getDownloadURL(imageRef);
       }

       await updateDoc(doc(db, 'pets', selectedPetForEdit.id), {
         petName: editForm.petName.trim(),
         petType: editForm.petType,
         petGender: editForm.petGender,
         breed: editForm.breed.trim(),
         description: editForm.description.trim(),
         ownerFullName: editForm.ownerFullName.trim(),
         contactNumber: editForm.contactNumber.trim(),
         petImage: imageUrl,
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
       // Error handled - Alert already shown
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
       // Error handled - Alert already shown
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

  const { isSmallDevice, isTablet } = getResponsiveDimensions();

  const handleBackPress = () => {
    navigation.goBack();
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
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
      justifyContent: 'space-between',
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    archiveButtonHeader: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
      marginRight: SPACING.xs,
    },
    helpButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
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
      color: '#65676b',
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.lg,
    },
    content: {
      paddingBottom: SPACING.xl,
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    petCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
      width: isTablet ? '48%' : '100%',
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
    pendingQRButton: {
      backgroundColor: COLORS.secondaryText,
      opacity: 0.6,
    },
    lostButton: {
      backgroundColor: '#FF8C00', // Orange color for warning/lost
    },
    foundButton: {
      backgroundColor: '#4CAF50', // Green color for found/success
    },
    actionButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
    },
    statusButtonsContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.sm,
      gap: SPACING.sm,
    },
    statusButton: {
      flex: 1,
      borderRadius: RADIUS.medium,
      padding: SPACING.sm,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOWS.light,
    },
    pregnantButton: {
      backgroundColor: '#FEF3C7',
      borderWidth: 1,
      borderColor: '#F59E0B',
    },
    deceasedButton: {
      backgroundColor: '#FEE2E2',
      borderWidth: 1,
      borderColor: '#EF4444',
    },
    undoButton: {
      backgroundColor: '#DCFCE7',
      borderWidth: 1,
      borderColor: '#16A34A',
    },
    statusButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      textAlign: 'center',
    },
    pendingQRButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
      opacity: 0.8,
    },
    addPetButton: {
      backgroundColor: '#1877f2',
      borderRadius: 10,
      padding: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    addPetButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 8,
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
      maxWidth: 400,
      width: '90%',
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
      gap: SPACING.md,
      justifyContent: 'space-between',
      width: '100%',
      alignItems: 'center',
    },
    modalButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.medium,
      minWidth: 0,
      ...SHADOWS.light,
    },
    downloadButton: {
      backgroundColor: COLORS.mediumBlue,
    },
    closeButton: {
      backgroundColor: '#EF4444',
    },
    modalButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
      flexShrink: 0,
    },
    // Report Lost Modal Styles - Facebook Style
    reportModalContent: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      maxHeight: '90%',
      width: '90%',
      maxWidth: 500,
      alignSelf: 'center',
      marginTop: 'auto',
      marginBottom: 'auto',
      overflow: 'hidden',
    },
    reportModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      backgroundColor: '#ffffff',
    },
    reportModalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    modalCloseButton: {
      padding: SPACING.xs,
    },
    reportFormContainer: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      maxHeight: 500,
      backgroundColor: '#ffffff',
    },
    formField: {
      marginBottom: 16,
    },
    formLabel: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 8,
    },
    formInput: {
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: FONTS.family,
      color: '#050505',
      backgroundColor: '#ffffff',
      minHeight: 44,
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
      minHeight: 80,
      textAlignVertical: 'top',
      paddingTop: 10,
    },
    reportModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      gap: 8,
      backgroundColor: '#f2f3f5',
    },
    cancelButton: {
      backgroundColor: '#e4e6eb',
      flex: 1,
      borderRadius: 6,
      paddingVertical: 8,
      minHeight: 36,
    },
    submitButton: {
      backgroundColor: '#1877f2',
      flex: 1,
      borderRadius: 6,
      paddingVertical: 8,
      minHeight: 36,
    },
    // Map and DateTime Selection Buttons
    mapSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderRadius: 6,
      padding: 12,
      backgroundColor: '#ffffff',
      gap: 8,
    },
    locationButtonContent: {
      flex: 1,
    },
    mapSelectButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '500',
      color: '#050505',
      marginBottom: 4,
    },
    locationButtonSubtext: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: '#65676b',
      lineHeight: 18,
    },
    dateTimeSelectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderRadius: 6,
      padding: 12,
      backgroundColor: '#ffffff',
      gap: 8,
    },
    dateTimeSelectButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: reportForm.timeLost ? '#050505' : '#65676b',
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
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
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
      borderRadius: RADIUS.xlarge,
      width: '90%',
      maxHeight: '85%',
      ...SHADOWS.heavy,
      elevation: 10,
    },
    centeredModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      backgroundColor: '#ffffff',
    },
    centeredModalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
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
      flexGrow: 1,
      flexShrink: 1,
    },
    centeredSection: {
      marginBottom: SPACING.xl,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    centeredSectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.darkPurple,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    centeredDatePickerContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    centeredDateButton: {
      flex: 1,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderWidth: 2,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.medium,
      alignItems: 'center',
      backgroundColor: COLORS.white,
      ...SHADOWS.light,
    },
    centeredActiveDateButton: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple,
      ...SHADOWS.medium,
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
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.darkPurple,
      textAlign: 'center',
      marginTop: SPACING.sm,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.small,
    },
    // Custom Date Picker Styles
    centeredCustomDateContainer: {
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
      paddingVertical: SPACING.md,
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      paddingHorizontal: SPACING.sm,
    },
    centeredCustomDateLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    centeredDateInputContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.sm,
      alignItems: 'center',
    },
    centeredDateInputGroup: {
      flex: 1,
      alignItems: 'center',
      marginHorizontal: SPACING.xs,
    },
    centeredYearInputContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING.sm,
    },
    centeredYearInputGroup: {
      alignItems: 'center',
      width: 150,
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
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.white,
      paddingHorizontal: SPACING.xs,
      paddingVertical: SPACING.xs,
      minHeight: 44,
      minWidth: 120,
      gap: SPACING.xs,
    },
    centeredDateInputButton: {
      padding: SPACING.sm,
      borderRadius: RADIUS.small,
      backgroundColor: COLORS.lightBackground,
      alignItems: 'center',
      justifyContent: 'center',
      width: 32,
      height: 32,
    },
    centeredDateInputValue: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 50,
      textAlign: 'center',
      paddingHorizontal: SPACING.xs,
    },
    centeredTimePickerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.md,
      marginBottom: SPACING.md,
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
    centeredTimeInput: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      minWidth: 40,
      textAlign: 'center',
      paddingVertical: SPACING.sm,
      flex: 1,
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
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.small,
    },
    // Bottom Buttons
    centeredBottomButtons: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      gap: 8,
      backgroundColor: '#f2f3f5',
    },
    centeredCancelButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#e4e6eb',
      marginRight: 8,
      minHeight: 36,
    },
    centeredCancelButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: '#050505',
      textAlign: 'center',
    },
    centeredConfirmButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: '#1877f2',
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
    },
    centeredButtonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: '#ffffff',
      textAlign: 'center',
    },
    centeredDisabledButton: {
      backgroundColor: COLORS.secondaryText,
      opacity: 0.7,
    },
    centeredDisabledButtonText: {
      color: COLORS.white,
      opacity: 0.8,
    },
    // Edit Modal Styles - Facebook Style
    centeredEditModal: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      width: '90%',
      maxWidth: 500,
      maxHeight: '85%',
      overflow: 'hidden',
    },
    centeredEditContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      maxHeight: 500,
      backgroundColor: '#ffffff',
    },
    editFormGroup: {
      marginBottom: 16,
    },
    editFormLabel: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 8,
    },
    editFormInput: {
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      fontFamily: FONTS.family,
      color: '#050505',
      backgroundColor: '#ffffff',
    },
    editFormTextArea: {
      height: 80,
      textAlignVertical: 'top',
      paddingTop: 10,
    },
    imagePickerButton: {
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderStyle: 'solid',
      borderRadius: 6,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f2f3f5',
    },
    editFormImage: {
      width: 120,
      height: 120,
      borderRadius: RADIUS.medium,
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    imagePlaceholderText: {
      fontSize: FONTS.sizes.small,
      color: COLORS.secondaryText,
      marginTop: SPACING.sm,
      textAlign: 'center',
    },
    editFormRadioGroup: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    editFormRadioButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: '#ccd0d5',
      borderRadius: 6,
      alignItems: 'center',
      backgroundColor: '#ffffff',
    },
    editFormActiveRadioButton: {
      backgroundColor: '#1877f2',
      borderColor: '#1877f2',
    },
    editFormRadioText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '500',
      color: '#050505',
    },
    editFormActiveRadioText: {
      color: '#ffffff',
    },
    disabledButton: {
      opacity: 0.6,
    },
    disabledButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.secondaryText,
      textAlign: 'center',
      opacity: 0.7,
    },
  }), [COLORS, reportForm.lastSeenLocation, reportForm.timeLost]);


  return (
    <>
    {!showLocationModal && !showDateTimeModal && (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Pets</Text>
          <View style={styles.headerActions}>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {pets.length} {pets.length === 1 ? 'Pet' : 'Pets'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.archiveButtonHeader}
              onPress={() => navigation.navigate('ArchivedPets')}
            >
              <MaterialIcons name="archive" size={20} color="#050505" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const paddingToBottom = 400;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleLoadMorePets();
          }
        }}
        scrollEventThrottle={400}
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
                <MaterialIcons name="add-circle-outline" size={24} color="#FFFFFF" />
                <Text style={styles.addPetButtonText}>Register Your First Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={isTablet ? styles.gridContainer : null}>
                {pets.map((pet) => (
                  <PetCard 
                    key={pet.id} 
                    pet={pet}
                    onUpdateStatus={handleUpdatePetStatus}
                    onEditPet={handleEditPet}
                    onReportLost={(pet) => {setSelectedPetForReport(pet); setShowReportLostModal(true);}}
                    onMarkFound={(pet) => handleMarkFound(pet)}
                    onShowQR={(pet) => setSelectedPetQR(pet)}
                    styles={modernPetCardStyles}
                  />
                ))}
              </View>

              {/* Loading more indicator */}
              {loadingMorePets && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.mediumBlue} />
                  <Text style={{ marginTop: 8, fontSize: 14, color: COLORS.secondaryText }}>Loading more pets...</Text>
                </View>
              )}

              {/* End of list indicator */}
              {!hasMorePets && pets.length > 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>No more pets to load</Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={styles.addPetButton}
                onPress={() => navigation.navigate('RegisterPet')}
              >
                <MaterialIcons name="add-circle-outline" size={24} color={COLORS.white} />
                <Text style={styles.addPetButtonText}>Add Another Pet</Text>
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
                activeOpacity={0.8}
              >
                <MaterialIcons name="download" size={18} color="#FFFFFF" />
                <Text style={[styles.modalButtonText, { marginLeft: 4 }]}>
                  Download
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.closeButton,
                  { backgroundColor: '#EF4444' }
                ]}
                onPress={() => setSelectedPetQR(null)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
                <Text style={[styles.modalButtonText, { marginLeft: 4, color: '#FFFFFF' }]}>
                  Close
                </Text>
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
                  <View style={styles.locationButtonContent}>
                    <Text style={styles.mapSelectButtonText}>
                      {reportForm.lastSeenLocation || 'Select Location'}
                    </Text>
                    <Text style={styles.locationButtonSubtext}>
                      {reportForm.lastSeenLocation ? 'Tap to change location' : 'Tap to pin the exact location where your pet was last seen'}
                    </Text>
                  </View>
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
              provider={PROVIDER_GOOGLE}
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
              style={[
                styles.centeredConfirmButton,
                !reportForm.coordinates && styles.centeredDisabledButton
              ]}
              onPress={() => setShowLocationModal(false)}
              disabled={!reportForm.coordinates}
            >
              <Text style={[
                styles.centeredButtonText,
                !reportForm.coordinates && styles.centeredDisabledButtonText
              ]}>
                {reportForm.coordinates ? 'Confirm Location' : 'Select Location on Map'}
              </Text>
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
                    const yesterday = new Date();
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
                
                {/* First Row: Month and Day */}
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
                </View>
                
                {/* Second Row: Year */}
                <View style={styles.centeredYearInputContainer}>
                  <View style={styles.centeredYearInputGroup}>
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
                    <TextInput
                      style={styles.centeredTimeInput}
                      value={tempTime.hours.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 1 && num <= 12) {
                          setTempTime(prev => ({ ...prev, hours: num }));
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
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
                    <TextInput
                      style={styles.centeredTimeInput}
                      value={tempTime.minutes.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text);
                        if (!isNaN(num) && num >= 0 && num <= 59) {
                          setTempTime(prev => ({ ...prev, minutes: num }));
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                      textAlign="center"
                    />
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
              activeOpacity={0.8}
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
            <Text style={styles.centeredModalTitle}>Edit Pet</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <MaterialIcons name="close" size={24} color="#050505" />
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

            {/* Pet Image */}
            <View style={styles.editFormGroup}>
              <Text style={styles.editFormLabel}>Pet Image</Text>
              <TouchableOpacity style={styles.imagePickerButton} onPress={selectImage}>
                {editForm.petImage ? (
                  <Image source={{ uri: editForm.petImage }} style={styles.editFormImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <MaterialIcons name="add-a-photo" size={40} color={COLORS.secondaryText} />
                    <Text style={styles.imagePlaceholderText}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
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
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.centeredButtonText}>Save</Text>
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