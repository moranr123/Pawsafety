import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import { FONTS, SPACING } from '../constants/theme';

const BlockedUsersScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [blockedUsers, setBlockedUsers] = useState([]);

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
    scrollView: {
      flex: 1,
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#ffffff',
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#e4e6eb',
      marginRight: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    userInfo: {
      flex: 1,
    },
    name: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text || '#050505',
      fontWeight: FONTS.weights.medium,
    },
    email: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText || '#65676b',
      marginTop: 2,
    },
    unblockButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#1877f2',
    },
    unblockButtonText: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: '#1877f2',
      fontWeight: FONTS.weights.medium,
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

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'blocks'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const items = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const blockedId = data.blockedUserId;
          const userDoc = await getDoc(doc(db, 'users', blockedId));
          const userData = userDoc.exists() ? userDoc.data() : {};
          items.push({
            id: docSnap.id,
            blockedUserId: blockedId,
            name: userData.displayName || userData.name || 'Pet Lover',
            email: userData.email || '',
            profileImage: userData.profileImage || null,
          });
        }
        setBlockedUsers(items);
      },
      (error) => {
        console.error('Error fetching blocked users:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleUnblock = (blockedUserId) => {
    if (!user?.uid) return;

    Alert.alert(
      'Unblock User',
      'Are you sure you want to unblock this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              const blockId = `${user.uid}_${blockedUserId}`;
              await deleteDoc(doc(db, 'blocks', blockId));
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackPress}
        >
          <MaterialIcons name="arrow-back" size={24} color="#050505" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {blockedUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              You haven't blocked anyone.
            </Text>
          </View>
        ) : (
          blockedUsers.map((item) => (
            <View key={item.blockedUserId} style={styles.itemContainer}>
              <View style={styles.avatar}>
                {item.profileImage ? (
                  <Image 
                    source={{ uri: item.profileImage }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                ) : (
                  <MaterialIcons name="account-circle" size={40} color="#bcc0c4" />
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                {!!item.email && (
                  <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.unblockButton}
                onPress={() => handleUnblock(item.blockedUserId)}
              >
                <Text style={styles.unblockButtonText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default BlockedUsersScreen;


