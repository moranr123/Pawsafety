import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileImage } from '../contexts/ProfileImageContext';

const { width } = Dimensions.get('window');

const CreatePostScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const { profileImage } = useProfileImage();
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f0f2f5',
    },
    header: {
      backgroundColor: '#ffffff',
      paddingTop: 50,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
      textAlign: 'center',
    },
    cancelButton: {
      padding: 8,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1877f2',
    },
    postButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: '#1877f2',
      borderRadius: 20,
      minWidth: 80,
      alignItems: 'center',
    },
    postButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    postButtonDisabled: {
      backgroundColor: '#e4e6eb',
    },
    postButtonTextDisabled: {
      color: '#bcc0c4',
    },
    content: {
      backgroundColor: '#ffffff',
      marginTop: 8,
      padding: 16,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      backgroundColor: '#e4e6eb',
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
    },
    textInput: {
      fontSize: 24,
      color: '#050505',
      minHeight: 100,
      textAlignVertical: 'top',
      fontFamily: FONTS.family,
    },
    placeholderText: {
      fontSize: 24,
      color: '#8a8d91',
      position: 'absolute',
      top: 0,
      left: 0,
    },
    imageContainer: {
      marginTop: 16,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    imageWrapper: {
      position: 'relative',
      width: (width - 48) / 3,
      height: (width - 48) / 3,
      borderRadius: 8,
      overflow: 'hidden',
    },
    selectedImage: {
      width: '100%',
      height: '100%',
    },
    removeImageButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addImageButton: {
      width: (width - 48) / 3,
      height: (width - 48) / 3,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#e4e6eb',
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
    },
    infoCard: {
      backgroundColor: '#f0f2f5',
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    infoIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: '#65676b',
      lineHeight: 18,
    },
  }), [COLORS, width]);

  const selectImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({ uri: asset.uri }));
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 10)); // Limit to 10 images
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    // Both text and images are optional, but at least one must be present
    if (!postText.trim() && selectedImages.length === 0) {
      Alert.alert('Empty Post', 'Please add some text or images to your post.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images to Firebase Storage
      const imageUrls = [];
      for (const image of selectedImages) {
        try {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          const imageRef = ref(storage, `posts/${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);
          await uploadBytes(imageRef, blob);
          const downloadURL = await getDownloadURL(imageRef);
          imageUrls.push(downloadURL);
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      // Create post in Firestore
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Pet Lover',
        userEmail: user.email,
        userProfileImage: profileImage || null,
        text: postText.trim() || '',
        images: imageUrls.length > 0 ? imageUrls : [],
        createdAt: serverTimestamp(),
        likes: [],
        shares: 0,
      });

      Alert.alert(
        'Post Created!',
        'Your pet-related post has been shared successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setPostText('');
              setSelectedImages([]);
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPost = (postText.trim().length > 0 || selectedImages.length > 0) && !isSubmitting;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity 
          style={[styles.postButton, !canPost && styles.postButtonDisabled]}
          onPress={handlePost}
          disabled={!canPost}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={[styles.postButtonText, !canPost && styles.postButtonTextDisabled]}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Post Content */}
        <View style={styles.content}>
          {/* User Info */}
          <View style={styles.userInfo}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <MaterialIcons name="account-circle" size={40} color="#65676b" />
              </View>
            )}
            <Text style={styles.userName}>
              {user?.displayName || 'Pet Lover'}
            </Text>
          </View>

          {/* Text Input */}
          <View style={{ position: 'relative' }}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#8a8d91"
              value={postText}
              onChangeText={setPostText}
              multiline
              maxLength={5000}
            />
          </View>

          {/* Images */}
          {selectedImages.length > 0 && (
            <View style={styles.imageContainer}>
              <View style={styles.imageGrid}>
                {selectedImages.map((image, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image 
                      source={{ uri: image.uri }} 
                      style={styles.selectedImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <MaterialIcons name="close" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {selectedImages.length < 10 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={selectImages}
                  >
                    <MaterialIcons name="add-photo-alternate" size={32} color="#65676b" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Add Image Button (when no images) */}
          {selectedImages.length === 0 && (
            <TouchableOpacity
              style={[styles.addImageButton, { marginTop: 16 }]}
              onPress={selectImages}
            >
              <MaterialIcons name="add-photo-alternate" size={32} color="#65676b" />
              <Text style={{ marginTop: 8, fontSize: 13, color: '#65676b' }}>Add Photos</Text>
            </TouchableOpacity>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color="#65676b" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Share your pet-related stories, tips, photos, or experiences with the community. Make sure your content is appropriate and related to pets.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default CreatePostScreen;

