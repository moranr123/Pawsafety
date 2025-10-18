import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { auth, db, storage } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

// Breed data
const CAT_BREEDS = [
  'Puspin (Mixed Breed)', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll', 
  'Bengal', 'Abyssinian', 'Russian Blue', 'Birman', 'Sphynx', 'Scottish Fold', 
  'Norwegian Forest Cat', 'Burmese', 'Oriental Shorthair', 'Manx', 'Devon Rex', 'Cornish Rex', 
  'Somali', 'Turkish Angora', 'Chartreux', 'Tonkinese', 'Balinese', 'Egyptian Mau', 'Ocicat', 
  'Bombay', 'Havana Brown', 'Singapura', 'Korat', 'Snowshoe', 'American Curl', 'Selkirk Rex', 
  'Mixed/Unknown'
];

const DOG_BREEDS = [
  'Aspin (Mixed Breed)', 'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'Bulldog', 
  'Poodle', 'Beagle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund', 'Siberian Husky', 
  'Great Dane', 'Chihuahua', 'Boxer', 'Shih Tzu', 'Boston Terrier', 'Pomeranian', 
  'Australian Shepherd', 'Maltese', 'Cavalier King Charles Spaniel', 'French Bulldog', 
  'Cocker Spaniel', 'Border Collie', 'Mastiff', 'Basset Hound', 'Dalmatian', 'Bichon Frise', 
  'Akita', 'Collie', 'Chow Chow', 'Doberman Pinscher', 'Bernese Mountain Dog', 'Weimaraner', 
  'Vizsla', 'Mixed/Unknown'
];

const RegisterPetScreen = ({ navigation }) => {
  console.log('🏁 RegisterPetScreen component loaded');
  console.log('🧪 Testing console logging - this should appear in mobile console');
  const { colors: COLORS } = useTheme();
  const [petData, setPetData] = useState({
    petImage: null,
    petBooklet: null,
    petName: '',
    petType: '',
    petGender: '',
    breed: '',
    description: '',
    ownerFullName: '',
    contactNumber: ''
  });

  const [errors, setErrors] = useState({});
  const [breedModalVisible, setBreedModalVisible] = useState(false);
  const [breedSearchText, setBreedSearchText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registeredPet, setRegisteredPet] = useState(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  // Set default owner name from logged-in user and request permissions
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.displayName && !petData.ownerFullName) {
      setPetData(prev => ({
        ...prev,
        ownerFullName: user.displayName
      }));
    }
    
    // Request camera and media library permissions
    (async () => {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
        Alert.alert(
          'Permissions Required', 
          'Camera and photo library access are needed to add pet photos.'
        );
      }
    })();
  }, []);

  const handleInputChange = (field, value) => {
    setPetData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const getAvailableBreeds = () => {
    if (petData.petType === 'cat') return CAT_BREEDS;
    if (petData.petType === 'dog') return DOG_BREEDS;
    return [];
  };

  const getFilteredBreeds = () => {
    const breeds = getAvailableBreeds();
    if (!breedSearchText) return breeds;
    return breeds.filter(breed => 
      breed.toLowerCase().includes(breedSearchText.toLowerCase())
    );
  };

  const openBreedModal = () => {
    if (petData.petType) {
      setBreedSearchText('');
      setBreedModalVisible(true);
    } else {
      Alert.alert('Select Pet Type', 'Please select a pet type first to choose a breed.');
    }
  };

  const selectBreed = (breed) => {
    handleInputChange('breed', breed);
    setBreedModalVisible(false);
  };

  const generateQRData = (pet) => {
    return JSON.stringify({
      petId: pet.id,
      petName: pet.petName,
      ownerName: pet.ownerFullName,
      contactNumber: pet.contactNumber,
      breed: pet.breed,
      petType: pet.petType,
      petGender: pet.petGender,
      description: pet.description,
      registeredDate: pet.registeredDate
    });
  };

  const selectImage = () => {
    Alert.alert(
      'Select Pet Photo',
      'Choose how you want to add your pet\'s photo',
      [
        { text: 'Camera', onPress: () => handleImagePicker('camera') },
        { text: 'Photo Library', onPress: () => handleImagePicker('library') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const selectBooklet = () => {
    Alert.alert(
      'Select Pet Booklet',
      'Choose how you want to add your pet\'s booklet photo',
      [
        { text: 'Camera', onPress: () => handleBookletPicker('camera') },
        { text: 'Photo Library', onPress: () => handleBookletPicker('library') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleImagePicker = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setPetData(prev => ({
          ...prev,
          petImage: imageUri
        }));
        // Clear error when image is selected
        if (errors.petImage) {
          setErrors(prev => ({
            ...prev,
            petImage: null
          }));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleBookletPicker = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setPetData(prev => ({
          ...prev,
          petBooklet: imageUri
        }));
        // Clear error when booklet is selected
        if (errors.petBooklet) {
          setErrors(prev => ({
            ...prev,
            petBooklet: null
          }));
        }
      }
    } catch (error) {
      console.error('Error picking booklet image:', error);
      Alert.alert('Error', 'Failed to select booklet image. Please try again.');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!petData.petName.trim()) {
      newErrors.petName = 'Pet name is required';
    }

    if (!petData.petType) {
      newErrors.petType = 'Please select pet type';
    }

    if (!petData.petGender) {
      newErrors.petGender = 'Please select pet gender';
    }

    if (!petData.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }

    if (!petData.ownerFullName.trim()) {
      newErrors.ownerFullName = 'Owner name is required';
    }

    if (!petData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (!/^\d{10,15}$/.test(petData.contactNumber.replace(/\s/g, ''))) {
      newErrors.contactNumber = 'Please enter a valid contact number';
    }

    // Make pet image required
    if (!petData.petImage) {
      newErrors.petImage = 'Pet photo is required';
    }

    // Make pet booklet required
    if (!petData.petBooklet) {
      newErrors.petBooklet = 'Pet booklet photo is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadImageToFirebase = async (imageUri, fileName) => {
    try {
      console.log('Starting image upload:', imageUri);
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob created, size:', blob.size);
      
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${fileName}`;
      const storageRef = ref(storage, `pet_images/${uniqueFileName}`);
      
      console.log('Uploading to Firebase Storage...');
      await uploadBytes(storageRef, blob);
      
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Upload successful, URL:', downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error.message}`);
      throw error;
    }
  };

  const handleSubmit = async () => {
    console.log('🚀 REGISTRATION STARTED - handleSubmit called');
    if (validateForm()) {
      console.log('✅ Form validation passed');
      setIsSubmitting(true);
      try {
        const user = auth.currentUser;
        console.log('👤 Current user:', user?.uid);
        
        // Upload images to Firebase Storage if they exist
        let petImageUrl = '';
        let petBookletUrl = '';
        
        console.log('Pet data before upload:', { 
          petImage: petData.petImage, 
          petBooklet: petData.petBooklet 
        });
        
        if (petData.petImage && !petData.petImage.startsWith('http')) {
          console.log('Uploading pet image...');
          petImageUrl = await uploadImageToFirebase(petData.petImage, 'pet_photo.jpg');
          console.log('Pet image uploaded:', petImageUrl);
        } else {
          petImageUrl = petData.petImage; // Keep existing URL
        }
        
        if (petData.petBooklet && !petData.petBooklet.startsWith('http')) {
          console.log('Uploading pet booklet...');
          petBookletUrl = await uploadImageToFirebase(petData.petBooklet, 'pet_booklet.jpg');
          console.log('Pet booklet uploaded:', petBookletUrl);
        } else {
          petBookletUrl = petData.petBooklet; // Keep existing URL
        }
        
        const petDocData = {
          ...petData,
          petImage: petImageUrl, // Use uploaded URL
          petBooklet: petBookletUrl, // Use uploaded URL
          userId: user.uid,
          registeredDate: new Date().toISOString(),
          createdAt: new Date(),
          registrationStatus: 'pending' // Set as pending until agricultural admin approves
        };
        
        console.log('Final pet data to save:', {
          ...petDocData,
          petImage: petDocData.petImage ? 'URL_SET' : 'NO_IMAGE',
          petBooklet: petDocData.petBooklet ? 'URL_SET' : 'NO_BOOKLET'
        });
        
        console.log('Adding pet to database...');
        const docRef = await addDoc(collection(db, 'pets'), petDocData);
        console.log('Pet added to database with ID:', docRef.id);
        const completePetData = {
          ...petDocData,
          id: docRef.id
        };

        // Note: Admin notifications are now created automatically by the dashboard
        // when it detects new pets in the database
        
        setRegisteredPet(completePetData);
        setShowQRModal(true);
        setIsSubmitting(false);
      } catch (error) {
        console.error('Error registering pet:', error);
        Alert.alert('Error', 'Failed to register pet. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const TypeButton = ({ type, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        selected && styles.typeButtonSelected
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.typeButtonText,
        selected && styles.typeButtonTextSelected
      ]}>
        {type}
      </Text>
    </TouchableOpacity>
  );

  const GenderButton = ({ gender, selected, onPress }) => (
    <TouchableOpacity
      style={[
        styles.genderButton,
        selected && styles.genderButtonSelected
      ]}
      onPress={onPress}
    >
      <Text style={[
        styles.genderButtonText,
        selected && styles.genderButtonTextSelected
      ]}>
        {gender}
      </Text>
    </TouchableOpacity>
  );

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
    placeholderContainer: {
      width: 44, // Same width as back button to balance the layout
    },
    helpButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
      marginLeft: SPACING.md,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    form: {
      paddingBottom: SPACING.xl,
    },
    card: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
    },
    cardHeader: {
      padding: SPACING.lg,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightBlue,
    },
    cardTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    fieldContainer: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    firstField: {
      paddingTop: SPACING.lg,
    },
    lastField: {
      marginBottom: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    label: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    input: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      borderWidth: 1,
      borderColor: COLORS.lightBlue,
      ...SHADOWS.light,
    },
    inputError: {
      borderColor: COLORS.error,
    },
    textArea: {
      height: 100,
      paddingTop: SPACING.md,
    },
    errorText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.error,
      marginTop: SPACING.xs,
    },
    imageUpload: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      borderWidth: 2,
      borderColor: COLORS.lightBlue,
      borderStyle: 'dashed',
      ...SHADOWS.light,
      overflow: 'hidden',
    },
    imagePlaceholder: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
      paddingHorizontal: SPACING.lg,
    },
    imageContainer: {
      position: 'relative',
      width: '100%',
      height: 200,
    },
    selectedImage: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingVertical: SPACING.sm,
      alignItems: 'center',
    },
    changeImageText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
    },
    imageIcon: {
      fontSize: 40,
      marginBottom: SPACING.sm,
    },
    imageText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    imageSubtext: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    typeContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    typeButton: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.mediumBlue,
      ...SHADOWS.light,
    },
    typeButtonSelected: {
      backgroundColor: COLORS.mediumBlue,
      borderColor: COLORS.mediumBlue,
    },
    typeButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
    },
    typeButtonTextSelected: {
      color: COLORS.white,
    },
    genderContainer: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    genderButton: {
      flex: 1,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.golden,
      ...SHADOWS.light,
    },
    genderButtonSelected: {
      backgroundColor: COLORS.golden,
      borderColor: COLORS.golden,
    },
    genderButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
    },
    genderButtonTextSelected: {
      color: COLORS.text,
    },
    submitButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      alignItems: 'center',
      ...SHADOWS.medium,
    },
    submitButtonDisabled: {
      backgroundColor: COLORS.secondaryText,
      opacity: 0.7,
    },
    submitButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    submitButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
    infoCard: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.lg,
    },
    infoIcon: {
      fontSize: FONTS.sizes.large,
      marginRight: SPACING.md,
    },
    infoText: {
      flex: 1,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 20,
    },
    // Breed Selector
    breedSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    breedSelectorText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      flex: 1,
    },
    placeholderText: {
      color: COLORS.secondaryText,
    },
    dropdownIcon: {
      fontSize: FONTS.sizes.small,
      color: COLORS.secondaryText,
      marginLeft: SPACING.sm,
    },
    disabledInput: {
      backgroundColor: COLORS.background,
      opacity: 0.6,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    centeredModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    modalContent: {
      backgroundColor: COLORS.cardBackground,
      borderTopLeftRadius: RADIUS.large,
      borderTopRightRadius: RADIUS.large,
      padding: SPACING.lg,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    modalTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    closeButton: {
      padding: SPACING.sm,
    },
    closeButtonText: {
      fontSize: FONTS.sizes.large,
      color: COLORS.secondaryText,
    },
    searchInput: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      borderWidth: 1,
      borderColor: COLORS.lightBlue,
      marginBottom: SPACING.md,
    },
    breedList: {
      maxHeight: 300,
    },
    breedItem: {
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightBlue,
    },
    breedItemText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
    },
    selectedBreedItem: {
      backgroundColor: COLORS.lightBlue,
    },
    selectedBreedItemText: {
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
    },
    checkMark: {
      fontSize: FONTS.sizes.medium,
      color: COLORS.text,
      fontWeight: FONTS.weights.bold,
    },
    separator: {
      height: 1,
      backgroundColor: COLORS.lightBlue,
      marginHorizontal: SPACING.lg,
    },
    modalCloseButton: {
      padding: SPACING.sm,
    },
    modalCloseText: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    searchContainer: {
      padding: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    // QR Modal styles
    qrModalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.xl,
      alignItems: 'center',
      marginHorizontal: SPACING.lg,
      maxWidth: 350,
    },
    qrModalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    qrModalSubtitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: SPACING.lg,
    },
    qrContainer: {
      padding: SPACING.md,
      backgroundColor: COLORS.white,
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.lg,
      ...SHADOWS.light,
    },
    qrInfo: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 20,
    },
    qrModalButtons: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    qrModalButton: {
      flex: 1,
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.medium,
      ...SHADOWS.light,
    },
    viewPetsButton: {
      backgroundColor: COLORS.mediumBlue,
    },
    qrModalButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      textAlign: 'center',
    },
    pendingContainer: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    pendingIcon: {
      fontSize: 40,
      marginBottom: SPACING.sm,
    },
    pendingTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    pendingText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 18,
    },
    // Instruction Modal Styles
    instructionModalContent: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginHorizontal: SPACING.lg,
      maxHeight: '90%',
      width: '90%',
      maxWidth: 500,
      ...SHADOWS.heavy,
    },
    instructionModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightBlue,
    },
    instructionModalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
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
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: SPACING.lg,
      lineHeight: 22,
    },
    stepContainer: {
      flexDirection: 'row',
      marginBottom: SPACING.lg,
      alignItems: 'flex-start',
    },
    stepNumber: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    stepNumberText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    stepDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
    },
    tipContainer: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    tipTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    tipText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
    },
    noteContainer: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.golden,
    },
    noteTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    noteText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 20,
    },
    instructionGotItButton: {
      backgroundColor: COLORS.darkPurple,
      borderRadius: RADIUS.medium,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      alignItems: 'center',
      marginTop: SPACING.lg,
      ...SHADOWS.medium,
    },
    instructionGotItButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
    },
  }), [COLORS]);

  return (
    <View style={styles.container}>
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Register Pet</Text>
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => setShowInstructionModal(true)}
          >
            <MaterialIcons name="help-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.form}>
          {/* Registration Form Card */}
          <View style={styles.card}>
            {/* Pet Image */}
            <View style={[styles.fieldContainer, styles.firstField]}>
              <Text style={styles.label}>Pet Photo *</Text>
              <TouchableOpacity style={styles.imageUpload} onPress={selectImage}>
                {petData.petImage && petData.petImage !== 'placeholder' ? (
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: petData.petImage }} 
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.changeImageText}>Tap to change photo</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imageIcon}>📸</Text>
                    <Text style={styles.imageText}>Add Pet Photo</Text>
                    <Text style={styles.imageSubtext}>Tap to select image</Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.petImage && (
                <Text style={styles.errorText}>{errors.petImage}</Text>
              )}
            </View>

            {/* Pet Booklet */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pet Booklet *</Text>
              <TouchableOpacity style={styles.imageUpload} onPress={selectBooklet}>
                {petData.petBooklet && petData.petBooklet !== 'placeholder' ? (
                  <View style={styles.imageContainer}>
                    <Image 
                      source={{ uri: petData.petBooklet }} 
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.imageOverlay}>
                      <Text style={styles.changeImageText}>Tap to change booklet</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imageIcon}>📋</Text>
                    <Text style={styles.imageText}>Add Pet Booklet</Text>
                    <Text style={styles.imageSubtext}>Tap to select booklet photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {errors.petBooklet && (
                <Text style={styles.errorText}>{errors.petBooklet}</Text>
              )}
            </View>

            {/* Pet Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pet Name</Text>
              <TextInput
                style={[styles.input, errors.petName && styles.inputError]}
                value={petData.petName}
                onChangeText={(value) => handleInputChange('petName', value)}
                placeholder="Enter your pet's name"
                placeholderTextColor={COLORS.secondaryText}
              />
              {errors.petName && <Text style={styles.errorText}>{errors.petName}</Text>}
            </View>

            {/* Pet Type */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pet Type</Text>
              <View style={styles.typeContainer}>
                <TypeButton
                  type="🐕 Dog"
                  selected={petData.petType === 'dog'}
                  onPress={() => handleInputChange('petType', 'dog')}
                />
                <TypeButton
                  type="🐱 Cat"
                  selected={petData.petType === 'cat'}
                  onPress={() => handleInputChange('petType', 'cat')}
                />
              </View>
              {errors.petType && <Text style={styles.errorText}>{errors.petType}</Text>}
            </View>

            {/* Pet Gender */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Pet Gender</Text>
              <View style={styles.genderContainer}>
                <GenderButton
                  gender="♂️ Male"
                  selected={petData.petGender === 'male'}
                  onPress={() => handleInputChange('petGender', 'male')}
                />
                <GenderButton
                  gender="♀️ Female"
                  selected={petData.petGender === 'female'}
                  onPress={() => handleInputChange('petGender', 'female')}
                />
              </View>
              {errors.petGender && <Text style={styles.errorText}>{errors.petGender}</Text>}
            </View>

            {/* Breed */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Breed</Text>
              {petData.petType ? (
                <TouchableOpacity
                  style={[styles.input, styles.breedSelector, errors.breed && styles.inputError]}
                  onPress={openBreedModal}
                >
                  <Text style={[
                    styles.breedSelectorText,
                    !petData.breed && styles.placeholderText
                  ]}>
                    {petData.breed || `Select ${petData.petType} breed`}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.input, styles.breedSelector, styles.disabledInput]}
                  onPress={() => Alert.alert('Select Pet Type', 'Please select a pet type first to choose a breed.')}
                >
                  <Text style={styles.placeholderText}>Select pet type first</Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              )}
              {errors.breed && <Text style={styles.errorText}>{errors.breed}</Text>}
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={petData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                placeholder="Tell us about your pet's personality, habits, or special features..."
                placeholderTextColor={COLORS.secondaryText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Owner Full Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Owner Full Name</Text>
              <TextInput
                style={[styles.input, errors.ownerFullName && styles.inputError]}
                value={petData.ownerFullName}
                onChangeText={(value) => handleInputChange('ownerFullName', value)}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.secondaryText}
              />
              {errors.ownerFullName && <Text style={styles.errorText}>{errors.ownerFullName}</Text>}
            </View>

            {/* Contact Number */}
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Contact Number</Text>
              <TextInput
                style={[styles.input, errors.contactNumber && styles.inputError]}
                value={petData.contactNumber}
                onChangeText={(value) => handleInputChange('contactNumber', value)}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.secondaryText}
                keyboardType="phone-pad"
              />
              {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}
            </View>

            {/* Submit Button */}
            <View style={[styles.fieldContainer, styles.lastField]}>
                          <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
              onPress={() => {
                console.log('🎯 Submit button pressed!');
                handleSubmit();
              }}
              disabled={isSubmitting}
            >
                {isSubmitting ? (
                  <View style={styles.submitButtonContent}>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={[styles.submitButtonText, { marginLeft: SPACING.sm }]}>Registering...</Text>
                  </View>
                ) : (
                <Text style={styles.submitButtonText}>🐾 Register Pet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>
              Your pet's information will be securely stored and can help reunite you if your pet ever gets lost.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* QR Code Success Modal */}
      <Modal
        visible={showQRModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>🎉 Pet Registration Submitted!</Text>
            <Text style={styles.qrModalSubtitle}>
              {registeredPet?.petName} has been registered and is awaiting admin approval.
            </Text>
            
            <View style={styles.pendingContainer}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <Text style={styles.pendingTitle}>Pending Verification</Text>
              <Text style={styles.pendingText}>
                Your pet's information has been submitted to the agricultural admin for review. 
                Once approved, you'll receive a notification and the QR code will be available in "My Pets".
              </Text>
            </View>
            
            <View style={styles.qrModalButtons}>
              <TouchableOpacity
                style={styles.qrModalButton}
                onPress={() => {
                  setShowQRModal(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.qrModalButtonText}>Got It</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.qrModalButton, styles.viewPetsButton]}
                onPress={() => {
                  setShowQRModal(false);
                  navigation.navigate('MyPets');
                }}
              >
                <Text style={styles.qrModalButtonText}>View My Pets</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Breed Selection Modal */}
      <Modal
        visible={breedModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBreedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {petData.petType === 'cat' ? '🐱 Cat' : '🐕 Dog'} Breed
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setBreedModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={breedSearchText}
                onChangeText={setBreedSearchText}
                placeholder="Search breeds..."
                placeholderTextColor={COLORS.secondaryText}
              />
            </View>

            <FlatList
              data={getFilteredBreeds()}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.breedItem,
                    petData.breed === item && styles.selectedBreedItem
                  ]}
                  onPress={() => selectBreed(item)}
                >
                  <Text style={[
                    styles.breedItemText,
                    petData.breed === item && styles.selectedBreedItemText
                  ]}>
                    {item}
                  </Text>
                  {petData.breed === item && (
                    <Text style={styles.checkMark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
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
        <View style={styles.centeredModalOverlay}>
          <View style={styles.instructionModalContent}>
            <View style={styles.instructionModalHeader}>
              <Text style={styles.instructionModalTitle}>📋 How to Register Your Pet</Text>
              <TouchableOpacity
                style={styles.instructionCloseButton}
                onPress={() => setShowInstructionModal(false)}
              >
                <MaterialIcons name="close" size={24} color={COLORS.secondaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.instructionScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.instructionContent}>
                <Text style={styles.instructionSubtitle}>
                  Follow these simple steps to register your pet with PawSafety:
                </Text>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📸 Add Pet Photos</Text>
                    <Text style={styles.stepDescription}>
                      • Take a clear photo of your pet (required){'\n'}
                      • Add a photo of your pet's booklet or registration document (required){'\n'}
                      • Tap the photo areas to select from camera or gallery
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>🐾 Pet Information</Text>
                    <Text style={styles.stepDescription}>
                      • Enter your pet's name{'\n'}
                      • Select pet type (Dog or Cat){'\n'}
                      • Choose gender (Male or Female){'\n'}
                      • Select breed from the dropdown list
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>📝 Additional Details</Text>
                    <Text style={styles.stepDescription}>
                      • Add a description of your pet's personality or special features{'\n'}
                      • Verify your full name (auto-filled from your account){'\n'}
                      • Enter your contact number
                    </Text>
                  </View>
                </View>

                <View style={styles.stepContainer}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>✅ Submit for Review</Text>
                    <Text style={styles.stepDescription}>
                      • Tap "Register Pet" to submit your registration{'\n'}
                      • Your pet's information will be sent to the agricultural admin for review{'\n'}
                      • You'll receive a notification once approved
                    </Text>
                  </View>
                </View>

                <View style={styles.tipContainer}>
                  <Text style={styles.tipTitle}>💡 Tips for Success:</Text>
                  <Text style={styles.tipText}>
                    • Make sure photos are clear and well-lit{'\n'}
                    • Double-check all information before submitting{'\n'}
                    • Keep your contact information up to date{'\n'}
                    • The review process usually takes 1-2 business days
                  </Text>
                </View>

                <View style={styles.noteContainer}>
                  <Text style={styles.noteTitle}>📋 Important Notes:</Text>
                  <Text style={styles.noteText}>
                    • All fields marked with * are required{'\n'}
                    • Your pet's information is secure and private{'\n'}
                    • Once approved, you'll get a QR code for easy pet identification{'\n'}
                    • You can view your registered pets in "My Pets" section
                  </Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.instructionGotItButton}
              onPress={() => setShowInstructionModal(false)}
            >
              <Text style={styles.instructionGotItButtonText}>Got It!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default RegisterPetScreen; 