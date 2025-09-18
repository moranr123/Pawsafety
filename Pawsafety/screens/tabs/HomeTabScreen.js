import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Image,
  Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';

const HomeTabScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const [recentReports, setRecentReports] = useState([]);
  const [recentPets, setRecentPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [appNotifs, setAppNotifs] = useState([]);
  const [petNotifs, setPetNotifs] = useState([]);
  const [transferNotifs, setTransferNotifs] = useState([]);
  const [registrationNotifs, setRegistrationNotifs] = useState([]);
  const [incidentNotifs, setIncidentNotifs] = useState([]);
  const [notifFilter, setNotifFilter] = useState('All'); // All | Applications | Pets | Transfers | Registration | Incidents
  const [notifMenu, setNotifMenu] = useState(null); // { type: 'app'|'pet', id: string } | null
  const [showBanner, setShowBanner] = useState(false);
  const [bannerCounts, setBannerCounts] = useState({ apps: 0, pets: 0, transfers: 0, registrations: 0, incidents: 0 });
  const [selectedNotif, setSelectedNotif] = useState(null); // { id, type, ts, title, sub, data }
  const [selectedPetDetails, setSelectedPetDetails] = useState(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [hiddenAppIds, setHiddenAppIds] = useState(new Set());
  const [hiddenPetIds, setHiddenPetIds] = useState(new Set());
  const [hiddenTransferIds, setHiddenTransferIds] = useState(new Set());
  const [hiddenRegistrationIds, setHiddenRegistrationIds] = useState(new Set());
  const [hiddenIncidentIds, setHiddenIncidentIds] = useState(new Set());
  const [lastReadUpdate, setLastReadUpdate] = useState(0);

  // Load hidden notifications from storage
  useEffect(() => {
    (async () => {
      try {
        const [appJson, petJson, transferJson, registrationJson, incidentJson] = await Promise.all([
          AsyncStorage.getItem('PAW_HIDDEN_APP_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_PET_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_TRANSFER_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_REGISTRATION_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_INCIDENT_NOTIFS'),
        ]);
        if (appJson) setHiddenAppIds(new Set(JSON.parse(appJson)));
        if (petJson) setHiddenPetIds(new Set(JSON.parse(petJson)));
        if (transferJson) setHiddenTransferIds(new Set(JSON.parse(transferJson)));
        if (registrationJson) setHiddenRegistrationIds(new Set(JSON.parse(registrationJson)));
        if (incidentJson) setHiddenIncidentIds(new Set(JSON.parse(incidentJson)));
      } catch (_) {}
    })();
  }, []);

  const persistHiddenSets = async (nextAppSet, nextPetSet, nextTransferSet, nextRegistrationSet, nextIncidentSet) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('PAW_HIDDEN_APP_NOTIFS', JSON.stringify(Array.from(nextAppSet || hiddenAppIds))),
        AsyncStorage.setItem('PAW_HIDDEN_PET_NOTIFS', JSON.stringify(Array.from(nextPetSet || hiddenPetIds))),
        AsyncStorage.setItem('PAW_HIDDEN_TRANSFER_NOTIFS', JSON.stringify(Array.from(nextTransferSet || hiddenTransferIds))),
        AsyncStorage.setItem('PAW_HIDDEN_REGISTRATION_NOTIFS', JSON.stringify(Array.from(nextRegistrationSet || hiddenRegistrationIds))),
        AsyncStorage.setItem('PAW_HIDDEN_INCIDENT_NOTIFS', JSON.stringify(Array.from(nextIncidentSet || hiddenIncidentIds))),
      ]);
    } catch (_) {}
  };

  const handleDeleteNotif = (type, id) => {
    if (type === 'app') {
      setAppNotifs((prev) => prev.filter((a) => a.id !== id));
      setHiddenAppIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(next, null, null, null, null);
        return next;
      });
    } else if (type === 'transfer') {
      setTransferNotifs((prev) => prev.filter((t) => t.id !== id));
      setHiddenTransferIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, next, null, null);
        return next;
      });
    } else if (type === 'registration') {
      setRegistrationNotifs((prev) => prev.filter((r) => r.id !== id));
      setHiddenRegistrationIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, next, null);
        return next;
      });
    } else if (type === 'incident') {
      setIncidentNotifs((prev) => prev.filter((i) => i.id !== id));
      setHiddenIncidentIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, next);
        return next;
      });
    } else {
      setPetNotifs((prev) => prev.filter((p) => p.id !== id));
      setHiddenPetIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, next, null, null, null);
        return next;
      });
    }
    setNotifMenu(null);
  };
  const notifCount = Math.min(99, (appNotifs?.length || 0) + (petNotifs?.length || 0) + (transferNotifs?.length || 0) + (registrationNotifs?.length || 0));
  
  const notifUnreadCount = useMemo(() => {
    try {
      const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
      const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
      const lastTransfer = (() => { try { return Number((globalThis.__PAW_LAST_TRANSFER__) || 0); } catch (_) { return 0; } })();
      const lastRegistration = (() => { try { return Number((globalThis.__PAW_LAST_REGISTRATION__) || 0); } catch (_) { return 0; } })();
      const unreadApp = (appNotifs || []).filter((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp).length;
      const unreadPet = (petNotifs || []).filter((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet).length;
      const unreadTransfer = (transferNotifs || []).filter((t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0) > lastTransfer).length;
      const unreadRegistration = (registrationNotifs || []).filter((r) => (r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0) > lastRegistration).length;
      return Math.min(99, unreadApp + unreadPet + unreadTransfer + unreadRegistration);
    } catch (e) {
      return 0;
    }
  }, [appNotifs, petNotifs, transferNotifs, registrationNotifs, lastReadUpdate]);

  useEffect(() => {
    let loadingCount = 2; // Track both queries
    
    // Fetch recent reports
    const reportsQuery = query(
      collection(db, 'stray_reports'),
      orderBy('reportTime', 'desc'),
      limit(5)
    );
    
    const reportsUnsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter out found reports from MyPetsScreen (foundBy: 'owner') and resolved reports
      const filteredReports = reports.filter(report => {
        const status = (report.status || 'Stray').toLowerCase();
        // Exclude found reports that came from MyPetsScreen
        if (status === 'found' && report.foundBy === 'owner') {
          return false;
        }
        // Exclude resolved reports
        if (status === 'resolved') {
          return false;
        }
        return true;
      });
      setRecentReports(filteredReports);
      loadingCount--;
      if (loadingCount === 0) setLoading(false);
    });
    
    // Fetch recent registered pets
    const petsQuery = query(
      collection(db, 'pets'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    
    const petsUnsubscribe = onSnapshot(petsQuery, (snapshot) => {
      const pets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPets(pets);
      loadingCount--;
      if (loadingCount === 0) setLoading(false);
    });
    
    return () => {
      reportsUnsubscribe();
      petsUnsubscribe();
    };
  }, [user?.uid]);

  // Notifications sources
  useEffect(() => {
    // Adoption application updates for current user
    let unsubApp = () => {};
    if (user?.uid) {
      const appsQ = query(
        collection(db, 'adoption_applications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      unsubApp = onSnapshot(appsQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAppNotifs(items.slice(0, 20));
      });
    } else {
      setAppNotifs([]);
    }

    // New adoptable pets
    const petsQ = query(
      collection(db, 'adoptable_pets'),
      orderBy('createdAt', 'desc')
    );
    const unsubPets = onSnapshot(petsQ, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => p.readyForAdoption !== false);
      setPetNotifs(items.slice(0, 20));
    });

    // Transfer notifications for current user
    let unsubTransfer = () => {};
    if (user?.uid) {
      const transferQ = query(
        collection(db, 'user_notifications'),
        where('userId', '==', user.uid),
        where('type', '==', 'pet_transfer'),
        orderBy('createdAt', 'desc')
      );
      unsubTransfer = onSnapshot(transferQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTransferNotifs(items.slice(0, 20));
      });
    } else {
      setTransferNotifs([]);
    }

    // Pet registration status notifications for current user
    let unsubRegistration = () => {};
    if (user?.uid) {
      const registrationQ = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('type', 'in', ['pet_registration_approved', 'pet_registration_rejected']),
        orderBy('createdAt', 'desc')
      );
      unsubRegistration = onSnapshot(registrationQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRegistrationNotifs(items.slice(0, 20));
      });
    } else {
      setRegistrationNotifs([]);
    }

    // Incident report notifications for current user
    let unsubIncident = () => {};
    if (user?.uid) {
      const incidentQ = query(
        collection(db, 'user_notifications'),
        where('userId', '==', user.uid),
        where('type', 'in', ['incident_resolved', 'incident_declined']),
        orderBy('createdAt', 'desc')
      );
      unsubIncident = onSnapshot(incidentQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setIncidentNotifs(items.slice(0, 20));
      });
    } else {
      setIncidentNotifs([]);
    }

    return () => {
      unsubApp && unsubApp();
      unsubPets && unsubPets();
      unsubTransfer && unsubTransfer();
      unsubRegistration && unsubRegistration();
      unsubIncident && unsubIncident();
    };
  }, [user?.uid]);

  // Compute banner counts for new notifications compared to last seen
  useEffect(() => {
    (async () => {
      try {
        const [lastAppStr, lastPetStr, lastTransferStr, lastRegistrationStr, lastIncidentStr] = await Promise.all([
          AsyncStorage.getItem('PAW_LAST_SEEN_APP_NOTIF'),
          AsyncStorage.getItem('PAW_LAST_SEEN_PET_NOTIF'),
          AsyncStorage.getItem('PAW_LAST_SEEN_TRANSFER_NOTIF'),
          AsyncStorage.getItem('PAW_LAST_SEEN_REGISTRATION_NOTIF'),
          AsyncStorage.getItem('PAW_LAST_SEEN_INCIDENT_NOTIF'),
        ]);
        const lastApp = lastAppStr ? Number(lastAppStr) : 0;
        const lastPet = lastPetStr ? Number(lastPetStr) : 0;
        const lastTransfer = lastTransferStr ? Number(lastTransferStr) : 0;
        const lastRegistration = lastRegistrationStr ? Number(lastRegistrationStr) : 0;
        const lastIncident = lastIncidentStr ? Number(lastIncidentStr) : 0;
        try { globalThis.__PAW_LAST_APP__ = lastApp; globalThis.__PAW_LAST_PET__ = lastPet; globalThis.__PAW_LAST_TRANSFER__ = lastTransfer; globalThis.__PAW_LAST_REGISTRATION__ = lastRegistration; globalThis.__PAW_LAST_INCIDENT__ = lastIncident; } catch (_) {}
        const appsNew = (appNotifs || []).filter((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp).length;
        const petsNew = (petNotifs || []).filter((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet).length;
        const transfersNew = (transferNotifs || []).filter((t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0) > lastTransfer).length;
        const registrationsNew = (registrationNotifs || []).filter((r) => (r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0) > lastRegistration).length;
        const incidentsNew = (incidentNotifs || []).filter((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident).length;
        setBannerCounts({ apps: appsNew, pets: petsNew, transfers: transfersNew, registrations: registrationsNew, incidents: incidentsNew });
        setShowBanner((appsNew + petsNew + transfersNew + registrationsNew + incidentsNew) > 0);
      } catch (e) {}
    })();
  }, [appNotifs, petNotifs, transferNotifs, registrationNotifs, incidentNotifs, lastReadUpdate]);

  const updateLastSeenAndOpen = async () => {
    try {
      const latestApp = Math.max(0, ...appNotifs.map((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0)));
      const latestPet = Math.max(0, ...petNotifs.map((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0)));
      const latestTransfer = Math.max(0, ...transferNotifs.map((t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0)));
      const latestRegistration = Math.max(0, ...registrationNotifs.map((r) => (r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0)));
      const latestIncident = Math.max(0, ...incidentNotifs.map((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0)));
      if (latestApp) await AsyncStorage.setItem('PAW_LAST_SEEN_APP_NOTIF', String(latestApp));
      if (latestPet) await AsyncStorage.setItem('PAW_LAST_SEEN_PET_NOTIF', String(latestPet));
      if (latestTransfer) await AsyncStorage.setItem('PAW_LAST_SEEN_TRANSFER_NOTIF', String(latestTransfer));
      if (latestRegistration) await AsyncStorage.setItem('PAW_LAST_SEEN_REGISTRATION_NOTIF', String(latestRegistration));
      if (latestIncident) await AsyncStorage.setItem('PAW_LAST_SEEN_INCIDENT_NOTIF', String(latestIncident));
    } catch (e) {}
    setShowBanner(false);
    setNotifVisible(true);
  };

  const handleMarkAllReadCombined = async () => {
    try {
      const latestApp = Math.max(0, ...appNotifs.map((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0)));
      const latestPet = Math.max(0, ...petNotifs.map((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0)));
      const latestTransfer = Math.max(0, ...transferNotifs.map((t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0)));
      const latestRegistration = Math.max(0, ...registrationNotifs.map((r) => (r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0)));
      const latestIncident = Math.max(0, ...incidentNotifs.map((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0)));
      if (latestApp) await AsyncStorage.setItem('PAW_LAST_SEEN_APP_NOTIF', String(latestApp));
      if (latestPet) await AsyncStorage.setItem('PAW_LAST_SEEN_PET_NOTIF', String(latestPet));
      if (latestTransfer) await AsyncStorage.setItem('PAW_LAST_SEEN_TRANSFER_NOTIF', String(latestTransfer));
      if (latestRegistration) await AsyncStorage.setItem('PAW_LAST_SEEN_REGISTRATION_NOTIF', String(latestRegistration));
      if (latestIncident) await AsyncStorage.setItem('PAW_LAST_SEEN_INCIDENT_NOTIF', String(latestIncident));
      try { globalThis.__PAW_LAST_APP__ = latestApp; globalThis.__PAW_LAST_PET__ = latestPet; globalThis.__PAW_LAST_TRANSFER__ = latestTransfer; globalThis.__PAW_LAST_REGISTRATION__ = latestRegistration; globalThis.__PAW_LAST_INCIDENT__ = latestIncident; } catch (_) {}
    } catch (e) {}
  };

  const handleDeleteAllCombined = () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            setAppNotifs((prev) => {
              const allIds = new Set(hiddenAppIds);
              for (const a of prev) allIds.add(a.id);
              setHiddenAppIds(allIds);
              persistHiddenSets(allIds, null, null, null, null);
              return [];
            });
            setPetNotifs((prev) => {
              const allIds = new Set(hiddenPetIds);
              for (const p of prev) allIds.add(p.id);
              setHiddenPetIds(allIds);
              persistHiddenSets(null, allIds, null, null, null);
              return [];
            });
            setRegistrationNotifs((prev) => {
              const allIds = new Set(hiddenRegistrationIds);
              for (const r of prev) allIds.add(r.id);
              setHiddenRegistrationIds(allIds);
              persistHiddenSets(null, null, null, allIds, null);
              return [];
            });
            setIncidentNotifs((prev) => {
              const allIds = new Set(hiddenIncidentIds);
              for (const i of prev) allIds.add(i.id);
              setHiddenIncidentIds(allIds);
              persistHiddenSets(null, null, null, null, allIds);
              return [];
            });
          },
        },
      ]
    );
  };

  const markNotificationAsRead = async (notif) => {
    try {
      const key = notif.type === 'app' ? 'PAW_LAST_SEEN_APP_NOTIF' : 
                  notif.type === 'transfer' ? 'PAW_LAST_SEEN_TRANSFER_NOTIF' :
                  notif.type === 'registration' ? 'PAW_LAST_SEEN_REGISTRATION_NOTIF' :
                  notif.type === 'incident' ? 'PAW_LAST_SEEN_INCIDENT_NOTIF' :
                  'PAW_LAST_SEEN_PET_NOTIF';
      const prevStr = await AsyncStorage.getItem(key);
      const prev = prevStr ? Number(prevStr) : 0;
      const ts = Number(notif.ts || 0);
      if (ts > prev) {
        await AsyncStorage.setItem(key, String(ts));
        try {
          if (notif.type === 'app') globalThis.__PAW_LAST_APP__ = ts; 
          else if (notif.type === 'transfer') globalThis.__PAW_LAST_TRANSFER__ = ts;
          else if (notif.type === 'registration') globalThis.__PAW_LAST_REGISTRATION__ = ts;
          else globalThis.__PAW_LAST_PET__ = ts;
        } catch (_) {}
        // Trigger UI update to refresh unread counts and indicators
        setLastReadUpdate(Date.now());
      }
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // The Firebase listener will automatically update the data
    // Just simulate a brief refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Lost': return COLORS.error;
      case 'Found': return COLORS.warning;
      case 'Stray': return COLORS.mediumBlue;
      default: return COLORS.mediumBlue;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Create styles using current theme colors
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    scrollView: {
      flex: 1,
      paddingTop: SPACING.lg,
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
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.white,
      flex: 1,
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    iconButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 12,
      padding: SPACING.sm,
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#ef4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '700',
    },
    section: {
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.lg,
    },
    quickActionsSection: {
      backgroundColor: COLORS.lightBlue,
      borderRadius: RADIUS.large,
      paddingVertical: SPACING.lg,
      marginHorizontal: SPACING.sm,
      marginBottom: SPACING.xl,
      ...SHADOWS.light,
    },
    petsSection: {
      backgroundColor: COLORS.golden,
      borderRadius: RADIUS.large,
      paddingVertical: SPACING.lg,
      marginHorizontal: SPACING.sm,
      marginBottom: SPACING.xl,
      ...SHADOWS.light,
    },
    reportsSection: {
      backgroundColor: COLORS.mediumBlue,
      borderRadius: RADIUS.large,
      paddingVertical: SPACING.lg,
      marginHorizontal: SPACING.sm,
      marginBottom: SPACING.xl,
      ...SHADOWS.light,
    },
    sectionTitle: {
      fontSize: FONTS.sizes.xlarge,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.text,
      marginBottom: SPACING.md,
    },
    sectionTitleInHeader: {
      marginBottom: 0,
    },
    actionCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginBottom: SPACING.sm,
      borderLeftWidth: 4,
      ...SHADOWS.light,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIcon: {
      fontSize: FONTS.sizes.xxxlarge,
      marginRight: SPACING.md,
    },
    cardText: {
      flex: 1,
    },
    cardTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    cardDescription: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    viewAllButton: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: COLORS.text,
      textAlignVertical: 'center',
    },
    reportsScrollContainer: {
      paddingRight: SPACING.lg,
    },
    reportCard: {
      width: 280,
      borderRadius: RADIUS.medium,
      marginRight: SPACING.md,
      minHeight: 200,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      ...SHADOWS.medium,
    },
    cardBackgroundImage: {
      borderRadius: RADIUS.medium,
    },
    darkOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    reportContent: {
      padding: SPACING.md,
      position: 'relative',
      zIndex: 1,
    },
    reportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    reportName: {
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
    statusBadgeText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: '#FFFFFF',
    },
    reportLocation: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: 2,
    },
    reportDistance: {
      fontSize: 10,
      fontFamily: FONTS.family,
      color: 'rgba(255, 255, 255, 0.8)',
      marginBottom: SPACING.xs,
    },
    reportDescription: {
      fontSize: 12,
      fontFamily: FONTS.family,
      color: '#FFFFFF',
      marginBottom: SPACING.md,
      lineHeight: 16,
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    helpButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.small,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    helpButtonText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.medium,
      color: '#FFFFFF',
    },
    tipCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.xl,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.light,
    },
    tipIcon: {
      fontSize: FONTS.sizes.xxlarge,
      marginRight: SPACING.md,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.semiBold,
      color: COLORS.text,
      marginBottom: SPACING.xs,
    },
    tipText: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
      lineHeight: 18,
    },
    loadingContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
    },
    loadingText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      marginTop: SPACING.sm,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
    },
    emptyText: {
      color: COLORS.white,
      fontSize: FONTS.sizes.large,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
    },
    emptySubtext: {
      color: COLORS.lightBlue,
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      marginTop: SPACING.xs,
      textAlign: 'center',
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

  }), [COLORS]);

  const QuickActionCard = ({ title, description, icon, onPress, color = COLORS.darkPurple }) => (
    <TouchableOpacity style={[styles.actionCard, { borderLeftColor: color }]} onPress={onPress}>
      <View style={styles.cardContent}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>PawSafety</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={[styles.iconButton, { position: 'relative' }]}
              onPress={() => setNotifVisible(true)}
            >
              <MaterialIcons name="notifications" size={24} color={COLORS.white} />
              {!!notifUnreadCount && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                // Handle profile press
                navigation.navigate('Settings');
              }}
            >
              <MaterialIcons name="account-circle" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {showBanner && (
        <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm }}>
          <View
            style={{
              backgroundColor: COLORS.darkPurple,
              borderRadius: 14,
              paddingVertical: SPACING.sm,
              paddingHorizontal: SPACING.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              ...SHADOWS.light,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialIcons name="notifications-active" size={20} color="#ffffff" />
              <View>
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>
                  {bannerCounts.apps + bannerCounts.pets + bannerCounts.transfers + bannerCounts.registrations + bannerCounts.incidents} new notification{(bannerCounts.apps + bannerCounts.pets + bannerCounts.transfers + bannerCounts.registrations + bannerCounts.incidents) > 1 ? 's' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  {bannerCounts.apps > 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Applications: {bannerCounts.apps}</Text>
                    </View>
                  ) : null}
                  {bannerCounts.pets > 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Pets: {bannerCounts.pets}</Text>
                    </View>
                  ) : null}
                  {bannerCounts.transfers > 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Transfers: {bannerCounts.transfers}</Text>
                    </View>
                  ) : null}
                  {bannerCounts.registrations > 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Registrations: {bannerCounts.registrations}</Text>
                    </View>
                  ) : null}
                  {bannerCounts.incidents > 0 ? (
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>Incidents: {bannerCounts.incidents}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={updateLastSeenAndOpen}
                style={{ backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: COLORS.darkPurple, fontWeight: '800' }}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowBanner(false)}
                style={{ borderWidth: 1, borderColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '800' }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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




        {/* Quick Actions */}
        <View style={[styles.section, styles.quickActionsSection]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <QuickActionCard
            title="Register Pet"
            description="Add a new pet to your family"
            icon="📝"
            color={COLORS.golden}
            onPress={() => navigation.navigate('RegisterPet')}
          />

          <QuickActionCard
            title="File a Report"
            description="Report a stray, lost, or found pet"
            icon="📍"
            color={COLORS.success}
            onPress={() => navigation.navigate('StrayReport')}
          />

          <QuickActionCard
            title="My Reports"
            description="View and manage your submitted reports"
            icon="📋"
            color={COLORS.darkPurple}
            onPress={() => navigation.navigate('MyReports')}
          />

          <QuickActionCard
            title="My Pets"
            description="View and manage your pets"
            icon="🐾"
            color={COLORS.mediumBlue}
            onPress={() => navigation.navigate('MyPets')}
          />

          <QuickActionCard
            title="Pet Care Guide"
            description="How to care for your pet"
            icon="📘"
            color={COLORS.darkPurple}
            onPress={() => navigation.navigate('PetCareGuide')}
          />
        </View>

        {/* Recent Registered Pets */}
        <View style={[styles.section, styles.petsSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Recent Registered Pets</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PetList')}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.white} />
              <Text style={styles.loadingText}>Loading pets...</Text>
            </View>
          ) : recentPets.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No registered pets yet</Text>
              <Text style={styles.emptySubtext}>Be the first to register your pet!</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reportsScrollContainer}
            >
              {recentPets.map((pet) => (
                <ImageBackground 
                  key={pet.id}
                  source={pet.petImage ? { uri: pet.petImage } : null}
                  style={styles.reportCard}
                  imageStyle={styles.cardBackgroundImage}
                >
                  {!pet.petImage && (
                    <View style={styles.placeholderBackground}>
                      <Text style={styles.petEmoji}>🐕</Text>
                    </View>
                  )}
                  <View style={styles.darkOverlay} />
                  
                  <View style={styles.reportContent}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportName}>{pet.petName || 'Unnamed Pet'}</Text>
                    </View>
                    
                    <Text style={styles.reportLocation}>🐾 {pet.breed || 'Unknown Breed'}</Text>
                    <Text style={styles.reportDistance}>{formatTimeAgo(pet.createdAt)}</Text>
                    <Text style={styles.reportDescription} numberOfLines={3}>
                      {pet.description || `A lovely ${pet.petType || 'pet'} looking for a loving home.`}
                    </Text>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.helpButton}
                        onPress={() => setSelectedPetDetails(pet)}
                      >
                        <Text style={styles.helpButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ImageBackground>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent Reports */}
        <View style={[styles.section, styles.reportsSection]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInHeader]}>Recent Reports</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Strays')}>
              <Text style={styles.viewAllButton}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.white} />
              <Text style={styles.loadingText}>Loading reports...</Text>
            </View>
          ) : recentReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No reports yet</Text>
              <Text style={styles.emptySubtext}>Be the first to report a stray pet!</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reportsScrollContainer}
            >
              {recentReports.map((report) => (
                <ImageBackground 
                  key={report.id}
                  source={report.imageUrl ? { uri: report.imageUrl } : null}
                  style={styles.reportCard}
                  imageStyle={styles.cardBackgroundImage}
                >
                  {!report.imageUrl && (
                    <View style={styles.placeholderBackground}>
                      <Text style={styles.petEmoji}>🐾</Text>
                    </View>
                  )}
                  <View style={styles.darkOverlay} />
                  
                  <View style={styles.reportContent}>
                    <View style={styles.reportHeader}>
                      <Text style={styles.reportName}>Stray Report</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status) }]}>
                        <Text style={styles.statusBadgeText}>{report.status || 'Stray'}</Text>
                      </View>
                    </View>
                    
                    <Text style={styles.reportLocation}>📍 {report.locationName || 'Unknown Location'}</Text>
                    <Text style={styles.reportDistance}>{formatTimeAgo(report.reportTime)}</Text>
                    <Text style={styles.reportDescription} numberOfLines={3}>
                      {report.description || 'No description provided'}
                    </Text>
                    
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.helpButton}
                        onPress={() => setSelectedReportDetails(report)}
                      >
                        <Text style={styles.helpButtonText}>View Details</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ImageBackground>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Safety Tip */}
        <View style={styles.tipCard}>
          <Text style={styles.tipIcon}>💡</Text>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Safety Tip</Text>
            <Text style={styles.tipText}>
              Always keep your pet's ID tags updated with current contact information.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16, zIndex: 100 }}>
          <View style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: 24, 
            overflow: 'hidden', 
            maxHeight: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.25,
            shadowRadius: 25,
            elevation: 15
          }}>
            {/* Header */}
            <View style={{ 
              padding: 24, 
              borderBottomWidth: 1, 
              borderBottomColor: '#e2e8f0',
              backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View>
                  <Text style={{ fontSize: 26, fontWeight: '800', color: '#1f2937', marginBottom: 2 }}>
                    🔔 Notifications
                  </Text>
                  <Text style={{ color: '#6b7280', fontSize: 15, fontWeight: '500' }}>
                    Stay updated with your applications and pet transfers
                  </Text>
                </View>

              </View>
              
                            {/* Filter Tabs */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 4 }}
                style={{ marginHorizontal: -4 }}
              >
                <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 4 }}>
                  {['All', 'Apps', 'Pets', 'Transfers', 'Registration', 'Incidents'].map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setNotifFilter(opt === 'Apps' ? 'Applications' : opt)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 25,
                        borderWidth: 1.5,
                        borderColor: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#8b5cf6' : '#d1d5db',
                        backgroundColor: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#8b5cf6' : 'rgba(255, 255, 255, 0.95)',
                        alignItems: 'center',
                        shadowColor: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#8b5cf6' : 'transparent',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 4,
                        elevation: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? 3 : 0,
                        minWidth: 80
                      }}
                    >
                      <Text style={{
                        color: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#ffffff' : '#374151',
                        fontWeight: '700',
                        fontSize: 11,
                        textAlign: 'center'
                      }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Content */}
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {/* Action Buttons */}
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 20,
                paddingHorizontal: 4
              }}>
                <Text style={{ fontWeight: '800', fontSize: 18, color: '#1f2937' }}>Recent Updates</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    onPress={handleMarkAllReadCombined} 
                    disabled={(() => {
                      const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
                      const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
                      const lastIncident = (() => { try { return Number((globalThis.__PAW_LAST_INCIDENT__) || 0); } catch (_) { return 0; } })();
                      const hasUnreadApp = (appNotifs || []).some((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp);
                      const hasUnreadPet = (petNotifs || []).some((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet);
                      const hasUnreadIncident = (incidentNotifs || []).some((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident);
                      return !(hasUnreadApp || hasUnreadPet || hasUnreadIncident);
                    })()}
                    style={{ 
                      paddingHorizontal: 12, 
                      paddingVertical: 8, 
                      borderRadius: 12, 
                      backgroundColor: '#f3f4f6',
                      borderWidth: 1,
                      borderColor: '#e5e7eb',
                      opacity: (() => {
                        const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
                        const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
                        const lastIncident = (() => { try { return Number((globalThis.__PAW_LAST_INCIDENT__) || 0); } catch (_) { return 0; } })();
                        const hasUnreadApp = (appNotifs || []).some((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp);
                        const hasUnreadPet = (petNotifs || []).some((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet);
                        const hasUnreadIncident = (incidentNotifs || []).some((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident);
                        return (hasUnreadApp || hasUnreadPet || hasUnreadIncident) ? 1 : 0.5;
                      })()
                    }}
                  >
                   <Text style={{ 
                     fontWeight: '600', 
                     fontSize: 12,
                     color: (() => {
                       const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
                       const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
                       const hasUnreadApp = (appNotifs || []).some((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp);
                       const hasUnreadPet = (petNotifs || []).some((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet);
                       return (hasUnreadApp || hasUnreadPet) ? '#374151' : '#9ca3af';
                     })()
                   }}>Mark all read</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleDeleteAllCombined} 
                    style={{ 
                      paddingHorizontal: 12, 
                      paddingVertical: 8, 
                      borderRadius: 12, 
                      backgroundColor: '#fef2f2',
                      borderWidth: 1,
                      borderColor: '#fecaca'
                    }}
                  >
                    <Text style={{ fontWeight: '600', color: '#dc2626', fontSize: 12 }}>Delete all</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {(() => {
                const lastSeenApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
                const lastSeenPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
                const lastSeenTransfer = (() => { try { return Number((globalThis.__PAW_LAST_TRANSFER__) || 0); } catch (_) { return 0; } })();
                const lastSeenRegistration = (() => { try { return Number((globalThis.__PAW_LAST_REGISTRATION__) || 0); } catch (_) { return 0; } })();
                const apps = (appNotifs || [])
                  .filter((a) => !hiddenAppIds.has(a.id))
                  .map((a) => ({
                  id: a.id,
                  type: 'app',
                  ts: a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0,
                  title: (a.status === 'Approved' ? 'Application Approved' : a.status === 'Declined' ? 'Application Declined' : 'Application Update'),
                  sub: `Pet: ${a.petName || a.petBreed || 'Pet'} • Status: ${a.status || 'Submitted'}`,
                  data: a,
                }));
                const pets = (petNotifs || [])
                  .filter((p) => !hiddenPetIds.has(p.id))
                  .map((p) => ({
                  id: p.id,
                  type: 'pet',
                  ts: p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0,
                  title: 'New Pet is available for adoption',
                  sub: `${p.petName || 'Pet'} • ${p.breed || 'Unknown breed'} • ${p.age || 'Unknown age'}`,
                  data: p,
                }));
                const transfers = (transferNotifs || [])
                  .filter((t) => !hiddenTransferIds.has(t.id))
                  .map((t) => ({
                  id: t.id,
                  type: 'transfer',
                  ts: t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0,
                  title: t.title || 'Pet Transferred to You!',
                  sub: `${t.petName || 'Pet'} • ${t.petBreed || 'Unknown breed'} • From Impound`,
                  data: t,
                }));
                const registrations = (registrationNotifs || [])
                  .filter((r) => !hiddenRegistrationIds.has(r.id))
                  .map((r) => ({
                  id: r.id,
                  type: 'registration',
                  ts: r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0,
                  title: r.type === 'pet_registration_approved' ? 'Pet Registration Approved!' : 'Pet Registration Rejected',
                  sub: `${r.petName || 'Pet'} • ${r.message || 'Registration status updated'}`,
                  data: r,
                }));
                const incidents = (incidentNotifs || [])
                  .filter((i) => !hiddenIncidentIds.has(i.id))
                  .map((i) => ({
                  id: i.id,
                  type: 'incident',
                  ts: i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0,
                  title: i.type === 'incident_resolved' ? 'Incident Report Resolved' : 'Incident Report Declined',
                  sub: `${i.location || 'Unknown location'} • ${i.message || 'Incident report status updated'}`,
                  data: i,
                }));
                let list = [...apps, ...pets, ...transfers, ...registrations, ...incidents].sort((a, b) => b.ts - a.ts);
                if (notifFilter === 'Applications') list = list.filter((n) => n.type === 'app');
                if (notifFilter === 'Pets') list = list.filter((n) => n.type === 'pet');
                if (notifFilter === 'Transfers') list = list.filter((n) => n.type === 'transfer');
                if (notifFilter === 'Registration') list = list.filter((n) => n.type === 'registration');
                if (notifFilter === 'Incidents') list = list.filter((n) => n.type === 'incident');
                if (list.length === 0) return <Text style={{ color: '#64748b' }}>No notifications yet.</Text>;
                return list.map((n) => (
                  <View key={`${n.type}-${n.id}`} style={{ 
                    position: 'relative', 
                    borderWidth: 1, 
                    borderColor: '#f1f5f9', 
                    borderRadius: 16, 
                    padding: 16, 
                    marginBottom: 12, 
                    backgroundColor: '#ffffff',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2
                  }}>
                    <TouchableOpacity 
                      onPress={() => setNotifMenu((m) => (m && m.id === n.id ? null : { type: n.type, id: n.id }))} 
                      style={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12, 
                        padding: 6, 
                        zIndex: 20,
                        borderRadius: 8,
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <MaterialIcons name="more-horiz" size={18} color="#6b7280" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={async () => {
                        // Mark as read for this specific notification
                        await markNotificationAsRead(n);
                        setSelectedNotif(n);
                        setNotifVisible(false);
                      }} 
                      activeOpacity={0.7} 
                      style={{ flex: 1 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        {/* Status Indicator */}
                        <View style={{ 
                          width: 12, 
                          height: 12, 
                          borderRadius: 6, 
                          backgroundColor: (n.type === 'app' ? (n.ts > (Number(lastSeenApp) || 0)) : n.type === 'transfer' ? (n.ts > (Number(lastSeenTransfer) || 0)) : n.type === 'registration' ? (n.ts > (Number(lastSeenRegistration) || 0)) : (n.ts > (Number(lastSeenPet) || 0))) ? '#10b981' : '#d1d5db',
                          marginTop: 2
                        }} />
                        
                        {/* Content */}
                        <View style={{ flex: 1, paddingRight: 32 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                            <MaterialIcons 
                              name={n.type === 'pet' 
                                ? 'favorite' 
                                : n.type === 'transfer'
                                  ? 'pets'
                                  : n.type === 'registration'
                                    ? (n.data?.type === 'pet_registration_approved' 
                                      ? 'check-circle' 
                                      : 'cancel')
                                    : (n.data?.status === 'Approved' 
                                      ? 'check-circle' 
                                      : (n.data?.status === 'Declined' 
                                        ? 'cancel' 
                                        : 'info'))}
                              size={18}
                              color={n.type === 'pet' 
                                ? '#f59e0b' 
                                : n.type === 'transfer'
                                  ? '#8b5cf6'
                                  : n.type === 'registration'
                                    ? (n.data?.type === 'pet_registration_approved' 
                                      ? '#16a34a' 
                                      : '#dc2626')
                                    : (n.data?.status === 'Declined' 
                                      ? '#dc2626' 
                                      : (n.data?.status === 'Approved' 
                                        ? '#16a34a' 
                                        : '#6b7280'))}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={{ 
                              fontWeight: '700', 
                              fontSize: 16, 
                              color: (n.type === 'pet' 
                                ? '#f59e0b' 
                                : n.type === 'transfer'
                                  ? '#8b5cf6'
                                  : n.type === 'registration'
                                    ? (n.data?.type === 'pet_registration_approved' 
                                      ? '#16a34a' 
                                      : '#dc2626')
                                    : (n.data?.status === 'Declined' 
                                      ? '#dc2626' 
                                      : (n.data?.status === 'Approved' 
                                        ? '#16a34a' 
                                        : '#1f2937')))
                            }}>
                              {n.title}
                            </Text>
                          </View>
                          <Text style={{ 
                            color: (n.type === 'pet' 
                              ? '#f59e0b' 
                              : n.type === 'transfer'
                                ? '#8b5cf6'
                                : n.type === 'registration'
                                  ? (n.data?.type === 'pet_registration_approved' 
                                    ? '#16a34a' 
                                    : '#dc2626')
                                  : (n.data?.status === 'Declined' 
                                    ? '#dc2626' 
                                    : (n.data?.status === 'Approved' 
                                      ? '#16a34a' 
                                      : '#6b7280'))), 
                            fontSize: 14,
                            marginBottom: 6
                          }}>
                            {n.sub}
                          </Text>
                          <Text style={{ 
                            color: '#9ca3af', 
                            fontSize: 12,
                            fontWeight: '500'
                          }}>
                            {n.ts ? new Date(n.ts).toLocaleDateString() + ' • ' + new Date(n.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    
                    {/* Dropdown Menu */}
                    {notifMenu && notifMenu.id === n.id && notifMenu.type === n.type && (
                      <View style={{ 
                        position: 'absolute', 
                        top: 40, 
                        right: 12, 
                        backgroundColor: '#ffffff', 
                        borderWidth: 1, 
                        borderColor: '#e5e7eb', 
                        borderRadius: 12, 
                        overflow: 'hidden', 
                        zIndex: 30,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5
                      }}>
                        <TouchableOpacity 
                          onPress={() => handleDeleteNotif(n.type, n.id)} 
                          style={{ 
                            paddingVertical: 10, 
                            paddingHorizontal: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f3f4f6'
                          }}
                        >
                          <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 14 }}>Delete</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => setNotifMenu(null)} 
                          style={{ 
                            paddingVertical: 10, 
                            paddingHorizontal: 16 
                          }}
                        >
                          <Text style={{ color: '#374151', fontWeight: '500', fontSize: 14 }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ));
              })()}
            </ScrollView>
            
            {/* Footer */}
            <View style={{ 
              padding: 20, 
              borderTopWidth: 1, 
              borderTopColor: '#f1f5f9',
              backgroundColor: '#fafafa',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Text style={{ color: '#6b7280', fontSize: 12 }}>
                {(() => {
                  const apps = (appNotifs || [])
                    .filter((a) => !hiddenAppIds.has(a.id))
                    .map((a) => ({
                      id: a.id,
                      type: 'app',
                      ts: a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0,
                      title: (a.status === 'Approved' ? 'Application Approved' : a.status === 'Declined' ? 'Application Declined' : 'Application Update'),
                      sub: `Pet: ${a.petName || a.petBreed || 'Pet'} • Status: ${a.status || 'Submitted'}`,
                      data: a,
                    }));
                  const pets = (petNotifs || [])
                    .filter((p) => !hiddenPetIds.has(p.id))
                    .map((p) => ({
                      id: p.id,
                      type: 'pet',
                      ts: p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0,
                      title: 'New Pet is available for adoption',
                      sub: `${p.petName || 'Pet'} • ${p.breed || 'Unknown breed'} • ${p.age || 'Unknown age'}`,
                      data: p,
                    }));
                  const transfers = (transferNotifs || [])
                    .filter((t) => !hiddenTransferIds.has(t.id))
                    .map((t) => ({
                      id: t.id,
                      type: 'transfer',
                      ts: t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0,
                      title: t.title || 'Pet Transferred to You!',
                      sub: `${t.petName || 'Pet'} • ${t.petBreed || 'Unknown breed'} • From Impound`,
                      data: t,
                    }));
                  const incidents = (incidentNotifs || [])
                    .filter((i) => !hiddenIncidentIds.has(i.id))
                    .map((i) => ({
                      id: i.id,
                      type: 'incident',
                      ts: i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0,
                      title: i.type === 'incident_resolved' ? 'Incident Report Resolved' : 'Incident Report Declined',
                      sub: `${i.location || 'Unknown location'} • ${i.message || 'Incident report status updated'}`,
                      data: i,
                    }));
                  let list = [...apps, ...pets, ...transfers, ...incidents].sort((a, b) => b.ts - a.ts);
                  if (notifFilter === 'Applications') list = list.filter((n) => n.type === 'app');
                  if (notifFilter === 'Pets') list = list.filter((n) => n.type === 'pet');
                  if (notifFilter === 'Transfers') list = list.filter((n) => n.type === 'transfer');
                  if (notifFilter === 'Incidents') list = list.filter((n) => n.type === 'incident');
                  return `${list.length} notification${list.length !== 1 ? 's' : ''}`;
                })()}
              </Text>
              <TouchableOpacity 
                onPress={() => setNotifVisible(false)} 
                style={{ 
                  paddingVertical: 12, 
                  paddingHorizontal: 20, 
                  backgroundColor: '#1f2937', 
                  borderRadius: 12 
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    
    {/* Notification Details Modal - Moved outside notifications modal */}
    {selectedNotif && (
      <View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: 20
      }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxHeight: '85%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#f1f5f9'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937' }}>
                  {selectedNotif.title}
                </Text>
                <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                  {selectedNotif.type === 'app' ? 'Application Update' : 
                   selectedNotif.type === 'transfer' ? 'Pet Transfer Notification' : 
                   selectedNotif.type === 'registration' ? 'Pet Registration Update' :
                   selectedNotif.type === 'incident' ? 'Incident Report Update' :
                   'New Pet Available'}
                </Text>
              </View>

            </View>

            {/* Content */}
            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {selectedNotif.type === 'app' ? (
                <>
                  {/* Status Card */}
                  <View style={{
                    backgroundColor: selectedNotif.data?.status === 'Approved' ? '#dcfce7' :
                                   selectedNotif.data?.status === 'Declined' ? '#fee2e2' : '#fef3c7',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: selectedNotif.data?.status === 'Approved' ? '#16a34a' :
                                    selectedNotif.data?.status === 'Declined' ? '#dc2626' : '#d97706'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      Status: {selectedNotif.data?.status || 'Submitted'}
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      {selectedNotif.data?.status === 'Approved' 
                        ? `Your application has been approved! You can now go to your preferred date/time for claiming the pet${selectedNotif.data?.preferredDate ? `: ${selectedNotif.data.preferredDate}` : '.'}` 
                        : selectedNotif.data?.status === 'Declined' 
                          ? 'Your application was not approved.' 
                          : 'Your application is being reviewed.'}
                    </Text>
                  </View>

                  {/* Pet Info */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Pet Information
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151' }}>
                      {selectedNotif.data?.petName || selectedNotif.data?.petBreed || 'Unknown Pet'}
                    </Text>
                  </View>

                  {/* Application Date */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Application Date
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151' }}>
                      {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                    </Text>
                  </View>

                  {/* Admin Notes */}
                  {selectedNotif.data?.notes && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Admin Notes
                      </Text>
                      <View style={{
                        backgroundColor: '#fef2f2',
                        padding: 16,
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#dc2626'
                      }}>
                        <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                          {selectedNotif.data.notes}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Preferred Date */}
                  {selectedNotif.data?.preferredDate && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Preferred Adoption Date
                      </Text>
                      <Text style={{ fontSize: 16, color: '#374151' }}>
                        {selectedNotif.data.preferredDate}
                      </Text>
                    </View>
                  )}
                </>
              ) : selectedNotif.type === 'transfer' ? (
                <>
                  {/* Transfer Success Card */}
                  <View style={{
                    backgroundColor: '#dcfce7',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: '#8B5CF6'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      🎉 Pet Successfully Transferred!
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      Congratulations! {selectedNotif.data?.petName || 'A pet'} has been transferred to your care by the animal impound facility. The pet is now officially registered under your name.
                    </Text>
                  </View>

                  {/* Pet Image */}
                  {selectedNotif.data?.petImage && (
                    <View style={{ marginBottom: 20, alignItems: 'center' }}>
                      <Image 
                        source={{ uri: selectedNotif.data.petImage }} 
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          borderRadius: 16,
                          backgroundColor: '#f3f4f6'
                        }} 
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Pet Details */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 12, color: '#1f2937' }}>
                      {selectedNotif.data?.petName || 'Transferred Pet'}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          {selectedNotif.data?.petBreed || 'Unknown breed'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          From Impound
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          Adopted
                        </Text>
                      </View>
                    </View>

                    {/* Transfer Information */}
                    <View style={{ 
                      backgroundColor: '#EEF2FF', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#6366F1', fontWeight: '600', marginBottom: 8 }}>
                        TRANSFER DETAILS
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                        <Text style={{ fontWeight: '700' }}>Pet Name:</Text> {selectedNotif.data?.petName || 'N/A'}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                        <Text style={{ fontWeight: '700' }}>Breed:</Text> {selectedNotif.data?.petBreed || 'Unknown'}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', marginBottom: 6 }}>
                        <Text style={{ fontWeight: '700' }}>Source:</Text> Animal Impound Facility
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151' }}>
                        <Text style={{ fontWeight: '700' }}>Status:</Text> Successfully Transferred
                      </Text>
                    </View>

                    {/* Next Steps */}
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600', marginBottom: 8 }}>
                        NEXT STEPS
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        • Check your "My Pets" section to view your new pet{'\n'}
                        • Visit the Pet List to see all registered pets in the community{'\n'}
                        • Ensure your pet receives proper care and attention{'\n'}
                        • Update pet information if needed
                      </Text>
                    </View>

                    {/* Transfer Date */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Transfer Date
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151' }}>
                        {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </>
              ) : selectedNotif.type === 'registration' ? (
                <>
                  {/* Registration Status Card */}
                  <View style={{
                    backgroundColor: selectedNotif.data?.type === 'pet_registration_approved' ? '#dcfce7' : '#fee2e2',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: selectedNotif.data?.type === 'pet_registration_approved' ? '#16a34a' : '#dc2626'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      {selectedNotif.data?.type === 'pet_registration_approved' ? '🎉 Registration Approved!' : '❌ Registration Rejected'}
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      {selectedNotif.data?.message || (selectedNotif.data?.type === 'pet_registration_approved' 
                        ? 'Your pet registration has been approved by the agricultural admin. Your pet is now officially registered and will appear in the pet list.' 
                        : 'Your pet registration was not approved. Please contact the agricultural admin for more information.')}
                    </Text>
                  </View>

                  {/* Pet Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Pet Information
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>Pet Name:</Text> {selectedNotif.data?.petName || 'N/A'}
                    </Text>
                  </View>

                  {/* Registration Date */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Registration Date
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151' }}>
                      {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                    </Text>
                  </View>

                  {/* Next Steps */}
                  {selectedNotif.data?.type === 'pet_registration_approved' ? (
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600', marginBottom: 8 }}>
                        WHAT'S NEXT?
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        • Your pet is now visible in the Pet List{'\n'}
                        • Other users can now see your registered pet{'\n'}
                        • Keep your pet information updated{'\n'}
                        • Ensure your pet has proper identification
                      </Text>
                    </View>
                  ) : (
                    <View style={{ 
                      backgroundColor: '#FEE2E2', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600', marginBottom: 8 }}>
                        WHAT CAN YOU DO?
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        • Contact the agricultural admin for clarification{'\n'}
                        • Review your pet registration information{'\n'}
                        • Ensure all required documents are complete{'\n'}
                        • You may resubmit your registration if needed
                      </Text>
                    </View>
                  )}
                </>
              ) : selectedNotif.type === 'incident' ? (
                <>
                  {/* Incident Status Card */}
                  <View style={{
                    backgroundColor: selectedNotif.data?.type === 'incident_resolved' ? '#dcfce7' : '#fee2e2',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: selectedNotif.data?.type === 'incident_resolved' ? '#16a34a' : '#dc2626'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      {selectedNotif.data?.type === 'incident_resolved' ? '✅ Incident Report Resolved' : '❌ Incident Report Declined'}
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      {selectedNotif.data?.message || (selectedNotif.data?.type === 'incident_resolved' 
                        ? 'Your incident report has been resolved by the animal impound facility. Thank you for reporting this incident.' 
                        : 'Your incident report has been declined. Please see the reason below.')}
                    </Text>
                  </View>

                  {/* Incident Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Incident Details
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>Location:</Text> {selectedNotif.data?.location || 'Unknown location'}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>
                      <Text style={{ fontWeight: '700' }}>Report ID:</Text> {selectedNotif.data?.reportId || 'N/A'}
                    </Text>
                  </View>

                  {/* Decline Reason (if declined) */}
                  {selectedNotif.data?.type === 'incident_declined' && selectedNotif.data?.declineReason && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Reason for Decline
                      </Text>
                      <View style={{
                        backgroundColor: '#fef2f2',
                        padding: 16,
                        borderRadius: 12,
                        borderLeftWidth: 4,
                        borderLeftColor: '#dc2626'
                      }}>
                        <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                          {selectedNotif.data.declineReason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Report Date */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Report Date
                    </Text>
                    <Text style={{ fontSize: 16, color: '#374151' }}>
                      {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                    </Text>
                  </View>

                  {/* Next Steps */}
                  {selectedNotif.data?.type === 'incident_resolved' ? (
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#D97706', fontWeight: '600', marginBottom: 8 }}>
                        THANK YOU
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        • Thank you for reporting this incident{'\n'}
                        • The impound facility has taken appropriate action{'\n'}
                        • Continue to report any animal-related incidents{'\n'}
                        • Your reports help keep the community safe
                      </Text>
                    </View>
                  ) : (
                    <View style={{ 
                      backgroundColor: '#FEE2E2', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16 
                    }}>
                      <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600', marginBottom: 8 }}>
                        WHAT CAN YOU DO?
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                        • Review the reason for decline above{'\n'}
                        • Contact the impound facility for clarification{'\n'}
                        • Ensure your report contains accurate information{'\n'}
                        • You may submit a new incident report if needed
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  {/* Pet Image */}
                  {selectedNotif.data?.imageUrl && (
                    <View style={{ marginBottom: 20, alignItems: 'center' }}>
                      <Image 
                        source={{ uri: selectedNotif.data.imageUrl }} 
                        style={{ 
                          width: '100%', 
                          height: 200, 
                          borderRadius: 16,
                          backgroundColor: '#f3f4f6'
                        }} 
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Pet Details */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 12, color: '#1f2937' }}>
                      {selectedNotif.data?.petName || 'Unnamed Pet'}
                    </Text>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          {selectedNotif.data?.breed || 'Unknown breed'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          {selectedNotif.data?.age || 'Unknown age'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          {selectedNotif.data?.gender || 'Unknown'}
                        </Text>
                      </View>
                    </View>

                    {selectedNotif.data?.description && (
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                          Description
                        </Text>
                        <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                          {selectedNotif.data.description}
                        </Text>
                      </View>
                    )}

                    {/* Medical Status */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Medical Status
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 16 }}>
                        <View style={{ alignItems: 'center' }}>
                          <View style={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: 10, 
                            backgroundColor: selectedNotif.data?.vaccinated ? '#16a34a' : '#d1d5db',
                            marginBottom: 6
                          }} />
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Vaccine</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <View style={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: 10, 
                            backgroundColor: selectedNotif.data?.dewormed ? '#16a34a' : '#d1d5db',
                            marginBottom: 6
                          }} />
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Deworm</Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                          <View style={{ 
                            width: 20, 
                            height: 20, 
                            borderRadius: 10, 
                            backgroundColor: selectedNotif.data?.antiRabies ? '#16a34a' : '#d1d5db',
                            marginBottom: 6
                          }} />
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>Anti-rabies</Text>
                        </View>
                      </View>
                    </View>

                    {/* Posted Date */}
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Posted
                      </Text>
                      <Text style={{ fontSize: 14, color: '#374151' }}>
                        {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={{
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: '#f1f5f9',
              flexDirection: 'row',
              justifyContent: 'flex-end'
            }}>
              <TouchableOpacity 
                onPress={() => setSelectedNotif(null)}
                style={{
                  backgroundColor: '#1f2937',
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Pet Details Modal */}
      {selectedPetDetails && (
        <Modal
          visible={!!selectedPetDetails}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedPetDetails(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: SPACING.lg,
          }}>
            <View style={{
              backgroundColor: COLORS.cardBackground,
              borderRadius: RADIUS.xlarge,
              maxHeight: '90%',
              width: '100%',
              maxWidth: 400,
              elevation: 10,
              ...SHADOWS.heavy,
            }}>
              {/* Modal Header with Close Button */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: SPACING.lg,
                borderBottomWidth: 1,
                borderBottomColor: '#E5E5E5',
              }}>
                <Text style={{
                  fontSize: FONTS.sizes.xlarge,
                  fontFamily: FONTS.family,
                  fontWeight: FONTS.weights.bold,
                  color: COLORS.text,
                }}>Pet Details</Text>
                <TouchableOpacity
                  onPress={() => setSelectedPetDetails(null)}
                  style={{
                    padding: SPACING.sm,
                    borderRadius: RADIUS.medium,
                    backgroundColor: COLORS.inputBackground,
                  }}
                >
                  <MaterialIcons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Pet Image */}
                <View style={{
                  padding: SPACING.lg,
                  alignItems: 'center',
                }}>
                  {selectedPetDetails.petImage ? (
                    <Image 
                      source={{ uri: selectedPetDetails.petImage }} 
                      style={{
                        width: 200,
                        height: 200,
                        borderRadius: RADIUS.xlarge,
                        backgroundColor: COLORS.inputBackground,
                      }} 
                      resizeMode="cover" 
                    />
                  ) : (
                    <View style={{
                      width: 200,
                      height: 200,
                      borderRadius: RADIUS.xlarge,
                      backgroundColor: COLORS.inputBackground,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <MaterialIcons 
                        name="pets" 
                        size={80} 
                        color={COLORS.mediumBlue} 
                      />
                      <Text style={{
                        fontSize: FONTS.sizes.medium,
                        fontFamily: FONTS.family,
                        color: COLORS.secondaryText,
                        marginTop: SPACING.sm,
                      }}>No Photo</Text>
                    </View>
                  )}
                </View>

                {/* Pet Name */}
                <View style={{
                  paddingHorizontal: SPACING.lg,
                  marginBottom: SPACING.lg,
                }}>
                  <Text style={{
                    fontSize: FONTS.sizes.xxlarge,
                    fontFamily: FONTS.family,
                    fontWeight: FONTS.weights.bold,
                    color: COLORS.text,
                    flex: 1,
                  }}>{selectedPetDetails.petName || 'Unnamed Pet'}</Text>
                </View>

                {/* Pet Information Cards */}
                <View style={{
                  paddingHorizontal: SPACING.lg,
                }}>
                  <View style={{
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: RADIUS.medium,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    borderLeftWidth: 4,
                    borderLeftColor: COLORS.mediumBlue,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: RADIUS.large,
                        backgroundColor: COLORS.cardBackground,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: SPACING.md,
                      }}>
                        <MaterialIcons 
                          name="pets" 
                          size={20} 
                          color={COLORS.darkPurple} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: FONTS.sizes.small,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.semiBold,
                          color: COLORS.secondaryText,
                          marginBottom: SPACING.xs,
                        }}>Type</Text>
                        <Text style={{
                          fontSize: FONTS.sizes.medium,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.medium,
                          color: COLORS.text,
                        }}>
                          {selectedPetDetails.petType ? 
                            (selectedPetDetails.petType === 'dog' ? '🐕 Dog' : '🐱 Cat') : 
                            'Unknown'
                          }
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: RADIUS.medium,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    borderLeftWidth: 4,
                    borderLeftColor: COLORS.mediumBlue,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: RADIUS.large,
                        backgroundColor: COLORS.cardBackground,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: SPACING.md,
                      }}>
                        <MaterialIcons 
                          name={selectedPetDetails.petGender === 'male' ? 'male' : 'female'} 
                          size={20} 
                          color={selectedPetDetails.petGender === 'male' ? '#2196F3' : '#E91E63'} 
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: FONTS.sizes.small,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.semiBold,
                          color: COLORS.secondaryText,
                          marginBottom: SPACING.xs,
                        }}>Gender</Text>
                        <Text style={{
                          fontSize: FONTS.sizes.medium,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.medium,
                          color: COLORS.text,
                        }}>
                          {selectedPetDetails.petGender ? 
                            (selectedPetDetails.petGender === 'male' ? '♂️ Male' : '♀️ Female') : 
                            'Unknown'
                          }
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: RADIUS.medium,
                    padding: SPACING.md,
                    marginBottom: SPACING.sm,
                    borderLeftWidth: 4,
                    borderLeftColor: COLORS.mediumBlue,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: RADIUS.large,
                        backgroundColor: COLORS.cardBackground,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: SPACING.md,
                      }}>
                        <MaterialIcons name="category" size={20} color="#FF9800" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{
                          fontSize: FONTS.sizes.small,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.semiBold,
                          color: COLORS.secondaryText,
                          marginBottom: SPACING.xs,
                        }}>Breed</Text>
                        <Text style={{
                          fontSize: FONTS.sizes.medium,
                          fontFamily: FONTS.family,
                          fontWeight: FONTS.weights.medium,
                          color: COLORS.text,
                        }}>{selectedPetDetails.breed || 'Unknown Breed'}</Text>
                      </View>
                    </View>
                  </View>

                  {selectedPetDetails.ownerFullName && (
                    <View style={{
                      backgroundColor: COLORS.inputBackground,
                      borderRadius: RADIUS.medium,
                      padding: SPACING.md,
                      marginBottom: SPACING.sm,
                      borderLeftWidth: 4,
                      borderLeftColor: COLORS.mediumBlue,
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: RADIUS.large,
                          backgroundColor: COLORS.cardBackground,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: SPACING.md,
                        }}>
                          <MaterialIcons name="person" size={20} color={COLORS.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: FONTS.sizes.small,
                            fontFamily: FONTS.family,
                            fontWeight: FONTS.weights.semiBold,
                            color: COLORS.secondaryText,
                            marginBottom: SPACING.xs,
                          }}>Owner</Text>
                          <Text style={{
                            fontSize: FONTS.sizes.medium,
                            fontFamily: FONTS.family,
                            fontWeight: FONTS.weights.medium,
                            color: COLORS.text,
                          }}>{selectedPetDetails.ownerFullName}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {selectedPetDetails.contactNumber && (
                    <View style={{
                      backgroundColor: COLORS.inputBackground,
                      borderRadius: RADIUS.medium,
                      padding: SPACING.md,
                      marginBottom: SPACING.sm,
                      borderLeftWidth: 4,
                      borderLeftColor: COLORS.mediumBlue,
                    }}>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <View style={{
                          width: 40,
                          height: 40,
                          borderRadius: RADIUS.large,
                          backgroundColor: COLORS.cardBackground,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: SPACING.md,
                        }}>
                          <MaterialIcons name="phone" size={20} color={COLORS.mediumBlue} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: FONTS.sizes.small,
                            fontFamily: FONTS.family,
                            fontWeight: FONTS.weights.semiBold,
                            color: COLORS.secondaryText,
                            marginBottom: SPACING.xs,
                          }}>Contact</Text>
                          <Text style={{
                            fontSize: FONTS.sizes.medium,
                            fontFamily: FONTS.family,
                            fontWeight: FONTS.weights.medium,
                            color: COLORS.text,
                          }}>{selectedPetDetails.contactNumber}</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                {/* Description Section */}
                {selectedPetDetails.description && (
                  <View style={{
                    margin: SPACING.lg,
                    padding: SPACING.md,
                    backgroundColor: COLORS.inputBackground,
                    borderRadius: RADIUS.medium,
                    borderLeftWidth: 4,
                    borderLeftColor: COLORS.darkPurple,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginBottom: SPACING.sm,
                    }}>
                      <MaterialIcons name="description" size={20} color={COLORS.darkPurple} />
                      <Text style={{
                        fontSize: FONTS.sizes.medium,
                        fontFamily: FONTS.family,
                        fontWeight: FONTS.weights.semiBold,
                        color: COLORS.text,
                        marginLeft: SPACING.sm,
                      }}>Description</Text>
                    </View>
                    <Text style={{
                      fontSize: FONTS.sizes.medium,
                      fontFamily: FONTS.family,
                      color: COLORS.text,
                      lineHeight: 22,
                    }}>{selectedPetDetails.description}</Text>
                  </View>
                )}

                {/* Registration Info */}
                {selectedPetDetails.createdAt && (
                  <View style={{
                    paddingHorizontal: SPACING.lg,
                    paddingBottom: SPACING.md,
                  }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="event" size={16} color={COLORS.secondaryText} />
                      <Text style={{
                        fontSize: FONTS.sizes.small,
                        fontFamily: FONTS.family,
                        color: COLORS.secondaryText,
                        marginLeft: SPACING.xs,
                      }}>
                        Registered {formatTimeAgo(selectedPetDetails.createdAt)}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={{
                padding: SPACING.lg,
                borderTopWidth: 1,
                borderTopColor: '#E5E5E5',
              }}>
                <TouchableOpacity
                  onPress={() => setSelectedPetDetails(null)}
                  style={{
                    borderRadius: RADIUS.medium,
                    paddingVertical: SPACING.md,
                    alignItems: 'center',
                    backgroundColor: COLORS.darkPurple,
                  }}
                >
                  <Text style={{
                    fontSize: FONTS.sizes.medium,
                    fontFamily: FONTS.family,
                    fontWeight: FONTS.weights.semiBold,
                    color: COLORS.white,
                  }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Report Details Modal */}
      {selectedReportDetails && (
        <Modal
          visible={!!selectedReportDetails}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedReportDetails(null)}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: 20 
          }}>
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              width: '100%',
              maxHeight: '85%',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10
            }}>
              {/* Header */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f5f9'
              }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1f2937' }}>
                  Report Details
                </Text>
                <TouchableOpacity
                  onPress={() => setSelectedReportDetails(null)}
                  style={{ padding: 8 }}
                >
                  <MaterialIcons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
                {/* Report Image */}
                {selectedReportDetails.imageUrl && (
                  <View style={{ marginBottom: 20, alignItems: 'center' }}>
                    <Image 
                      source={{ uri: selectedReportDetails.imageUrl }} 
                      style={{ 
                        width: '100%', 
                        height: 200, 
                        borderRadius: 16,
                        backgroundColor: '#f3f4f6'
                      }} 
                      resizeMode="cover"
                    />
                  </View>
                )}

                {/* Status Card */}
                <View style={{
                  backgroundColor: getStatusColor(selectedReportDetails.status) === COLORS.error ? '#fee2e2' :
                               getStatusColor(selectedReportDetails.status) === COLORS.warning ? '#fef3c7' : '#dbeafe',
                  padding: 16,
                  borderRadius: 12,
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: getStatusColor(selectedReportDetails.status)
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 8 }}>
                    Status: {selectedReportDetails.status || 'Stray'}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#374151' }}>
                    {selectedReportDetails.status === 'Found' ? 'This pet has been found and is safe!' :
                     selectedReportDetails.status === 'Reunited' ? 'This pet has been reunited with its owner!' :
                     selectedReportDetails.status === 'Lost' ? 'This pet is currently missing.' :
                     'This is a stray pet that needs help.'}
                  </Text>
                </View>

                {/* Location Information */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 }}>
                    Location
                  </Text>
                  <View style={{ backgroundColor: '#f9fafb', padding: 16, borderRadius: 12 }}>
                    <Text style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>
                      📍 {selectedReportDetails.locationName || 'Unknown Location'}
                    </Text>
                    {selectedReportDetails.coordinates && (
                      <Text style={{ fontSize: 14, color: '#6b7280' }}>
                        Coordinates: {selectedReportDetails.coordinates.latitude.toFixed(6)}, {selectedReportDetails.coordinates.longitude.toFixed(6)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Description */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 }}>
                    Description
                  </Text>
                  <Text style={{ fontSize: 16, color: '#374151', lineHeight: 24 }}>
                    {selectedReportDetails.description || 'No description provided'}
                  </Text>
                </View>

                {/* Reporter Information */}
                {selectedReportDetails.reporterName && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 }}>
                      Reporter Information
                    </Text>
                    <View style={{ backgroundColor: '#f9fafb', padding: 16, borderRadius: 12 }}>
                      <Text style={{ fontSize: 16, color: '#374151', marginBottom: 8 }}>
                        <Text style={{ fontWeight: '700' }}>Name:</Text> {selectedReportDetails.reporterName}
                      </Text>
                      {selectedReportDetails.reporterContact && (
                        <Text style={{ fontSize: 16, color: '#374151' }}>
                          <Text style={{ fontWeight: '700' }}>Contact:</Text> {selectedReportDetails.reporterContact}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Report Date */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 12 }}>
                    Report Date
                  </Text>
                  <Text style={{ fontSize: 16, color: '#374151' }}>
                    {selectedReportDetails.reportTime ? formatTimeAgo(selectedReportDetails.reportTime) : 'Unknown'}
                  </Text>
                </View>
              </ScrollView>

              {/* Footer */}
              <View style={{
                padding: 20,
                borderTopWidth: 1,
                borderTopColor: '#f1f5f9',
                flexDirection: 'row',
                justifyContent: 'flex-end'
              }}>
                <TouchableOpacity 
                  onPress={() => setSelectedReportDetails(null)}
                  style={{
                    backgroundColor: '#1f2937',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 12
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};



export default HomeTabScreen; 