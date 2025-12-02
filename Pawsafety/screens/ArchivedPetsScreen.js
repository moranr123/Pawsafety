import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs, orderBy, limit } from 'firebase/firestore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const ArchivedPetsScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [archivedPets, setArchivedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;


  useEffect(() => {
    if (!user) return;

    // Optimized: Add orderBy and limit
    const q = query(
      collection(db, 'pets'),
      where('userId', '==', user.uid),
      where('archived', '==', true),
      orderBy('archivedAt', 'desc'), // Assuming archivedAt field exists
      limit(100) // Reasonable limit for archived pets
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const petList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setArchivedPets(petList);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleUnarchivePet = (petId, petName) => {
    Alert.alert(
      'Restore Pet',
      `Do you want to restore ${petName} back to your pets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'pets', petId), {
                archived: false,
                archivedAt: null
              });
              Alert.alert('Success', `${petName} has been restored to your pets.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to restore pet. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeletePet = (petId, petName) => {
    Alert.alert(
      'Delete Pet Permanently',
      `Are you sure you want to permanently delete ${petName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the pet
              await deleteDoc(doc(db, 'pets', petId));
              
              // Also delete any corresponding stray reports
              const strayReportsQuery = query(
                collection(db, 'stray_reports'),
                where('petId', '==', petId)
              );
              
              const strayReportsSnapshot = await getDocs(strayReportsQuery);
              const deletePromises = strayReportsSnapshot.docs.map(docSnapshot => 
                deleteDoc(doc(db, 'stray_reports', docSnapshot.id))
              );
              
              await Promise.all(deletePromises);
              
              Alert.alert('Success', `${petName} has been permanently deleted.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete pet. Please try again.');
            }
          }
        }
      ]
    );
  };

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      backgroundColor: '#ffffff',
      paddingHorizontal: SPACING.md,
      paddingTop: Platform.OS === 'ios' ? 50 : Math.max(0, (StatusBar.currentHeight || 0) - 24),
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      ...SHADOWS.light,
    },
    headerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statsContainer: {
      marginLeft: 'auto',
    },
    statsText: {
      color: '#65676b',
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
      marginRight: SPACING.md,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.lg,
    },
    content: {
      paddingBottom: SPACING.xl,
    },
    petCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: 0,
      marginTop: SPACING.md,
      borderRadius: 10,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
      marginBottom: SPACING.md,
      opacity: 0.9,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      justifyContent: 'space-between',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 2,
    },
    postTime: {
      fontSize: 12,
      color: '#65676b',
    },
    petImageContainer: {
      marginBottom: 12,
    },
    petImage: {
      width: '85%',
      height: 300,
      maxHeight: 400,
      borderRadius: 8,
      alignSelf: 'center',
    },
    imagePlaceholder: {
      width: '85%',
      height: 300,
      maxHeight: 400,
      alignSelf: 'center',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
      borderRadius: 8,
      marginBottom: 12,
    },
    placeholderIcon: {
      fontSize: 60,
      marginBottom: 8,
    },
    placeholderText: {
      fontSize: 14,
      color: '#65676b',
      fontWeight: '500',
    },
    petInfo: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    petName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      flex: 1,
      marginBottom: 2,
    },
    archivedBadge: {
      backgroundColor: '#65676b',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      marginLeft: 8,
    },
    archivedBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#ffffff',
      textTransform: 'uppercase',
    },
    petTypeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
    },
    petDetails: {
      fontSize: 12,
      color: '#65676b',
      marginBottom: 8,
    },
    ownerInfo: {
      fontSize: 13,
      color: '#65676b',
      marginBottom: 8,
    },
    description: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginBottom: 12,
      fontFamily: FONTS.family,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
    },
    unarchiveButton: {
      backgroundColor: 'transparent',
    },
    deleteButton: {
      backgroundColor: 'transparent',
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#65676b',
      marginLeft: 6,
    },
    unarchiveButtonText: {
      color: '#10B981',
    },
    deleteButtonText: {
      color: '#EF4444',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    emptyIcon: {
      fontSize: 60,
      marginBottom: SPACING.md,
    },
    emptyTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
    },
    emptyText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.lg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    loadingText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.md,
    },
  }), [COLORS]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Pets</Text>
          <View style={styles.headerActions}>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {archivedPets.length} {archivedPets.length === 1 ? 'Pet' : 'Pets'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.mediumBlue} />
              <Text style={styles.loadingText}>Loading archived pets...</Text>
            </View>
          ) : archivedPets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Archived Pets</Text>
              <Text style={styles.emptyText}>
                You haven't archived any pets yet. Archived pets are hidden from your main pets list but can be restored at any time.
              </Text>
            </View>
          ) : (
            archivedPets.map((pet) => (
              <View key={pet.id} style={styles.petCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.userInfo}>
                    <View style={styles.profilePlaceholder}>
                      <Text style={{ fontSize: 20 }}>{pet.petType === 'dog' ? '🐕' : '🐱'}</Text>
                    </View>
                    <View style={styles.userDetails}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                        <Text style={styles.userName}>{pet.petName}</Text>
                        <View style={styles.archivedBadge}>
                          <Text style={styles.archivedBadgeText}>Archived</Text>
                        </View>
                      </View>
                      <Text style={styles.postTime}>
                        {pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1)} • {pet.breed || 'Mixed Breed'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pet Image */}
                {pet.petImage ? (
                  <View style={styles.petImageContainer}>
                    <Image 
                      source={{ uri: pet.petImage }} 
                      style={styles.petImage} 
                      resizeMode="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderIcon}>
                      {pet.petType === 'dog' ? '🐕' : '🐱'}
                    </Text>
                    <Text style={styles.placeholderText}>No Photo</Text>
                  </View>
                )}

                {/* Content */}
                <View style={styles.petInfo}>
                  {pet.description && (
                    <Text style={styles.description}>{pet.description}</Text>
                  )}
                  <Text style={styles.ownerInfo}>
                    Owner: {pet.ownerFullName || 'Unknown'}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.unarchiveButton]} 
                    onPress={() => handleUnarchivePet(pet.id, pet.petName)}
                  >
                    <MaterialIcons name="unarchive" size={20} color="#10B981" />
                    <Text style={[styles.actionButtonText, styles.unarchiveButtonText]}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]} 
                    onPress={() => handleDeletePet(pet.id, pet.petName)}
                  >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ArchivedPetsScreen;

