import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  ImageBackground,
  Modal,
  RefreshControl
} from 'react-native';
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
    // Exclude reports marked as "Found" (from MyPetsScreen) or "Resolved" from the "All" filter
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen (foundBy: 'owner')
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return status !== 'resolved';
    });
  } else if (filter === 'Found') {
    // Only show "Found" reports that came from the File a Report form (not from MyPetsScreen)
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      return status === 'found' && r.foundBy !== 'owner';
    });
  } else if (['Stray', 'Lost', 'Incident'].includes(filter)) {
    // Only show reports with the specific status, but exclude found reports from MyPetsScreen
    filteredReports = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return status === filter.toLowerCase() && status !== 'resolved';
    });
  }

  // Create styles using current theme colors
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
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpButtonText}>Help Find</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Stray Reports</Text>
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
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          {selectedReport && (
            <View style={{ backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 24, width: '90%', maxWidth: 400 }}>
              {selectedReport.imageUrl && (
                <Image source={{ uri: selectedReport.imageUrl }} style={{ width: '100%', height: 260, borderRadius: 12, marginBottom: 16 }} resizeMode="cover" />
              )}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
                <MaterialIcons name="location-pin" size={20} color="#E74C3C" style={{ marginRight: 4, marginTop: 2 }} />
                <Text style={{ fontWeight: 'bold', color: COLORS.text, marginRight: 4, marginTop: 2 }}>Location:</Text>
                <Text style={{ color: COLORS.text, flexShrink: 1, flex: 1, flexWrap: 'wrap' }}>{selectedReport.locationName || 'Unknown Location'}</Text>
              </View>
              <Text style={{ fontWeight: 'bold', color: COLORS.text, marginBottom: 2 }}>Reported:</Text>
              <Text style={{ color: COLORS.secondaryText, marginBottom: 8 }}>{selectedReport.reportTime?.toDate ? selectedReport.reportTime.toDate().toLocaleString() : ''}</Text>
              <Text style={{ fontWeight: 'bold', color: COLORS.text, marginBottom: 2 }}>Description:</Text>
              <Text style={{ color: COLORS.text, marginBottom: 16 }}>{selectedReport.description}</Text>
              <TouchableOpacity
                style={{ backgroundColor: COLORS.darkPurple, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 }}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default StraysScreen; 