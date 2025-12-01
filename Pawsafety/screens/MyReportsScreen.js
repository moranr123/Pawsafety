import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Modal,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { db, auth } from '../services/firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

const MyReportsScreen = ({ navigation }) => {
  const { colors: COLORS } = useTheme();
  const [userReports, setUserReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'

  useEffect(() => {
    if (auth.currentUser) {
      // Optimized: Add orderBy server-side and limit to reduce reads
      const q = query(
        collection(db, 'stray_reports'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('reportTime', 'desc'), // Sort server-side instead of client-side
        limit(100) // Add reasonable limit
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUserReports(reports);
      });
      return unsubscribe;
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleDeleteReport = (reportId) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'stray_reports', reportId));
              Alert.alert('Success', 'Report deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete report');
            }
          }
        }
      ]
    );
  };

  const handleEditReport = (report) => {
    navigation.navigate('EditReport', { report });
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setModalVisible(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Lost': return '#FF6B6B';
      case 'Found': return '#4ECDC4';
      case 'Stray': return '#45B7D1';
      case 'Incident': return '#DC2626';
      case 'In Progress': return '#F59E0B';
      case 'Resolved': return '#10B981';
      case 'Declined': return '#EF4444';
      case 'Invalid': return '#6B7280';
      default: return '#45B7D1';
    }
  };

  // Filter reports based on active tab
  const getFilteredReports = () => {
    if (activeTab === 'archived') {
      // Show completed reports (Resolved, Declined, Invalid)
      return userReports.filter(report => {
        const status = report.status;
        // Exclude found reports from MyPetsScreen
        if (status === 'Found' && report.foundBy === 'owner') {
          return false;
        }
        // Show completed statuses: Resolved, Declined, Invalid
        return ['Resolved', 'Declined', 'Invalid'].includes(status);
      });
    } else {
      // Show all active reports (Lost, Stray, Found from form, In Progress) - exclude found reports from MyPetsScreen
      return userReports.filter(report => {
        const status = report.status;
        // Exclude found reports that came from MyPetsScreen
        if (status === 'Found' && report.foundBy === 'owner') {
          return false;
        }
        // Include all active statuses: Lost, Stray, Found (from form), In Progress, Incident
        return ['Lost', 'Stray', 'Found', 'In Progress', 'Incident'].includes(status);
      });
    }
  };

  const getTabStats = () => {
    const activeReports = userReports.filter(report => {
      const status = report.status;
      // Exclude found reports that came from MyPetsScreen
      if (status === 'Found' && report.foundBy === 'owner') {
        return false;
      }
      // Include all active statuses: Lost, Stray, Found (from form), In Progress, Incident
      return ['Lost', 'Stray', 'Found', 'In Progress', 'Incident'].includes(status);
    });
    const archivedReports = userReports.filter(report => {
      const status = report.status;
      // Exclude found reports from MyPetsScreen
      if (status === 'Found' && report.foundBy === 'owner') {
        return false;
      }
      // Show completed statuses: Resolved, Declined, Invalid
      return ['Resolved', 'Declined', 'Invalid'].includes(status);
    });
    
    return {
      active: activeReports.length,
      archived: archivedReports.length
    };
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Facebook color scheme
  const facebookBlue = '#1877F2';
  const facebookBackground = '#F0F2F5';
  const facebookCardBg = '#FFFFFF';
  const facebookText = '#050505';
  const facebookSecondaryText = '#65676B';
  const facebookBorder = '#E4E6EB';
  const facebookInputBg = '#F0F2F5';

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: facebookBackground,
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
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
      marginRight: SPACING.md,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    statsContainer: {
      marginLeft: 'auto',
    },
    statsText: {
      color: facebookSecondaryText,
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: facebookInputBg,
      borderRadius: 8,
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
      padding: 4,
    },
    tabButton: {
      flex: 1,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 6,
      alignItems: 'center',
    },
    activeTab: {
      backgroundColor: facebookBlue,
    },
    inactiveTab: {
      backgroundColor: 'transparent',
    },
    tabText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    activeTabText: {
      color: '#FFFFFF',
    },
    inactiveTabText: {
      color: facebookSecondaryText,
    },
    tabBadge: {
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginLeft: 4,
      minWidth: 20,
      alignItems: 'center',
    },
    tabBadgeText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontFamily: FONTS.family,
      fontWeight: '700',
    },
    scrollView: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
    },
    reportCard: {
      backgroundColor: facebookCardBg,
      borderRadius: 10,
      marginBottom: SPACING.md,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    cardHeader: {
      position: 'relative',
      height: 180,
    },
    reportImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: facebookInputBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    placeholderIcon: {
      marginBottom: 8,
    },
    placeholderText: {
      color: facebookSecondaryText,
      fontSize: 14,
      fontFamily: FONTS.family,
      fontWeight: '500',
    },
    statusBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    statusText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    cardContent: {
      padding: SPACING.md,
    },
    cardTitle: {
      fontSize: 17,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.sm,
    },
    locationContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    locationText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginLeft: 6,
      flex: 1,
    },
    timeText: {
      fontSize: 13,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      marginBottom: SPACING.sm,
    },
    descriptionText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      lineHeight: 22,
      marginBottom: SPACING.md,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: facebookBorder,
      paddingTop: SPACING.sm,
      marginTop: SPACING.sm,
    },
    actionButton: {
      flex: 1,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewButton: {
      backgroundColor: facebookInputBg,
    },
    editButton: {
      backgroundColor: facebookBlue,
    },
    deleteButton: {
      backgroundColor: '#FEF2F2',
    },
    buttonText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    viewButtonText: {
      color: facebookText,
    },
    editButtonText: {
      color: '#FFFFFF',
    },
    deleteButtonText: {
      color: '#DC2626',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.xxl * 2,
      paddingHorizontal: SPACING.lg,
    },
    emptyIcon: {
      marginBottom: SPACING.lg,
      opacity: 0.6,
    },
    emptyTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: facebookText,
      marginBottom: SPACING.sm,
      textAlign: 'center',
    },
    emptyDescription: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookSecondaryText,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: SPACING.lg,
    },
    createButton: {
      backgroundColor: facebookBlue,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontFamily: FONTS.family,
      fontWeight: '600',
    },
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: facebookCardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xl,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: facebookBorder,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: facebookText,
    },
    closeButton: {
      backgroundColor: facebookInputBg,
      borderRadius: 20,
      padding: SPACING.sm,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalImage: {
      width: '100%',
      height: 200,
      borderRadius: 15,
      marginBottom: SPACING.lg,
    },
    modalSection: {
      marginBottom: SPACING.lg,
    },
    modalSectionTitle: {
      fontSize: 16,
      fontFamily: FONTS.family,
      fontWeight: '600',
      color: facebookText,
      marginBottom: SPACING.sm,
    },
    modalText: {
      fontSize: 15,
      fontFamily: FONTS.family,
      color: facebookText,
      lineHeight: 22,
    },
    modalMapContainer: {
      width: '100%',
      height: 200,
      borderRadius: 15,
      overflow: 'hidden',
      marginTop: SPACING.md,
      ...SHADOWS.light,
    },
    modalMap: {
      width: '100%',
      height: '100%',
    },
  }), [COLORS]);

  const ReportCard = ({ report }) => {
    // Consider reports as archived if they are Declined, Invalid, Resolved, or Found reports from MyPetsScreen
    const isArchived = ['Declined', 'Invalid', 'Resolved'].includes(report.status) || (report.status === 'Found' && report.foundBy === 'owner');
    
    // Use originalType for completed reports, otherwise use current status
    const displayType = report.originalType || report.status;
    const reportType = displayType === 'Lost' ? 'Lost Pet Report' : 
                      displayType === 'Found' ? 'Found Pet Report' : 
                      displayType === 'Incident' ? 'Incident Report' : 'Stray Report';
    
    return (
      <View style={styles.reportCard}>
        <View style={styles.cardHeader}>
          {report.imageUrl ? (
            <Image source={{ uri: report.imageUrl }} style={styles.reportImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="pets" size={40} color="#94A3B8" style={styles.placeholderIcon} />
              <Text style={styles.placeholderText}>No photo</Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
            <Text style={styles.statusText}>
              {report.status === 'Resolved' ? 'Resolved' :
               report.status === 'Declined' ? 'Declined' :
               report.status === 'Invalid' ? 'Invalid' :
               report.status || 'Stray'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{reportType}</Text>
          
          {report.petName && (
            <View style={styles.locationContainer}>
              <MaterialIcons name="pets" size={16} color="#8B5CF6" />
              <Text style={styles.locationText} numberOfLines={1}>
                {report.petName} ({report.breed || 'Unknown Breed'})
              </Text>
            </View>
          )}
          
          <View style={styles.locationContainer}>
            <MaterialIcons name="location-on" size={16} color="#EF4444" />
            <Text style={styles.locationText} numberOfLines={1}>
              {report.locationName || 'Unknown Location'}
            </Text>
          </View>
          
          <Text style={styles.timeText}>{formatDate(report.reportTime)}</Text>
          
          <Text style={styles.descriptionText} numberOfLines={3}>
            {report.description || 'No description provided'}
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => handleViewDetails(report)}
            >
              <Text style={[styles.buttonText, styles.viewButtonText]}>View</Text>
            </TouchableOpacity>
            
            {!isArchived && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEditReport(report)}
              >
                <Text style={[styles.buttonText, styles.editButtonText]}>Edit</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteReport(report.id)}
            >
              <Text style={[styles.buttonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#050505" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reports</Text>
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>
              {getFilteredReports().length} {getFilteredReports().length === 1 ? 'Report' : 'Reports'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => setActiveTab('active')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'active' ? styles.activeTabText : styles.inactiveTabText]}>
              Active
            </Text>
            {getTabStats().active > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{getTabStats().active}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'archived' ? styles.activeTab : styles.inactiveTab]}
          onPress={() => setActiveTab('archived')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'archived' ? styles.activeTabText : styles.inactiveTabText]}>
              Completed
            </Text>
            {getTabStats().archived > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{getTabStats().archived}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {getFilteredReports().length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons 
              name={activeTab === 'archived' ? "archive" : "pets"} 
              size={80} 
              color="#CBD5E1" 
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'archived' ? 'No Completed Reports' : 'No Active Reports'}
            </Text>
            <Text style={styles.emptyDescription}>
              {activeTab === 'archived' 
                ? 'You don\'t have any completed reports yet. Completed reports include resolved, declined, or invalid reports.'
                : 'You don\'t have any active reports yet. Help reunite pets with their families by reporting strays you find or lost pets.'
              }
            </Text>
            {activeTab === 'active' && (
              <TouchableOpacity 
                style={styles.createButton}
                onPress={() => navigation.navigate('StrayReport')}
              >
                <Text style={styles.createButtonText}>Create First Report</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          getFilteredReports().map((report) => (
            <ReportCard key={report.id} report={report} />
          ))
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Details</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={20} color={facebookSecondaryText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedReport?.imageUrl && (
                <Image 
                  source={{ uri: selectedReport.imageUrl }} 
                  style={styles.modalImage}
                />
              )}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Status</Text>
                <Text style={[styles.modalText, { color: getStatusColor(selectedReport?.status) }]}>
                  {selectedReport?.status || 'Stray'}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Location</Text>
                <Text style={styles.modalText}>
                  {selectedReport?.locationName || 'Unknown Location'}
                </Text>
                {selectedReport?.location && selectedReport.location.latitude && selectedReport.location.longitude && (
                  <View style={styles.modalMapContainer}>
                    <MapView
                      provider={PROVIDER_GOOGLE}
                      style={styles.modalMap}
                      initialRegion={{
                        latitude: selectedReport.location.latitude,
                        longitude: selectedReport.location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      }}
                      scrollEnabled={true}
                      zoomEnabled={true}
                    >
                      <Marker
                        coordinate={{
                          latitude: selectedReport.location.latitude,
                          longitude: selectedReport.location.longitude,
                        }}
                        title="Last Seen Location"
                        description={selectedReport.locationName || 'Unknown Location'}
                        pinColor={getStatusColor(selectedReport?.status)}
                      />
                    </MapView>
                  </View>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Date & Time</Text>
                <Text style={styles.modalText}>
                  {formatDate(selectedReport?.reportTime)}
                </Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Description</Text>
                <Text style={styles.modalText}>
                  {selectedReport?.description || 'No description provided'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MyReportsScreen; 