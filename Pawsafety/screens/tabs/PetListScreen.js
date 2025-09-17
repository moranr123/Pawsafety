import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
  FlatList,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const PetListScreen = ({ navigation }) => {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedPet, setSelectedPet] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const { colors: COLORS } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8FAFC',
    },
    header: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.lg,
      paddingTop: 50,
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
      fontFamily: 'SF Pro Display',
      fontWeight: '700',
      color: COLORS.white,
      textAlign: 'center',
      marginBottom: SPACING.md,
    },
    filtersContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.xs,
    },
    filterButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.sm,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      flex: 1,
      alignItems: 'center',
      minHeight: 36,
      justifyContent: 'center',
    },
    filterButtonActive: {
      backgroundColor: COLORS.white,
      borderColor: COLORS.white,
    },
    filterText: {
      fontSize: 12,
      fontFamily: 'SF Pro Display',
      color: COLORS.white,
      fontWeight: '600',
      textAlign: 'center',
    },
    filterTextActive: {
      color: COLORS.darkPurple,
    },
    statsContainer: {
      marginLeft: 'auto',
    },
    statsText: {
      color: COLORS.lightBlue,
      fontSize: 14,
      fontFamily: 'SF Pro Display',
      fontWeight: '500',
    },
    lastUpdatedText: {
      color: COLORS.lightBlue,
      fontSize: 12,
      fontFamily: 'SF Pro Display',
      fontWeight: '400',
      marginTop: 2,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
    },
    content: {
      padding: SPACING.lg,
    },
    petCount: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.lg,
    },
    petCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      marginBottom: SPACING.lg,
      flex: 0.48, // for 2 columns
      overflow: 'hidden',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    petImageContainer: {
      height: 160,
      position: 'relative',
      overflow: 'hidden',
    },
    petImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderIcon: {
      fontSize: 48,
      marginBottom: 4,
    },
    placeholderText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semibold,
      opacity: 0.9,
    },
    cardContent: {
      padding: 16,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    petName: {
      fontSize: 18,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#1F2937',
      flex: 1,
      marginRight: 8,
    },
    petTypeIcon: {
      backgroundColor: '#F3F4F6',
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    petDetails: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: '#6B7280',
      marginBottom: 4,
      fontWeight: '500',
    },
    ownerInfo: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: '#9CA3AF',
      marginBottom: 12,
      fontWeight: '400',
    },
    statusContainer: {
      marginBottom: 8,
    },
    statusText: {
      fontSize: 11,
      fontFamily: FONTS.family,
      fontWeight: '600',
      textAlign: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12,
      overflow: 'hidden',
    },
    pregnantStatus: {
      backgroundColor: '#FEF3C7',
      color: '#D97706',
    },
    deceasedStatus: {
      backgroundColor: '#FEE2E2',
      color: '#DC2626',
    },

    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      padding: SPACING.xs,
      marginLeft: SPACING.xs,
    },
    actionIcon: {
      fontSize: FONTS.sizes.large,
      color: COLORS.mediumBlue,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.xxxlarge,
    },
    emptyIcon: {
      fontSize: 80,
      marginBottom: SPACING.lg,
    },
    emptyTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      textAlign: 'center',
      marginBottom: SPACING.lg,
    },
    flatListContent: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.lg,
    },
    row: {
      flex: 1,
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    detailsButton: {
      backgroundColor: '#667EEA',
      borderRadius: 25,
      paddingVertical: 10,
      paddingHorizontal: 20,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      elevation: 3,
      shadowColor: '#667EEA',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    detailsButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 13,
      marginLeft: 4,
    },


    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    modalContainer: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.xlarge,
      maxHeight: '90%',
      width: '100%',
      maxWidth: 400,
      elevation: 10,
      ...SHADOWS.heavy,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: SPACING.lg,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E5E5',
    },
    modalTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    closeButton: {
      padding: SPACING.sm,
      borderRadius: RADIUS.medium,
      backgroundColor: COLORS.inputBackground,
    },
    imageContainer: {
      padding: SPACING.lg,
      alignItems: 'center',
    },
    petImage: {
      width: 200,
      height: 200,
      borderRadius: RADIUS.xlarge,
      backgroundColor: COLORS.inputBackground,
    },
    placeholderImage: {
      width: 200,
      height: 200,
      borderRadius: RADIUS.xlarge,
      backgroundColor: COLORS.inputBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginTop: SPACING.sm,
    },
    nameSection: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    petName: {
      fontSize: FONTS.sizes.xxlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      flex: 1,
    },
    infoSection: {
      paddingHorizontal: SPACING.lg,
    },
    infoCard: {
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.mediumBlue,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoIconContainer: {
      width: 40,
      height: 40,
      borderRadius: RADIUS.large,
      backgroundColor: COLORS.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.md,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.secondaryText,
      marginBottom: SPACING.xs,
    },
    infoValue: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
    },
    descriptionSection: {
      margin: SPACING.lg,
      padding: SPACING.md,
      backgroundColor: COLORS.inputBackground,
      borderRadius: RADIUS.medium,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.darkPurple,
    },
    descriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    descriptionTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginLeft: SPACING.sm,
    },
    descriptionText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 22,
    },
    registrationSection: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    registrationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    registrationText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginLeft: SPACING.xs,
    },
    actionButtonsContainer: {
      padding: SPACING.lg,
      borderTopWidth: 1,
      borderTopColor: '#E5E5E5',
    },
    actionButton: {
      borderRadius: RADIUS.medium,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    closeActionButton: {
      backgroundColor: COLORS.darkPurple,
    },
    closeButtonText: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.white,
    },
  }), [COLORS]);

  useEffect(() => {
    // Query all pets without requiring createdAt field for ordering
    const unsubscribe = onSnapshot(
      collection(db, 'pets'),
      (snapshot) => {
         const petsData = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
         }));
         
         console.log('All pets from database:', petsData);
         
         // Filter out pets that are not properly registered and only show approved pets
         const registeredPets = petsData.filter(pet => {
           const isValid = pet.petName && 
                  pet.petName.trim() !== '' && 
                  pet.petType && 
                  (pet.ownerName || pet.ownerFullName) && 
                  (pet.ownerName?.trim() !== '' || pet.ownerFullName?.trim() !== '') &&
                  pet.registrationStatus === 'registered'; // Only show approved pets
           
           if (!isValid) {
             console.log('Filtered out pet:', pet);
           }
           
           return isValid;
         });
         
         // Sort pets manually by createdAt, registeredDate, or transferredAt
         const sortedPets = registeredPets.sort((a, b) => {
           const getTimestamp = (pet) => {
             if (pet.createdAt?.toDate) return pet.createdAt.toDate().getTime();
             if (pet.transferredAt?.toDate) return pet.transferredAt.toDate().getTime();
             if (pet.registeredDate) return new Date(pet.registeredDate).getTime();
             return 0;
           };
           return getTimestamp(b) - getTimestamp(a); // Descending order (newest first)
         });
         
         console.log('Registered pets after filtering and sorting:', sortedPets);
         
         setPets(sortedPets);
         setLastUpdated(new Date());
         setLoading(false);
       },
      (error) => {
        console.error('Error fetching pets:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // The useEffect will handle the refresh automatically
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleViewPet = (pet) => {
    setSelectedPet(pet);
    setDetailsVisible(true);
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const filteredPets = pets.filter(pet => {
    if (selectedFilter === 'All') return true;
    return pet.petType?.toLowerCase() === selectedFilter.toLowerCase();
  });



  const getPetEmoji = (petType) => {
    const emojiMap = {
      'dog': '🐕',
      'cat': '🐱',
      'bird': '🐦',
      'fish': '🐠',
      'rabbit': '🐰',
      'hamster': '🐹',
      'other': '🐾'
    };
    return emojiMap[petType] || '🐾';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <MaterialIcons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pet List</Text>
                      <View style={styles.statsContainer}>
            <Text style={styles.statsText}>Loading...</Text>
            <Text style={styles.lastUpdatedText}>Connecting to database...</Text>
          </View>
          </View>
        </View>
        <View style={styles.scrollView}>
          <Text style={styles.petCount}>Loading pets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
                 <Text style={styles.headerTitle}>Pet List</Text>
         <View style={styles.filtersContainer}>
           <TouchableOpacity
             style={[
               styles.filterButton,
               selectedFilter === 'All' && styles.filterButtonActive
             ]}
             onPress={() => handleFilterChange('All')}
           >
             <Text style={[
               styles.filterText,
               selectedFilter === 'All' && styles.filterTextActive
             ]}>All</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[
               styles.filterButton,
               selectedFilter === 'Dog' && styles.filterButtonActive
             ]}
             onPress={() => handleFilterChange('Dog')}
           >
             <Text style={[
               styles.filterText,
               selectedFilter === 'Dog' && styles.filterTextActive
             ]}>Dog</Text>
           </TouchableOpacity>
           <TouchableOpacity
             style={[
               styles.filterButton,
               selectedFilter === 'Cat' && styles.filterButtonActive
             ]}
             onPress={() => handleFilterChange('Cat')}
           >
             <Text style={[
               styles.filterText,
               selectedFilter === 'Cat' && styles.filterTextActive
             ]}>Cat</Text>
           </TouchableOpacity>
         </View>
      </View>

             <FlatList
         data={filteredPets}
         keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.flatListContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
                                   ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🐾</Text>
              <Text style={styles.emptyTitle}>
                {selectedFilter === 'All' ? 'No Registered Pets' : `No ${selectedFilter}s Found`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter === 'All' 
                  ? 'No pets have been properly registered in the community yet.'
                  : `No ${selectedFilter.toLowerCase()}s match your filter.`
                }
              </Text>
            </View>
          }
                 renderItem={({ item: pet }) => (
           <View style={styles.petCard}>
             {/* Pet Image Container */}
             <View style={styles.petImageContainer}>
               {pet.petImage ? (
                 <Image source={{ uri: pet.petImage }} style={styles.petImage} />
               ) : (
                 <View style={styles.imagePlaceholder}>
                   <Text style={styles.placeholderIcon}>{getPetEmoji(pet.petType)}</Text>
                   <Text style={styles.placeholderText}>No Photo</Text>
                 </View>
               )}
               
               
             </View>
             
             {/* Card Content */}
             <View style={styles.cardContent}>
               <View style={styles.petHeader}>
                 <Text style={styles.petName} numberOfLines={1}>{pet.petName}</Text>
                 <View style={styles.petTypeIcon}>
                   <Text style={{ fontSize: 16 }}>{getPetEmoji(pet.petType)}</Text>
                 </View>
               </View>
               
               <Text style={styles.petDetails}>
                 {pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1)} • {pet.breed || 'Mixed Breed'}
               </Text>
               
               <Text style={styles.ownerInfo}>
                 Owner: {pet.ownerFullName || pet.ownerName || 'Unknown'}
               </Text>
               
               {/* Pet Status */}
               {pet.petStatus && pet.petStatus !== 'healthy' && (
                 <View style={styles.statusContainer}>
                   <Text style={[
                     styles.statusText,
                     pet.petStatus === 'pregnant' && styles.pregnantStatus,
                     pet.petStatus === 'deceased' && styles.deceasedStatus
                   ]}>
                     {pet.petStatus === 'pregnant' ? '🤰 Pregnant' : 
                      pet.petStatus === 'deceased' ? '🕊️ Deceased' : ''}
                   </Text>
                 </View>
               )}
               
               <TouchableOpacity
                 style={styles.detailsButton}
                 onPress={() => handleViewPet(pet)}
                 activeOpacity={0.8}
               >
                 <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                 <Text style={styles.detailsButtonText}>View Details</Text>
               </TouchableOpacity>
             </View>
           </View>
         )}
      />
      {/* Enhanced Pet Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header with Close Button */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pet Details</Text>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Pet Image */}
              <View style={styles.imageContainer}>
                {selectedPet?.petImage ? (
                  <Image 
                    source={{ uri: selectedPet.petImage }} 
                    style={styles.petImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <MaterialIcons 
                      name={selectedPet?.petType === 'cat' ? 'pets' : 'pets'} 
                      size={80} 
                      color={COLORS.mediumBlue} 
                    />
                    <Text style={styles.placeholderText}>No Photo</Text>
                  </View>
                )}
              </View>

              {/* Pet Name */}
              <View style={styles.nameSection}>
                <Text style={styles.petName}>{selectedPet?.petName || 'Unnamed Pet'}</Text>
              </View>

              {/* Pet Information Cards */}
              <View style={styles.infoSection}>
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons 
                        name={selectedPet?.petType === 'cat' ? 'pets' : 'pets'} 
                        size={20} 
                        color={COLORS.darkPurple} 
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Type</Text>
                      <Text style={styles.infoValue}>
                        {selectedPet?.petType ? 
                          (selectedPet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat') : 
                          'Unknown'
                        }
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons 
                        name={selectedPet?.petGender === 'male' ? 'male' : 'female'} 
                        size={20} 
                        color={selectedPet?.petGender === 'male' ? '#2196F3' : '#E91E63'} 
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Gender</Text>
                      <Text style={styles.infoValue}>
                        {selectedPet?.petGender ? 
                          (selectedPet.petGender === 'male' ? '♂️ Male' : '♀️ Female') : 
                          'Unknown'
                        }
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons name="category" size={20} color="#FF9800" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Breed</Text>
                      <Text style={styles.infoValue}>{selectedPet?.breed || 'Unknown Breed'}</Text>
                    </View>
                  </View>
                </View>

                {selectedPet?.ownerFullName && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="person" size={20} color={COLORS.success} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Owner</Text>
                        <Text style={styles.infoValue}>{selectedPet.ownerFullName}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedPet?.contactNumber && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="phone" size={20} color={COLORS.mediumBlue} />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Contact</Text>
                        <Text style={styles.infoValue}>{selectedPet.contactNumber}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Pet Status */}
                {selectedPet?.petStatus && selectedPet.petStatus !== 'healthy' && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons 
                          name={selectedPet.petStatus === 'pregnant' ? 'favorite' : 'pets'} 
                          size={20} 
                          color={selectedPet.petStatus === 'pregnant' ? '#E91E63' : '#9E9E9E'} 
                        />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Status</Text>
                        <Text style={[
                          styles.infoValue,
                          selectedPet.petStatus === 'pregnant' && { color: '#E91E63' },
                          selectedPet.petStatus === 'deceased' && { color: '#DC2626' }
                        ]}>
                          {selectedPet.petStatus === 'pregnant' ? '🤰 Pregnant' : 
                           selectedPet.petStatus === 'deceased' ? '🕊️ Deceased' : 
                           selectedPet.petStatus}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Description Section */}
              {selectedPet?.description && (
                <View style={styles.descriptionSection}>
                  <View style={styles.descriptionHeader}>
                    <MaterialIcons name="description" size={20} color={COLORS.darkPurple} />
                    <Text style={styles.descriptionTitle}>Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedPet.description}</Text>
                </View>
              )}

              {/* Registration Info */}
              {selectedPet?.registeredDate && (
                <View style={styles.registrationSection}>
                  <View style={styles.registrationHeader}>
                    <MaterialIcons name="event" size={16} color={COLORS.gray} />
                    <Text style={styles.registrationText}>
                      Registered on {new Date(selectedPet.registeredDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                onPress={() => setDetailsVisible(false)}
                style={[styles.actionButton, styles.closeActionButton]}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PetListScreen; 