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
import { doc, setDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs, updateDoc, getDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileImage } from '../contexts/ProfileImageContext';
import NotificationService from '../services/NotificationService';
import PostCard from '../components/PostCard';
import DirectChatModal from '../components/DirectChatModal';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation, route }) => {
  const currentUser = auth.currentUser;
  const viewUserId = route?.params?.userId || currentUser?.uid;
  const isOwnProfile = viewUserId === currentUser?.uid;
  const user = isOwnProfile ? currentUser : null;
  const { colors: COLORS } = useTheme();
  const { profileImage, updateProfileImage } = useProfileImage();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Pet Lover');
  const [viewedUserData, setViewedUserData] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tempImageUri, setTempImageUri] = useState(null);
  const [friends, setFriends] = useState([]);
  const [userPosts, setUserPosts] = useState([]);
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [hasIncomingRequest, setHasIncomingRequest] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [directChatVisible, setDirectChatVisible] = useState(false);

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
    addFriendButton: {
      flex: 1,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    messageButton: {
      backgroundColor: '#e4e6eb',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: SPACING.sm,
    },
    messageButtonText: {
      color: '#050505',
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      marginLeft: SPACING.xs,
    },
    addFriendButtonText: {
      color: COLORS.white || '#ffffff',
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      marginLeft: SPACING.xs,
    },
    unfriendButton: {
      flex: 1,
      backgroundColor: '#fee2e2',
      borderRadius: 8,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#dc2626',
    },
    unfriendButtonText: {
      color: '#dc2626',
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
        name: displayName.trim(), // Keep name field in sync with displayName
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

  const handleBlockUser = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    Alert.alert(
      'Block User',
      `If you block this user, they won't be able to see your profile.\n\nYou will also stop being friends and any pending friend requests will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockId = `${currentUser.uid}_${viewUserId}`;

              // Create block document
              await setDoc(doc(db, 'blocks', blockId), {
                userId: currentUser.uid,
                blockedUserId: viewUserId,
                createdAt: serverTimestamp(),
              });

              // Remove friendship (both directions) if exists
              const friendId1 = `${currentUser.uid}_${viewUserId}`;
              const friendId2 = `${viewUserId}_${currentUser.uid}`;
              await deleteDoc(doc(db, 'friends', friendId1)).catch(() => {});
              await deleteDoc(doc(db, 'friends', friendId2)).catch(() => {});

              // Remove any friend requests between users
              const requestId1 = `${currentUser.uid}_${viewUserId}`;
              const requestId2 = `${viewUserId}_${currentUser.uid}`;
              await deleteDoc(doc(db, 'friend_requests', requestId1)).catch(() => {});
              await deleteDoc(doc(db, 'friend_requests', requestId2)).catch(() => {});

              setIsFriend(false);
              setHasPendingRequest(false);
              setHasIncomingRequest(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    Alert.alert(
      'Unblock User',
      'Do you want to unblock this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockId = `${currentUser.uid}_${viewUserId}`;
              await deleteDoc(doc(db, 'blocks', blockId));
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAddFriend = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    if (isFriend) {
      Alert.alert('Already Friends', 'You are already friends with this user.');
      return;
    }

    if (hasPendingRequest) {
      Alert.alert('Request Pending', 'You have already sent a friend request to this user.');
      return;
    }

    setIsSendingRequest(true);

    try {
      // Get recipient user data
      const recipientDoc = await getDoc(doc(db, 'users', viewUserId));
      if (!recipientDoc.exists()) {
        Alert.alert('Error', 'User not found.');
        setIsSendingRequest(false);
        return;
      }

      const recipientData = recipientDoc.data();
      const senderName = currentUser.displayName || currentUser.email || 'Someone';

      // Check if there's an old friend request (accepted/rejected) and delete it first
      const requestId = `${currentUser.uid}_${viewUserId}`;
      const oldRequestDoc = await getDoc(doc(db, 'friend_requests', requestId));
      if (oldRequestDoc.exists()) {
        const oldRequestData = oldRequestDoc.data();
        // If old request exists and is not pending, delete it to allow new request
        if (oldRequestData.status !== 'pending') {
          await deleteDoc(doc(db, 'friend_requests', requestId));
        }
      }

      // Create friend request document (always create new, even if previously friends)
      await setDoc(doc(db, 'friend_requests', requestId), {
        fromUserId: currentUser.uid,
        toUserId: viewUserId,
        fromUserName: senderName,
        fromUserEmail: currentUser.email,
        fromUserProfileImage: currentUser.photoURL || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Create notification for recipient
      const notificationService = NotificationService.getInstance();
      await notificationService.createNotification({
        userId: viewUserId,
        title: 'New Friend Request',
        body: `${senderName} sent you a friend request`,
        type: 'friend_request',
        data: {
          type: 'friend_request',
          requestId: requestId,
          fromUserId: currentUser.uid,
          fromUserName: senderName,
        }
      });

      // Send push notification
      try {
        const tokenDoc = await getDoc(doc(db, 'user_push_tokens', viewUserId));
        if (tokenDoc.exists()) {
          const token = tokenDoc.data().expoPushToken;
          if (token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([{
                to: token,
                sound: 'default',
                title: 'New Friend Request',
                body: `${senderName} sent you a friend request`,
                data: {
                  type: 'friend_request',
                  requestId: requestId,
                  fromUserId: currentUser.uid,
                },
                priority: 'high',
                channelId: 'default'
              }])
            });
          }
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }

      Alert.alert('Success', 'Friend request sent!');
      setHasPendingRequest(true);
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    setIsSendingRequest(true);

    try {
      // Find the pending request document first
      const q = query(
        collection(db, 'friend_requests'),
        where('fromUserId', '==', currentUser.uid),
        where('toUserId', '==', viewUserId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const requestDoc = snapshot.docs[0];
        const requestId = requestDoc.id;

        // Delete the friend request
        await deleteDoc(doc(db, 'friend_requests', requestId));
        
        // Delete the associated notification
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', viewUserId),
          where('type', '==', 'friend_request'),
          where('data.requestId', '==', requestId)
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        notificationsSnapshot.docs.forEach(async (notifDoc) => {
          await deleteDoc(notifDoc.ref);
        });

        setHasPendingRequest(false);
        Alert.alert('Success', 'Friend request cancelled.');
      } else {
        // Fallback: try with ID convention if query returned nothing but we think there is one
        const fallbackId = `${currentUser.uid}_${viewUserId}`;
        const fallbackDoc = await getDoc(doc(db, 'friend_requests', fallbackId));
        if (fallbackDoc.exists()) {
           await deleteDoc(doc(db, 'friend_requests', fallbackId));
           setHasPendingRequest(false);
           Alert.alert('Success', 'Friend request cancelled.');
        }
      }
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    setIsSendingRequest(true);

    try {
      // Find the incoming request document
      const q = query(
        collection(db, 'friend_requests'),
        where('fromUserId', '==', viewUserId),
        where('toUserId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        Alert.alert('Error', 'Friend request not found.');
        setIsSendingRequest(false);
        return;
      }

      const requestDoc = snapshot.docs[0];
      const requestId = requestDoc.id;
      const request = requestDoc.data();

      const friendId1 = `${currentUser.uid}_${viewUserId}`;
      const friendId2 = `${viewUserId}_${currentUser.uid}`;

      // Get sender user data (latest from Firestore)
      const senderUserDoc = await getDoc(doc(db, 'users', viewUserId));
      const senderUserData = senderUserDoc.exists() ? senderUserDoc.data() : {};

      // Get current user data
      const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      // Add friend relationship for current user
      await setDoc(doc(db, 'friends', friendId1), {
        userId: currentUser.uid,
        friendId: viewUserId,
        friendName: senderUserData.displayName || senderUserData.name || request.fromUserName || 'Unknown',
        friendEmail: senderUserData.email || request.fromUserEmail || '',
        friendProfileImage: senderUserData.profileImage || senderUserData.photoURL || request.fromUserProfileImage || null,
        createdAt: serverTimestamp(),
      });

      // Add friend relationship for sender
      await setDoc(doc(db, 'friends', friendId2), {
        userId: viewUserId,
        friendId: currentUser.uid,
        friendName: currentUser.displayName || currentUserData.displayName || currentUserData.name || 'Unknown',
        friendEmail: currentUser.email || currentUserData.email || '',
        friendProfileImage: currentUser.photoURL || currentUserData.profileImage || null,
        createdAt: serverTimestamp(),
      });

      // Update the friend request status to 'accepted'
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp(),
      });

      // Send notification to the requester
      const notificationService = NotificationService.getInstance();
      const currentUserName = currentUser.displayName || currentUser.email || 'Someone';
      
      await notificationService.createNotification({
        userId: viewUserId,
        title: 'Friend Request Accepted',
        body: `${currentUserName} accepted your friend request`,
        type: 'friend_request_accepted',
        data: {
          type: 'friend_request_accepted',
          friendId: currentUser.uid,
          friendName: currentUserName,
        }
      });

      // Send push notification
      try {
        const tokenDoc = await getDoc(doc(db, 'user_push_tokens', viewUserId));
        if (tokenDoc.exists()) {
          const token = tokenDoc.data().expoPushToken;
          if (token) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([{
                to: token,
                sound: 'default',
                title: 'Friend Request Accepted',
                body: `${currentUserName} accepted your friend request`,
                data: {
                  type: 'friend_request_accepted',
                  friendId: currentUser.uid,
                },
                priority: 'high',
                channelId: 'default'
              }])
            });
          }
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
      }

      setIsFriend(true);
      setHasIncomingRequest(false);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleUnfriend = async () => {
    if (!currentUser || !viewUserId || isOwnProfile) return;

    Alert.alert(
      'Unfriend',
      `Are you sure you want to unfriend ${viewedUserData?.displayName || displayName || 'this user'}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Unfriend',
          style: 'destructive',
          onPress: async () => {
            setIsSendingRequest(true);
            try {
              // Delete both friend relationships
              const friendId1 = `${currentUser.uid}_${viewUserId}`;
              const friendId2 = `${viewUserId}_${currentUser.uid}`;
              
              const friendDoc1 = await getDoc(doc(db, 'friends', friendId1));
              const friendDoc2 = await getDoc(doc(db, 'friends', friendId2));
              
              if (friendDoc1.exists()) {
                await deleteDoc(doc(db, 'friends', friendId1));
              }
              if (friendDoc2.exists()) {
                await deleteDoc(doc(db, 'friends', friendId2));
              }

              setIsFriend(false);
              Alert.alert('Success', 'User unfriended successfully.');
            } catch (error) {
              console.error('Error unfriending user:', error);
              Alert.alert('Error', 'Failed to unfriend user. Please try again.');
            } finally {
              setIsSendingRequest(false);
            }
          }
        }
      ]
    );
  };

  // Load viewed user data when viewing another user's profile
  useEffect(() => {
    if (!viewUserId || isOwnProfile) return;

    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', viewUserId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if user is banned - prevent viewing banned user profiles
          if (userData.status === 'banned') {
            Alert.alert(
              'Profile Unavailable',
              'This user\'s profile is not available.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            return;
          }
          
          setViewedUserData({
            displayName: userData.displayName || userData.name || 'Pet Lover',
            profileImage: userData.profileImage || null,
            email: userData.email || '',
          });
          setDisplayName(userData.displayName || userData.name || 'Pet Lover');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [viewUserId, isOwnProfile]);

  // Fetch user posts
  useEffect(() => {
    if (!viewUserId) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', viewUserId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs
          .map(doc => ({
          id: doc.id,
          ...doc.data()
          }))
          .filter(post => !post.deleted); // Filter out deleted posts
        setUserPosts(postsData);
      },
      (error) => {
        // Error handled silently
      }
    );

    return () => unsubscribe();
  }, [viewUserId]);

  // Fetch friends in real-time
  useEffect(() => {
    if (!viewUserId) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', viewUserId)
    );

    const unsubscribe = onSnapshot(
      friendsQuery,
      async (snapshot) => {
        const friendsList = [];
        
        // Check each friend's status to filter out banned users
        for (const docSnapshot of snapshot.docs) {
          const friendId = docSnapshot.data().friendId;
          try {
            const friendUserDoc = await getDoc(doc(db, 'users', friendId));
            if (friendUserDoc.exists()) {
              const friendUserData = friendUserDoc.data();
              // Only include friends who are not banned
              if (friendUserData.status !== 'banned') {
                friendsList.push({
                  id: friendId,
                  name: docSnapshot.data().friendName || 'Unknown',
                  email: docSnapshot.data().friendEmail || '',
                  profileImage: docSnapshot.data().friendProfileImage || null,
                });
              }
            } else {
              // If user doc doesn't exist, still add friend (might be deleted user)
              friendsList.push({
                id: friendId,
                name: docSnapshot.data().friendName || 'Unknown',
                email: docSnapshot.data().friendEmail || '',
                profileImage: docSnapshot.data().friendProfileImage || null,
              });
            }
          } catch (error) {
            console.error(`Error checking friend status for ${friendId}:`, error);
            // On error, still include the friend
            friendsList.push({
              id: friendId,
              name: docSnapshot.data().friendName || 'Unknown',
              email: docSnapshot.data().friendEmail || '',
              profileImage: docSnapshot.data().friendProfileImage || null,
            });
          }
        }
        
        setFriends(friendsList);
      },
      (error) => {
        console.error('Error fetching friends:', error);
      }
    );

    return () => unsubscribe();
  }, [viewUserId]);

  // Fetch incoming friend requests count (only for own profile)
  useEffect(() => {
    if (!isOwnProfile || !currentUser?.uid) return;

    const requestsQuery = query(
      collection(db, 'friend_requests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setIncomingRequestsCount(snapshot.size);
      },
      (error) => {
        console.error('Error fetching friend requests count:', error);
      }
    );

    return () => unsubscribe();
  }, [isOwnProfile, currentUser?.uid]);

  // Check if viewed user is a friend and check friend request status
  useEffect(() => {
    if (!currentUser?.uid || !viewUserId || isOwnProfile) {
      setIsFriend(false);
      setHasPendingRequest(false);
      setHasIncomingRequest(false);
      return;
    }

    // Check if they are friends
    const checkFriendship = async () => {
      try {
        const friendId1 = `${currentUser.uid}_${viewUserId}`;
        const friendId2 = `${viewUserId}_${currentUser.uid}`;
        
        const friendDoc1 = await getDoc(doc(db, 'friends', friendId1));
        const friendDoc2 = await getDoc(doc(db, 'friends', friendId2));
        
        setIsFriend(friendDoc1.exists() || friendDoc2.exists());
      } catch (error) {
        console.error('Error checking friendship:', error);
      }
    };

    // Check for pending friend request (sent by current user)
    const checkPendingRequest = async () => {
      try {
        const q = query(
          collection(db, 'friend_requests'),
          where('fromUserId', '==', currentUser.uid),
          where('toUserId', '==', viewUserId),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        setHasPendingRequest(!snapshot.empty);
      } catch (error) {
        console.error('Error checking pending request:', error);
      }
    };

    // Check for incoming friend request (sent to current user)
    const checkIncomingRequest = async () => {
      try {
        const q = query(
          collection(db, 'friend_requests'),
          where('fromUserId', '==', viewUserId),
          where('toUserId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        setHasIncomingRequest(!snapshot.empty);
      } catch (error) {
        console.error('Error checking incoming request:', error);
      }
    };

    checkFriendship();
    checkPendingRequest();
    checkIncomingRequest();

    // Set up real-time listeners
    const friendId1 = `${currentUser.uid}_${viewUserId}`;
    const friendId2 = `${viewUserId}_${currentUser.uid}`;

    const unsubscribe1 = onSnapshot(doc(db, 'friends', friendId1), (snap) => {
      setIsFriend(snap.exists());
    });
    const unsubscribe2 = onSnapshot(doc(db, 'friends', friendId2), (snap) => {
      setIsFriend(snap.exists());
    });

    const qPending = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', currentUser.uid),
      where('toUserId', '==', viewUserId),
      where('status', '==', 'pending')
    );
    const unsubscribe3 = onSnapshot(qPending, (snapshot) => {
      setHasPendingRequest(!snapshot.empty);
    });

    const qIncoming = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', viewUserId),
      where('toUserId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubscribe4 = onSnapshot(qIncoming, (snapshot) => {
      setHasIncomingRequest(!snapshot.empty);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, [currentUser?.uid, viewUserId, isOwnProfile]);

  // Check block status (have they blocked me / have I blocked them)
  useEffect(() => {
    if (!currentUser?.uid || !viewUserId || isOwnProfile) {
      setIsBlockedByUser(false);
      setIsBlockingUser(false);
      return;
    }

    const blockedById = `${viewUserId}_${currentUser.uid}`; // they blocked me
    const blockingId = `${currentUser.uid}_${viewUserId}`; // I blocked them

    const unsubscribeBlockedBy = onSnapshot(
      doc(db, 'blocks', blockedById),
      (snap) => {
        setIsBlockedByUser(snap.exists());
      }
    );

    const unsubscribeBlocking = onSnapshot(
      doc(db, 'blocks', blockingId),
      (snap) => {
        setIsBlockingUser(snap.exists());
      }
    );

    return () => {
      unsubscribeBlockedBy();
      unsubscribeBlocking();
    };
  }, [currentUser?.uid, viewUserId, isOwnProfile]);

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
              ) : (isOwnProfile ? profileImage : viewedUserData?.profileImage) ? (
                <Image 
                  source={{ uri: isOwnProfile ? profileImage : viewedUserData?.profileImage }} 
                  style={styles.profileImage}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Text style={styles.profileEmoji}>👤</Text>
                </View>
              )}
            </View>
            {isEditing && isOwnProfile && (
              <TouchableOpacity 
                style={styles.editImageButton}
                onPress={selectProfileImage}
              >
                <MaterialIcons name="camera-alt" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* User Name */}
          {isEditing && isOwnProfile ? (
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
              {isOwnProfile ? (user?.displayName || 'Pet Lover') : (viewedUserData?.displayName || displayName || 'Pet Lover')}
            </Text>
          )}

          {/* User Email - Only show for own profile */}
          {isOwnProfile && (
            <Text style={styles.userEmail}>
              {user?.email || ''}
            </Text>
          )}

          {/* If this user has blocked me, show limited view */}
          {!isOwnProfile && isBlockedByUser ? (
            <View style={{ marginTop: SPACING.lg, paddingHorizontal: SPACING.lg, width: '100%' }}>
              <Text style={{ color: COLORS.secondaryText || '#65676b', textAlign: 'center' }}>
                You can't view this profile because this user has blocked you.
              </Text>
            </View>
          ) : (
          <>
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {isOwnProfile && isEditing ? (
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
                {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={handleEditProfile}
                >
                  <MaterialIcons name="edit" size={18} color="#ffffff" />
                  <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
                )}
                {!isOwnProfile && (
                  <>
                    <View style={{ flex: 1, flexDirection: 'row', gap: SPACING.sm }}>
                      {isBlockingUser ? (
                        <TouchableOpacity 
                          style={styles.unfriendButton}
                          onPress={handleUnblockUser}
                          disabled={isSendingRequest}
                        >
                          {isSendingRequest ? (
                            <ActivityIndicator color="#dc2626" size="small" />
                          ) : (
                            <>
                              <MaterialIcons 
                                name="block" 
                                size={18} 
                                color="#dc2626" 
                              />
                              <Text style={styles.unfriendButtonText}>
                                Unblock
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : isFriend ? (
                        <TouchableOpacity 
                          style={styles.unfriendButton}
                          onPress={handleUnfriend}
                          disabled={isSendingRequest}
                        >
                          {isSendingRequest ? (
                            <ActivityIndicator color="#dc2626" size="small" />
                          ) : (
                            <>
                              <MaterialIcons 
                                name="person-remove" 
                                size={18} 
                                color="#dc2626" 
                              />
                              <Text style={styles.unfriendButtonText}>
                                Unfriend
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.addFriendButton}
                          onPress={
                            hasIncomingRequest 
                              ? handleAcceptRequest 
                              : hasPendingRequest 
                              ? handleCancelRequest 
                              : handleAddFriend
                          }
                          disabled={isSendingRequest}
                        >
                          {isSendingRequest ? (
                            <ActivityIndicator color="#ffffff" size="small" />
                          ) : (
                            <>
                              <MaterialIcons 
                                name={
                                  hasIncomingRequest 
                                    ? "check-circle" 
                                    : hasPendingRequest 
                                    ? "person-remove" 
                                    : "person-add"
                                } 
                                size={18} 
                                color="#ffffff" 
                              />
                              <Text style={styles.addFriendButtonText}>
                                {
                                  hasIncomingRequest 
                                    ? 'Confirm Request' 
                                    : hasPendingRequest 
                                    ? 'Cancel Request' 
                                    : 'Add Friend'
                                }
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      {!isBlockingUser && !isBlockedByUser && (
                        <TouchableOpacity 
                          style={styles.messageButton}
                          onPress={() => {
                            if (viewedUserData) {
                              setDirectChatVisible(true);
                            }
                          }}
                        >
                          <MaterialIcons name="message" size={18} color="#050505" />
                          <Text style={styles.messageButtonText}>Message</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
                {!isOwnProfile && !isBlockingUser && (
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={handleBlockUser}
                  >
                    <MaterialIcons name="block" size={24} color="#e41e3f" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
          </>
          )}
        </View>

        {/* Friends Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('FriendRequests')}
                style={{ position: 'relative', padding: 4 }}
              >
                <MaterialIcons name="person-add-alt" size={24} color={COLORS.darkPurple || '#1877f2'} />
                {incomingRequestsCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#e41e3f',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 4,
                  }}>
                    <Text style={{
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}>
                      {incomingRequestsCount > 9 ? '9+' : incomingRequestsCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('FriendsList')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
            </View>
          </View>
          <View style={styles.friendsGrid}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No friends yet. Add some friends to get started!</Text>
              </View>
            ) : (
              friends.slice(0, 6).map((friend) => (
                <TouchableOpacity
                  key={friend.id}
                  style={styles.friendItem}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('Profile', { userId: friend.id })}
                >
                <View style={styles.friendImage}>
                    {friend.profileImage ? (
                      <Image
                        source={{ uri: friend.profileImage }}
                        style={{ width: 100, height: 100, borderRadius: 50 }}
                        contentFit="cover"
                      />
                    ) : (
                  <MaterialIcons name="account-circle" size={100} color="#bcc0c4" />
                    )}
                </View>
                <Text style={styles.friendName} numberOfLines={1}>
                  {friend.name}
                </Text>
                </TouchableOpacity>
              ))
            )}
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

      {/* Direct Chat Modal */}
      {viewedUserData && (
        <DirectChatModal
          visible={directChatVisible}
          onClose={() => setDirectChatVisible(false)}
          friend={{
            id: viewUserId,
            name: viewedUserData.displayName || viewedUserData.name || 'Pet Lover',
            profileImage: viewedUserData.profileImage || null,
          }}
        />
      )}
    </View>
  );
};

export default ProfileScreen;

