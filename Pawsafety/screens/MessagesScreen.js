import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Platform,
  useWindowDimensions,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { auth, db } from '../services/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useMessage } from '../contexts/MessageContext';
import ReportChatModal from '../components/ReportChatModal';
import DirectChatModal from '../components/DirectChatModal';
import NotificationService from '../services/NotificationService';

const MessagesScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const { reportChats, directChats, loading, markAsRead } = useMessage();
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [reportData, setReportData] = useState({});
  const [userData, setUserData] = useState({});
  const [filter, setFilter] = useState('chat'); // 'chat', 'reports', or 'archive'
  const [openChatId, setOpenChatId] = useState(null); // Track which chat is currently open
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [directChatVisible, setDirectChatVisible] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedChatForMenu, setSelectedChatForMenu] = useState(null);
  const [chatMenuPosition, setChatMenuPosition] = useState({ top: 0, left: 0 });
  const [menuPositionReady, setMenuPositionReady] = useState(false);
  const [menuLoading, setMenuLoading] = useState({ delete: false, archive: false, block: false });
  const [longPressedChatId, setLongPressedChatId] = useState(null);
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const chatItemRefs = useRef({});
  const currentUser = auth.currentUser;

  // Listen for new messages and send push notifications
  useEffect(() => {
    if (!currentUser) return;

    const notificationService = NotificationService.getInstance();
    const messagesRef = collection(db, 'report_messages');
    
    // Listen to all messages where current user is a participant
    // We'll filter by checking if the chatId belongs to a chat where user is a participant
    const unsubscribe = onSnapshot(messagesRef, async (snapshot) => {
      // Check if user is still logged in
      if (!auth.currentUser) return;
      
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          
          // Skip if message is from current user
          if (!auth.currentUser || messageData.senderId === auth.currentUser.uid) {
            return;
          }

          // Skip if this chat is currently open
          if (messageData.chatId === openChatId) {
            return;
          }

          // Check if current user is a participant in this chat
          try {
            const chatDoc = await getDoc(doc(db, 'report_chats', messageData.chatId));
            if (chatDoc.exists()) {
              const chatData = chatDoc.data();
              if (auth.currentUser && chatData.participants && chatData.participants.includes(auth.currentUser.uid)) {
                // If chat was deleted for this user, restore it by removing from deletedBy
                if (chatData.deletedBy && chatData.deletedBy.includes(auth.currentUser.uid)) {
                  try {
                    await updateDoc(doc(db, 'report_chats', messageData.chatId), {
                      deletedBy: arrayRemove(auth.currentUser.uid)
                    });
                  } catch (error) {
                    console.error('Error restoring deleted chat:', error);
                  }
                }
                
                // Get sender's name
                let senderName = 'Someone';
                try {
                  const senderDoc = await getDoc(doc(db, 'users', messageData.senderId));
                  if (senderDoc.exists()) {
                    const senderData = senderDoc.data();
                    senderName = senderData.displayName || senderData.name || 'Someone';
                  }
                } catch (error) {
                  console.error('Error getting sender name:', error);
                }

                // Send push notification
                await notificationService.sendLocalNotification(
                  senderName,
                  messageData.text || 'New message',
                  {
                    type: 'message',
                    chatId: messageData.chatId,
                    reportId: messageData.reportId,
                    senderId: messageData.senderId,
                  }
                );
              }
            }
          } catch (error) {
            console.error('Error checking chat participation:', error);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => unsubscribe();
  }, [currentUser, openChatId]);

  // Listen for direct messages and restore deleted chats
  useEffect(() => {
    if (!currentUser) return;

    const notificationService = NotificationService.getInstance();
    const directMessagesRef = collection(db, 'direct_messages');
    
    const unsubscribeDirect = onSnapshot(directMessagesRef, async (snapshot) => {
      // Check if user is still logged in
      if (!auth.currentUser) return;
      
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const messageData = change.doc.data();
          
          // Skip if message is from current user
          if (!auth.currentUser || messageData.senderId === auth.currentUser.uid) {
            return;
          }

          // Skip if this chat is currently open
          if (messageData.chatId === openChatId) {
            return;
          }

          // Check if current user is a participant in this chat
          try {
            const chatDoc = await getDoc(doc(db, 'direct_chats', messageData.chatId));
            if (chatDoc.exists()) {
              const chatData = chatDoc.data();
              if (auth.currentUser && chatData.participants && chatData.participants.includes(auth.currentUser.uid)) {
                // If chat was deleted for this user, restore it by removing from deletedBy
                if (chatData.deletedBy && chatData.deletedBy.includes(auth.currentUser.uid)) {
                  try {
                    await updateDoc(doc(db, 'direct_chats', messageData.chatId), {
                      deletedBy: arrayRemove(auth.currentUser.uid)
                    });
                  } catch (error) {
                    console.error('Error restoring deleted direct chat:', error);
                  }
                }
                
                // Get sender's name
                let senderName = 'Someone';
                try {
                  const senderDoc = await getDoc(doc(db, 'users', messageData.senderId));
                  if (senderDoc.exists()) {
                    const senderData = senderDoc.data();
                    senderName = senderData.displayName || senderData.name || 'Someone';
                  }
                } catch (error) {
                  console.error('Error getting sender name:', error);
                }

                // Send push notification
                await notificationService.sendLocalNotification(
                  senderName,
                  messageData.text || 'New message',
                  {
                    type: 'message',
                    chatId: messageData.chatId,
                    senderId: messageData.senderId,
                  }
                );
              }
            }
          } catch (error) {
            console.error('Error checking direct chat participation:', error);
          }
        }
      });
    }, (error) => {
      console.error('Error listening to direct messages:', error);
    });

    return () => unsubscribeDirect();
  }, [currentUser, openChatId]);

  // Load friends list
  useEffect(() => {
    if (!currentUser) {
      setFriendsLoading(false);
      return;
    }

    setFriendsLoading(true);
    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(friendsQuery, (snapshot) => {
      const friendsList = snapshot.docs.map(doc => ({
        id: doc.data().friendId,
        name: doc.data().friendName || 'Pet Lover',
        email: doc.data().friendEmail || '',
        profileImage: doc.data().friendProfileImage || null,
      }));
      setFriends(friendsList);
      setFriendsLoading(false);
    }, (error) => {
      console.error('Error fetching friends:', error);
      setFriendsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate report chats count (non-archived only, includes deleted/resolved/active reports)
  const unreadReportsCount = useMemo(() => {
    if (!currentUser) return 0;
    // Count all report chats (read and unread) that are not archived
    // This includes chats where the report is deleted, resolved, or still active
    return reportChats.filter(chat => {
      const isActive = !chat.archived;
      return isActive;
    }).length;
  }, [reportChats, currentUser]);

  // Filter chats based on filter type
  const filteredChats = useMemo(() => {
    if (filter === 'reports') {
      // Show only non-archived report chats
      return reportChats.filter(chat => !chat.archived);
    } else if (filter === 'chat') {
      // Show only non-archived direct chats
      return directChats.filter(chat => !chat.archived);
    } else if (filter === 'archive') {
      // Show only archived chats (both report and direct)
      const archivedReportChats = reportChats.filter(chat => chat.archived);
      const archivedDirectChats = directChats.filter(chat => chat.archived);
      const allArchived = [...archivedReportChats, ...archivedDirectChats];
      return allArchived.sort((a, b) => {
        const timeA = a.archivedAt?.toDate ? a.archivedAt.toDate().getTime() : (a.lastMessageTime?.toDate ? a.lastMessageTime.toDate().getTime() : 0);
        const timeB = b.archivedAt?.toDate ? b.archivedAt.toDate().getTime() : (b.lastMessageTime?.toDate ? b.lastMessageTime.toDate().getTime() : 0);
        return timeB - timeA;
      });
    }
    return [];
  }, [reportChats, directChats, filter]);

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) {
      return friends;
    }
    const query = searchQuery.toLowerCase();
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(query) ||
      friend.email.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const handleFriendPress = (friend) => {
    setSelectedFriend(friend);
    setDirectChatVisible(true);
  };

  const handleCloseDirectChat = () => {
    setDirectChatVisible(false);
    setSelectedFriend(null);
    setOpenChatId(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleChatPress = (chat) => {
    if (chat.type === 'direct') {
      // Open direct chat modal
      setSelectedFriend(chat.otherUser);
      setDirectChatVisible(true);
      setOpenChatId(chat.id);
      markAsRead(chat.id, 'direct');
    } else if (chat.report) {
      // Open report chat modal
      setReportData(chat.report);
      setUserData(chat.otherUser);
      setSelectedChat(chat);
      setOpenChatId(chat.id);
      setChatModalVisible(true);
      markAsRead(chat.id, 'report');
    }
  };

  const handleCloseChat = () => {
    setChatModalVisible(false);
    setSelectedChat(null);
    setReportData({});
    setUserData({});
    setOpenChatId(null); // Clear open chat tracking
  };

  // Handle chat card long press
  const handleChatLongPress = async (chat) => {
    setMenuPositionReady(false); // Reset position ready state
    setSelectedChatForMenu(chat);
    setLongPressedChatId(chat.id);
    
    // Check if user is already blocked
    if (chat.otherUser?.id && currentUser) {
      try {
        const blockId = `${currentUser.uid}_${chat.otherUser.id}`;
        const blockDoc = await getDoc(doc(db, 'blocks', blockId));
        setIsUserBlocked(blockDoc.exists());
      } catch (error) {
        console.error('Error checking block status:', error);
        setIsUserBlocked(false);
      }
    } else {
      setIsUserBlocked(false);
    }
    
    // Measure the chat item position - use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      const chatRef = chatItemRefs.current[chat.id];
      if (chatRef) {
        chatRef.measureInWindow((x, y, width, height) => {
          // Position menu below the chat item, aligned to the left edge
          // Adjust left position to align with chat item (with some padding)
          const menuLeft = Math.max(SPACING.md || 16, x);
          setChatMenuPosition({ 
            top: y + height + 8,
            left: menuLeft
          });
          setMenuPositionReady(true); // Mark position as ready
        });
      } else {
        // Fallback if ref is not available
        setMenuPositionReady(true);
      }
    });
  };

  // Close chat menu
  const closeChatMenu = () => {
    setSelectedChatForMenu(null);
    setChatMenuPosition({ top: 0, left: 0 });
    setMenuPositionReady(false);
    setLongPressedChatId(null);
    setIsUserBlocked(false);
    setMenuLoading({ delete: false, archive: false, block: false });
  };

  // Delete chat (only for current user)
  const handleDeleteChat = async (chat) => {
    const user = auth.currentUser;
    if (!user) return;
    
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat? This will remove it and all messages from your chat list.',
      [
        { text: 'Cancel', style: 'cancel', onPress: closeChatMenu },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setMenuLoading(prev => ({ ...prev, delete: true }));
            try {
              const chatCollection = chat.type === 'direct' ? 'direct_chats' : 'report_chats';
              const messagesCollection = chat.type === 'direct' ? 'direct_messages' : 'report_messages';
              const chatRef = doc(db, chatCollection, chat.id);
              
              // Add user ID to deletedBy array instead of deleting the document
              await updateDoc(chatRef, {
                deletedBy: arrayUnion(user.uid)
              });
              
              // Mark all messages in this chat as deleted for this user
              try {
                const messagesQuery = query(
                  collection(db, messagesCollection),
                  where('chatId', '==', chat.id)
                );
                const messagesSnapshot = await getDocs(messagesQuery);
                
                // Update each message to add user to deletedBy
                const updatePromises = messagesSnapshot.docs.map(messageDoc => {
                  const messageData = messageDoc.data();
                  // Only update if not already deleted by this user
                  if (!messageData.deletedBy || !messageData.deletedBy.includes(user.uid)) {
                    return updateDoc(doc(db, messagesCollection, messageDoc.id), {
                      deletedBy: arrayUnion(user.uid)
                    });
                  }
                  return Promise.resolve();
                });
                
                await Promise.all(updatePromises);
              } catch (error) {
                console.error('Error deleting messages:', error);
                // Continue even if message deletion fails
              }
              
              closeChatMenu();
            } catch (error) {
              console.error('Error deleting chat:', error);
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
              setMenuLoading(prev => ({ ...prev, delete: false }));
            }
          },
        },
      ]
    );
  };

  // Archive/Unarchive chat
  const handleArchiveChat = async (chat) => {
    const isArchived = chat.archived;
    
    setMenuLoading(prev => ({ ...prev, archive: true }));
    try {
      const chatCollection = chat.type === 'direct' ? 'direct_chats' : 'report_chats';
      
      if (isArchived) {
        // Unarchive chat
        await updateDoc(doc(db, chatCollection, chat.id), {
          archived: false,
          archivedAt: null,
        });
        closeChatMenu();
        // Switch back to chat filter after unarchiving
        setFilter('chat');
      } else {
        // Archive chat
        await updateDoc(doc(db, chatCollection, chat.id), {
          archived: true,
          archivedAt: serverTimestamp(),
        });
        closeChatMenu();
      }
    } catch (error) {
      console.error('Error archiving/unarchiving chat:', error);
      Alert.alert('Error', `Failed to ${isArchived ? 'unarchive' : 'archive'} chat. Please try again.`);
      setMenuLoading(prev => ({ ...prev, archive: false }));
    }
  };

  // Block/Unblock user
  const handleBlockUser = async (chat) => {
    const otherUserId = chat.otherUser?.id;
    const user = auth.currentUser;
    if (!otherUserId || !user) return;

    // Check current block status
    const blockId = `${user.uid}_${otherUserId}`;
    const blockDoc = await getDoc(doc(db, 'blocks', blockId));
    const isBlocked = blockDoc.exists();

    if (isBlocked) {
      // Unblock user
      Alert.alert(
        'Unblock User',
        `Are you sure you want to unblock ${chat.otherUser?.name || 'this user'}?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: closeChatMenu },
          {
            text: 'Unblock',
            onPress: async () => {
              setMenuLoading(prev => ({ ...prev, block: true }));
              try {
                const user = auth.currentUser;
                if (!user) {
                  closeChatMenu();
                  return;
                }
                
                const blockId = `${user.uid}_${otherUserId}`;
                await deleteDoc(doc(db, 'blocks', blockId));

                setIsUserBlocked(false);
                closeChatMenu();
                Alert.alert('Success', 'User has been unblocked.');
              } catch (error) {
                console.error('Error unblocking user:', error);
                Alert.alert('Error', 'Failed to unblock user. Please try again.');
                setMenuLoading(prev => ({ ...prev, block: false }));
              }
            },
          },
        ]
      );
    } else {
      // Block user
      Alert.alert(
        'Block User',
        `Are you sure you want to block ${chat.otherUser?.name || 'this user'}? You will not be able to message each other.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: closeChatMenu },
          {
            text: 'Block',
            style: 'destructive',
            onPress: async () => {
              setMenuLoading(prev => ({ ...prev, block: true }));
              try {
                const user = auth.currentUser;
                if (!user) {
                  closeChatMenu();
                  return;
                }
                
                const blockId = `${user.uid}_${otherUserId}`;
                await setDoc(doc(db, 'blocks', blockId), {
                  userId: user.uid,
                  blockedUserId: otherUserId,
                  createdAt: serverTimestamp(),
                });

                // Remove friendship (both directions) if exists
                const friendId1 = `${user.uid}_${otherUserId}`;
                const friendId2 = `${otherUserId}_${user.uid}`;
                await deleteDoc(doc(db, 'friends', friendId1)).catch(() => {});
                await deleteDoc(doc(db, 'friends', friendId2)).catch(() => {});

                // Remove any friend requests between users
                const requestId1 = `${user.uid}_${otherUserId}`;
                const requestId2 = `${otherUserId}_${user.uid}`;
                await deleteDoc(doc(db, 'friend_requests', requestId1)).catch(() => {});
                await deleteDoc(doc(db, 'friend_requests', requestId2)).catch(() => {});

                setIsUserBlocked(true);
                closeChatMenu();
                Alert.alert('Success', 'User has been blocked.');
              } catch (error) {
                console.error('Error blocking user:', error);
                Alert.alert('Error', 'Failed to block user. Please try again.');
                setMenuLoading(prev => ({ ...prev, block: false }));
              }
            },
          },
        ]
      );
    }
  };

  const renderChatItem = ({ item }) => {
    const isUnread = currentUser && item.readBy && !item.readBy.includes(currentUser.uid);
    const lastMessagePreview = item.lastMessage || 'No messages yet';
    const time = formatTime(item.lastMessageTime);

    return (
      <View
        ref={(ref) => {
          if (ref) chatItemRefs.current[item.id] = ref;
        }}
      >
        <Pressable
          style={[
            styles.chatItem,
            longPressedChatId === item.id && styles.chatItemPressed
          ]}
          onPress={() => handleChatPress(item)}
          onLongPress={() => handleChatLongPress(item)}
        >
        <View style={styles.chatItemLeft}>
          {item.otherUser?.profileImage ? (
            <Image
              source={{ uri: item.otherUser.profileImage }}
              style={styles.avatar}
              contentFit="cover"
            />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialIcons 
                          name="person" 
                          size={isSmallDevice ? 20 : isTablet ? 28 : 24} 
                          color="#65676b" 
                        />
                      </View>
                    )}
          <View style={styles.chatItemContent}>
            <View style={styles.chatItemHeader}>
              <Text style={styles.chatItemName} numberOfLines={1}>
                {item.otherUser?.name || 'Pet Lover'}
              </Text>
              {time && (
                <Text style={styles.chatItemTime}>{time}</Text>
              )}
            </View>
            <View style={styles.chatItemBottom}>
              {item.report && (
                <View style={styles.reportBadge}>
                  <MaterialIcons 
                    name="description" 
                    size={isSmallDevice ? 10 : isTablet ? 14 : 12} 
                    color={COLORS.darkPurple} 
                  />
                  <Text style={styles.reportBadgeText} numberOfLines={1}>
                    {item.report.status || 'Report'}
                  </Text>
                </View>
              )}
              <Text 
                style={[styles.chatItemMessage, isUnread && styles.chatItemMessageUnread]} 
                numberOfLines={1}
              >
                {lastMessagePreview}
              </Text>
            </View>
          </View>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
        </Pressable>
      </View>
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      backgroundColor: '#FFFFFF',
      paddingTop: Platform.OS === 'ios' 
        ? (isSmallDevice ? 45 : isTablet ? 60 : 50)
        : (isSmallDevice ? 12 : isTablet ? 20 : 15),
      paddingBottom: Platform.OS === 'android' 
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Platform.OS === 'android'
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
    },
    headerTitle: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 20 : isTablet ? 28 : 24)
        : (isSmallDevice ? 20 : isTablet ? 26 : 24),
      fontWeight: '700',
      color: '#050505',
      fontFamily: FONTS.family,
    },
    filterContainer: {
      flexDirection: 'row',
      gap: isSmallDevice ? 6 : isTablet ? 12 : 8,
      flexWrap: 'wrap',
    },
    filterButton: {
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      paddingVertical: isSmallDevice ? 5 : isTablet ? 8 : 6,
      borderRadius: isSmallDevice ? 18 : 20,
      backgroundColor: '#e4e6eb',
      minWidth: isSmallDevice ? 60 : isTablet ? 90 : 70,
    },
    filterButtonActive: {
      backgroundColor: COLORS.darkPurple || '#1877f2',
    },
    filterButtonText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 12 : isTablet ? 16 : 14)
        : (isSmallDevice ? 12 : isTablet ? 15 : 14),
      fontWeight: '600',
      color: '#050505',
      fontFamily: FONTS.family,
    },
    filterButtonTextActive: {
      color: '#FFFFFF',
    },
    filterButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallDevice ? 4 : isTablet ? 8 : 6,
    },
    filterBadge: {
      backgroundColor: COLORS.error || '#FF3B30',
      borderRadius: isSmallDevice ? 8 : isTablet ? 12 : 10,
      minWidth: isSmallDevice ? 16 : isTablet ? 22 : 18,
      height: isSmallDevice ? 16 : isTablet ? 22 : 18,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isSmallDevice ? 4 : isTablet ? 6 : 5,
    },
    filterBadgeActive: {
      backgroundColor: '#FFFFFF',
    },
    filterBadgeText: {
      color: '#FFFFFF',
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 9 : isTablet ? 12 : 10)
        : (isSmallDevice ? 9 : isTablet ? 11 : 10),
      fontWeight: '700',
    },
    filterBadgeTextActive: {
      color: COLORS.darkPurple || '#1877f2',
    },
    chatList: {
      flex: 1,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      paddingVertical: isSmallDevice ? 10 : isTablet ? 14 : 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    chatItemPressed: {
      backgroundColor: '#F0F2F5',
    },
    chatItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    avatar: {
      width: isSmallDevice ? 48 : isTablet ? 64 : 56,
      height: isSmallDevice ? 48 : isTablet ? 64 : 56,
      borderRadius: isSmallDevice ? 24 : isTablet ? 32 : 28,
      marginRight: isSmallDevice ? 10 : isTablet ? 14 : 12,
      backgroundColor: '#e4e6eb',
    },
    avatarPlaceholder: {
      width: isSmallDevice ? 48 : isTablet ? 64 : 56,
      height: isSmallDevice ? 48 : isTablet ? 64 : 56,
      borderRadius: isSmallDevice ? 24 : isTablet ? 32 : 28,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isSmallDevice ? 10 : isTablet ? 14 : 12,
    },
    chatItemContent: {
      flex: 1,
    },
    chatItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: isSmallDevice ? 3 : 4,
    },
    chatItemName: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 14 : isTablet ? 18 : 16)
        : (isSmallDevice ? 14 : isTablet ? 17 : 16),
      fontWeight: '600',
      color: '#050505',
      fontFamily: FONTS.family,
      flex: 1,
    },
    chatItemTime: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 11 : isTablet ? 13 : 12)
        : (isSmallDevice ? 11 : isTablet ? 12 : 12),
      color: '#65676b',
      fontFamily: FONTS.family,
      marginLeft: isSmallDevice ? 6 : 8,
    },
    chatItemBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isSmallDevice ? 6 : isTablet ? 10 : 8,
    },
    reportBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.lightBlue || '#e7f3ff',
      paddingHorizontal: isSmallDevice ? 6 : isTablet ? 10 : 8,
      paddingVertical: isSmallDevice ? 1 : 2,
      borderRadius: isSmallDevice ? 10 : 12,
      gap: isSmallDevice ? 3 : 4,
    },
    reportBadgeText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 10 : isTablet ? 12 : 11)
        : (isSmallDevice ? 10 : isTablet ? 11 : 11),
      fontWeight: '600',
      color: COLORS.darkPurple || '#1877f2',
      fontFamily: FONTS.family,
    },
    directChatBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.lightBlue || '#e7f3ff',
      paddingHorizontal: isSmallDevice ? 6 : isTablet ? 10 : 8,
      paddingVertical: isSmallDevice ? 1 : 2,
      borderRadius: isSmallDevice ? 10 : 12,
      gap: isSmallDevice ? 3 : 4,
    },
    directChatBadgeText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 10 : isTablet ? 12 : 11)
        : (isSmallDevice ? 10 : isTablet ? 11 : 11),
      fontWeight: '600',
      color: COLORS.darkPurple || '#1877f2',
      fontFamily: FONTS.family,
    },
    chatItemMessage: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 13 : isTablet ? 15 : 14)
        : (isSmallDevice ? 13 : isTablet ? 15 : 14),
      color: '#65676b',
      fontFamily: FONTS.family,
      flex: 1,
    },
    chatItemMessageUnread: {
      fontWeight: '600',
      color: '#050505',
    },
    unreadDot: {
      width: isSmallDevice ? 7 : isTablet ? 10 : 8,
      height: isSmallDevice ? 7 : isTablet ? 10 : 8,
      borderRadius: isSmallDevice ? 3.5 : isTablet ? 5 : 4,
      backgroundColor: COLORS.darkPurple || '#1877f2',
      marginLeft: isSmallDevice ? 6 : 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: isSmallDevice ? SPACING.md : isTablet ? SPACING.xxl : SPACING.xl,
    },
    emptyIcon: {
      width: isSmallDevice ? 100 : isTablet ? 140 : 120,
      height: isSmallDevice ? 100 : isTablet ? 140 : 120,
      borderRadius: isSmallDevice ? 50 : isTablet ? 70 : 60,
      backgroundColor: COLORS.lightBlue || '#e7f3ff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallDevice ? SPACING.md : SPACING.lg,
    },
    emptyTitle: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 18 : isTablet ? 24 : 20)
        : (isSmallDevice ? 18 : isTablet ? 22 : 20),
      fontWeight: '600',
      color: COLORS.text,
      marginBottom: isSmallDevice ? SPACING.xs : SPACING.sm,
      fontFamily: FONTS.family,
    },
    emptyText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 13 : isTablet ? 17 : 15)
        : (isSmallDevice ? 13 : isTablet ? 16 : 15),
      color: COLORS.secondaryText,
      textAlign: 'center',
      fontFamily: FONTS.family,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F0F2F5',
      borderRadius: isSmallDevice ? 18 : isTablet ? 24 : 20,
      paddingHorizontal: isSmallDevice ? 10 : isTablet ? 16 : 12,
      paddingVertical: isSmallDevice ? 6 : isTablet ? 10 : 8,
      marginHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      marginBottom: Platform.OS === 'android'
        ? (isSmallDevice ? 4 : isTablet ? 6 : 4)
        : (isSmallDevice ? 10 : isTablet ? 14 : 12),
      marginTop: Platform.OS === 'android'
        ? (isSmallDevice ? 0 : isTablet ? 2 : 0)
        : (isSmallDevice ? 6 : 8),
    },
    searchIcon: {
      marginRight: isSmallDevice ? 6 : isTablet ? 10 : 8,
    },
    searchInput: {
      flex: 1,
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 14 : isTablet ? 17 : 15)
        : (isSmallDevice ? 14 : isTablet ? 16 : 15),
      color: COLORS.text,
      fontFamily: FONTS.family,
      paddingVertical: 0,
    },
    clearSearchButton: {
      padding: isSmallDevice ? 3 : 4,
    },
    chatHeadsContainer: {
      marginBottom: Platform.OS === 'android'
        ? (isSmallDevice ? 4 : isTablet ? 6 : 4)
        : (isSmallDevice ? 10 : isTablet ? 14 : 12),
      paddingVertical: Platform.OS === 'android'
        ? (isSmallDevice ? 2 : 2)
        : (isSmallDevice ? 6 : 8),
    },
    chatHeadsContent: {
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      gap: isSmallDevice ? 10 : isTablet ? 14 : 12,
    },
    chatHead: {
      alignItems: 'center',
      width: isSmallDevice ? 60 : isTablet ? 80 : 70,
    },
    chatHeadImage: {
      width: isSmallDevice ? 48 : isTablet ? 64 : 56,
      height: isSmallDevice ? 48 : isTablet ? 64 : 56,
      borderRadius: isSmallDevice ? 24 : isTablet ? 32 : 28,
      backgroundColor: '#e4e6eb',
      marginBottom: isSmallDevice ? 5 : 6,
    },
    chatHeadPlaceholder: {
      width: isSmallDevice ? 48 : isTablet ? 64 : 56,
      height: isSmallDevice ? 48 : isTablet ? 64 : 56,
      borderRadius: isSmallDevice ? 24 : isTablet ? 32 : 28,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: isSmallDevice ? 5 : 6,
    },
    chatHeadName: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 11 : isTablet ? 13 : 12)
        : (isSmallDevice ? 11 : isTablet ? 12 : 12),
      color: COLORS.text,
      fontFamily: FONTS.family,
      textAlign: 'center',
      maxWidth: isSmallDevice ? 60 : isTablet ? 80 : 70,
    },
    searchResultsContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    searchResultsTitle: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 16 : isTablet ? 22 : 18)
        : (isSmallDevice ? 16 : isTablet ? 20 : 18),
      fontWeight: '700',
      color: COLORS.text,
      fontFamily: FONTS.family,
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      paddingTop: isSmallDevice ? 10 : isTablet ? 14 : 12,
      paddingBottom: isSmallDevice ? 6 : 8,
    },
    emptySearchContainer: {
      padding: isSmallDevice ? SPACING.md : isTablet ? SPACING.xxl : SPACING.xl,
      alignItems: 'center',
    },
    emptySearchText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 13 : isTablet ? 17 : 15)
        : (isSmallDevice ? 13 : isTablet ? 16 : 15),
      color: COLORS.secondaryText,
      fontFamily: FONTS.family,
    },
    friendSearchItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      paddingVertical: isSmallDevice ? 10 : isTablet ? 14 : 12,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    friendSearchImage: {
      width: isSmallDevice ? 44 : isTablet ? 56 : 48,
      height: isSmallDevice ? 44 : isTablet ? 56 : 48,
      borderRadius: isSmallDevice ? 22 : isTablet ? 28 : 24,
      backgroundColor: '#e4e6eb',
      marginRight: isSmallDevice ? 10 : isTablet ? 14 : 12,
    },
    friendSearchPlaceholder: {
      width: isSmallDevice ? 44 : isTablet ? 56 : 48,
      height: isSmallDevice ? 44 : isTablet ? 56 : 48,
      borderRadius: isSmallDevice ? 22 : isTablet ? 28 : 24,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isSmallDevice ? 10 : isTablet ? 14 : 12,
    },
    friendSearchInfo: {
      flex: 1,
    },
    friendSearchName: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 14 : isTablet ? 18 : 16)
        : (isSmallDevice ? 14 : isTablet ? 17 : 16),
      fontWeight: '600',
      color: COLORS.text,
      fontFamily: FONTS.family,
      marginBottom: isSmallDevice ? 1 : 2,
    },
    friendSearchEmail: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 12 : isTablet ? 15 : 13)
        : (isSmallDevice ? 12 : isTablet ? 14 : 13),
      color: COLORS.secondaryText,
      fontFamily: FONTS.family,
    },
    chatMenuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    },
    chatMenuBackdrop: {
      flex: 1,
    },
    chatMenu: {
      position: 'absolute',
      backgroundColor: COLORS.background || '#FFFFFF',
      borderRadius: RADIUS.medium,
      paddingVertical: SPACING.xs,
      minWidth: 160,
      maxWidth: currentWidth - (SPACING.md * 2),
      zIndex: 1001,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    chatMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
    },
    chatMenuItemDelete: {
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    chatMenuItemText: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 14 : isTablet ? 17 : 15)
        : (isSmallDevice ? 14 : isTablet ? 16 : 15),
      fontFamily: FONTS.family,
      fontWeight: '500',
      color: COLORS.text,
      marginLeft: SPACING.sm,
    },
    chatMenuItemTextDelete: {
      color: COLORS.error || '#FF3B30',
    },
  }), [COLORS, isSmallDevice, isTablet, currentWidth, currentHeight]);

  return (
    <View style={styles.container}>
      {/* Header - Facebook-style */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Messages</Text>
          </View>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons 
              name="search" 
              size={isSmallDevice ? 18 : isTablet ? 24 : 20} 
              color={COLORS.secondaryText || '#65676b'} 
              style={styles.searchIcon} 
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              placeholderTextColor={COLORS.secondaryText || '#65676b'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <MaterialIcons 
                  name="close" 
                  size={isSmallDevice ? 16 : isTablet ? 20 : 18} 
                  color={COLORS.secondaryText || '#65676b'} 
                />
              </TouchableOpacity>
            )}
          </View>
          {/* Friends Chat Heads */}
          {!searchQuery && friends.length > 0 && (
            <View style={styles.chatHeadsContainer}>
              <FlatList
                data={friends.slice(0, 10)} // Show first 10 friends
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.chatHead}
                    onPress={() => handleFriendPress(item)}
                    activeOpacity={0.7}
                  >
                    {item.profileImage ? (
                      <Image
                        source={{ uri: item.profileImage }}
                        style={styles.chatHeadImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.chatHeadPlaceholder}>
                        <MaterialIcons 
                          name="person" 
                          size={isSmallDevice ? 18 : isTablet ? 24 : 20} 
                          color="#65676b" 
                        />
                      </View>
                    )}
                    <Text style={styles.chatHeadName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.chatHeadsContent}
              />
            </View>
          )}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'chat' && styles.filterButtonActive]}
              onPress={() => setFilter('chat')}
            >
              <Text style={[styles.filterButtonText, filter === 'chat' && styles.filterButtonTextActive]}>
                Chat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'reports' && styles.filterButtonActive]}
              onPress={() => setFilter('reports')}
            >
              <View style={styles.filterButtonContent}>
                <Text style={[styles.filterButtonText, filter === 'reports' && styles.filterButtonTextActive]}>
                  Reports
                </Text>
                {unreadReportsCount > 0 && (
                  <View style={[
                    styles.filterBadge,
                    filter === 'reports' && styles.filterBadgeActive
                  ]}>
                    <Text style={[
                      styles.filterBadgeText,
                      filter === 'reports' && styles.filterBadgeTextActive
                    ]}>
                      {unreadReportsCount > 99 ? '99+' : unreadReportsCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'archive' && styles.filterButtonActive]}
              onPress={() => setFilter('archive')}
            >
              <Text style={[styles.filterButtonText, filter === 'archive' && styles.filterButtonTextActive]}>
                Archive
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Search Results - Friends */}
        {searchQuery && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsTitle}>Friends</Text>
            {friendsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.darkPurple} />
              </View>
            ) : filteredFriends.length === 0 ? (
              <View style={styles.emptySearchContainer}>
                <Text style={styles.emptySearchText}>No friends found</Text>
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendSearchItem}
                    onPress={() => handleFriendPress(item)}
                    activeOpacity={0.7}
                  >
                    {item.profileImage ? (
                      <Image
                        source={{ uri: item.profileImage }}
                        style={styles.friendSearchImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={styles.friendSearchPlaceholder}>
                        <MaterialIcons 
                          name="person" 
                          size={isSmallDevice ? 20 : isTablet ? 28 : 24} 
                          color="#65676b" 
                        />
                      </View>
                    )}
                    <View style={styles.friendSearchInfo}>
                      <Text style={styles.friendSearchName}>{item.name}</Text>
                    </View>
                    <MaterialIcons 
                      name="chevron-right" 
                      size={isSmallDevice ? 20 : isTablet ? 28 : 24} 
                      color={COLORS.secondaryText} 
                    />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* Chat List */}
        {!searchQuery && (
          <>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.darkPurple} />
              </View>
            ) : filteredChats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MaterialIcons 
                name="message" 
                size={isSmallDevice ? 50 : isTablet ? 70 : 60} 
                color={COLORS.darkPurple} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'reports' ? 'No Report Chats' : filter === 'chat' ? 'No Direct Chats' : filter === 'archive' ? 'No Archived Chats' : 'No Messages'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'reports' 
                ? 'You haven\'t received any messages about your reports yet.'
                : filter === 'chat'
                ? 'Start a conversation with a friend by clicking on their profile.'
                : filter === 'archive'
                ? 'You don\'t have any archived chats yet.'
                : 'Start a conversation by messaging someone about a report or chatting with a friend.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.id}
            style={styles.chatList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.darkPurple]}
                tintColor={COLORS.darkPurple}
              />
            }
            removeClippedSubviews
            initialNumToRender={10}
            maxToRenderPerBatch={5}
          />
        )}
          </>
        )}

        {/* Report Chat Modal */}
        {selectedChat && selectedChat.report && (
          <ReportChatModal
            visible={chatModalVisible}
            onClose={handleCloseChat}
            report={reportData}
            reporter={userData}
            chatId={selectedChat.id}
          />
        )}

      {/* Direct Chat Modal */}
      <DirectChatModal
        visible={directChatVisible}
        onClose={handleCloseDirectChat}
        friend={selectedFriend}
      />

      {/* Chat Card Menu */}
      {selectedChatForMenu && menuPositionReady && (
        <View style={styles.chatMenuOverlay}>
          <Pressable style={styles.chatMenuBackdrop} onPress={closeChatMenu} />
          <View style={[styles.chatMenu, { top: chatMenuPosition.top, left: chatMenuPosition.left }]}>
            <TouchableOpacity
              style={styles.chatMenuItem}
              onPress={() => handleArchiveChat(selectedChatForMenu)}
              disabled={menuLoading.archive || menuLoading.delete || menuLoading.block}
            >
              {menuLoading.archive ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <MaterialIcons 
                  name={selectedChatForMenu?.archived ? "unarchive" : "archive"} 
                  size={20} 
                  color={COLORS.text} 
                />
              )}
              <Text style={styles.chatMenuItemText}>
                {selectedChatForMenu?.archived ? 'Unarchive' : 'Archive'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.chatMenuItem}
              onPress={() => handleBlockUser(selectedChatForMenu)}
              disabled={menuLoading.archive || menuLoading.delete || menuLoading.block}
            >
              {menuLoading.block ? (
                <ActivityIndicator size="small" color={COLORS.error || '#FF3B30'} />
              ) : (
                <MaterialIcons 
                  name={isUserBlocked ? "person-remove" : "block"} 
                  size={20} 
                  color={COLORS.error || '#FF3B30'} 
                />
              )}
              <Text style={[styles.chatMenuItemText, styles.chatMenuItemTextDelete]}>
                {isUserBlocked ? 'Unblock' : 'Block User'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatMenuItem, styles.chatMenuItemDelete]}
              onPress={() => handleDeleteChat(selectedChatForMenu)}
              disabled={menuLoading.archive || menuLoading.delete || menuLoading.block}
            >
              {menuLoading.delete ? (
                <ActivityIndicator size="small" color={COLORS.error || '#FF3B30'} />
              ) : (
                <MaterialIcons name="delete" size={20} color={COLORS.error || '#FF3B30'} />
              )}
              <Text style={[styles.chatMenuItemText, styles.chatMenuItemTextDelete]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default MessagesScreen;
