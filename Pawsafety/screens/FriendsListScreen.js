import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { collection, query, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const FriendsListScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [friends, setFriends] = useState([]);

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
      fontSize: 20,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    content: {
      padding: SPACING.lg,
    },
    friendsList: {
      backgroundColor: '#ffffff',
      borderRadius: 10,
      overflow: 'hidden',
    },
    friendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    friendItemLast: {
      borderBottomWidth: 0,
    },
    friendImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#e4e6eb',
      marginRight: SPACING.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    friendInfo: {
      flex: 1,
    },
    friendName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 4,
      fontFamily: FONTS.family,
    },
    friendEmail: {
      fontSize: 14,
      color: '#65676b',
      fontFamily: FONTS.family,
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
  }), [COLORS]);

  // Fetch friends in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', user.uid)
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
  }, [user?.uid]);

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
        <Text style={styles.headerTitle}>Friends</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No friends yet</Text>
            </View>
          ) : (
            <View style={styles.friendsList}>
              {friends.map((friend, index) => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    styles.friendItem,
                    index === friends.length - 1 && styles.friendItemLast
                  ]}
                  onPress={() => navigation.navigate('Profile', { userId: friend.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.friendImage}>
                    {friend.profileImage ? (
                      <Image
                        source={{ uri: friend.profileImage }}
                        style={{ width: 60, height: 60, borderRadius: 30 }}
                        contentFit="cover"
                      />
                    ) : (
                    <MaterialIcons name="account-circle" size={60} color="#bcc0c4" />
                    )}
                  </View>
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{friend.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default FriendsListScreen;

