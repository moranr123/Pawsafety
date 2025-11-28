import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs, updateDoc } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileImage } from '../contexts/ProfileImageContext';
import PostCard from '../components/PostCard';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const { profileImage, updateProfileImage } = useProfileImage();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Pet Lover');
  const [isUploading, setIsUploading] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);
  const [friends, setFriends] = useState([]);
  const [userPosts, setUserPosts] = useState([]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f0f2f5',
    },
    scrollView: {
      flex: 1,
    },
    coverPhotoContainer: {
      width: '100%',
      height: 200,
      backgroundColor: COLORS.darkPurple,
      position: 'relative',
    },
    coverPhoto: {
      width: '100%',
      height: '100%',
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: SPACING.md,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    profileSection: {
      backgroundColor: COLORS.white || '#ffffff',
      paddingTop: 80,
      paddingBottom: SPACING.lg,
      alignItems: 'center',
    },
    profileImageContainer: {
      position: 'absolute',
      top: -80,
      alignSelf: 'center',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: COLORS.white || '#ffffff',
      padding: 4,
      ...SHADOWS.large,
    },
    profileImageWrapper: {
      width: '100%',
      height: '100%',
      borderRadius: 76,
      overflow: 'hidden',
      backgroundColor: COLORS.lightBlue,
    },
    profileImage: {
      width: '100%',
      height: '100%',
    },
    profileImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: COLORS.lightBlue,
      justifyContent: 'center',
      alignItems: 'center',
    },
    profileEmoji: {
      fontSize: 80,
    },
    userName: {
      fontSize: 28,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text || '#050505',
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
    },
    userEmail: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText || '#65676b',
      marginBottom: SPACING.lg,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
      gap: SPACING.sm,
      width: '100%',
    },
    editButton: {
      flex: 1,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButtonText: {
      color: COLORS.white || '#ffffff',
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      marginLeft: SPACING.xs,
    },
    moreButton: {
      width: 40,
      height: 40,
      backgroundColor: '#e4e6eb',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentSection: {
      backgroundColor: COLORS.white || '#ffffff',
      marginTop: SPACING.md,
      paddingTop: SPACING.lg,
    },
    bottomSpacing: {
      height: 100,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: COLORS.white || '#ffffff',
      borderRadius: 12,
      padding: SPACING.lg,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text || '#050505',
      marginBottom: SPACING.lg,
    },
    inputContainer: {
      marginBottom: SPACING.lg,
    },
    inputLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text || '#050505',
      marginBottom: SPACING.sm,
    },
    textInput: {
      borderWidth: 1,
      borderColor: COLORS.secondaryText || '#e4e6eb',
      borderRadius: 8,
      padding: SPACING.md,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text || '#050505',
      backgroundColor: COLORS.background || '#f0f2f5',
    },
    imagePickerButton: {
      backgroundColor: COLORS.lightBlue || '#e4e6eb',
      borderRadius: 8,
      padding: SPACING.md,
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    imagePickerText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text || '#050505',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: SPACING.md,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: '#e4e6eb',
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text || '#050505',
    },
    saveButton: {
      flex: 1,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white || '#ffffff',
    },
    editImageButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: COLORS.white || '#ffffff',
    },
    editableName: {
      fontSize: 28,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text || '#050505',
      marginTop: SPACING.md,
      marginBottom: SPACING.xs,
      textAlign: 'center',
      borderBottomWidth: 2,
      borderBottomColor: COLORS.darkPurple || '#1877f2',
      paddingBottom: SPACING.xs,
      minWidth: 200,
    },
    section: {
      backgroundColor: COLORS.white || '#ffffff',
      marginTop: SPACING.md,
      padding: SPACING.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text || '#050505',
    },
    seeAllButton: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.darkPurple || '#1877f2',
    },
    friendsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.md,
    },
    friendItem: {
      width: (width - SPACING.lg * 2 - SPACING.md * 2) / 3,
      alignItems: 'center',
    },
    friendImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#e4e6eb',
      marginBottom: SPACING.xs,
    },
    friendName: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text || '#050505',
      textAlign: 'center',
    },
    postsContainer: {
      marginTop: SPACING.md,
    },
    emptyState: {
      padding: SPACING.xl,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText || '#65676b',
      textAlign: 'center',
    },
  }), [COLORS, width]);

  const handleEditProfile = () => {
    setIsEditing(true);
    setDisplayName(user?.displayName || 'Pet Lover');
    setTempImageUri(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDisplayName(user?.displayName || 'Pet Lover');
    setTempImageUri(null);
  };

  const selectProfileImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setTempImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name.');
      return;
    }

    setIsUploading(true);
    try {
      let imageUrl = profileImage;

      // Upload new image if one was selected
      if (tempImageUri) {
        const response = await fetch(tempImageUri);
        const blob = await response.blob();
        const imageRef = ref(storage, `profile-images/${user.uid}_${Date.now()}.jpg`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      // Update Firebase Auth display name
      await updateProfile(user, {
        displayName: displayName.trim(),
      });

      // Update Firestore user document
      await setDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        profileImage: imageUrl,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Update profile image context if image was changed
      if (tempImageUri && imageUrl) {
        await updateProfileImage(imageUrl);
      }

      // Update all existing posts with new profile information
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', user.uid)
        );
        const postsSnapshot = await getDocs(postsQuery);
        
        const updatePromises = postsSnapshot.docs.map(postDoc => 
          updateDoc(doc(db, 'posts', postDoc.id), {
            userName: displayName.trim(),
            userEmail: user.email,
            userProfileImage: imageUrl,
          })
        );
        
        await Promise.all(updatePromises);
      } catch (error) {
        // Error handled silently - posts update is optional
        console.error('Error updating posts:', error);
      }

      // Update all existing comments with new profile information
      try {
        const commentsQuery = query(
          collection(db, 'post_comments'),
          where('userId', '==', user.uid)
        );
        const commentsSnapshot = await getDocs(commentsQuery);
        
        const updateCommentPromises = commentsSnapshot.docs.map(commentDoc => 
          updateDoc(doc(db, 'post_comments', commentDoc.id), {
            userName: displayName.trim(),
            userProfileImage: imageUrl,
          })
        );
        
        await Promise.all(updateCommentPromises);
      } catch (error) {
        // Error handled silently - comments update is optional
        console.error('Error updating comments:', error);
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => setIsEditing(false) }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackPress = () => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      navigation.goBack();
    }
  };

  // Fetch user posts
  useEffect(() => {
    if (!user?.uid) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserPosts(postsData);
      },
      (error) => {
        // Error handled silently
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch friends (placeholder for now)
  useEffect(() => {
    // For now, create placeholder friends
    const placeholderFriends = Array.from({ length: 6 }, (_, i) => ({
      id: `friend_${i}`,
      name: `Friend ${i + 1}`,
      profileImage: null,
    }));
    setFriends(placeholderFriends);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Cover Photo Section */}
        <View style={styles.coverPhotoContainer}>
          <View style={styles.coverPhoto} />
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBackPress}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {/* Profile Image - Overlapping Cover Photo */}
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              {tempImageUri ? (
                <Image 
                  source={{ uri: tempImageUri }} 
                  style={styles.profileImage}
                  contentFit="cover"
                />
              ) : profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.profileImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileEmoji}>👤</Text>
                </View>
              )}
            </View>
            {isEditing && (
              <TouchableOpacity 
                style={styles.editImageButton}
                onPress={selectProfileImage}
              >
                <MaterialIcons name="camera-alt" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* User Name */}
          {isEditing ? (
            <TextInput
              style={styles.editableName}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              placeholderTextColor={COLORS.secondaryText || '#65676b'}
              maxLength={50}
            />
          ) : (
            <Text style={styles.userName}>
              {user?.displayName || 'Pet Lover'}
            </Text>
          )}

          {/* User Email */}
          <Text style={styles.userEmail}>
            {user?.email || ''}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {isEditing ? (
              <>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={handleCancelEdit}
                  disabled={isUploading}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditProfile}
                >
                  <MaterialIcons name="edit" size={18} color="#ffffff" />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.moreButton}>
                  <MaterialIcons name="more-horiz" size={24} color="#050505" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FriendsList')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.friendsGrid}>
            {friends.slice(0, 6).map((friend) => (
              <View key={friend.id} style={styles.friendItem}>
                <View style={styles.friendImage}>
                  <MaterialIcons name="account-circle" size={100} color="#bcc0c4" />
                </View>
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.name}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Posts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Posts</Text>
          </View>
          {userPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No posts yet. Share something with the community!</Text>
            </View>
          ) : (
            <View style={styles.postsContainer}>
              {userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPostDeleted={(postId) => {
                    setUserPosts(prev => prev.filter(p => p.id !== postId));
                  }}
                  onPostHidden={() => {}}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

    </View>
  );
};

export default ProfileScreen;

