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
import { collection, query, onSnapshot } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const AddFriendsScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
    addButtonText: {
      color: '#ffffff',
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

  const handleAddFriend = (userId) => {
    // TODO: Implement add friend functionality
    // For now, just show an alert
    Alert.alert('Add Friend', 'Friend request feature coming soon!');
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
                  
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddFriend(userItem.id)}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
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

