import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { collection, query, onSnapshot, doc, setDoc, getDoc, deleteDoc, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import NotificationService from '../services/NotificationService';

const AddFriendsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [friendRequests, setFriendRequests] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [sendingRequest, setSendingRequest] = useState({});
  const [incomingRequestsCount, setIncomingRequestsCount] = useState(0);

  // Fetch friend requests and friends
  useEffect(() => {
    if (!user) return;

    // Fetch sent friend requests
    const sentRequestsQuery = query(
      collection(db, 'friend_requests'),
      where('fromUserId', '==', user.uid)
    );

    const sentRequestsUnsubscribe = onSnapshot(
      sentRequestsQuery,
      (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFriendRequests(requests);
      },
      (error) => {
        console.error('Error fetching friend requests:', error);
      }
    );

    // Fetch incoming friend requests
    const incomingRequestsQuery = query(
      collection(db, 'friend_requests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const incomingRequestsUnsubscribe = onSnapshot(
      incomingRequestsQuery,
      (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setIncomingRequests(requests);
        setIncomingRequestsCount(snapshot.size);
      },
      (error) => {
        console.error('Error fetching incoming friend requests:', error);
      }
    );

    // Fetch friends
    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', user.uid)
    );

    const friendsUnsubscribe = onSnapshot(
      friendsQuery,
      (snapshot) => {
        const friendsList = snapshot.docs.map(doc => ({
          friendId: doc.data().friendId,
          ...doc.data()
        }));
        setFriends(friendsList);
      },
      (error) => {
        console.error('Error fetching friends:', error);
      }
    );

    return () => {
      sentRequestsUnsubscribe();
      incomingRequestsUnsubscribe();
      friendsUnsubscribe();
    };
  }, [user]);

  // Fetch all users from Firestore
  useEffect(() => {
    if (!user) return;

    const usersQuery = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const usersList = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((u) => {
            // Exclude current user, admins, and inactive users
            return u.id !== user.uid && 
                   (u.role === 'user' || !u.role) && 
                   (u.status === 'active' || !u.status);
          })
          .sort((a, b) => {
            const nameA = (a.name || a.displayName || '').toLowerCase();
            const nameB = (b.name || b.displayName || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });

        setUsers(usersList);
        setFilteredUsers(usersList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter((u) => {
      const name = (u.name || u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(query) || email.includes(query);
    });

    setFilteredUsers(filtered);
  }, [searchQuery, users]);

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
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    searchContainer: {
      backgroundColor: '#f0f2f5',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: '#050505',
      fontFamily: FONTS.family,
      padding: 0,
    },
    content: {
      padding: 16,
    },
    usersList: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      overflow: 'hidden',
      ...RADIUS.medium,
    },
    userItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    userItemLast: {
      borderBottomWidth: 0,
    },
    userImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#e4e6eb',
      marginRight: 12,
      overflow: 'hidden',
      justifyContent: 'center',
      alignItems: 'center',
    },
    userImage: {
      width: '100%',
      height: '100%',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 17,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 4,
      fontFamily: FONTS.family,
    },
    userEmail: {
      fontSize: 15,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    addButton: {
      backgroundColor: '#1877f2',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 6,
    },
    addButtonDisabled: {
      backgroundColor: '#e4e6eb',
    },
    cancelButton: {
      backgroundColor: '#e4e6eb',
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 6,
    },
    addButtonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
      fontFamily: FONTS.family,
    },
    addButtonTextDisabled: {
      color: '#65676b',
    },
    cancelButtonText: {
      color: '#050505',
      fontSize: 15,
      fontWeight: '600',
      fontFamily: FONTS.family,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.xl,
    },
    loadingText: {
      fontSize: 15,
      color: '#65676b',
      marginTop: 12,
      fontFamily: FONTS.family,
    },
    emptyState: {
      padding: SPACING.xl,
      alignItems: 'center',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      marginTop: 16,
    },
    emptyStateText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: '#65676b',
      textAlign: 'center',
    },
  }), [COLORS]);

  const handleAddFriend = async (userId) => {
    if (!user) return;

    // Check if already friends
    const isAlreadyFriend = friends.some(f => f.friendId === userId);
    if (isAlreadyFriend) {
      Alert.alert('Already Friends', 'You are already friends with this user.');
      return;
    }

    // Check if request already sent (pending)
    const existingRequest = friendRequests.find(r => r.toUserId === userId && r.status === 'pending');
    if (existingRequest) {
      Alert.alert('Request Pending', 'You have already sent a friend request to this user.');
      return;
    }

    // Check if there's an incoming request
    const hasIncoming = incomingRequests.some(r => r.fromUserId === userId && r.status === 'pending');
    if (hasIncoming) {
      Alert.alert('Request Exists', 'This user has already sent you a friend request. Please check your friend requests.');
      setSendingRequest(prev => ({ ...prev, [userId]: false }));
      return;
    }

    setSendingRequest(prev => ({ ...prev, [userId]: true }));

    try {
      // Get recipient user data
      const recipientDoc = await getDoc(doc(db, 'users', userId));
      if (!recipientDoc.exists()) {
        Alert.alert('Error', 'User not found.');
        setSendingRequest(prev => ({ ...prev, [userId]: false }));
        return;
      }

      const recipientData = recipientDoc.data();
      const senderName = user.displayName || user.email || 'Someone';

      // Check if there's an old friend request (accepted/rejected) and delete it first
      const requestId = `${user.uid}_${userId}`;
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
        fromUserId: user.uid,
        toUserId: userId,
        fromUserName: senderName,
        fromUserEmail: user.email,
        fromUserProfileImage: user.photoURL || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Create notification for recipient
      const notificationService = NotificationService.getInstance();
      await notificationService.createNotification({
        userId: userId,
        title: 'New Friend Request',
        body: `${senderName} sent you a friend request`,
        type: 'friend_request',
        data: {
          type: 'friend_request',
          requestId: requestId,
          fromUserId: user.uid,
          fromUserName: senderName,
        }
      });

      // Send push notification
      try {
        console.log('Attempting to send push notification to user:', userId);
        const tokenDoc = await getDoc(doc(db, 'user_push_tokens', userId));
        
        if (!tokenDoc.exists()) {
          console.log('No push token document found for user:', userId);
          // Still continue - in-app notification was created
        } else {
          const tokenData = tokenDoc.data();
          const token = tokenData?.expoPushToken || tokenData?.pushToken;
          
          if (!token) {
            console.log('No push token found in document for user:', userId);
            // Still continue - in-app notification was created
          } else {
            console.log('Sending push notification to token:', token.substring(0, 20) + '...');
            
            // Use fetch to send push notification via Expo API
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
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
                  fromUserId: user.uid,
                },
                priority: 'high',
                channelId: 'default'
              }])
            });
            
            if (!response.ok) {
              console.error('Push notification HTTP error:', response.status, response.statusText);
            } else {
              const result = await response.json();
              console.log('Push notification response:', JSON.stringify(result));
              
              if (result.data && result.data[0]) {
                if (result.data[0].status === 'error') {
                  console.error('Expo push error:', result.data[0].message);
                } else {
                  console.log('Push notification sent successfully. Status:', result.data[0].status);
                }
              }
            }
          }
        }
      } catch (pushError) {
        // Push notification error is non-critical but log it
        console.error('Error sending push notification:', pushError);
        console.error('Push error details:', pushError.message);
        if (pushError.stack) {
          console.error('Stack trace:', pushError.stack);
        }
      }

      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    } finally {
      setSendingRequest(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleCancelRequest = async (userId) => {
    if (!user) return;

    const existingRequest = friendRequests.find(r => r.toUserId === userId && r.status === 'pending');
    if (!existingRequest) {
      Alert.alert('Error', 'No pending request found.');
      return;
    }

    setSendingRequest(prev => ({ ...prev, [userId]: true }));

    try {
      const requestId = existingRequest.id;
      
      // Delete the friend request
      await deleteDoc(doc(db, 'friend_requests', requestId));

      // Delete the notification if it exists
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', userId),
          where('type', '==', 'friend_request')
        );
        const notificationsSnapshot = await getDocs(notificationsQuery);
        const deletePromises = [];
        notificationsSnapshot.forEach((notifDoc) => {
          const notifData = notifDoc.data();
          if (notifData.data && notifData.data.requestId === requestId) {
            deletePromises.push(deleteDoc(doc(db, 'notifications', notifDoc.id)));
          }
        });
        await Promise.all(deletePromises);
      } catch (notifError) {
        // Error handled silently - notification deletion is optional
        console.error('Error deleting notification:', notifError);
      }

      Alert.alert('Success', 'Friend request cancelled.');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    } finally {
      setSendingRequest(prev => ({ ...prev, [userId]: false }));
    }
  };

  const getButtonText = (userId) => {
    if (sendingRequest[userId]) {
      const hasPendingRequest = friendRequests.some(r => r.toUserId === userId && r.status === 'pending');
      return hasPendingRequest ? 'Cancelling...' : 'Sending...';
    }
    if (friends.some(f => f.friendId === userId)) return 'Friends';
    // Check if current user sent a request to this user
    if (friendRequests.some(r => r.toUserId === userId && r.status === 'pending')) return 'Cancel Request';
    // Check if this user sent a request to current user
    if (incomingRequests.some(r => r.fromUserId === userId && r.status === 'pending')) return 'Respond';
    return 'Add';
  };

  const isButtonDisabled = (userId) => {
    return sendingRequest[userId] || friends.some(f => f.friendId === userId);
  };

  const hasPendingRequest = (userId) => {
    return friendRequests.some(r => r.toUserId === userId && r.status === 'pending');
  };

  const hasIncomingRequest = (userId) => {
    return incomingRequests.some(r => r.fromUserId === userId && r.status === 'pending');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Friends</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FriendRequests')}
            style={{ padding: 8, position: 'relative' }}
          >
            <MaterialIcons name="person-add-alt" size={24} color="#1877f2" />
            {incomingRequestsCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: '#e41e3f',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 6,
              }}>
                <Text style={{
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 'bold',
                }}>
                  {incomingRequestsCount > 9 ? '9+' : incomingRequestsCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons 
            name="search" 
            size={20} 
            color="#65676b" 
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="#8a8d91"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#65676b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1877f2" />
              <Text style={styles.loadingText}>Loading users...</Text>
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No users found' : 'No users available'}
              </Text>
            </View>
          ) : (
            <View style={styles.usersList}>
              {filteredUsers.map((userItem, index) => (
                <View
                  key={userItem.id}
                  style={[
                    styles.userItem,
                    index === filteredUsers.length - 1 && styles.userItemLast
                  ]}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => navigation.navigate('Profile', { userId: userItem.id })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userImageContainer}>
                      {userItem.profileImage ? (
                        <Image
                          source={{ uri: userItem.profileImage }}
                          style={styles.userImage}
                          contentFit="cover"
                        />
                      ) : (
                        <MaterialIcons name="account-circle" size={60} color="#bcc0c4" />
                      )}
                    </View>
                    
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {userItem.name || userItem.displayName || 'Unknown User'}
                      </Text>
                      <Text style={styles.userEmail}>
                        {userItem.email || 'No email'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      hasPendingRequest(userItem.id) ? styles.cancelButton : 
                      hasIncomingRequest(userItem.id) ? styles.addButton :
                      styles.addButton,
                      isButtonDisabled(userItem.id) && styles.addButtonDisabled
                    ]}
                    onPress={() => {
                      if (hasPendingRequest(userItem.id)) {
                        handleCancelRequest(userItem.id);
                      } else if (hasIncomingRequest(userItem.id)) {
                        // Navigate to friend requests screen to respond
                        navigation.navigate('FriendRequests');
                      } else {
                        handleAddFriend(userItem.id);
                      }
                    }}
                    disabled={isButtonDisabled(userItem.id)}
                  >
                    <Text style={[
                      hasPendingRequest(userItem.id) 
                        ? styles.cancelButtonText 
                        : hasIncomingRequest(userItem.id)
                        ? styles.addButtonText
                        : (isButtonDisabled(userItem.id) ? styles.addButtonTextDisabled : styles.addButtonText)
                    ]}>
                      {getButtonText(userItem.id)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AddFriendsScreen;

