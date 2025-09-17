import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  RefreshControl,
  Modal,
  Image,
  TextInput,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { auth, db } from '../../services/firebase';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, where, deleteDoc, doc } from 'firebase/firestore';

const AdoptScreen = () => {
  const { colors: COLORS } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [pets, setPets] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [myAppsVisible, setMyAppsVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All'); // All | Dogs | Cats
  const [selectedPet, setSelectedPet] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(null); // { petId: string } | null
  const [appForm, setAppForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    adults: '',
    children: '',
    residenceType: 'house',
    landlordApproval: false,
    experience: '',
    currentPets: '',
    lifestyle: '',
    vetName: '',
    vetPhone: '',
    references: '',
    preferredDate: '',
    agreeTerms: false,
    agreeData: false,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleDeleteApplication = async (appId) => {
    try {
      await deleteDoc(doc(db, 'adoption_applications', appId));
      // The onSnapshot listener will automatically update the myApplications state
    } catch (error) {
      console.error('Error deleting application:', error);
      Alert.alert('Error', 'Failed to delete application. Please try again.');
    }
  };

  // Create styles using current theme colors
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    filtersContainer: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.lg,
      marginBottom: SPACING.md,
    },
    filterChip: {
      backgroundColor: COLORS.cardBackground,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.medium,
      marginRight: SPACING.sm,
      borderWidth: 1,
      borderColor: COLORS.mediumBlue,
    },
    filterChipActive: {
      backgroundColor: COLORS.success,
      borderColor: COLORS.success,
    },
    filterText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
      fontWeight: FONTS.weights.medium,
    },
    filterTextActive: {
      color: COLORS.white,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
    },
    petCard: {
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.md,
      minHeight: 200,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      ...SHADOWS.medium,
    },
    cardBackgroundImage: {
      borderRadius: RADIUS.medium,
    },
    placeholderBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: COLORS.lightBlue,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: RADIUS.medium,
    },
    petEmoji: {
      fontSize: 60,
    },
    darkOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: RADIUS.medium,
    },
    petContent: {
      position: 'absolute',
      bottom: SPACING.md,
      left: SPACING.md,
      right: SPACING.md,
      zIndex: 2,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    petName: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    petType: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: '#FFFFFF',
      opacity: 0.95,
      marginBottom: SPACING.xs,
    },
    genderBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    genderText: {
      fontSize: FONTS.sizes.medium,
      color: '#FFFFFF',
    },
    petBreed: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    petLocation: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: SPACING.xs,
    },
    petDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      lineHeight: 18,
      marginBottom: SPACING.md,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    adoptButton: {
      backgroundColor: 'rgba(76, 175, 80, 0.8)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginRight: SPACING.xs,
    },
    adoptButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    detailsButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginLeft: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    detailsButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    ctaCard: {
      backgroundColor: COLORS.golden,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      ...SHADOWS.light,
    },
    ctaIcon: {
      fontSize: FONTS.sizes.xlarge,
      marginRight: SPACING.md,
    },
    ctaContent: {
      flex: 1,
    },
    ctaTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    ctaText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 18,
      marginBottom: SPACING.sm,
    },
    ctaButton: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      alignSelf: 'flex-start',
    },
    ctaButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    myAppsButton: {
      alignSelf: 'flex-end',
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
    },
    myAppsButtonText: {
      color: '#fff',
      fontWeight: '700'
    },
    bottomSpacing: {
      height: 100,
    },
    input: {
      borderWidth: 1,
      borderColor: '#e5e7eb',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: '#fff'
    },
    label: {
      fontSize: FONTS.sizes.small,
      color: '#334155',
      marginTop: 8
    },
    sectionHeader: {
      fontSize: FONTS.sizes.medium,
      fontWeight: '700',
      color: '#0f172a',
      marginTop: 8,
      marginBottom: 6
    },
    sectionCard: {
      backgroundColor: '#f8fafc',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#e2e8f0',
      marginTop: 8,
      marginBottom: 8
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
      marginBottom: 8
    },
    chipChoice: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#cbd5e1',
      backgroundColor: '#fff'
    },
    chipChoiceActive: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#94a3b8',
      backgroundColor: '#fff'
    },
    checkboxChecked: {
      backgroundColor: COLORS.darkPurple,
      borderColor: COLORS.darkPurple
    },
    menuButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      zIndex: 10,
    },
    menuDropdown: {
      position: 'absolute',
      top: 50,
      right: SPACING.sm,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 20,
      minWidth: 120,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
    },
    menuItemText: {
      marginLeft: SPACING.xs,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#374151',
    },
    appMenuButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      backgroundColor: '#f9fafb',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      zIndex: 10,
    },
    appMenuDropdown: {
      position: 'absolute',
      top: 40,
      right: SPACING.sm,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 20,
      minWidth: 120,
    },
    appMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.small,
    },
    appMenuItemText: {
      marginLeft: SPACING.xs,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#374151',
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
    petImageModal: {
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
    petNameModal: {
      fontSize: FONTS.sizes.xxlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      textAlign: 'center',
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
    // Medical Section Styles
    medicalSection: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.large,
      padding: SPACING.lg,
      marginTop: SPACING.md,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.light,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
      textAlign: 'center',
    },
    treatmentContainer: {
      gap: SPACING.md,
    },
    treatmentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    treatmentInfo: {
      flex: 1,
      marginLeft: SPACING.md,
    },
    treatmentLabel: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    treatmentStatus: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      marginBottom: SPACING.xs,
    },
    treatmentStatusActive: {
      color: '#4CAF50',
      fontWeight: FONTS.weights.medium,
    },
    treatmentDate: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      fontStyle: 'italic',
    },
    // Medical Info Card Styles (for adoption cards)
    medicalInfoCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: RADIUS.medium,
      padding: SPACING.sm,
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
    },
    medicalTitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: '#FFFFFF',
      marginBottom: SPACING.xs,
      textAlign: 'center',
    },
    medicalBadges: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: SPACING.xs,
    },
    medicalBadge: {
      flex: 1,
      alignItems: 'center',
      borderRadius: RADIUS.small,
      padding: SPACING.xs,
      minHeight: 40,
      justifyContent: 'center',
    },
    medicalBadgeActive: {
      backgroundColor: 'rgba(76, 175, 80, 0.3)',
      borderWidth: 1,
      borderColor: 'rgba(76, 175, 80, 0.6)',
    },
    medicalBadgeInactive: {
      backgroundColor: 'rgba(158, 158, 158, 0.2)',
      borderWidth: 1,
      borderColor: 'rgba(158, 158, 158, 0.4)',
    },
    medicalBadgeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#FFFFFF',
      opacity: 0.8,
    },
    medicalBadgeTextActive: {
      opacity: 1,
      color: '#FFFFFF',
    },
    medicalDate: {
      fontSize: 10,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      opacity: 0.9,
      marginTop: 2,
      textAlign: 'center',
    },
    upperLeftInfo: {
      position: 'absolute',
      top: SPACING.md,
      left: SPACING.md,
      zIndex: 2,
    },
    upperRightInfo: {
      position: 'absolute',
      top: SPACING.md,
      right: SPACING.md,
      zIndex: 2,
    },
  }), [COLORS]);

  const AdoptionCard = ({ pet, onPressDetails, onPressAdopt }) => (
    <ImageBackground 
      source={pet.imageUrl ? { uri: pet.imageUrl } : null}
      style={styles.petCard}
      imageStyle={styles.cardBackgroundImage}
    >
      {!pet.imageUrl && (
        <View style={styles.placeholderBackground}>
          <Text style={styles.petEmoji}>{pet.petType === 'dog' ? '🐕' : '🐱'}</Text>
        </View>
      )}
      
      <View style={styles.darkOverlay} />
      
      {/* Pet name and type at upper left */}
      <View style={styles.upperLeftInfo}>
        <Text style={styles.petName}>{pet.petName}</Text>
        <Text style={styles.petType}>{pet.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}</Text>
      </View>
      
      {/* Gender badge at upper right */}
      <View style={styles.upperRightInfo}>
        <View style={styles.genderBadge}>
          <Text style={styles.genderText}>{pet.gender === 'male' ? '♂' : '♀'}</Text>
        </View>
      </View>
      
      {/* Action buttons at bottom */}
      <View style={styles.petContent}>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.adoptButton} onPress={onPressAdopt}>
            <Text style={styles.adoptButtonText}>❤️ Adopt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.detailsButton} onPress={onPressDetails}>
            <Text style={styles.detailsButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );

  const FilterChip = ({ title, active = false, onPress, style }) => (
    <TouchableOpacity 
      style={[styles.filterChip, active && styles.filterChipActive, style]} 
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  useEffect(() => {
    const q = query(collection(db, 'adoptable_pets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ready = items.filter(p => p.readyForAdoption !== false);
        setPets(ready);
        setErrorMsg('');
        // Push-like local notifications for new pets
        // If desired, you can compare previous ids and Alert user
      },
      (error) => {
        console.log('AdoptScreen onSnapshot error:', error);
        setErrorMsg('Unable to load adoptable pets. Please try again later.');
      }
    );
    return unsubscribe;
  }, []);

  // My adoption applications (for current user)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(
      collection(db, 'adoption_applications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMyApplications(apps);
    });
    return unsub;
  }, [auth.currentUser?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Section */}
      <View style={styles.filtersContainer}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <FilterChip title="All" active={selectedFilter === 'All'} onPress={() => setSelectedFilter('All')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
          <FilterChip title="Dogs" active={selectedFilter === 'Dogs'} onPress={() => setSelectedFilter('Dogs')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
          <FilterChip title="Cats" active={selectedFilter === 'Cats'} onPress={() => setSelectedFilter('Cats')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} />
        </View>
        <View style={{ marginTop: SPACING.sm }}>
          <TouchableOpacity style={styles.myAppsButton} onPress={() => setMyAppsVisible(true)}>
            <Text style={styles.myAppsButtonText}>My Applications</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Adoption List */}
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.darkPurple]}
            tintColor={COLORS.darkPurple}
          />
        }
      >
        {!!errorMsg && (
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, backgroundColor: COLORS.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text }}>{errorMsg}</Text>
          </View>
        )}

        {pets.length === 0 && !errorMsg && (
          <View style={[styles.petCard, { padding: SPACING.md, minHeight: 120, backgroundColor: COLORS.cardBackground, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: COLORS.text }}>No adoptable pets yet.</Text>
          </View>
        )}

        {pets
          .filter((p) => {
            const type = (p.petType || '').toLowerCase();
            if (selectedFilter === 'All') return true;
            if (selectedFilter === 'Dogs') return type !== 'cat'; // default to dog when type unknown
            if (selectedFilter === 'Cats') return type === 'cat';
            return true;
          })
          .map((p) => (
            <AdoptionCard
              key={p.id}
              pet={p}
              onPressDetails={() => { setSelectedPet(p); setDetailsVisible(true); }}
              onPressAdopt={() => {
                setSelectedPet(p);
                const user = auth.currentUser;
                setAppForm((prev) => ({
                  ...prev,
                  fullName: prev.fullName || (user?.displayName || ''),
                  email: prev.email || (user?.email || ''),
                }));
                setApplyVisible(true);
              }}
            />
          ))}

        {/* Call to Action */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaIcon}>🏠</Text>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Can't Adopt Right Now?</Text>
            <Text style={styles.ctaText}>Consider fostering or volunteering at local shelters. Every bit of help makes a difference!</Text>
            <TouchableOpacity style={styles.ctaButton}>
              <Text style={styles.ctaButtonText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Details Modal */}
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
                {selectedPet?.imageUrl ? (
                  <Image 
                    source={{ uri: selectedPet.imageUrl }} 
                    style={styles.petImageModal} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <MaterialIcons 
                      name="pets" 
                      size={80} 
                      color={COLORS.mediumBlue} 
                    />
                    <Text style={styles.placeholderText}>No Photo</Text>
                  </View>
                )}
              </View>

              {/* Pet Name */}
              <View style={styles.nameSection}>
                <Text style={styles.petNameModal}>{selectedPet?.petName || 'Unnamed Pet'}</Text>
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
                      <MaterialIcons name="category" size={20} color="#FF9800" />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Breed</Text>
                      <Text style={styles.infoValue}>{selectedPet?.breed || 'Unknown Breed'}</Text>
                    </View>
                  </View>
                </View>

                {selectedPet?.age && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="cake" size={20} color="#4CAF50" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Age</Text>
                        <Text style={styles.infoValue}>{selectedPet.age}</Text>
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <MaterialIcons 
                        name={selectedPet?.gender === 'male' ? 'male' : 'female'} 
                        size={20} 
                        color={selectedPet?.gender === 'male' ? '#2196F3' : '#E91E63'} 
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Gender</Text>
                      <Text style={styles.infoValue}>
                        {selectedPet?.gender ? 
                          (selectedPet.gender === 'male' ? '♂️ Male' : '♀️ Female') : 
                          'Unknown'
                        }
                      </Text>
                    </View>
                  </View>
                </View>

                {selectedPet?.location && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="location-on" size={20} color="#F44336" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Location</Text>
                        <Text style={styles.infoValue}>{selectedPet.location}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Medical Treatments Section */}
                <View style={styles.medicalSection}>
                  <Text style={styles.sectionTitle}>Medical Information</Text>
                  
                  <View style={styles.treatmentContainer}>
                    <View style={styles.treatmentItem}>
                      <MaterialIcons 
                        name="vaccines" 
                        size={20} 
                        color={selectedPet?.vaccinated ? "#4CAF50" : "#9E9E9E"} 
                      />
                      <View style={styles.treatmentInfo}>
                        <Text style={styles.treatmentLabel}>Vaccine</Text>
                        <Text style={[styles.treatmentStatus, selectedPet?.vaccinated && styles.treatmentStatusActive]}>
                          {selectedPet?.vaccinated ? '✓ Vaccinated' : '✗ Not Vaccinated'}
                        </Text>
                        {selectedPet?.vaccinated && selectedPet?.vaccinatedDate && (
                          <Text style={styles.treatmentDate}>Date: {selectedPet.vaccinatedDate}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.treatmentItem}>
                      <MaterialIcons 
                        name="healing" 
                        size={20} 
                        color={selectedPet?.dewormed ? "#4CAF50" : "#9E9E9E"} 
                      />
                      <View style={styles.treatmentInfo}>
                        <Text style={styles.treatmentLabel}>Deworm</Text>
                        <Text style={[styles.treatmentStatus, selectedPet?.dewormed && styles.treatmentStatusActive]}>
                          {selectedPet?.dewormed ? '✓ Dewormed' : '✗ Not Dewormed'}
                        </Text>
                        {selectedPet?.dewormed && selectedPet?.dewormedDate && (
                          <Text style={styles.treatmentDate}>Date: {selectedPet.dewormedDate}</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.treatmentItem}>
                      <MaterialIcons 
                        name="local-hospital" 
                        size={20} 
                        color={selectedPet?.antiRabies ? "#4CAF50" : "#9E9E9E"} 
                      />
                      <View style={styles.treatmentInfo}>
                        <Text style={styles.treatmentLabel}>Anti-rabies</Text>
                        <Text style={[styles.treatmentStatus, selectedPet?.antiRabies && styles.treatmentStatusActive]}>
                          {selectedPet?.antiRabies ? '✓ Anti-rabies' : '✗ No Anti-rabies'}
                        </Text>
                        {selectedPet?.antiRabies && selectedPet?.antiRabiesDate && (
                          <Text style={styles.treatmentDate}>Date: {selectedPet.antiRabiesDate}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {selectedPet?.temperament && (
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <View style={styles.infoIconContainer}>
                        <MaterialIcons name="psychology" size={20} color="#9C27B0" />
                      </View>
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Temperament</Text>
                        <Text style={styles.infoValue}>{selectedPet.temperament}</Text>
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
      {/* My Applications Modal */}
      <Modal
        visible={myAppsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMyAppsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '85%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ fontSize: FONTS.sizes.large, fontWeight: '700' }}>My Applications</Text>
              <Text style={{ color: '#64748b', marginTop: 4 }}>Track your application status</Text>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {myApplications.length === 0 ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#64748b' }}>You have not submitted any applications yet.</Text>
                </View>
              ) : (
                myApplications.map((app) => (
                  <View key={app.id} style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, marginBottom: 10, position: 'relative' }}>
                    {/* Three-dot menu */}
                    <TouchableOpacity 
                      style={styles.appMenuButton}
                      onPress={() => setMenuVisible(menuVisible === app.id ? null : app.id)}
                    >
                      <MaterialIcons name="more-horiz" size={20} color="#6b7280" />
                    </TouchableOpacity>
                    
                    {/* Menu dropdown */}
                    {menuVisible === app.id && (
                      <View style={styles.appMenuDropdown}>
                        <TouchableOpacity 
                          style={styles.appMenuItem}
                          onPress={() => {
                            Alert.alert(
                              'Delete Application',
                              'Are you sure you want to delete this application? This action cannot be undone.',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { 
                                  text: 'Delete', 
                                  style: 'destructive',
                                  onPress: () => {
                                    handleDeleteApplication(app.id);
                                    setMenuVisible(null);
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <MaterialIcons name="delete" size={16} color="#dc2626" />
                          <Text style={styles.appMenuItemText}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.appMenuItem}
                          onPress={() => setMenuVisible(null)}
                        >
                          <MaterialIcons name="close" size={16} color="#6b7280" />
                          <Text style={styles.appMenuItemText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    
                    <Text style={{ fontWeight: '700', fontSize: 16 }}>{app.petName || app.petBreed || 'Pet'}</Text>
                    <Text style={{ marginTop: 2, color: '#475569' }}>Preferred: {app.preferredDate || 'N/A'}</Text>
                    <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: app.status === 'Approved' ? '#dcfce7' : app.status === 'Declined' ? '#fee2e2' : app.status === 'Under Review' ? '#fef3c7' : '#ede9fe' }}>
                        <Text style={{ color: '#111827', fontWeight: '700', fontSize: 12 }}>{app.status || 'Submitted'}</Text>
                      </View>
                      <Text style={{ color: '#64748b', fontSize: 12 }}>{app.createdAt?.toDate ? app.createdAt.toDate().toLocaleString() : ''}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => setMyAppsVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#ef4444', borderRadius: 8 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Apply to Adopt Modal */}
      <Modal
        visible={applyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setApplyVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', maxHeight: '90%' }}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: FONTS.sizes.large, fontWeight: '700', marginBottom: 10 }}>Apply to Adopt</Text>
              <Text style={{ marginBottom: 16, color: '#555' }}>{selectedPet?.petName || 'This pet'}</Text>

              <Text style={styles.sectionHeader}>Contact</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput value={appForm.fullName} onChangeText={(t) => setAppForm({ ...appForm, fullName: t })} style={styles.input} />
                <Text style={styles.label}>Phone</Text>
                <TextInput keyboardType="phone-pad" value={appForm.phone} onChangeText={(t) => setAppForm({ ...appForm, phone: t })} style={styles.input} />
                <Text style={styles.label}>Email</Text>
                <TextInput keyboardType="email-address" value={appForm.email} onChangeText={(t) => setAppForm({ ...appForm, email: t })} style={styles.input} />
                <Text style={styles.label}>Address</Text>
                <TextInput value={appForm.address} onChangeText={(t) => setAppForm({ ...appForm, address: t })} style={styles.input} />
              </View>

              <Text style={styles.sectionHeader}>Household</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Adults</Text>
                    <TextInput keyboardType="numeric" value={appForm.adults} onChangeText={(t) => setAppForm({ ...appForm, adults: t })} style={styles.input} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}># Children</Text>
                    <TextInput keyboardType="numeric" value={appForm.children} onChangeText={(t) => setAppForm({ ...appForm, children: t })} style={styles.input} />
                  </View>
                </View>
                <Text style={styles.label}>Residence Type</Text>
                <View style={styles.chipRow}>
                  {['house', 'apartment', 'other'].map((opt) => (
                    <TouchableOpacity key={opt} onPress={() => setAppForm({ ...appForm, residenceType: opt })} style={[styles.chipChoice, appForm.residenceType === opt && styles.chipChoiceActive]}>
                      <Text style={{ color: appForm.residenceType === opt ? '#fff' : '#0f172a' }}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.label}>Landlord Approval</Text>
                <View style={styles.chipRow}>
                  {[
                    { k: true, label: 'Yes' },
                    { k: false, label: 'No' }
                  ].map(({ k, label }) => (
                    <TouchableOpacity key={label} onPress={() => setAppForm({ ...appForm, landlordApproval: k })} style={[styles.chipChoice, appForm.landlordApproval === k && styles.chipChoiceActive]}>
                      <Text style={{ color: appForm.landlordApproval === k ? '#fff' : '#0f172a' }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.sectionHeader}>Experience</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Past pets / training experience</Text>
                <TextInput multiline value={appForm.experience} onChangeText={(t) => setAppForm({ ...appForm, experience: t })} style={[styles.input, { height: 80 }]} />
                <Text style={styles.label}>Current pets</Text>
                <TextInput multiline value={appForm.currentPets} onChangeText={(t) => setAppForm({ ...appForm, currentPets: t })} style={[styles.input, { height: 60 }]} />
                <Text style={styles.label}>Lifestyle (time at home, travel, budget)</Text>
                <TextInput multiline value={appForm.lifestyle} onChangeText={(t) => setAppForm({ ...appForm, lifestyle: t })} style={[styles.input, { height: 80 }]} />
              </View>

              <Text style={styles.sectionHeader}>Vet & References</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Vet Clinic Name</Text>
                <TextInput value={appForm.vetName} onChangeText={(t) => setAppForm({ ...appForm, vetName: t })} style={styles.input} />
                <Text style={styles.label}>Vet Phone</Text>
                <TextInput keyboardType="phone-pad" value={appForm.vetPhone} onChangeText={(t) => setAppForm({ ...appForm, vetPhone: t })} style={styles.input} />
                <Text style={styles.label}>References (names/phones)</Text>
                <TextInput multiline value={appForm.references} onChangeText={(t) => setAppForm({ ...appForm, references: t })} style={[styles.input, { height: 80 }]} />
              </View>

              <Text style={styles.sectionHeader}>Scheduling</Text>
              <View style={styles.sectionCard}>
                <Text style={styles.label}>Preferred date/time</Text>
                <TextInput value={appForm.preferredDate} onChangeText={(t) => setAppForm({ ...appForm, preferredDate: t })} style={styles.input} />
              </View>

              <Text style={styles.sectionHeader}>Acknowledgements</Text>
              <View style={styles.sectionCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeTerms: !appForm.agreeTerms })} style={[styles.checkbox, appForm.agreeTerms && styles.checkboxChecked]} />
                  <Text style={{ marginLeft: 8, flex: 1 }}>I understand adoption responsibilities and agree to the terms.</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setAppForm({ ...appForm, agreeData: !appForm.agreeData })} style={[styles.checkbox, appForm.agreeData && styles.checkboxChecked]} />
                  <Text style={{ marginLeft: 8, flex: 1 }}>I consent to the processing of my data for this application.</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 8 }}>
                <TouchableOpacity onPress={() => setApplyVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#f1f5f9', borderRadius: 8 }}>
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    if (!selectedPet) return;
                    if (!appForm.fullName || !appForm.phone || !appForm.email || !appForm.address || !appForm.agreeTerms || !appForm.agreeData) {
                      Alert.alert('Missing Information', 'Please fill in required fields and accept the acknowledgements.');
                      return;
                    }
                    try {
                      await addDoc(collection(db, 'adoption_applications'), {
                        petId: selectedPet.id,
                        petName: selectedPet.petName || null,
                        petBreed: selectedPet.breed || null,
                        userId: auth.currentUser?.uid || null,
                        applicant: {
                          fullName: appForm.fullName,
                          phone: appForm.phone,
                          email: appForm.email,
                          address: appForm.address,
                        },
                        household: {
                          adults: appForm.adults,
                          children: appForm.children,
                          residenceType: appForm.residenceType,
                          landlordApproval: !!appForm.landlordApproval,
                        },
                        experience: appForm.experience,
                        currentPets: appForm.currentPets,
                        lifestyle: appForm.lifestyle,
                        vet: { name: appForm.vetName, phone: appForm.vetPhone },
                        references: appForm.references,
                        preferredDate: appForm.preferredDate,
                        agreeTerms: !!appForm.agreeTerms,
                        agreeData: !!appForm.agreeData,
                        status: 'Submitted',
                        createdAt: serverTimestamp(),
                      });
                      setApplyVisible(false);
                      setAppForm({
                        fullName: '', phone: '', email: '', address: '', adults: '', children: '', residenceType: 'house', landlordApproval: false,
                        experience: '', currentPets: '', lifestyle: '', vetName: '', vetPhone: '', references: '', preferredDate: '', agreeTerms: false, agreeData: false,
                      });
                      Alert.alert('Application Submitted', 'Your adoption application has been sent. We will contact you soon.');
                    } catch (e) {
                      Alert.alert('Error', 'Failed to submit application. Please try again later.');
                    }
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 16, backgroundColor: COLORS.darkPurple, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff' }}>Submit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AdoptScreen; 