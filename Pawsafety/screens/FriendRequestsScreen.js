import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { collection, query, onSnapshot, where, doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import NotificationService from '../services/NotificationService';

const FriendRequestsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [userDataMap, setUserDataMap] = useState({}); // Map of userId -> latest user data

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
    content: {
      padding: 16,
    },
    requestsList: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      overflow: 'hidden',
    },
    requestItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    requestItemLast: {
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
    buttonContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    confirmButton: {
      backgroundColor: '#1877f2',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    rejectButton: {
      backgroundColor: '#e4e6eb',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 15,
      fontWeight: '600',
      fontFamily: FONTS.family,
    },
    rejectButtonText: {
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

  // Fetch incoming friend requests and latest user data
  useEffect(() => {
    if (!user) return;

    const requestsQuery = query(
      collection(db, 'friend_requests'),
      where('toUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      requestsQuery,
      async (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setIncomingRequests(requests);
        
        // Fetch latest user data for each sender
        const userIds = [...new Set(requests.map(r => r.fromUserId))];
        const userDataPromises = userIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              return { userId, data: userDoc.data() };
            }
            return { userId, data: null };
          } catch (error) {
            console.error(`Error fetching user data for ${userId}:`, error);
            return { userId, data: null };
          }
        });
        
        const userDataResults = await Promise.all(userDataPromises);
        const newUserDataMap = {};
        userDataResults.forEach(({ userId, data }) => {
          if (data) {
            newUserDataMap[userId] = data;
          }
        });
        setUserDataMap(newUserDataMap);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching friend requests:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleConfirmRequest = async (request) => {
    if (!user) return;

    const requestId = request.id;
    setProcessing(prev => ({ ...prev, [requestId]: true }));

    try {
      // Update request status to accepted
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'accepted',
        respondedAt: serverTimestamp(),
      });

      // Add to friends collection for both users
      const friendId1 = `${user.uid}_${request.fromUserId}`;
      const friendId2 = `${request.fromUserId}_${user.uid}`;

      // Get current user data
      const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      // Get sender user data (latest from Firestore)
      const senderUserDoc = await getDoc(doc(db, 'users', request.fromUserId));
      const senderUserData = senderUserDoc.exists() ? senderUserDoc.data() : {};

      // Add friend relationship for current user (use latest data from Firestore)
      await setDoc(doc(db, 'friends', friendId1), {
        userId: user.uid,
        friendId: request.fromUserId,
        friendName: senderUserData.displayName || senderUserData.name || request.fromUserName || 'Unknown',
        friendEmail: senderUserData.email || request.fromUserEmail || '',
        friendProfileImage: senderUserData.profileImage || senderUserData.photoURL || request.fromUserProfileImage || null,
        createdAt: serverTimestamp(),
      });

      // Add friend relationship for sender
      await setDoc(doc(db, 'friends', friendId2), {
        userId: request.fromUserId,
        friendId: user.uid,
        friendName: user.displayName || currentUserData.displayName || currentUserData.name || 'Unknown',
        friendEmail: user.email || currentUserData.email || '',
        friendProfileImage: user.photoURL || currentUserData.profileImage || null,
        createdAt: serverTimestamp(),
      });

      // Send notification to the requester
      const notificationService = NotificationService.getInstance();
      const currentUserName = user.displayName || user.email || 'Someone';
      
      await notificationService.createNotification({
        userId: request.fromUserId,
        title: 'Friend Request Accepted',
        body: `${currentUserName} accepted your friend request`,
        type: 'friend_request_accepted',
        data: {
          type: 'friend_request_accepted',
          friendId: user.uid,
          friendName: currentUserName,
        }
      });

      // Send push notification
      try {
        const tokenDoc = await getDoc(doc(db, 'user_push_tokens', request.fromUserId));
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
                  friendId: user.uid,
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

      Alert.alert('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error confirming friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (request) => {
    if (!user) return;

    const requestId = request.id;
    setProcessing(prev => ({ ...prev, [requestId]: true }));

    try {
      // Update request status to rejected
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'rejected',
        respondedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Friend request rejected.');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Error', 'Failed to reject friend request. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: false }));
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#050505" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friend Requests</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1877f2" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : incomingRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No pending friend requests</Text>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {incomingRequests.map((request, index) => (
                <View
                  key={request.id}
                  style={[
                    styles.requestItem,
                    index === incomingRequests.length - 1 && styles.requestItemLast
                  ]}
                >
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => navigation.navigate('Profile', { userId: request.fromUserId })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userImageContainer}>
                      {(() => {
                        const latestUserData = userDataMap[request.fromUserId];
                        const profileImage = latestUserData?.profileImage || latestUserData?.photoURL || request.fromUserProfileImage;
                        return profileImage ? (
                          <Image
                            source={{ uri: profileImage }}
                            style={styles.userImage}
                            contentFit="cover"
                          />
                        ) : (
                          <MaterialIcons name="account-circle" size={60} color="#bcc0c4" />
                        );
                      })()}
                    </View>
                    
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {(() => {
                          const latestUserData = userDataMap[request.fromUserId];
                          return latestUserData?.displayName || latestUserData?.name || request.fromUserName || 'Unknown User';
                        })()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={() => handleConfirmRequest(request)}
                      disabled={processing[request.id]}
                    >
                      {processing[request.id] ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text style={styles.buttonText}>Confirm</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => handleRejectRequest(request)}
                      disabled={processing[request.id]}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default FriendRequestsScreen;

