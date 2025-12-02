import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { auth, db, storage } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const DirectChatModal = ({ visible, onClose, friend }) => {
  const { colors: COLORS } = useTheme();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasBlocked, setHasBlocked] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [chatRestricted, setChatRestricted] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0 });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [messageToReport, setMessageToReport] = useState(null);
  const [reportedMessageIds, setReportedMessageIds] = useState(new Set());
  const messageLayouts = useRef({});
  const messageRefs = useRef({});
  const scrollViewRef = useRef(null);
  const currentUser = auth.currentUser;

  // Get chat ID - unique for each pair of users - memoized
  const getChatId = useCallback(() => {
    if (!currentUser || !friend?.id) return null;
    const userIds = [currentUser.uid, friend.id].sort();
    return `direct_${userIds[0]}_${userIds[1]}`;
  }, [currentUser, friend?.id]);

  // Check block status and ban status
  useEffect(() => {
    if (!visible || !currentUser || !friend?.id) {
      setIsBlocked(false);
      setHasBlocked(false);
      setIsBanned(false);
      return;
    }

    const checkBlockStatus = async () => {
      try {
        // Check if current user's chat is restricted
        if (currentUser) {
          const currentUserDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (currentUserDoc.exists()) {
            const currentUserData = currentUserDoc.data();
            if (currentUserData.chatRestricted) {
              // Check if restriction has expired
              if (currentUserData.chatRestrictionExpiresAt) {
                const expiryDate = currentUserData.chatRestrictionExpiresAt.toDate ? currentUserData.chatRestrictionExpiresAt.toDate() : new Date(currentUserData.chatRestrictionExpiresAt);
                if (new Date() < expiryDate) {
                  setChatRestricted(true);
                } else {
                  // Restriction expired, update user document
                  await updateDoc(doc(db, 'users', currentUser.uid), {
                    chatRestricted: false,
                    chatRestrictionExpiresAt: null
                  });
                  setChatRestricted(false);
                }
              } else {
                setChatRestricted(true);
              }
            } else {
              setChatRestricted(false);
            }
          }
        }

        // Check if friend is banned
        const userDoc = await getDoc(doc(db, 'users', friend.id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.status === 'banned') {
            setIsBanned(true);
            Alert.alert(
              'User Banned',
              'This user has been banned and you cannot chat with them.',
              [{ text: 'OK', onPress: onClose }]
            );
            return;
          }
        }
        
        const blockedByOtherId = `${friend.id}_${currentUser.uid}`;
        const blockedByOtherDoc = await getDoc(doc(db, 'blocks', blockedByOtherId));
        setIsBlocked(blockedByOtherDoc.exists());

        const hasBlockedId = `${currentUser.uid}_${friend.id}`;
        const hasBlockedDoc = await getDoc(doc(db, 'blocks', hasBlockedId));
        setHasBlocked(hasBlockedDoc.exists());
      } catch (error) {
        console.error('Error checking block status:', error);
        setIsBlocked(false);
        setHasBlocked(false);
        setIsBanned(false);
        setChatRestricted(false);
      }
    };

    checkBlockStatus();

    const blockedByOtherId = `${friend.id}_${currentUser.uid}`;
    const hasBlockedId = `${currentUser.uid}_${friend.id}`;
    
    const unsubscribe1 = onSnapshot(doc(db, 'blocks', blockedByOtherId), (docSnap) => {
      setIsBlocked(docSnap.exists());
    }, (error) => {
      if (error.code === 'not-found' || error.code === 'permission-denied') {
        setIsBlocked(false);
      }
    });

    const unsubscribe2 = onSnapshot(doc(db, 'blocks', hasBlockedId), (docSnap) => {
      setHasBlocked(docSnap.exists());
    }, (error) => {
      if (error.code === 'not-found' || error.code === 'permission-denied') {
        setHasBlocked(false);
      }
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [visible, currentUser, friend?.id]);

  // Load reported messages by current user
  useEffect(() => {
    if (!visible || !currentUser) {
      setReportedMessageIds(new Set());
      return;
    }

    const chatId = getChatId();
    if (!chatId) {
      setReportedMessageIds(new Set());
      return;
    }

    const reportsRef = collection(db, 'message_reports');
    const reportsQuery = query(
      reportsRef,
      where('chatId', '==', chatId),
      where('chatType', '==', 'direct'),
      where('reportedBy', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reportedIds = new Set();
      snapshot.docs.forEach(doc => {
        const reportData = doc.data();
        if (reportData.messageId) {
          reportedIds.add(reportData.messageId);
        }
      });
      setReportedMessageIds(reportedIds);
    }, (error) => {
      console.error('Error loading reported messages:', error);
    });

    return () => unsubscribe();
  }, [visible, currentUser, friend?.id, getChatId]);

  // Load messages
  useEffect(() => {
    if (!visible || !currentUser || !friend?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const chatId = getChatId();
    if (!chatId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const messagesRef = collection(db, 'direct_messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(message => {
          // Hide messages that have been reported by the current user
          if (!currentUser) return true;
          return !reportedMessageIds.has(message.id);
        });
      setMessages(messagesData);
      setLoading(false);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (error) => {
      console.error('Error loading messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [visible, currentUser, friend?.id, reportedMessageIds]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Reset selected images when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedImages([]);
    }
  }, [visible]);

  // Open camera - memoized
  const openCamera = useCallback(async () => {
    if (isBlocked || hasBlocked || isBanned) {
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your camera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({ uri: asset.uri }));
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, [isBlocked, hasBlocked, isBanned]);

  // Open image library - memoized
  const openImageLibrary = useCallback(async () => {
    if (isBlocked || hasBlocked) {
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos.');
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
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [isBlocked, hasBlocked]);

  // Show image picker options - memoized
  const showImagePickerOptions = useCallback(() => {
    if (isBlocked || hasBlocked || isBanned) {
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose an option',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Photo Library', onPress: openImageLibrary },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  }, [isBlocked, hasBlocked, isBanned, openCamera, openImageLibrary]);

  const removeImage = useCallback((index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle message menu - memoized
  const handleMessageMenu = useCallback((messageId) => {
    setSelectedMessageId(messageId);
  }, []);

  // Cancel menu - memoized
  const cancelMenu = useCallback(() => {
    setSelectedMessageId(null);
    setEditingMessageId(null);
    setEditText('');
    setMenuPosition({ top: 0 });
  }, []);

  // Edit message - memoized
  const handleEditMessage = useCallback((message) => {
    setEditingMessageId(message.id);
    setEditText(message.text || '');
    setSelectedMessageId(null);
  }, []);

  // Save edited message - memoized
  const saveEditedMessage = useCallback(async () => {
    if (!editingMessageId || !editText.trim()) {
      cancelMenu();
      return;
    }

    try {
      const messageRef = doc(db, 'direct_messages', editingMessageId);
      await updateDoc(messageRef, {
        text: editText.trim(),
        edited: true,
        editedAt: serverTimestamp(),
      });
      cancelMenu();
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message. Please try again.');
    }
  }, [editingMessageId, editText, cancelMenu]);

  // Copy message - memoized
  const handleCopyMessage = useCallback(async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    cancelMenu();
    Alert.alert('Copied', 'Message copied to clipboard');
  }, [cancelMenu]);

  // Delete message - memoized
  const handleDeleteMessage = useCallback((messageId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel', onPress: cancelMenu },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const messageRef = doc(db, 'direct_messages', messageId);
              const messageDoc = await getDoc(messageRef);
              
              if (messageDoc.exists()) {
                const messageData = messageDoc.data();
                // Mark message as deleted instead of deleting it
                await updateDoc(messageRef, {
                  deleted: true,
                  deletedBy: currentUser.uid,
                  deletedAt: serverTimestamp(),
                  text: null, // Clear the text
                  images: null, // Clear the images
                });
              }
              cancelMenu();
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          },
        },
      ]
    );
  }, [cancelMenu, currentUser]);

  // Report message - memoized
  const handleReportMessage = useCallback((message) => {
    // Don't allow reporting deleted messages
    if (message.deleted) {
      Alert.alert('Cannot Report', 'You cannot report a deleted message.');
      cancelMenu();
      return;
    }

    // Show confirmation before opening report modal
    Alert.alert(
      'Report Message',
      'Are you sure you want to report this message? Our team will review it.',
      [
        { text: 'Cancel', style: 'cancel', onPress: cancelMenu },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            setMessageToReport(message);
            setReportModalVisible(true);
            cancelMenu();
          },
        },
      ]
    );
  }, [cancelMenu]);

  const submitReport = useCallback(async (reason) => {
    if (!currentUser || !messageToReport) return;

    try {
      await addDoc(collection(db, 'message_reports'), {
        messageId: messageToReport.id,
        chatId: getChatId(),
        chatType: 'direct',
        reportedBy: currentUser.uid,
        reportedByName: currentUser.displayName || 'Unknown',
        reportedUser: messageToReport.senderId,
        reportedUserName: messageToReport.senderName || 'Unknown',
        messageText: messageToReport.text || '',
        messageImages: messageToReport.images || [],
        reason: reason,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      // Add to reported messages set to hide it immediately
      setReportedMessageIds(prev => new Set([...prev, messageToReport.id]));
      setReportModalVisible(false);
      setMessageToReport(null);
      Alert.alert('Report Submitted', 'Thank you for reporting this message. Our team will review it.');
    } catch (error) {
      console.error('Error reporting message:', error);
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  }, [currentUser, messageToReport, getChatId]);

  const sendMessage = useCallback(async () => {
    if ((!messageText.trim() && selectedImages.length === 0) || !currentUser || !friend?.id || sending || uploadingImages) return;
    
    if (chatRestricted) {
      Alert.alert('Chat Restricted', 'Your ability to send messages has been restricted by an administrator.');
      return;
    }
    
    if (isBanned) {
      Alert.alert('Cannot Send Message', 'This user has been banned and you cannot chat with them.');
      return;
    }
    
    if (isBlocked) {
      Alert.alert('Cannot Send Message', 'You cannot message this person.');
      return;
    }

    if (hasBlocked) {
      Alert.alert('Cannot Send Message', 'You have blocked this user. Unblock them to send messages.');
      return;
    }

    const chatId = getChatId();
    if (!chatId) return;

    setSending(true);
    setUploadingImages(true);
    const messageToSend = messageText.trim();
    const imagesToSend = [...selectedImages];
    setMessageText('');
    setSelectedImages([]);

    try {
      // Upload images to Firebase Storage
      const imageUrls = [];
      for (const image of imagesToSend) {
        try {
          const response = await fetch(image.uri);
          const blob = await response.blob();
          const imageRef = ref(storage, `chat_images/${chatId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);
          await uploadBytes(imageRef, blob);
          const downloadURL = await getDownloadURL(imageRef);
          imageUrls.push(downloadURL);
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to send messages.');
        return;
      }

      const messageData = {
        text: messageToSend || '',
        images: imageUrls.length > 0 ? imageUrls : null,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Pet Lover',
        timestamp: serverTimestamp(),
        chatId: chatId,
      };

      const messagesRef = collection(db, 'direct_messages');
      await addDoc(messagesRef, messageData);

      // Update or create chat metadata
      const chatRef = doc(db, 'direct_chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      const lastMessagePreview = imageUrls.length > 0 
        ? (imageUrls.length === 1 ? '📷 Photo' : `📷 ${imageUrls.length} Photos`)
        : messageToSend;
      
      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          id: chatId,
          participants: [currentUser.uid, friend.id].sort(),
          lastMessage: lastMessagePreview,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          readBy: [currentUser.uid], // Mark as read by sender
        });
      } else {
        const chatData = chatDoc.data();
        const updateData = {
          lastMessage: lastMessagePreview,
          lastMessageTime: serverTimestamp(),
          readBy: [currentUser.uid], // Mark as read by sender (others haven't read it yet)
        };
        
        // If chat was deleted for this user, restore it by removing from deletedBy
        if (chatData.deletedBy && chatData.deletedBy.includes(currentUser.uid)) {
          updateData.deletedBy = arrayRemove(currentUser.uid);
        }
        
        await setDoc(chatRef, updateData, { merge: true });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageText(messageToSend);
      setSelectedImages(imagesToSend);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploadingImages(false);
    }
  }, [messageText, selectedImages, currentUser, friend?.id, sending, uploadingImages, chatRestricted, isBanned, isBlocked, hasBlocked, getChatId]);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: '#F0F2F5',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: '85%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      backgroundColor: COLORS.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      justifyContent: 'space-between',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: SPACING.sm,
      backgroundColor: '#e4e6eb',
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.text,
      fontFamily: FONTS.family,
    },
    headerSubtitle: {
      fontSize: 12,
      color: COLORS.secondaryText,
      fontFamily: FONTS.family,
    },
    iconButton: {
      padding: SPACING.xs,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    messageBubble: {
      maxWidth: '75%',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.xs,
    },
    messageBubbleSent: {
      backgroundColor: COLORS.darkPurple || '#1877f2',
      alignSelf: 'flex-end',
    },
    messageBubbleReceived: {
      backgroundColor: '#FFFFFF',
      alignSelf: 'flex-start',
    },
    messageText: {
      fontSize: 15,
      color: '#FFFFFF',
      fontFamily: FONTS.family,
      lineHeight: 20,
    },
    messageTextReceived: {
      color: COLORS.text,
    },
    messageTime: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: SPACING.xs / 2,
      fontFamily: FONTS.family,
    },
    messageTimeReceived: {
      color: COLORS.secondaryText,
    },
    inputArea: {
      backgroundColor: COLORS.background,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    blockedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
      backgroundColor: COLORS.lightBlue || '#e7f3ff',
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      gap: 8,
    },
    blockedText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.error || '#FF3B30',
      fontFamily: FONTS.family,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    textInput: {
      flex: 1,
      backgroundColor: '#F0F2F5',
      borderRadius: RADIUS.large,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      marginRight: SPACING.sm,
      fontSize: 15,
      color: COLORS.text,
      fontFamily: FONTS.family,
      maxHeight: 100,
    },
    textInputDisabled: {
      backgroundColor: '#E4E6EB',
      opacity: 0.6,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: SPACING.xl,
    },
    emptyText: {
      fontSize: 15,
      color: COLORS.secondaryText,
      textAlign: 'center',
      fontFamily: FONTS.family,
    },
    blockedMessageContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.md,
      gap: 8,
      backgroundColor: COLORS.lightBlue || '#e7f3ff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: RADIUS.medium,
    },
    blockedMessageText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.error || '#FF3B30',
      fontFamily: FONTS.family,
    },
    messageImagesContainer: {
      marginBottom: SPACING.xs,
      gap: SPACING.xs,
    },
    messageImage: {
      width: 200,
      height: 200,
      borderRadius: RADIUS.medium,
      backgroundColor: '#E4E6EB',
    },
    imagePreviewContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      backgroundColor: COLORS.background,
    },
    imagePreviewScroll: {
      flexDirection: 'row',
    },
    imagePreviewWrapper: {
      position: 'relative',
      marginRight: SPACING.sm,
    },
    imagePreview: {
      width: 80,
      height: 80,
      borderRadius: RADIUS.small,
      backgroundColor: '#E4E6EB',
    },
    removeImageButton: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: COLORS.error || '#FF3B30',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: COLORS.background,
    },
    attachButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    messageTextContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
    },
    editedLabel: {
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.6)',
      fontStyle: 'italic',
      fontFamily: FONTS.family,
    },
    editedLabelReceived: {
      color: COLORS.secondaryText,
    },
    messageMenuButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      padding: 4,
    },
    messageMenuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
      justifyContent: 'center',
      alignItems: 'center',
    },
    messageMenuBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    messageMenu: {
      backgroundColor: COLORS.background || '#FFFFFF',
      borderRadius: RADIUS.medium,
      paddingVertical: SPACING.xs,
      minWidth: 140,
      zIndex: 1001,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    messageMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    messageMenuItemDelete: {
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    messageMenuItemText: {
      fontSize: 15,
      color: COLORS.text,
      fontFamily: FONTS.family,
    },
    messageMenuItemTextDelete: {
      color: COLORS.error || '#FF3B30',
    },
    editMessageContainer: {
      width: '100%',
    },
    editMessageInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: RADIUS.small,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: FONTS.family,
      minHeight: 40,
      maxHeight: 100,
      marginBottom: SPACING.xs,
    },
    editMessageInputReceived: {
      backgroundColor: '#F0F2F5',
      color: COLORS.text,
    },
    editMessageActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: SPACING.sm,
      marginTop: SPACING.xs,
    },
    editMessageButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: RADIUS.small,
      padding: SPACING.sm,
      minWidth: 40,
      minHeight: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editMessageButtonSave: {
      backgroundColor: COLORS.success || '#34C759',
    },
    reportModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      zIndex: 2000,
    },
    reportModalContent: {
      width: '100%',
      backgroundColor: '#f0f2f5',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: SPACING.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    reportModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.text,
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    reportModalSubtitle: {
      fontSize: 14,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: SPACING.lg,
    },
    reportOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f2f5',
    },
    reportOptionText: {
      fontSize: 16,
      color: COLORS.error || '#FF3B30',
      fontWeight: '500',
    },
    reportCancelButton: {
      marginTop: SPACING.lg,
      alignItems: 'center',
      padding: SPACING.md,
      backgroundColor: COLORS.background || '#FFFFFF',
      borderRadius: RADIUS.medium,
      borderWidth: 1,
      borderColor: '#e4e6eb',
    },
    reportCancelText: {
      fontSize: 16,
      color: COLORS.text,
      fontWeight: '600',
    },
  }), [COLORS]);

  if (!friend || !currentUser) return null;
  
  // Don't render if user is banned
  if (isBanned) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {friend?.profileImage ? (
                  <Image
                    source={{ uri: friend.profileImage }}
                    style={styles.profileImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.profilePlaceholder}>
                    <MaterialIcons name="person" size={20} color="#65676b" />
                  </View>
                )}
                <View style={styles.headerInfo}>
                  <Text style={styles.headerName}>
                    {friend?.name || 'Pet Lover'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Active now
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={onClose}
              >
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.darkPurple} />
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={{ paddingBottom: SPACING.md }}
                showsVerticalScrollIndicator={false}
              >
                {isBlocked && (
                  <View style={styles.blockedMessageContainer}>
                    <MaterialIcons name="block" size={24} color={COLORS.error || '#FF3B30'} />
                    <Text style={styles.blockedMessageText}>
                      You cannot message this person
                    </Text>
                  </View>
                )}
                {messages.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      {isBlocked ? 'You cannot message this person' : 'No messages yet. Start the conversation!'}
                    </Text>
                  </View>
                ) : (
                  messages.map((message) => {
                    const isSent = currentUser && message.senderId === currentUser.uid;
                    const isEditing = editingMessageId === message.id;
                    return (
                      <View
                        key={message.id}
                        ref={(ref) => { if (ref) messageRefs.current[message.id] = ref; }}
                        onLayout={(event) => {
                          const { y, height } = event.nativeEvent.layout;
                          messageLayouts.current[message.id] = { y, height };
                        }}
                      >
                        <Pressable
                          style={[
                            styles.messageBubble,
                            isSent ? styles.messageBubbleSent : styles.messageBubbleReceived,
                            selectedMessageId === message.id && { opacity: 0.7 }
                          ]}
                          onLongPress={() => handleMessageMenu(message.id)}
                        >
                        {isEditing ? (
                          <View style={styles.editMessageContainer}>
                            <TextInput
                              style={[
                                styles.editMessageInput,
                                !isSent && styles.editMessageInputReceived
                              ]}
                              value={editText}
                              onChangeText={setEditText}
                              multiline
                              autoFocus
                              placeholderTextColor={isSent ? 'rgba(255, 255, 255, 0.6)' : COLORS.secondaryText}
                            />
                            <View style={styles.editMessageActions}>
                              <TouchableOpacity
                                style={[styles.editMessageButton, styles.editMessageButtonSave]}
                                onPress={saveEditedMessage}
                                activeOpacity={0.7}
                              >
                                <MaterialIcons name="check" size={20} color="#FFFFFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.editMessageButton}
                                onPress={cancelMenu}
                                activeOpacity={0.7}
                              >
                                <MaterialIcons name="close" size={20} color={isSent ? "#FFFFFF" : COLORS.text} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            {message.deleted ? (
                              <View style={[styles.messageTextContainer, { alignItems: 'center' }]}>
                                <MaterialIcons 
                                  name="delete-outline" 
                                  size={16} 
                                  color={isSent ? 'rgba(255, 255, 255, 0.6)' : COLORS.secondaryText} 
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={[
                                    styles.messageText,
                                    !isSent && styles.messageTextReceived,
                                    { fontStyle: 'italic', opacity: 0.7 }
                                  ]}
                                >
                                  {message.deletedBy === currentUser?.uid 
                                    ? 'You deleted a message' 
                                    : `${message.senderName?.split(' ')[0] || 'Someone'} deleted a message`}
                                </Text>
                              </View>
                            ) : (
                              <>
                                {message.images && message.images.length > 0 && (
                                  <View style={styles.messageImagesContainer}>
                                    {message.images.map((imageUrl, index) => (
                                      <Image
                                        key={index}
                                        source={{ uri: imageUrl }}
                                        style={styles.messageImage}
                                        contentFit="cover"
                                      />
                                    ))}
                                  </View>
                                )}
                                {message.text && (
                                  <View style={styles.messageTextContainer}>
                                    <Text
                                      style={[
                                        styles.messageText,
                                        !isSent && styles.messageTextReceived,
                                      ]}
                                    >
                                      {message.text}
                                    </Text>
                                    {message.edited && (
                                      <Text style={[styles.editedLabel, !isSent && styles.editedLabelReceived]}>
                                        (edited)
                                      </Text>
                                    )}
                                  </View>
                                )}
                              </>
                            )}
                            {message.timestamp && (
                              <Text
                                style={[
                                  styles.messageTime,
                                  !isSent && styles.messageTimeReceived,
                                ]}
                              >
                                {formatTime(message.timestamp)}
                              </Text>
                            )}
                          </>
                        )}
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}

            {/* Input Area */}
            <View style={styles.inputArea}>
              {(isBlocked || hasBlocked || isBanned || chatRestricted) ? (
                <View style={styles.blockedBanner}>
                  <MaterialIcons name="block" size={20} color={COLORS.error || '#FF3B30'} />
                  <Text style={styles.blockedText}>
                    {chatRestricted ? 'Your chat has been restricted by an administrator' : isBlocked ? 'You cannot message this person' : 'You have blocked this user'}
                  </Text>
                </View>
              ) : (
                <>
                  {selectedImages.length > 0 && (
                    <View style={styles.imagePreviewContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                        {selectedImages.map((image, index) => (
                          <View key={index} style={styles.imagePreviewWrapper}>
                            <Image source={{ uri: image.uri }} style={styles.imagePreview} contentFit="cover" />
                            <TouchableOpacity
                              style={styles.removeImageButton}
                              onPress={() => removeImage(index)}
                            >
                              <MaterialIcons name="close" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  <View style={styles.inputContainer}>
                     <TouchableOpacity
                       style={styles.attachButton}
                       onPress={showImagePickerOptions}
                       disabled={isBlocked || hasBlocked || isBanned || chatRestricted}
                     >
                       <MaterialIcons 
                         name="add-photo-alternate" 
                         size={24} 
                         color={isBlocked || hasBlocked || isBanned || chatRestricted ? COLORS.secondaryText : COLORS.darkPurple} 
                       />
                     </TouchableOpacity>
                    <TextInput
                      style={[styles.textInput, (isBlocked || hasBlocked || isBanned || chatRestricted) && styles.textInputDisabled]}
                      placeholder="Type a message..."
                      placeholderTextColor={COLORS.secondaryText}
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                      maxLength={500}
                      editable={!isBlocked && !hasBlocked && !isBanned && !chatRestricted}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        ((!messageText.trim() && selectedImages.length === 0) || sending || uploadingImages) && styles.sendButtonDisabled,
                      ]}
                      onPress={sendMessage}
                      disabled={(!messageText.trim() && selectedImages.length === 0) || sending || uploadingImages}
                    >
                      {(sending || uploadingImages) ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <MaterialIcons name="send" size={20} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Message Menu */}
            {selectedMessageId && (() => {
              const selectedMessage = messages.find(m => m.id === selectedMessageId);
              const hasImages = selectedMessage?.images && selectedMessage.images.length > 0;
              const isOwnMessage = selectedMessage?.senderId === currentUser?.uid;
              return (
                <View style={styles.messageMenuOverlay}>
                  <Pressable style={styles.messageMenuBackdrop} onPress={cancelMenu} />
                  <View style={styles.messageMenu}>
                    {!hasImages && (
                      <TouchableOpacity
                        style={styles.messageMenuItem}
                        onPress={() => handleCopyMessage(selectedMessage?.text)}
                      >
                        <MaterialIcons name="content-copy" size={20} color={COLORS.text} />
                        <Text style={styles.messageMenuItemText}>Copy</Text>
                      </TouchableOpacity>
                    )}
                    {isOwnMessage && !hasImages && (
                      <TouchableOpacity
                        style={styles.messageMenuItem}
                        onPress={() => {
                          if (selectedMessage) handleEditMessage(selectedMessage);
                        }}
                      >
                        <MaterialIcons name="edit" size={20} color={COLORS.text} />
                        <Text style={styles.messageMenuItemText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                    {isOwnMessage && !selectedMessage?.deleted && (
                      <TouchableOpacity
                        style={[styles.messageMenuItem, !hasImages && styles.messageMenuItemDelete]}
                        onPress={() => handleDeleteMessage(selectedMessageId)}
                      >
                        <MaterialIcons name="delete" size={20} color={COLORS.error || '#FF3B30'} />
                        <Text style={[styles.messageMenuItemText, styles.messageMenuItemTextDelete]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    {!isOwnMessage && !selectedMessage?.deleted && (
                      <TouchableOpacity
                        style={styles.messageMenuItem}
                        onPress={() => {
                          if (selectedMessage) handleReportMessage(selectedMessage);
                        }}
                      >
                        <MaterialIcons name="flag" size={20} color={COLORS.error || '#FF3B30'} />
                        <Text style={[styles.messageMenuItemText, { color: COLORS.error || '#FF3B30' }]}>Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })()}
            {/* Report Reason Modal */}
            {reportModalVisible && (
              <View style={styles.reportModalOverlay}>
                <View style={styles.reportModalContent}>
                  <Text style={styles.reportModalTitle}>Report Message</Text>
                  <Text style={styles.reportModalSubtitle}>Please select a reason:</Text>
                  
                  {['Inappropriate Content', 'Harassment', 'Spam', 'Scam', 'Other'].map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      style={styles.reportOption}
                      onPress={() => submitReport(reason)}
                    >
                      <Text style={styles.reportOptionText}>{reason}</Text>
                      <MaterialIcons name="chevron-right" size={24} color={COLORS.secondaryText} />
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={styles.reportCancelButton}
                    onPress={() => {
                      setReportModalVisible(false);
                      setMessageToReport(null);
                    }}
                  >
                    <Text style={styles.reportCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default DirectChatModal;

