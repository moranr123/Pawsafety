import React, { useState, useEffect, useRef } from 'react';
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
  serverTimestamp,
  doc,
  getDoc,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FONTS, SPACING, RADIUS, COLORS as THEME_COLORS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const ReportChatModal = ({ visible, onClose, report, reporter, chatId }) => {
  const { colors: COLORS } = useTheme();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [showActionsBanner, setShowActionsBanner] = useState(true);
  const [reportStatus, setReportStatus] = useState(null);
  const [showReportDetails, setShowReportDetails] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false); // Current user is blocked by other user
  const [hasBlocked, setHasBlocked] = useState(false); // Current user has blocked other user
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0 });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [messageToReport, setMessageToReport] = useState(null);
  const messageLayouts = useRef({});
  const messageRefs = useRef({});
  const scrollViewRef = useRef(null);
  const currentUser = auth.currentUser;

  // Get chat ID - unique for each report between two users
  const getChatId = () => {
    if (chatId) return chatId;
    if (!currentUser || !report?.userId) return null;
    const userIds = [currentUser.uid, report.userId].sort();
    return `report_${report.id}_${userIds[0]}_${userIds[1]}`;
  };

  // Check block status
  useEffect(() => {
    if (!visible || !currentUser || !otherUser?.id) {
      setIsBlocked(false);
      setHasBlocked(false);
      return;
    }

    const checkBlockStatus = async () => {
      try {
        // Check if current user is blocked by other user
        const blockedByOtherId = `${otherUser.id}_${currentUser.uid}`;
        const blockedByOtherDoc = await getDoc(doc(db, 'blocks', blockedByOtherId));
        setIsBlocked(blockedByOtherDoc.exists());

        // Check if current user has blocked other user
        const hasBlockedId = `${currentUser.uid}_${otherUser.id}`;
        const hasBlockedDoc = await getDoc(doc(db, 'blocks', hasBlockedId));
        setHasBlocked(hasBlockedDoc.exists());
      } catch (error) {
        console.error('Error checking block status:', error);
        setIsBlocked(false);
        setHasBlocked(false);
      }
    };

    checkBlockStatus();

    // Listen for real-time block status changes
    const blockedByOtherId = `${otherUser.id}_${currentUser.uid}`;
    const hasBlockedId = `${currentUser.uid}_${otherUser.id}`;
    
    const unsubscribe1 = onSnapshot(doc(db, 'blocks', blockedByOtherId), (docSnap) => {
      // Document exists = blocked, document doesn't exist = unblocked
      setIsBlocked(docSnap.exists());
    }, (error) => {
      // If document doesn't exist, it means not blocked
      if (error.code === 'not-found' || error.code === 'permission-denied') {
        setIsBlocked(false);
      } else {
        console.error('Error listening to block status:', error);
      }
    });

    const unsubscribe2 = onSnapshot(doc(db, 'blocks', hasBlockedId), (docSnap) => {
      // Document exists = blocked, document doesn't exist = unblocked
      setHasBlocked(docSnap.exists());
    }, (error) => {
      // If document doesn't exist, it means not blocked
      if (error.code === 'not-found' || error.code === 'permission-denied') {
        setHasBlocked(false);
      } else {
        console.error('Error listening to block status:', error);
      }
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [visible, currentUser, otherUser?.id]);

  // Listen to report status changes in real-time
  useEffect(() => {
    if (!visible || !report?.id) {
      setReportStatus(null);
      return;
    }

    // Set initial status
    setReportStatus(report?.status || 'Stray');

    // Listen for real-time updates to the report
    const reportRef = doc(db, 'stray_reports', report.id);
    const unsubscribe = onSnapshot(reportRef, (docSnap) => {
      if (docSnap.exists()) {
        const reportData = docSnap.data();
        setReportStatus(reportData.status || 'Stray');
      }
    }, (error) => {
      console.error('Error listening to report status:', error);
    });

    return () => unsubscribe();
  }, [visible, report?.id]);

  // Set other user's info
  useEffect(() => {
    if (!visible) return;

    if (reporter) {
      setOtherUser({
        id: reporter.id || report?.userId,
        name: reporter.name || 'Pet Lover',
        profileImage: reporter.profileImage || null,
      });
      return;
    }

    // Fallback: load from report.userId if reporter prop is missing
    // Only do this if we are NOT the reporter
    if (report?.userId && report.userId !== currentUser?.uid) {
      const loadOtherUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', report.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setOtherUser({
              id: report.userId,
              name: userData.displayName || userData.name || 'Pet Lover',
              profileImage: userData.profileImage || null,
            });
          } else {
            setOtherUser({
              id: report.userId,
              name: 'Pet Lover',
              profileImage: null,
            });
          }
        } catch (error) {
          console.error('Error loading user:', error);
          setOtherUser({
            id: report.userId,
            name: 'Pet Lover',
            profileImage: null,
          });
        }
      };
      loadOtherUser();
    }
  }, [report?.userId, visible, reporter, currentUser?.uid]);

  // Load messages
  useEffect(() => {
    if (!visible || !currentUser || !report?.id) {
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
    const messagesRef = collection(db, 'report_messages');
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
          // Filter out messages deleted by current user
          if (!currentUser) return true;
          return !message.deletedBy || !message.deletedBy.includes(currentUser.uid);
        });
      setMessages(messagesData);
      setLoading(false);

      // Auto-scroll to bottom when new message arrives
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, (error) => {
      console.error('Error loading messages:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [visible, currentUser, report?.id]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Reset banner visibility when chat opens
  useEffect(() => {
    if (visible) {
      setShowActionsBanner(true);
      setSelectedImages([]);
    }
  }, [visible]);

  // Open camera
  const openCamera = async () => {
    if (isBlocked || hasBlocked || reportStatus === 'Resolved' || report?.status === 'Resolved') {
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
  };

  // Open image library
  const openImageLibrary = async () => {
    if (isBlocked || hasBlocked || reportStatus === 'Resolved' || report?.status === 'Resolved') {
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
  };

  // Show image picker options
  const showImagePickerOptions = () => {
    if (isBlocked || hasBlocked || reportStatus === 'Resolved' || report?.status === 'Resolved') {
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
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle message menu
  const handleMessageMenu = (messageId) => {
    setSelectedMessageId(messageId);
  };

  // Cancel menu
  const cancelMenu = () => {
    setSelectedMessageId(null);
    setEditingMessageId(null);
    setEditText('');
    setMenuPosition({ top: 0 });
  };

  // Edit message
  const handleEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text || '');
    setSelectedMessageId(null);
  };

  // Save edited message
  const saveEditedMessage = async () => {
    if (!editingMessageId || !editText.trim()) {
      cancelMenu();
      return;
    }

    try {
      const messageRef = doc(db, 'report_messages', editingMessageId);
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
  };

  // Copy message
  const handleCopyMessage = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    cancelMenu();
    Alert.alert('Copied', 'Message copied to clipboard');
  };

  // Delete message
  const handleDeleteMessage = (messageId) => {
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
              await deleteDoc(doc(db, 'report_messages', messageId));
              cancelMenu();
            } catch (error) {
              console.error('Error deleting message:', error);
              Alert.alert('Error', 'Failed to delete message. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Report message
  const handleReportMessage = (message) => {
    setMessageToReport(message);
    setReportModalVisible(true);
    cancelMenu();
  };

  const submitReport = async (reason) => {
    if (!currentUser || !messageToReport) return;

    try {
      await addDoc(collection(db, 'message_reports'), {
        messageId: messageToReport.id,
        chatId: chatId,
        chatType: 'report',
        reportId: report?.id || null,
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
      setReportModalVisible(false);
      setMessageToReport(null);
      Alert.alert('Report Submitted', 'Thank you for reporting this message. Our team will review it.');
    } catch (error) {
      console.error('Error reporting message:', error);
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  };

  const sendMessage = async () => {
    if ((!messageText.trim() && selectedImages.length === 0) || !currentUser || !report?.id || sending || uploadingImages) return;
    
    // Don't allow sending messages if user is blocked
    if (isBlocked) {
      Alert.alert('Cannot Send Message', 'You cannot message this person.');
      return;
    }

    // Don't allow sending messages if current user has blocked the other user
    if (hasBlocked) {
      Alert.alert('Cannot Send Message', 'You have blocked this user. Unblock them to send messages.');
      return;
    }
    
    // Don't allow sending messages if report is resolved
    if (reportStatus === 'Resolved' || report?.status === 'Resolved') {
      Alert.alert('Report Resolved', 'This report has been resolved. You can no longer send messages.');
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
        reportId: report.id,
        chatId: chatId,
      };

      // Add message to report_messages collection
      const messagesRef = collection(db, 'report_messages');
      await addDoc(messagesRef, messageData);

      // Update or create chat metadata
      const chatRef = doc(db, 'report_chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      const lastMessagePreview = imageUrls.length > 0 
        ? (imageUrls.length === 1 ? '📷 Photo' : `📷 ${imageUrls.length} Photos`)
        : messageToSend;
      
      if (!chatDoc.exists()) {
        // Create chat document if it doesn't exist
        await setDoc(chatRef, {
          id: chatId,
          reportId: report.id,
          participants: [currentUser.uid, report.userId].sort(),
          lastMessage: lastMessagePreview,
          lastMessageTime: serverTimestamp(),
          createdAt: serverTimestamp(),
          readBy: [currentUser.uid], // Mark as read by sender
        });
      } else {
        // Update last message
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
      setMessageText(messageToSend); // Restore message on error
      setSelectedImages(imagesToSend); // Restore images on error
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
      setUploadingImages(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!report?.id) return;

    Alert.alert(
      'Mark as Resolved',
      'Are you sure you want to mark this report as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Resolved',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'stray_reports', report.id), {
                status: 'Resolved',
                resolvedAt: serverTimestamp(),
              });
              Alert.alert('Success', 'Report marked as resolved.');
              setShowActionsBanner(false);
            } catch (error) {
              console.error('Error marking report as resolved:', error);
              Alert.alert('Error', 'Failed to mark report as resolved.');
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!otherUser?.id) return;
    const user = auth.currentUser;
    if (!user) return;

    if (hasBlocked) {
      // Unblock user
      Alert.alert(
        'Unblock User',
        `Are you sure you want to unblock ${otherUser.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unblock',
            onPress: async () => {
              try {
                const currentUser = auth.currentUser;
                if (!currentUser) return;
                
                const blockId = `${currentUser.uid}_${otherUser.id}`;
                await deleteDoc(doc(db, 'blocks', blockId));

                Alert.alert('Success', 'User has been unblocked.');
              } catch (error) {
                console.error('Error unblocking user:', error);
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
              }
            },
          },
        ]
      );
    } else {
      // Block user
      Alert.alert(
        'Block User',
        `If you block ${otherUser.name}, they won't be able to see your profile.\n\nYou will also stop being friends and any pending friend requests will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              try {
                const currentUser = auth.currentUser;
                if (!currentUser) return;
                
                const blockId = `${currentUser.uid}_${otherUser.id}`;

                // Create block document
                await setDoc(doc(db, 'blocks', blockId), {
                  userId: currentUser.uid,
                  blockedUserId: otherUser.id,
                  createdAt: serverTimestamp(),
                });

                // Remove friendship (both directions) if exists
                const friendId1 = `${currentUser.uid}_${otherUser.id}`;
                const friendId2 = `${otherUser.id}_${currentUser.uid}`;
                await deleteDoc(doc(db, 'friends', friendId1)).catch(() => {});
                await deleteDoc(doc(db, 'friends', friendId2)).catch(() => {});

                // Remove any friend requests between users
                const requestId1 = `${currentUser.uid}_${otherUser.id}`;
                const requestId2 = `${otherUser.id}_${currentUser.uid}`;
                await deleteDoc(doc(db, 'friend_requests', requestId1)).catch(() => {});
                await deleteDoc(doc(db, 'friend_requests', requestId2)).catch(() => {});

                Alert.alert('Success', 'User blocked.');
                onClose();
              } catch (error) {
                console.error('Error blocking user:', error);
                Alert.alert('Error', 'Failed to block user. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

  const formatTime = (timestamp) => {
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
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: '#F0F2F5', // Light grey for Messenger feel
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
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconButton: {
      padding: SPACING.xs,
      marginLeft: SPACING.xs,
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
      backgroundColor: COLORS.darkPurple || THEME_COLORS.darkPurple,
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
    actionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: '#F0F2F5',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    actionButtonsContainer: {
      flex: 1,
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#e4e6eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    actionButtonResolved: {
      backgroundColor: COLORS.success || '#34C759',
      borderColor: COLORS.success || '#34C759',
    },
    actionButtonBlock: {
      backgroundColor: COLORS.error || '#FF3B30',
      borderColor: COLORS.error || '#FF3B30',
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 6,
      color: COLORS.text,
      fontFamily: FONTS.family,
    },
    actionButtonTextResolved: {
      color: '#FFFFFF',
    },
    actionButtonTextBlock: {
      color: '#FFFFFF',
    },
    resolvedBanner: {
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
    resolvedText: {
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.text,
      fontFamily: FONTS.family,
      flex: 1,
      textAlign: 'center',
    },
    closeBannerButton: {
      padding: 4,
    },
    showActionsBannerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.background || '#F0F2F5',
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      gap: 6,
    },
    showActionsBannerText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.secondaryText,
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
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.darkPurple || THEME_COLORS.darkPurple,
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
    reportDetailsBanner: {
      backgroundColor: COLORS.background || '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    reportDetailsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
      gap: 8,
      paddingVertical: 4,
    },
    toggleButton: {
      padding: 4,
      marginLeft: 'auto',
    },
    reportDetailsTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: COLORS.text,
      fontFamily: FONTS.family,
      flex: 1,
    },
    reportStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    reportStatusText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
      fontFamily: FONTS.family,
    },
    reportDetailsContent: {
      gap: 6,
    },
    reportDetailRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    reportDetailText: {
      fontSize: 13,
      color: COLORS.text,
      fontFamily: FONTS.family,
      flex: 1,
      lineHeight: 18,
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
  });

  const isReporter = currentUser?.uid === report?.userId;

  if (!report || !currentUser) return null;

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
                {otherUser?.profileImage ? (
                  <Image
                    source={{ uri: otherUser.profileImage }}
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
                    {otherUser?.name || 'Pet Lover'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    About this report
                  </Text>
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={onClose}
                >
                  <MaterialIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Report Details Banner */}
            {report && (
              <View style={styles.reportDetailsBanner}>
                <TouchableOpacity 
                  style={styles.reportDetailsHeader}
                  onPress={() => setShowReportDetails(!showReportDetails)}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="description" size={18} color={COLORS.darkPurple || '#1877f2'} />
                  <Text style={styles.reportDetailsTitle}>Report Details</Text>
                  <View style={[
                    styles.reportStatusBadge,
                    reportStatus === 'Resolved' || report?.status === 'Resolved' 
                      ? { backgroundColor: COLORS.success || '#34C759' }
                      : report?.status === 'Lost'
                      ? { backgroundColor: COLORS.error || '#FF3B30' }
                      : report?.status === 'Stray'
                      ? { backgroundColor: COLORS.mediumBlue || '#1877f2' }
                      : { backgroundColor: COLORS.warning || '#FF9500' }
                  ]}>
                    <Text style={styles.reportStatusText}>
                      {reportStatus || report?.status || 'Stray'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={() => setShowReportDetails(!showReportDetails)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons 
                      name={showReportDetails ? "expand-less" : "expand-more"} 
                      size={20} 
                      color={COLORS.secondaryText} 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
                {showReportDetails && (
                  <View style={styles.reportDetailsContent}>
                  {report?.locationName && (
                    <View style={styles.reportDetailRow}>
                      <MaterialIcons name="location-on" size={16} color={COLORS.secondaryText} />
                      <Text style={styles.reportDetailText} numberOfLines={2}>
                        {report.locationName}
                      </Text>
                    </View>
                  )}
                  {report?.reportTime && (
                    <View style={styles.reportDetailRow}>
                      <MaterialIcons name="access-time" size={16} color={COLORS.secondaryText} />
                      <Text style={styles.reportDetailText}>
                        {(() => {
                          try {
                            const date = report.reportTime?.toDate ? 
                              report.reportTime.toDate() : 
                              new Date(report.reportTime);
                            return date.toLocaleString();
                          } catch (e) {
                            return 'Unknown time';
                          }
                        })()}
                      </Text>
                    </View>
                  )}
                  {report?.petType && (
                    <View style={styles.reportDetailRow}>
                      <MaterialIcons name="pets" size={16} color={COLORS.secondaryText} />
                      <Text style={styles.reportDetailText}>
                        {report.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}
                        {report?.petName && ` • ${report.petName}`}
                        {report?.breed && ` • ${report.breed}`}
                      </Text>
                    </View>
                  )}
                  {report?.description && (
                    <View style={styles.reportDetailRow}>
                      <MaterialIcons name="notes" size={16} color={COLORS.secondaryText} />
                      <Text style={styles.reportDetailText} numberOfLines={2}>
                        {report.description}
                      </Text>
                    </View>
                  )}
                  </View>
                )}
              </View>
            )}

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

            {/* Input Area with Banner */}
            <View style={styles.inputArea}>
              {/* Show resolved message if report is resolved */}
              {(reportStatus === 'Resolved' || report?.status === 'Resolved') ? (
                <View style={styles.resolvedBanner}>
                  <MaterialIcons name="check-circle" size={20} color={COLORS.success || '#34C759'} />
                  <Text style={styles.resolvedText}>
                    This report has been resolved. The chat is now disabled.
                  </Text>
                </View>
              ) : (
                <>
                  {showActionsBanner ? (
                    <View style={styles.actionBanner}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.actionButtonsContainer}
                      >
                        {isReporter && reportStatus !== 'Resolved' && report?.status !== 'Resolved' && (
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.actionButtonResolved]}
                            onPress={handleMarkResolved}
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="check-circle" size={18} color="#FFFFFF" />
                            <Text style={[styles.actionButtonText, styles.actionButtonTextResolved]}>
                              Mark Resolved
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          style={[
                            styles.actionButton, 
                            styles.actionButtonBlock,
                            { marginLeft: isReporter ? 10 : 0 }
                          ]}
                          onPress={handleBlockUser}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons 
                            name={hasBlocked ? "person-remove" : "block"} 
                            size={18} 
                            color="#FFFFFF" 
                          />
                          <Text style={[styles.actionButtonText, styles.actionButtonTextBlock]}>
                            {hasBlocked ? 'Unblock' : 'Block User'}
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                      <TouchableOpacity 
                        style={styles.closeBannerButton}
                        onPress={() => setShowActionsBanner(false)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <MaterialIcons name="close" size={18} color={COLORS.secondaryText} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.showActionsBannerButton}
                      onPress={() => setShowActionsBanner(true)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="expand-more" size={18} color={COLORS.secondaryText} />
                      <Text style={styles.showActionsBannerText}>Show Actions</Text>
                      <MaterialIcons name="expand-more" size={18} color={COLORS.secondaryText} />
                    </TouchableOpacity>
                  )}

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
                      disabled={isBlocked || hasBlocked || reportStatus === 'Resolved' || report?.status === 'Resolved'}
                    >
                      <MaterialIcons 
                        name="add-photo-alternate" 
                        size={24} 
                        color={isBlocked || hasBlocked || reportStatus === 'Resolved' || report?.status === 'Resolved' ? COLORS.secondaryText : COLORS.darkPurple} 
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.textInput,
                        (isBlocked || hasBlocked) && styles.textInputDisabled
                      ]}
                      placeholder={isBlocked ? "You cannot message this person" : hasBlocked ? "You have blocked this user" : "Type a message..."}
                      placeholderTextColor={COLORS.secondaryText}
                      value={messageText}
                      onChangeText={setMessageText}
                      multiline
                      maxLength={500}
                      editable={!isBlocked && !hasBlocked}
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        ((!messageText.trim() && selectedImages.length === 0) || sending || uploadingImages || isBlocked || hasBlocked) && styles.sendButtonDisabled,
                      ]}
                      onPress={sendMessage}
                      disabled={(!messageText.trim() && selectedImages.length === 0) || sending || uploadingImages || isBlocked || hasBlocked}
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
                    {isOwnMessage && (
                      <TouchableOpacity
                        style={[styles.messageMenuItem, !hasImages && styles.messageMenuItemDelete]}
                        onPress={() => handleDeleteMessage(selectedMessageId)}
                      >
                        <MaterialIcons name="delete" size={20} color={COLORS.error || '#FF3B30'} />
                        <Text style={[styles.messageMenuItemText, styles.messageMenuItemTextDelete]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    {!isOwnMessage && (
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

export default ReportChatModal;
