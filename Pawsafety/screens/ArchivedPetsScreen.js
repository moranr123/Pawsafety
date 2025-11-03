import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getResponsiveDimensions } from '../utils/responsive';

const ArchivedPetsScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [archivedPets, setArchivedPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  const { isSmallDevice, isTablet, wp, hp } = getResponsiveDimensions();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'pets'),
      where('userId', '==', user.uid),
      where('archived', '==', true)
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
      'Unarchive Pet',
      `Do you want to restore ${petName} back to your pets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'pets', petId), {
                archived: false,
                archivedAt: null
              });
              Alert.alert('Success', `${petName} has been restored to your pets.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to unarchive pet. Please try again.');
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
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: isSmallDevice ? SPACING.md : SPACING.lg,
      paddingTop: isSmallDevice ? 45 : 50,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    statsText: {
      color: COLORS.lightBlue,
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
    },
    backButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
      marginRight: SPACING.md,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: isSmallDevice ? SPACING.md : SPACING.lg,
      paddingTop: SPACING.lg,
    },
    content: {
      paddingBottom: SPACING.xl,
    },
    petCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      marginBottom: SPACING.lg,
      ...SHADOWS.medium,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: COLORS.secondaryText,
      opacity: 0.8,
    },
    petImageContainer: {
      height: 220,
      backgroundColor: COLORS.inputBackground,
    },
    petImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: COLORS.inputBackground,
    },
    placeholderIcon: {
      fontSize: 60,
      marginBottom: 8,
    },
    placeholderText: {
      fontSize: 14,
      color: COLORS.secondaryText,
      fontWeight: '500',
    },
    petInfo: {
      padding: 20,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    petName: {
      fontSize: 26,
      fontWeight: '900',
      color: COLORS.secondaryText,
      flex: 1,
    },
    archivedBadge: {
      backgroundColor: COLORS.secondaryText,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.small,
      marginLeft: SPACING.sm,
    },
    archivedBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: COLORS.white,
      textTransform: 'uppercase',
    },
    petTypeIcon: {
      backgroundColor: COLORS.inputBackground,
      borderRadius: 24,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.secondaryText,
    },
    petDetails: {
      fontSize: 15,
      color: COLORS.secondaryText,
      marginBottom: 6,
      fontWeight: '500',
    },
    ownerInfo: {
      fontSize: 14,
      color: COLORS.secondaryText,
      marginBottom: 12,
    },
    description: {
      fontSize: 14,
      color: COLORS.secondaryText,
      marginTop: 8,
      lineHeight: 20,
    },
    actionButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      paddingVertical: 20,
      paddingTop: 12,
      backgroundColor: COLORS.inputBackground,
      borderTopWidth: 2,
      borderTopColor: COLORS.secondaryText,
      justifyContent: 'space-between',
    },
    actionButton: {
      width: Platform.OS === 'android' ? '48%' : '48%',
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: Platform.OS === 'android' ? 12 : 18,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      elevation: 2,
      marginBottom: 12,
    },
    unarchiveButton: {
      backgroundColor: COLORS.success,
      ...SHADOWS.small,
    },
    deleteButton: {
      backgroundColor: COLORS.error,
      ...SHADOWS.small,
    },
    actionButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
      textAlign: 'center',
      marginLeft: SPACING.xs,
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
  }), [COLORS, isSmallDevice, isTablet, wp, hp]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Pets</Text>
          <View style={styles.headerActions}>
            <Text style={styles.statsText}>
              {archivedPets.length} {archivedPets.length === 1 ? 'Pet' : 'Pets'}
            </Text>
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
                <View style={styles.petImageContainer}>
                  {pet.petImage ? (
                    <Image 
                      source={{ uri: pet.petImage }} 
                      style={styles.petImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderIcon}>
                        {pet.petType === 'dog' ? '🐕' : '🐱'}
                      </Text>
                      <Text style={styles.placeholderText}>No Photo</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.petInfo}>
                  <View style={styles.petHeader}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.petName}>{pet.petName}</Text>
                      <View style={styles.archivedBadge}>
                        <Text style={styles.archivedBadgeText}>Archived</Text>
                      </View>
                    </View>
                    <View style={styles.petTypeIcon}>
                      <Text style={{ fontSize: 16 }}>
                        {pet.petType === 'dog' ? '🐕' : '🐱'}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.petDetails}>
                    {pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1)} • {pet.breed || 'Mixed Breed'}
                  </Text>
                  
                  <Text style={styles.ownerInfo}>
                    Owner: {pet.ownerFullName || 'Unknown'}
                  </Text>
                  
                  {pet.description && (
                    <Text style={styles.description}>{pet.description}</Text>
                  )}
                </View>
                
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.unarchiveButton]} 
                    onPress={() => handleUnarchivePet(pet.id, pet.petName)}
                  >
                    <MaterialIcons name="unarchive" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Unarchive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.deleteButton]} 
                    onPress={() => handleDeletePet(pet.id, pet.petName)}
                  >
                    <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Delete</Text>
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

