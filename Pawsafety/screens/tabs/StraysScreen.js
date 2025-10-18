import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  Modal,
  RefreshControl
} from 'react-native';
import { Image } from 'expo-image';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const StraysScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [closedBanners, setClosedBanners] = useState({});

  useEffect(() => {
    const q = query(collection(db, 'stray_reports'), orderBy('reportTime', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (filter === 'Near Me') {
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setUserLocation(loc.coords);
        } else {
          setUserLocation(null);
        }
      })();
    }
  }, [filter]);

  // Reset closed banners when filter changes
  useEffect(() => {
    setClosedBanners({});
  }, [filter]);

  const onRefresh = async () => {
    setRefreshing(true);
    // The Firebase listener will automatically update the data
    // Just simulate a brief refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  function isRecent(report) {
    if (!report.reportTime?.toDate) return false;
    const now = new Date();
    const reportDate = report.reportTime.toDate();
    return (now - reportDate) < 24 * 60 * 60 * 1000;
  }

  function isNearMe(report) {
    if (!userLocation || !report.location) return false;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(report.location.latitude - userLocation.latitude);
    const dLon = toRad(report.location.longitude - userLocation.longitude);
    const lat1 = toRad(userLocation.latitude);
    const lat2 = toRad(report.location.latitude);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d <= 5; // within 5km
  }

  let filteredReports = reports;
  if (filter === 'All') {
    // Exclude reports marked as "Found" (from MyPetsScreen), "Resolved", "Declined", or "Invalid" from the "All" filter
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen (foundBy: 'owner')
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return !['resolved', 'declined', 'invalid'].includes(status);
    });
  } else if (filter === 'Found') {
    // Only show "Found" reports that came from the File a Report form (not from MyPetsScreen)
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      return status === 'found' && r.foundBy !== 'owner';
    });
  } else if (['Stray', 'Lost', 'Incident'].includes(filter)) {
    // Only show reports with the specific status, but exclude found reports from MyPetsScreen, declined, and invalid
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return status === filter.toLowerCase() && !['resolved', 'declined', 'invalid'].includes(status);
    });
  }

  // Create styles using current theme colors
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
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
    emergencyBanner: {
      backgroundColor: COLORS.golden,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.lg,
      borderRadius: RADIUS.medium,
      padding: SPACING.lg,
      paddingRight: 50, // Extra padding for close button on right
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.lg,
      position: 'relative',
      minHeight: 80,
    },
    closeBannerButton: {
      position: 'absolute',
      top: SPACING.sm,
      right: SPACING.sm,
      zIndex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emergencyIcon: {
      fontSize: FONTS.sizes.xlarge,
      marginRight: SPACING.sm,
    },
    emergencyText: {
      flex: 1,
    },
    emergencyTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
    },
    emergencySubtitle: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    reportButton: {
      backgroundColor: COLORS.darkPurple,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
    },
    reportButtonText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.lg,
    },
    petCard: {
      borderRadius: RADIUS.medium,
      marginBottom: SPACING.md,
      minHeight: 260,
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
      padding: SPACING.md,
      position: 'relative',
      zIndex: 1,
    },
    petHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    petName: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    statusBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.small,
    },
    statusText: {
      fontSize: FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    petLocation: {
      fontSize: FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    petDistance: {
      fontSize: FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: SPACING.xs,
    },
    petDescription: {
      fontSize: FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      lineHeight: 18,
      marginBottom: SPACING.md,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    helpButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginRight: SPACING.xs,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    helpButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    shareButton: {
      backgroundColor: 'rgba(71, 65, 166, 0.8)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.small,
      flex: 1,
      marginLeft: SPACING.xs,
    },
    shareButtonText: {
      color: '#FFFFFF',
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      textAlign: 'center',
    },
    bottomSpacing: {
      height: 30,
    },
    // Modern Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
      minHeight: '60%',
      ...SHADOWS.heavy,
    },
    modernHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerContent: {
      flex: 1,
    },
    modernTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 4,
    },
    modernSubtitle: {
      fontSize: 16,
      color: '#6B7280',
      fontWeight: '400',
    },
    modernScrollView: {
      flex: 1,
    },
    heroImageContainer: {
      position: 'relative',
      height: 280,
      marginHorizontal: 24,
      marginBottom: 16,
      borderRadius: 20,
      overflow: 'hidden',
    },
    petInfoSection: {
      marginHorizontal: 24,
      marginBottom: 24,
    },
    petInfoName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 12,
    },
    petInfoBadges: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    petInfoBadge: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    petInfoBadgeText: {
      color: '#374151',
      fontSize: 14,
      fontWeight: '600',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroPlaceholderText: {
      fontSize: 16,
      color: '#9CA3AF',
      marginTop: 8,
      fontWeight: '500',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      padding: 20,
    },
    heroPetName: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    heroBadges: {
      flexDirection: 'row',
      gap: 8,
    },
    heroBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    heroBadgeText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    petDetailsColumn: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
    },
    petDetailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    petDetailIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    petDetailContent: {
      flex: 1,
    },
    petDetailLabel: {
      fontSize: 12,
      color: '#6B7280',
      fontWeight: '500',
      marginBottom: 4,
    },
    petDetailValue: {
      fontSize: 16,
      color: '#111827',
      fontWeight: '600',
    },
    descriptionCard: {
      marginHorizontal: 24,
      marginBottom: 24,
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 20,
    },
    descriptionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    descriptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
      marginLeft: 8,
    },
    descriptionText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 20,
    },
    infoGrid: {
      gap: 12,
    },
    infoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB',
    },
    infoLabel: {
      fontSize: 14,
      color: '#6B7280',
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 14,
      color: '#111827',
      fontWeight: '600',
    },
    modernActionContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 20,
      paddingBottom: 34,
      gap: 12,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
    },
    modernCloseBtn: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modernCloseBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
    },
  }), [COLORS]);

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const StrayPetCard = ({ name, type, location, time, description, status = "Stray", imageUri, onViewDetails }) => (
    <ImageBackground 
      source={imageUri ? { uri: imageUri } : null}
      style={styles.petCard}
      imageStyle={styles.cardBackgroundImage}
    >
      {/* Status badge at top left */}
      <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
        <View style={[
          styles.statusBadge,
          status === 'Lost' ? { backgroundColor: COLORS.error } : status === 'Stray' ? { backgroundColor: COLORS.mediumBlue } : { backgroundColor: COLORS.warning }
        ]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      {!imageUri && (
        <View style={styles.placeholderBackground}>
          <Text style={styles.petEmoji}>{type === 'dog' ? '\ud83d\udc15' : '\ud83d\udc31'}</Text>
        </View>
      )}
      <View style={styles.darkOverlay} />
      <View style={styles.petContent}>
        <View style={styles.petHeader}>
          <Text style={styles.petName}>{name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <MaterialIcons name="location-pin" size={18} color="#E74C3C" style={{ marginRight: 2 }} />
          <Text style={styles.petLocation}>{location}</Text>
        </View>
        <Text style={styles.petDistance}><Text style={{fontWeight:'bold'}}>Reported:</Text> {time}</Text>
        <Text style={styles.petDescription}>{description}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={onViewDetails}>
            <Text style={styles.shareButtonText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );

  const FilterButton = ({ title, active = false, onPress }) => (
    <TouchableOpacity 
      style={[styles.filterButton, active && styles.filterButtonActive]} 
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
    </TouchableOpacity>
  );

  // Get dynamic banner text based on filter
  const getBannerText = () => {
    switch (filter) {
      case 'Lost':
        return {
          title: 'Pet is lost?',
          subtitle: 'Report it as lost',
          icon: '🔍',
          buttonText: 'Report Lost'
        };

      case 'Incident':
        return {
          title: 'Pet incident?',
          subtitle: 'Report the incident',
          icon: '🚨',
          buttonText: 'Report Incident'
        };

      case 'Stray':
        return {
          title: 'Found a stray?',
          subtitle: 'Report it immediately',
          icon: '🚨',
          buttonText: 'Report Stray'
        };

      case 'Found':
        return {
          title: 'Found a pet?',
          subtitle: 'Report it to help reunite',
          icon: '🎉',
          buttonText: 'Report Found'
        };

      default:
        return {
          title: 'Found a stray?',
          subtitle: 'Report it immediately',
          icon: '🚨',
          buttonText: 'Report'
        };
    }
  };

  const bannerData = getBannerText();

  return (
    <View style={styles.container}>
      {/* Header with Filters */}
      <View style={styles.header}>
        <View style={styles.filtersContainer}>
          <FilterButton title="All" active={filter === 'All'} onPress={() => setFilter('All')} />
          <FilterButton title="Stray" active={filter === 'Stray'} onPress={() => setFilter('Stray')} />
          <FilterButton title="Lost" active={filter === 'Lost'} onPress={() => setFilter('Lost')} />
          <FilterButton title="Incident" active={filter === 'Incident'} onPress={() => setFilter('Incident')} />
          <FilterButton title="Found" active={filter === 'Found'} onPress={() => setFilter('Found')} />
        </View>
      </View>

      {/* Dynamic Emergency Banner - Only show when not viewing All and not closed */}
      {filter !== 'All' && !closedBanners[filter] && (
        <View style={styles.emergencyBanner}>
          <TouchableOpacity 
            style={styles.closeBannerButton}
            onPress={() => setClosedBanners(prev => ({ ...prev, [filter]: true }))}
          >
            <MaterialIcons name="close" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.emergencyIcon}>{bannerData.icon}</Text>
          <View style={styles.emergencyText}>
            <Text style={styles.emergencyTitle}>{bannerData.title}</Text>
            <Text style={styles.emergencySubtitle}>{bannerData.subtitle}</Text>
          </View>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => {
              if (filter === 'Lost') {
                navigation.navigate('MyPets');
              } else if (filter === 'Found') {
                navigation.navigate('StrayReport', { initialType: 'Found' });
              } else if (filter === 'Incident') {
                navigation.navigate('StrayReport', { initialType: 'Incident' });
              } else {
                navigation.navigate('StrayReport');
              }
            }}
          >
            <Text style={styles.reportButtonText}>{bannerData.buttonText}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stray Pets List */}
      <ScrollView 
        style={[
          styles.scrollView,
          (filter === 'All' || closedBanners[filter]) && { paddingTop: SPACING.lg }
        ]} 
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
        {filteredReports.length === 0 ? (
          <Text style={{ color: COLORS.secondaryText, textAlign: 'center', marginTop: 40 }}>
            No stray reports yet.
          </Text>
        ) : (
          filteredReports.map((report) => (
            <StrayPetCard
              key={report.id}
              name={report.locationName || 'Unknown'}
              type={'dog'}
              location={report.locationName || 'Unknown'}
              time={report.reportTime?.toDate ? report.reportTime.toDate().toLocaleString() : ''}
              description={report.description}
              status={report.status || 'Stray'}
              imageUri={report.imageUrl}
              onViewDetails={() => handleViewDetails(report)}
            />
          ))
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modern Header */}
            <View style={styles.modernHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.modernTitle}>Report Details</Text>
                <Text style={styles.modernSubtitle}>Stray pet information</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modernScrollView}>
              {/* Hero Image Section */}
              <View style={styles.heroImageContainer}>
                {selectedReport?.imageUrl ? (
                  <Image 
                    source={{ uri: selectedReport.imageUrl }} 
                    style={styles.heroImage} 
                    resizeMode="cover" 
                  />
                ) : (
                  <View style={styles.heroPlaceholder}>
                    <MaterialIcons name="pets" size={60} color="#9CA3AF" />
                    <Text style={styles.heroPlaceholderText}>No Photo Available</Text>
                  </View>
                )}
              </View>


              {/* Pet Details Column */}
              <View style={styles.petDetailsColumn}>
                {selectedReport?.petName && (
                  <View style={styles.petDetailItem}>
                    <View style={styles.petDetailIcon}>
                      <MaterialIcons name="pets" size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.petDetailContent}>
                      <Text style={styles.petDetailLabel}>Name</Text>
                      <Text style={styles.petDetailValue}>{selectedReport.petName}</Text>
                    </View>
                  </View>
                )}
                
                {selectedReport?.petType && (
                  <View style={styles.petDetailItem}>
                    <View style={styles.petDetailIcon}>
                      <MaterialIcons name="category" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.petDetailContent}>
                      <Text style={styles.petDetailLabel}>Type</Text>
                      <Text style={styles.petDetailValue}>
                        {selectedReport.petType === 'dog' ? '🐕 Dog' : '🐱 Cat'}
                      </Text>
                    </View>
                  </View>
                )}
                
                {selectedReport?.age && (
                  <View style={styles.petDetailItem}>
                    <View style={styles.petDetailIcon}>
                      <MaterialIcons name="cake" size={20} color="#10B981" />
                    </View>
                    <View style={styles.petDetailContent}>
                      <Text style={styles.petDetailLabel}>Age</Text>
                      <Text style={styles.petDetailValue}>{selectedReport.age}</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="location-on" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Location</Text>
                    <Text style={styles.petDetailValue}>{selectedReport?.locationName || 'Unknown'}</Text>
                  </View>
                </View>
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="schedule" size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Reported</Text>
                    <Text style={styles.petDetailValue}>
                      {selectedReport?.reportTime?.toDate ? 
                        selectedReport.reportTime.toDate().toLocaleDateString() : 
                        'Unknown'
                      }
                    </Text>
                  </View>
                </View>
                
                <View style={styles.petDetailItem}>
                  <View style={styles.petDetailIcon}>
                    <MaterialIcons name="report" size={20} color="#F59E0B" />
                  </View>
                  <View style={styles.petDetailContent}>
                    <Text style={styles.petDetailLabel}>Status</Text>
                    <Text style={styles.petDetailValue}>Stray Report</Text>
                  </View>
                </View>
              </View>

              {/* Description Card */}
              {selectedReport?.description && (
                <View style={styles.descriptionCard}>
                  <View style={styles.descriptionHeader}>
                    <MaterialIcons name="description" size={20} color="#6366F1" />
                    <Text style={styles.descriptionTitle}>Description</Text>
                  </View>
                  <Text style={styles.descriptionText}>{selectedReport.description}</Text>
                </View>
              )}

            </ScrollView>

            {/* Modern Action Buttons */}
            <View style={styles.modernActionContainer}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modernCloseBtn}
              >
                <Text style={styles.modernCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default StraysScreen; 