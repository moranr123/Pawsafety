import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ReportChatModal from '../../components/ReportChatModal';
import { auth } from '../../services/firebase';

const FilterButton = React.memo(({ title, active = false, onPress, styles }) => (
  <TouchableOpacity 
    style={[styles.filterButton, active && styles.filterButtonActive]} 
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{title}</Text>
  </TouchableOpacity>
));

const StrayPetCard = React.memo(({
  report,
  reporter,
  navigation,
  onOpenChat,
  styles,
  COLORS,
}) => {
  const imageUri = report?.imageUrl;
  const location = report?.locationName || 'Unknown location';
  const reportTime = report?.reportTime?.toDate ? report.reportTime.toDate() : null;
  const date = reportTime ? reportTime.toLocaleDateString() : 'Unknown';
  const time = reportTime ? reportTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown';
  const petType = report?.petType ? (report.petType === 'dog' ? '🐕 Dog' : '🐱 Cat') : null;
  const status = report?.status || 'Stray';
  const description = report?.description || '';
  
  const onPressReporter = report.userId ? () => navigation.navigate('Profile', { userId: report.userId }) : undefined;
  const onPressMessage = report.userId && report.userId !== auth.currentUser?.uid && onOpenChat
    ? () => onOpenChat(report) 
    : undefined;

  return (
  <View style={styles.reportCard}>
    {/* Header with reporter info and status badge */}
    <View style={styles.reportHeader}>
      <TouchableOpacity
        style={styles.reportUserInfo}
        onPress={onPressReporter}
        activeOpacity={0.8}
        disabled={!onPressReporter}
      >
        {reporter?.profileImage ? (
          <Image
            source={{ uri: reporter.profileImage }}
            style={styles.reportProfileImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.reportProfilePlaceholder}>
            <MaterialIcons name="person" size={22} color="#65676b" />
          </View>
        )}
        <View style={styles.reportUserDetails}>
          <Text style={styles.reportUserName} numberOfLines={1}>
            {reporter?.name || 'Pet Lover'}
          </Text>
          {reportTime && (
            <Text style={styles.reportTime} numberOfLines={1}>
              {reportTime.toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      <View
        style={[
        styles.statusBadge,
          status === 'Lost'
            ? { backgroundColor: COLORS.error }
            : status === 'Stray'
            ? { backgroundColor: COLORS.mediumBlue }
            : { backgroundColor: COLORS.warning },
        ]}
      >
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>

    {/* Content with Details */}
    <View style={styles.reportContent}>
      {/* Details Text */}
      <View style={styles.detailsContainer}>
        {petType && (
          <Text style={styles.detailText}>Type: {petType}</Text>
        )}
        <Text style={styles.detailText}>Location: {location}</Text>
        <Text style={styles.detailText}>Date: {date}</Text>
        <Text style={styles.detailText}>Time: {time}</Text>
      </View>

      {description ? (
        <Text style={styles.reportDescription}>{description}</Text>
      ) : null}
      
      {/* Image */}
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.reportImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <MaterialIcons name="image" size={60} color="#9CA3AF" />
        </View>
      )}
    </View>

    {/* Actions */}
    {onPressMessage && (
      <View style={styles.reportActions}>
        <TouchableOpacity
          style={styles.reportActionButton}
          onPress={onPressMessage}
        >
          <MaterialIcons name="message" size={18} color="#65676b" />
          <Text style={styles.reportActionText}>Message</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
  );
});

const StraysScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const { setIsVisible } = useTabBarVisibility();
  const [reports, setReports] = useState([]);
  const [reportUsers, setReportUsers] = useState({});
  const reportUsersRef = useRef({});
  const [filter, setFilter] = useState('All');
  const [userLocation, setUserLocation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Optimized: Use built-in hook instead of Dimensions listener
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;

  const handleScroll = React.useCallback((event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY.current;

    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Hide tab bar when scrolling down, show when scrolling up or at top
    if (currentScrollY <= 0) {
      setIsVisible(true);
    } else if (scrollDifference > 5) {
      setIsVisible(false);
    } else if (scrollDifference < -5) {
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;

    // Show tab bar after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      setIsVisible(true);
    }, 150);
  }, [setIsVisible]);

  useEffect(() => {
    // Optimized: Add limit to reduce Firebase reads
    const q = query(
      collection(db, 'stray_reports'), 
      orderBy('reportTime', 'desc'),
      limit(50) // Limit to most recent 50 reports
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  // Load reporter user info for each report so we can show who posted it
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userIds = Array.from(
          new Set(
            reports
              .map((r) => r.userId)
              .filter((uid) => typeof uid === 'string' && uid.length > 0)
          )
        );
        if (userIds.length === 0) {
          // No reports with userIds
          reportUsersRef.current = {};
          setReportUsers({});
          return;
        }

        const usersMap = { ...reportUsersRef.current };

        // Only fetch users we haven't loaded yet
        const missingIds = userIds.filter((uid) => !usersMap[uid]);
        if (missingIds.length === 0) {
          // All users already loaded
          return;
        }

        await Promise.all(
          missingIds.map(async (uid) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', uid));
              if (userDoc.exists()) {
                const data = userDoc.data();
                usersMap[uid] = {
                  name: data.displayName || data.name || 'Pet Lover',
                  profileImage: data.profileImage || data.photoURL || null,
                };
              } else {
                usersMap[uid] = {
                  name: 'Pet Lover',
                  profileImage: null,
                };
              }
            } catch (e) {
              usersMap[uid] = {
                name: 'Pet Lover',
                profileImage: null,
              };
            }
          })
        );

        reportUsersRef.current = usersMap;
        setReportUsers(usersMap);
      } catch (e) {
        // Silent fail; reports will still show without user info
      }
    };

    loadUsers();
  }, [reports]);

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


  const onRefresh = async () => {
    setRefreshing(true);
    // The Firebase listener will automatically update the data
    // Just simulate a brief refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const onOpenChat = (report) => {
    setSelectedReport(report);
    setChatModalVisible(true);
  };

  const onCloseChat = () => {
    setChatModalVisible(false);
    setSelectedReport(null);
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

  const filteredReports = useMemo(() => {
    let result = reports;

  if (filter === 'All') {
    // Exclude reports marked as "Found" (from MyPetsScreen), "Resolved", "Declined", or "Invalid" from the "All" filter
      result = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen (foundBy: 'owner')
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return !['resolved', 'declined', 'invalid'].includes(status);
    });
  } else if (filter === 'Found') {
    // Only show "Found" reports that came from the File a Report form (not from MyPetsScreen)
      result = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      return status === 'found' && r.foundBy !== 'owner';
    });
  } else if (['Stray', 'Lost', 'Incident'].includes(filter)) {
    // Only show reports with the specific status, but exclude found reports from MyPetsScreen, declined, and invalid
      result = reports.filter(r => {
      const status = (r.status || 'Stray').toLowerCase();
      // Exclude found reports that came from MyPetsScreen
      if (status === 'found' && r.foundBy === 'owner') {
        return false;
      }
      return status === filter.toLowerCase() && !['resolved', 'declined', 'invalid'].includes(status);
    });
  }

    return result;
  }, [reports, filter]);

  // Create styles using current theme colors and responsive values
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      backgroundColor: '#ffffff',
      paddingTop: Platform.OS === 'ios' 
        ? (isSmallDevice ? 45 : isTablet ? 60 : 50)
        : (isSmallDevice ? 12 : isTablet ? 20 : 15),
      paddingBottom: Platform.OS === 'android' 
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
      paddingHorizontal: isSmallDevice ? 12 : isTablet ? 20 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    headerTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Platform.OS === 'android'
        ? (isSmallDevice ? 2 : isTablet ? 4 : 2)
        : (isSmallDevice ? 10 : 12),
    },
    headerTitle: {
      fontSize: Platform.OS === 'ios'
        ? (isSmallDevice ? 20 : isTablet ? 28 : 24)
        : (isSmallDevice ? 20 : isTablet ? 26 : 24),
      fontWeight: '700',
      color: '#050505',
    },
    filtersContainer: {
      flexDirection: 'row',
      paddingHorizontal: 0,
      paddingRight: 16,
    },
    filterButton: {
      backgroundColor: '#e4e6eb',
      paddingHorizontal: isSmallDevice ? SPACING.sm : SPACING.md,
      paddingVertical: isSmallDevice ? SPACING.xs : SPACING.sm,
      borderRadius: isSmallDevice ? 12 : 15,
      borderWidth: 1,
      borderColor: '#e4e6eb',
      alignItems: 'center',
      minHeight: isSmallDevice ? 32 : 36,
      justifyContent: 'center',
      marginRight: isSmallDevice ? SPACING.xs : SPACING.sm,
      minWidth: isSmallDevice ? 70 : 80,
    },
    filterButtonActive: {
      backgroundColor: '#1877f2',
      borderColor: '#1877f2',
    },
    filterText: {
      fontSize: Platform.OS === 'android'
        ? (isSmallDevice ? 10 : isTablet ? 13 : 11)
        : (isSmallDevice ? 11 : isTablet ? 15 : 13),
      fontFamily: FONTS.family,
      color: '#050505',
      fontWeight: '600',
      textAlign: 'center',
    },
    filterTextActive: {
      color: '#ffffff',
    },
    scrollViewContent: {
      paddingHorizontal: 0,
      paddingBottom: SPACING.xl,
    },
    // Facebook-style report card (similar to PostCard)
    reportCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    reportHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 6,
      justifyContent: 'space-between',
    },
    reportUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    reportProfileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
      backgroundColor: '#e4e6eb',
    },
    reportProfilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    reportUserDetails: {
      flex: 1,
    },
    reportUserName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 2,
      fontFamily: FONTS.family,
    },
    reportTime: {
      fontSize: 12,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    statusBadge: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.small,
    },
    statusText: {
      fontSize: Platform.OS === 'android' ? FONTS.sizes.small - 4 : FONTS.sizes.small - 2,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    reportContent: {
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    reportLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    reportLocation: {
      fontSize: 13,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    reportDescription: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginTop: 4,
      marginBottom: 8,
      fontFamily: FONTS.family,
    },
    reportContent: {
      paddingHorizontal: 12,
      paddingBottom: 10,
    },
    detailsContainer: {
      marginBottom: 12,
    },
    detailText: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginBottom: 4,
      fontFamily: FONTS.family,
    },
    reportImage: {
      width: '100%',
      height: 260,
      borderRadius: 8,
    },
    imagePlaceholder: {
      width: '100%',
      height: 260,
      borderRadius: 8,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    reportActions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    reportActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 8,
    },
    reportActionText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#65676b',
      marginLeft: 6,
      fontFamily: FONTS.family,
    },
    bottomSpacing: {
      height: 30,
    },
    // Modern Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: '#FFFFFF',
      width: '95%',
      height: '90%',
      borderRadius: 24,
      ...SHADOWS.heavy,
    },
    modernHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 16,
    },
    headerContent: {
      flex: 1,
    },
    modalCloseButton: {
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#F3F4F6',
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
      paddingBottom: 20,
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
      backgroundColor: COLORS.darkPurple,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modernCloseBtnText: {
      fontSize: 16,
      fontWeight: '600',
      color: COLORS.white,
    },
  }), [COLORS, isSmallDevice, isTablet, currentWidth, currentHeight]);


  return (
    <View style={styles.container}>
      {/* Header - Facebook-style */}
      <View style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Reports</Text>
          </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          <FilterButton title="All" active={filter === 'All'} onPress={() => setFilter('All')} styles={styles} />
          <FilterButton title="Stray" active={filter === 'Stray'} onPress={() => setFilter('Stray')} styles={styles} />
          <FilterButton title="Lost" active={filter === 'Lost'} onPress={() => setFilter('Lost')} styles={styles} />
          <FilterButton title="Incident" active={filter === 'Incident'} onPress={() => setFilter('Incident')} styles={styles} />
          <FilterButton title="Found" active={filter === 'Found'} onPress={() => setFilter('Found')} styles={styles} />
        </ScrollView>
        </SafeAreaView>
      </View>

      {/* Stray Pets List - virtualized for performance */}
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingTop: SPACING.lg },
          filteredReports.length === 0 && { flexGrow: 1, justifyContent: 'center' },
        ]}
        ListEmptyComponent={
          <Text style={{ color: COLORS.secondaryText, textAlign: 'center', marginTop: 40 }}>
            No stray reports yet.
          </Text>
        }
        renderItem={({ item }) => (
          <StrayPetCard
            report={item}
            reporter={reportUsers[item.userId]}
            navigation={navigation}
            onOpenChat={onOpenChat}
            styles={styles}
            COLORS={COLORS}
          />
        )}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.darkPurple]}
            tintColor={COLORS.darkPurple}
          />
        }
        removeClippedSubviews
        windowSize={5}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
      />

      {/* Chat Modal */}
      <ReportChatModal
        visible={chatModalVisible}
        onClose={onCloseChat}
        report={selectedReport}
        reporter={selectedReport ? reportUsers[selectedReport.userId] : null}
      />
    </View>
  );
};

export default StraysScreen; 