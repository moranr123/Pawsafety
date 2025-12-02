import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  Alert,
  Dimensions,
  Platform,
  Animated,
  StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { auth, db } from '../../services/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileImage } from '../../contexts/ProfileImageContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import UserManualModal from '../../components/UserManualModal';
import PostCard from '../../components/PostCard';
import NotificationService from '../../services/NotificationService';
import { logUserActivity } from '../../services/userService';

const HomeTabScreen = ({ navigation }) => {
  const user = auth.currentUser;
  const { colors: COLORS } = useTheme();
  const { setIsVisible } = useTabBarVisibility();
  const { profileImage } = useProfileImage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [appNotifs, setAppNotifs] = useState([]);
  const [petNotifs, setPetNotifs] = useState([]);
  const [transferNotifs, setTransferNotifs] = useState([]);
  const [registrationNotifs, setRegistrationNotifs] = useState([]);
  const [incidentNotifs, setIncidentNotifs] = useState([]);
  const [foundPetNotifs, setFoundPetNotifs] = useState([]);
  const [socialNotifs, setSocialNotifs] = useState([]);
  const [friendRequestNotifs, setFriendRequestNotifs] = useState([]);
  const [friendRequestAcceptedNotifs, setFriendRequestAcceptedNotifs] = useState([]);
  const [announcementNotifs, setAnnouncementNotifs] = useState([]);
  const [adminActionNotifs, setAdminActionNotifs] = useState([]);
  const [notifFilter, setNotifFilter] = useState('All'); // All | Applications | Pets | Transfers | Registration | Incidents | Strays | Found Pets | Social | Friend Requests | Announcements | Admin Actions
  const [notifMenu, setNotifMenu] = useState(null); // { type: 'app'|'pet', id: string } | null
  const [showBanner, setShowBanner] = useState(false);
  const [bannerCounts, setBannerCounts] = useState({ apps: 0, pets: 0, transfers: 0, registrations: 0, incidents: 0, strays: 0 });
  const [selectedNotif, setSelectedNotif] = useState(null); // { id, type, ts, title, sub, data }
  const [selectedPetDetails, setSelectedPetDetails] = useState(null);
  const [selectedReportDetails, setSelectedReportDetails] = useState(null);
  const [hiddenAppIds, setHiddenAppIds] = useState(new Set());
  const [hiddenPetIds, setHiddenPetIds] = useState(new Set());
  const [hiddenTransferIds, setHiddenTransferIds] = useState(new Set());
  const [hiddenRegistrationIds, setHiddenRegistrationIds] = useState(new Set());
  const [hiddenIncidentIds, setHiddenIncidentIds] = useState(new Set());
  const [hiddenFoundPetIds, setHiddenFoundPetIds] = useState(new Set());
  const [hiddenFriendRequestIds, setHiddenFriendRequestIds] = useState(new Set());
  const [hiddenAdminActionIds, setHiddenAdminActionIds] = useState(new Set());
  const [lastReadUpdate, setLastReadUpdate] = useState(0);
  const [userManualVisible, setUserManualVisible] = useState(false);
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProfilesExpanded, setIsProfilesExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const historyDropdownAnim = useRef(new Animated.Value(0)).current;
  const profilesDropdownAnim = useRef(new Animated.Value(0)).current;
  const [posts, setPosts] = useState([]);
  const [hiddenPostIds, setHiddenPostIds] = useState(new Set());
  const [scrollToPostId, setScrollToPostId] = useState(null);
  const scrollViewRef = useRef(null);
  const postRefs = useRef({});
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);
  const [friends, setFriends] = useState([]); // Array of friend IDs
  const [announcements, setAnnouncements] = useState([]); // Announcements from admin

  const handleScroll = (event) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDifference = currentScrollY - lastScrollY.current;
    
    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Hide tab bar when scrolling down, show when scrolling up or at top
    if (currentScrollY <= 0) {
      // At top, always show
      setIsVisible(true);
    } else if (scrollDifference > 5) {
      // Scrolling down, hide
      setIsVisible(false);
    } else if (scrollDifference < -5) {
      // Scrolling up, show
      setIsVisible(true);
    }

    lastScrollY.current = currentScrollY;

    // Show tab bar after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      setIsVisible(true);
    }, 150);
  };

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Dynamic responsive calculations
  const currentWidth = screenData.width;
  const currentHeight = screenData.height;
  const isSmallDevice = currentWidth < 375 || currentHeight < 667;
  const isTablet = currentWidth > 768;
  const wp = (percentage) => (currentWidth * percentage) / 100;
  const hp = (percentage) => (currentHeight * percentage) / 100;

  // Check if user should see manual today (once per day per account)
  useEffect(() => {
    const checkDailyUserManual = async () => {
      try {
        if (!user) return; // No user logged in

        // Use user-specific storage key
        const storageKey = `PAW_USER_MANUAL_LAST_SHOWN_${user.uid}`;
        const lastShownDate = await AsyncStorage.getItem(storageKey);
        const today = new Date().toDateString(); // Get current date as string (e.g., "Mon Oct 18 2025")
        
        // Show manual if it hasn't been shown today for this user
        if (lastShownDate !== today) {
          setUserManualVisible(true);
        }
      } catch (error) {
        // Error handled silently
      }
    };
    
    checkDailyUserManual();
  }, [user]);

  // Handle user manual close and mark as shown for today
  const handleUserManualClose = async () => {
    try {
      if (!user) {
        setUserManualVisible(false);
        return;
      }

      const today = new Date().toDateString();
      const storageKey = `PAW_USER_MANUAL_LAST_SHOWN_${user.uid}`;
      await AsyncStorage.setItem(storageKey, today);
      setUserManualVisible(false);
    } catch (error) {
      // Error handled silently
      setUserManualVisible(false);
    }
  };

  // Load hidden notifications from storage
  useEffect(() => {
    (async () => {
      try {
        const [appJson, petJson, transferJson, registrationJson, incidentJson, foundPetJson, friendRequestJson] = await Promise.all([
          AsyncStorage.getItem('PAW_HIDDEN_APP_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_PET_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_TRANSFER_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_REGISTRATION_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_INCIDENT_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_FOUND_PET_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_FRIEND_REQUEST_NOTIFS'),
          AsyncStorage.getItem('PAW_HIDDEN_ADMIN_ACTION_NOTIFS'),
        ]);
        if (appJson) setHiddenAppIds(new Set(JSON.parse(appJson)));
        if (petJson) setHiddenPetIds(new Set(JSON.parse(petJson)));
        if (transferJson) setHiddenTransferIds(new Set(JSON.parse(transferJson)));
        if (registrationJson) setHiddenRegistrationIds(new Set(JSON.parse(registrationJson)));
        if (incidentJson) setHiddenIncidentIds(new Set(JSON.parse(incidentJson)));
        if (foundPetJson) setHiddenFoundPetIds(new Set(JSON.parse(foundPetJson)));
        if (friendRequestJson) setHiddenFriendRequestIds(new Set(JSON.parse(friendRequestJson)));
      } catch (_) {}
    })();
  }, []);

  const persistHiddenSets = async (nextAppSet, nextPetSet, nextTransferSet, nextRegistrationSet, nextIncidentSet, nextFoundPetSet, nextFriendRequestSet, nextAdminActionSet) => {
    try {
      await Promise.all([
        AsyncStorage.setItem('PAW_HIDDEN_APP_NOTIFS', JSON.stringify(Array.from(nextAppSet || hiddenAppIds))),
        AsyncStorage.setItem('PAW_HIDDEN_PET_NOTIFS', JSON.stringify(Array.from(nextPetSet || hiddenPetIds))),
        AsyncStorage.setItem('PAW_HIDDEN_TRANSFER_NOTIFS', JSON.stringify(Array.from(nextTransferSet || hiddenTransferIds))),
        AsyncStorage.setItem('PAW_HIDDEN_REGISTRATION_NOTIFS', JSON.stringify(Array.from(nextRegistrationSet || hiddenRegistrationIds))),
        AsyncStorage.setItem('PAW_HIDDEN_INCIDENT_NOTIFS', JSON.stringify(Array.from(nextIncidentSet || hiddenIncidentIds))),
        AsyncStorage.setItem('PAW_HIDDEN_FOUND_PET_NOTIFS', JSON.stringify(Array.from(nextFoundPetSet || hiddenFoundPetIds))),
        AsyncStorage.setItem('PAW_HIDDEN_FRIEND_REQUEST_NOTIFS', JSON.stringify(Array.from(nextFriendRequestSet || hiddenFriendRequestIds))),
        AsyncStorage.setItem('PAW_HIDDEN_ADMIN_ACTION_NOTIFS', JSON.stringify(Array.from(nextAdminActionSet || hiddenAdminActionIds))),
      ]);
    } catch (_) {}
  };

  const handleDeleteNotif = (type, id) => {
    if (type === 'app') {
      setAppNotifs((prev) => prev.filter((a) => a.id !== id));
      setHiddenAppIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(next, null, null, null, null, null);
        return next;
      });
    } else if (type === 'transfer') {
      setTransferNotifs((prev) => prev.filter((t) => t.id !== id));
      setHiddenTransferIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, next, null, null, null);
        return next;
      });
    } else if (type === 'registration') {
      setRegistrationNotifs((prev) => prev.filter((r) => r.id !== id));
      setHiddenRegistrationIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, next, null, null);
        return next;
      });
    } else if (type === 'incident') {
      setIncidentNotifs((prev) => prev.filter((i) => i.id !== id));
      setHiddenIncidentIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, next, null);
        return next;
      });
    } else if (type === 'found_pet') {
      setFoundPetNotifs((prev) => prev.filter((f) => f.id !== id));
      setHiddenFoundPetIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, null, next, null);
        return next;
      });
    } else if (type === 'friend_request') {
      setFriendRequestNotifs((prev) => prev.filter((fr) => fr.id !== id));
      setHiddenFriendRequestIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, null, null, next);
        return next;
      });
    } else if (type === 'friend_request_accepted') {
      setFriendRequestAcceptedNotifs((prev) => prev.filter((fra) => fra.id !== id));
      setHiddenFriendRequestIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, null, null, next);
        return next;
      });
    } else if (type === 'admin_action') {
      setAdminActionNotifs((prev) => prev.filter((aa) => aa.id !== id));
      setHiddenAdminActionIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, null, null, null, null, null, null, next);
        return next;
      });
    } else {
      setPetNotifs((prev) => prev.filter((p) => p.id !== id));
      setHiddenPetIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistHiddenSets(null, next, null, null, null, null);
        return next;
      });
    }
    setNotifMenu(null);
  };
    const notifCount = Math.min(99, (appNotifs?.length || 0) + (petNotifs?.length || 0) + (transferNotifs?.length || 0) + (registrationNotifs?.length || 0) + (foundPetNotifs?.length || 0) + (friendRequestNotifs?.length || 0) + (friendRequestAcceptedNotifs?.length || 0) + (announcementNotifs?.length || 0) + (adminActionNotifs?.length || 0));
  
  // Combine and sort announcements and posts by date (newest first)
  const combinedFeed = useMemo(() => {
    // Get LogoBlue image URI
    const logoSource = require('../../assets/LogoBlue.png');
    let logoUri = null;
    try {
      const resolved = RNImage.resolveAssetSource(logoSource);
      logoUri = resolved?.uri || null;
    } catch (error) {
      console.error('Error loading LogoBlue:', error);
    }

    // Convert announcements to post format
    const announcementPosts = announcements.map((announcement) => {
      const postText = announcement.title 
        ? `${announcement.title}${announcement.message ? '\n\n' + announcement.message : ''}`
        : announcement.message || '';
      
      return {
        id: `announcement_${announcement.id}`,
        userId: announcement.createdById || 'pawsafety_admin',
        userName: 'Pawsafety',
        userProfileImage: logoUri,
        text: postText || 'Announcement',
        images: announcement.imageUrl ? [announcement.imageUrl] : [],
        createdAt: announcement.createdAt || new Date(),
        likes: [],
        shares: 0,
        isAnnouncement: true,
        title: announcement.title,
        deleted: false
      };
    });

    // Combine announcements and posts, filter hidden/deleted, and sort by date
    const allPosts = [...announcementPosts, ...posts]
      .filter(post => !hiddenPostIds.has(post.id) && !post.deleted)
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

    return allPosts;
  }, [announcements, posts, hiddenPostIds]);

  const notifUnreadCount = useMemo(() => {
    try {
      const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
      const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
      const lastTransfer = (() => { try { return Number((globalThis.__PAW_LAST_TRANSFER__) || 0); } catch (_) { return 0; } })();
      const lastRegistration = (() => { try { return Number((globalThis.__PAW_LAST_REGISTRATION__) || 0); } catch (_) { return 0; } })();
      const lastIncident = (() => { try { return Number((globalThis.__PAW_LAST_INCIDENT__) || 0); } catch (_) { return 0; } })();
      const lastStray = (() => { try { return Number((globalThis.__PAW_LAST_STRAY__) || 0); } catch (_) { return 0; } })();
      const lastFoundPet = (() => { try { return Number((globalThis.__PAW_LAST_FOUND_PET__) || 0); } catch (_) { return 0; } })();
      
      const unreadApp = (appNotifs || []).filter((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp).length;
      const unreadPet = (petNotifs || []).filter((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet).length;
      const unreadTransfer = (transferNotifs || []).filter((t) => (t.createdAt?.toDate ? t.createdAt.toDate().getTime() : 0) > lastTransfer).length;
      const unreadRegistration = (registrationNotifs || []).filter((r) => (r.createdAt?.toDate ? r.createdAt.toDate().getTime() : 0) > lastRegistration).length;
      const unreadIncident = (incidentNotifs || []).filter((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident).length;
      const unreadFoundPet = (foundPetNotifs || []).filter((f) => {
        const createdAt = f.createdAt ? (typeof f.createdAt === 'string' ? new Date(f.createdAt).getTime() : f.createdAt.toDate ? f.createdAt.toDate().getTime() : 0) : 0;
        return createdAt > lastFoundPet;
      }).length;
      const lastFriendRequest = (() => { try { return Number((globalThis.__PAW_LAST_FRIEND_REQUEST__) || 0); } catch (_) { return 0; } })();
      const unreadFriendRequest = (friendRequestNotifs || []).filter((fr) => {
        const createdAt = fr.createdAt ? (typeof fr.createdAt === 'string' ? new Date(fr.createdAt).getTime() : fr.createdAt.toDate ? fr.createdAt.toDate().getTime() : 0) : 0;
        return createdAt > lastFriendRequest && !fr.read;
      }).length;
      const unreadFriendRequestAccepted = (friendRequestAcceptedNotifs || []).filter((fra) => !fra.read).length;
      const unreadSocial = (socialNotifs || []).filter((s) => !s.read).length;
      
      return Math.min(99, unreadApp + unreadPet + unreadTransfer + unreadRegistration + unreadIncident + unreadFoundPet + unreadSocial + unreadFriendRequest + unreadFriendRequestAccepted);
    } catch (e) {
      return 0;
    }
  }, [appNotifs, petNotifs, transferNotifs, registrationNotifs, incidentNotifs, socialNotifs, announcementNotifs, lastReadUpdate]);

  useEffect(() => {
    setLoading(false);
  }, []);

  // Load hidden posts from AsyncStorage
  useEffect(() => {
    const loadHiddenPosts = async () => {
      try {
        const hiddenPosts = await AsyncStorage.getItem('hidden_posts');
        if (hiddenPosts) {
          const hiddenArray = JSON.parse(hiddenPosts);
          setHiddenPostIds(new Set(hiddenArray));
        }
      } catch (error) {
        // Error handled silently
      }
    };
    loadHiddenPosts();
  }, []);

  // Fetch friends list
  useEffect(() => {
    if (!user?.uid) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      friendsQuery,
      (snapshot) => {
        const friendsList = snapshot.docs.map(doc => doc.data().friendId);
        setFriends(friendsList);
      },
      (error) => {
        console.error('Error fetching friends:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Fetch posts from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const postsData = snapshot.docs
          .map(doc => ({
          id: doc.id,
          ...doc.data()
          }))
          .filter(post => {
            // Filter out deleted posts
            if (post.deleted) return false;
            
            // Only show posts from friends or own posts
            const isOwnPost = post.userId === user.uid;
            const isFriendPost = friends.includes(post.userId);
            
            return isOwnPost || isFriendPost;
          });
        setPosts(postsData);
      },
      (error) => {
        // Error handled silently
      }
    );

    return () => unsubscribe();
  }, [user?.uid, friends]);

  // Fetch announcements
  useEffect(() => {
    if (!user?.uid) return;

    // Try query with where and orderBy first, fallback to just orderBy if index missing
    let announcementsQuery;
    try {
      announcementsQuery = query(
        collection(db, 'announcements'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
    } catch (error) {
      // If index error, try without where clause and filter client-side
      console.log('Index error, using fallback query');
      announcementsQuery = query(
        collection(db, 'announcements'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        const announcementsData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(announcement => {
            // Filter active announcements (client-side if index missing)
            return announcement.isActive !== false;
          })
          .sort((a, b) => {
            // Sort by createdAt descending
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 10); // Limit to 10 most recent
        
        console.log('✅ Announcements fetched:', announcementsData.length);
        if (announcementsData.length > 0) {
          console.log('📢 Sample announcement:', {
            id: announcementsData[0].id,
            title: announcementsData[0].title,
            hasImage: !!announcementsData[0].imageUrl
          });
        }
        setAnnouncements(announcementsData);
      },
      (error) => {
        console.error('❌ Error fetching announcements:', error);
        console.error('Error code:', error.code, 'Error message:', error.message);
        setAnnouncements([]);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Scroll to specific post when scrollToPostId is set
  useEffect(() => {
    if (scrollToPostId && scrollViewRef.current) {
      // Wait for posts to render, then try to scroll
      setTimeout(() => {
        const postIndex = posts.findIndex(p => p.id === scrollToPostId && !hiddenPostIds.has(p.id) && !p.deleted);
        if (postIndex !== -1 && postRefs.current[scrollToPostId]) {
          postRefs.current[scrollToPostId]?.measureLayout(
            scrollViewRef.current,
            (x, y) => {
              scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
              setScrollToPostId(null);
            },
            () => {
              // If measure fails, try alternative approach - scroll to approximate position
              // Estimate position based on post index (rough estimate)
              const estimatedY = postIndex * 400; // Rough estimate of post height
              scrollViewRef.current?.scrollTo({ y: Math.max(0, estimatedY - 100), animated: true });
              setScrollToPostId(null);
            }
          );
        } else {
          // Post not found or already scrolled past, clear the state
          setScrollToPostId(null);
        }
      }, 500);
    }
  }, [scrollToPostId, posts, hiddenPostIds]);

  // Notifications sources - Optimized with limits and server-side filtering
  useEffect(() => {
    if (!user?.uid) {
      setAppNotifs([]);
      setTransferNotifs([]);
      setRegistrationNotifs([]);
      setIncidentNotifs([]);
      return;
    }

    const unsubscribers = [];

    // Adoption application updates - ADD LIMIT to reduce reads
      const appsQ = query(
        collection(db, 'adoption_applications'),
        where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20) // CRITICAL: Limit at query level, not after fetch
      );
    unsubscribers.push(
      onSnapshot(appsQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAppNotifs(items);
      })
    );

    // New adoptable pets - Filter server-side when possible
    // Note: If readyForAdoption field doesn't exist for all docs, we still filter client-side
    const petsQ = query(
      collection(db, 'adoptable_pets'),
      orderBy('createdAt', 'desc'),
      limit(20) // Limit at query level first
    );
    unsubscribers.push(
      onSnapshot(petsQ, (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.readyForAdoption !== false)
          .slice(0, 20); // Additional slice for safety
        setPetNotifs(items);
      })
    );

    // Transfer notifications - Combine with limit
      const transferQ = query(
        collection(db, 'user_notifications'),
        where('userId', '==', user.uid),
        where('type', '==', 'pet_transfer'),
      orderBy('createdAt', 'desc'),
      limit(20)
      );
    unsubscribers.push(
      onSnapshot(transferQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTransferNotifs(items);
      })
    );

    // Pet registration status notifications
      const registrationQ = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('type', 'in', ['pet_registration_approved', 'pet_registration_rejected']),
      orderBy('createdAt', 'desc'),
      limit(20)
      );
    unsubscribers.push(
      onSnapshot(registrationQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRegistrationNotifs(items);
      })
    );

    // Incident report notifications
      const incidentQ = query(
        collection(db, 'user_notifications'),
        where('userId', '==', user.uid),
        where('type', 'in', ['incident_resolved', 'incident_declined', 'stray_resolved', 'stray_declined']),
      orderBy('createdAt', 'desc'),
      limit(20)
      );
    unsubscribers.push(
      onSnapshot(incidentQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setIncidentNotifs(items);
      })
    );

    // Found pet notifications
    const foundPetQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'found_pet'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribers.push(
      onSnapshot(foundPetQ, (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFoundPetNotifs(items);
      })
    );

    // Social notifications (post likes, comment likes, comments, replies)
    const socialQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', 'in', ['post_like', 'comment_like', 'post_comment', 'comment_reply']),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    unsubscribers.push(
      onSnapshot(socialQ, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            type: 'social',
            socialType: data.type, // Store original type (post_like, comment_like, etc.)
            ts: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
            title: data.title || '',
            sub: data.body || '',
            data: data.data || {},
            read: data.read || false,
          };
        });
        setSocialNotifs(items);
      })
    );

    // Friend request notifications
    const friendRequestQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'friend_request'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribers.push(
      onSnapshot(friendRequestQ, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            type: 'friend_request',
            ts: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
            title: data.title || 'New Friend Request',
            sub: data.body || '',
            data: data.data || {},
            read: data.read || false,
          };
        });
        setFriendRequestNotifs(items);
      })
    );

    // Friend request accepted notifications
    const friendRequestAcceptedQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'friend_request_accepted'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribers.push(
      onSnapshot(friendRequestAcceptedQ, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            type: 'friend_request_accepted',
            ts: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
            title: data.title || 'Friend Request Accepted',
            sub: data.body || '',
            data: data.data || {},
            read: data.read || false,
          };
        });
        setFriendRequestAcceptedNotifs(items);
      })
    );

    // Announcement notifications
    const announcementNotifQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'announcement'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribers.push(
      onSnapshot(announcementNotifQ, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            type: 'announcement',
            ts: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
            title: data.title || 'New Announcement',
            sub: data.body || data.message || '',
            read: data.read || false,
            announcementId: data.announcementId || null,
          };
        });
        setAnnouncementNotifs(items);
      })
    );

    // Admin action notifications (report updates)
    const adminActionNotifQ = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('type', '==', 'admin_action'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    unsubscribers.push(
      onSnapshot(adminActionNotifQ, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            type: 'admin_action',
            ts: data.createdAt?.toDate ? data.createdAt.toDate().getTime() : (data.createdAt ? new Date(data.createdAt).getTime() : Date.now()),
            title: data.title || 'Admin Action',
            sub: data.body || '',
            read: data.read || false,
            data: data.data || {},
          };
        });
        setAdminActionNotifs(items);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
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
        const straysNew = (incidentNotifs || []).filter((i) => i.type && i.type.includes('stray') && (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident).length;
        setBannerCounts({ apps: appsNew, pets: petsNew, transfers: transfersNew, registrations: registrationsNew, incidents: incidentsNew, strays: straysNew });
        // setShowBanner((appsNew + petsNew + transfersNew + registrationsNew + incidentsNew + straysNew) > 0); // Disabled for push notifications only
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
      
      // Update global timestamps for badge calculation
      globalThis.__PAW_LAST_APP__ = latestApp;
      globalThis.__PAW_LAST_PET__ = latestPet;
      globalThis.__PAW_LAST_TRANSFER__ = latestTransfer;
      globalThis.__PAW_LAST_REGISTRATION__ = latestRegistration;
      globalThis.__PAW_LAST_INCIDENT__ = latestIncident;
      
      setLastReadUpdate(Date.now()); // Trigger badge recalculation
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
      
      try { 
        globalThis.__PAW_LAST_APP__ = latestApp; 
        globalThis.__PAW_LAST_PET__ = latestPet; 
        globalThis.__PAW_LAST_TRANSFER__ = latestTransfer; 
        globalThis.__PAW_LAST_REGISTRATION__ = latestRegistration; 
        globalThis.__PAW_LAST_INCIDENT__ = latestIncident;
        globalThis.__PAW_LAST_STRAY__ = latestStray;
        setLastReadUpdate(Date.now()); // Trigger badge recalculation
      } catch (_) {}
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
              persistHiddenSets(allIds, null, null, null, null, null);
              return [];
            });
            setPetNotifs((prev) => {
              const allIds = new Set(hiddenPetIds);
              for (const p of prev) allIds.add(p.id);
              setHiddenPetIds(allIds);
              persistHiddenSets(null, allIds, null, null, null, null);
              return [];
            });
            setRegistrationNotifs((prev) => {
              const allIds = new Set(hiddenRegistrationIds);
              for (const r of prev) allIds.add(r.id);
              setHiddenRegistrationIds(allIds);
              persistHiddenSets(null, null, null, allIds, null, null);
              return [];
            });
            setIncidentNotifs((prev) => {
              const allIds = new Set(hiddenIncidentIds);
              for (const i of prev) allIds.add(i.id);
              setHiddenIncidentIds(allIds);
              persistHiddenSets(null, null, null, null, allIds, null);
              return [];
            });
            setFoundPetNotifs((prev) => {
              const allIds = new Set(hiddenFoundPetIds);
              for (const f of prev) allIds.add(f.id);
              setHiddenFoundPetIds(allIds);
              persistHiddenSets(null, null, null, null, null, allIds, null);
              return [];
            });
            setFriendRequestNotifs((prev) => {
              const allIds = new Set(hiddenFriendRequestIds);
              for (const fr of prev) allIds.add(fr.id);
              setHiddenFriendRequestIds(allIds);
              persistHiddenSets(null, null, null, null, null, null, allIds);
              return [];
            });
            setFriendRequestAcceptedNotifs((prev) => {
              const allIds = new Set(hiddenFriendRequestIds);
              for (const fra of prev) allIds.add(fra.id);
              setHiddenFriendRequestIds(allIds);
              persistHiddenSets(null, null, null, null, null, null, allIds);
              return [];
            });
          },
        },
      ]
    );
  };

  const markNotificationAsRead = async (notif) => {
    try {
      // Handle social, friend request, announcement, and admin action notifications differently - mark as read in Firestore
      if (notif.type === 'social' || notif.type === 'friend_request' || notif.type === 'friend_request_accepted' || notif.type === 'announcement' || notif.type === 'admin_action') {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.markNotificationAsRead(notif.id);
          setLastReadUpdate(Date.now());
        } catch (error) {
          // Error handled silently
        }
        if (notif.type === 'friend_request' || notif.type === 'friend_request_accepted') {
          // Also update the last seen timestamp
          const ts = Number(notif.ts || 0);
          await AsyncStorage.setItem('PAW_LAST_SEEN_FRIEND_REQUEST_NOTIF', String(ts));
          try {
            globalThis.__PAW_LAST_FRIEND_REQUEST__ = ts;
          } catch (_) {}
        }
        return;
      }

      const key = notif.type === 'app' ? 'PAW_LAST_SEEN_APP_NOTIF' : 
                  notif.type === 'transfer' ? 'PAW_LAST_SEEN_TRANSFER_NOTIF' :
                  notif.type === 'registration' ? 'PAW_LAST_SEEN_REGISTRATION_NOTIF' :
                  notif.type === 'incident' ? 'PAW_LAST_SEEN_INCIDENT_NOTIF' :
                  notif.type === 'found_pet' ? 'PAW_LAST_SEEN_FOUND_PET_NOTIF' :
                  notif.type === 'friend_request' || notif.type === 'friend_request_accepted' ? 'PAW_LAST_SEEN_FRIEND_REQUEST_NOTIF' :
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
          else if (notif.type === 'found_pet') globalThis.__PAW_LAST_FOUND_PET__ = ts;
          else if (notif.type === 'friend_request' || notif.type === 'friend_request_accepted') globalThis.__PAW_LAST_FRIEND_REQUEST__ = ts;
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
      height: 40,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: FONTS.family,
      fontWeight: '700',
      color: '#050505',
      marginLeft: 8,
    },
    headerCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 8,
      height: 36,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchText: {
      fontSize: 15,
      color: '#65676b',
      flex: 1,
    },
    headerIcons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    profileImage: {
      width: 24,
      height: 24,
      borderRadius: 12,
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
    petsSection: {
      backgroundColor: COLORS.golden,
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
    announcementCard: {
      backgroundColor: COLORS.cardBackground,
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
      borderRadius: RADIUS.medium,
      padding: SPACING.md,
      ...SHADOWS.medium,
      borderLeftWidth: 4,
      borderLeftColor: COLORS.darkPurple,
    },
    announcementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    announcementIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: COLORS.lightPurple,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    announcementHeaderText: {
      flex: 1,
    },
    announcementTitle: {
      fontSize: FONTS.sizes.medium,
      fontFamily: FONTS.family,
      fontWeight: FONTS.weights.bold,
      color: COLORS.darkPurple,
      marginBottom: 2,
    },
    announcementDate: {
      fontSize: FONTS.sizes.xsmall,
      fontFamily: FONTS.family,
      color: COLORS.secondaryText,
    },
    announcementMessage: {
      fontSize: FONTS.sizes.small,
      fontFamily: FONTS.family,
      color: COLORS.text,
      lineHeight: 20,
      marginTop: SPACING.xs,
    },
    createPostCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      marginBottom: SPACING.sm,
      borderRadius: 10,
      padding: 12,
      ...SHADOWS.light,
    },
    createPostHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    createPostProfileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 8,
    },
    createPostProfilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#e4e6eb',
    },
    createPostInput: {
      flex: 1,
      backgroundColor: '#f0f2f5',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      justifyContent: 'center',
      minHeight: 40,
    },
    createPostPlaceholder: {
      fontSize: 15,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    createPostActions: {
      flexDirection: 'row',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    createPostActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
    },
    createPostActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#65676b',
      marginLeft: 8,
      fontFamily: FONTS.family,
    },
    quickActionsCard: {
      backgroundColor: '#ffffff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: 10,
      padding: SPACING.md,
      flexDirection: 'row',
      justifyContent: 'space-around',
      ...SHADOWS.light,
    },
    quickActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: 8,
      flex: 1,
      justifyContent: 'center',
      marginHorizontal: SPACING.xs,
    },
    quickActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    quickActionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      fontFamily: FONTS.family,
    },
  }), [COLORS]);



  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Left: Menu Icon */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => {
              setSidebarVisible(true);
              setIsHistoryExpanded(false);
              setIsProfilesExpanded(false);
              historyDropdownAnim.setValue(0);
              profilesDropdownAnim.setValue(0);
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }}
          >
            <MaterialIcons name="menu" size={24} color="#050505" />
          </TouchableOpacity>
          
          {/* Right: Notification Icon */}
          <View style={styles.headerIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={updateLastSeenAndOpen}
            >
              <MaterialIcons name="notifications" size={20} color="#050505" />
              {!!notifUnreadCount && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notifUnreadCount > 9 ? '9+' : notifUnreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* Banner removed for push notifications only */}

      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
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
      >
        {/* Create Post Field */}
        <View style={styles.createPostCard}>
          <View style={styles.createPostHeader}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.createPostProfileImage}
              />
            ) : (
              <View style={styles.createPostProfilePlaceholder}>
                <MaterialIcons name="account-circle" size={40} color="#65676b" />
              </View>
            )}
            <TouchableOpacity 
              style={styles.createPostInput}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <Text style={styles.createPostPlaceholder}>
                What's on your mind?
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.createPostActions}>
            <TouchableOpacity 
              style={styles.createPostActionButton}
              onPress={() => navigation.navigate('CreatePost')}
            >
              <MaterialIcons name="photo-library" size={24} color="#45bd62" />
              <Text style={styles.createPostActionText}>Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('RegisterPet')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#e3f2fd' }]}>
              <MaterialIcons name="pets" size={24} color="#1976d2" />
            </View>
            <Text style={styles.quickActionText}>Register Pet</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => navigation.navigate('StrayReport')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#fff3e0' }]}>
              <MaterialIcons name="report" size={24} color="#f57c00" />
            </View>
            <Text style={styles.quickActionText}>File a Report</Text>
          </TouchableOpacity>
        </View>

        {/* Combined Feed: Announcements + Posts (sorted by date, newest first) */}
        {combinedFeed.map((post) => (
          <View
            key={post.id}
            ref={(ref) => {
              if (ref) {
                postRefs.current[post.id] = ref;
              } else {
                delete postRefs.current[post.id];
              }
            }}
          >
            <PostCard
              post={post}
              onPostDeleted={(postId) => {
                if (postId.startsWith('announcement_')) {
                  // Announcements can't be deleted by users
                  return;
                }
                setPosts(prev => prev.filter(p => p.id !== postId));
              }}
              onPostHidden={(postId) => {
                setHiddenPostIds(prev => new Set([...prev, postId]));
              }}
            />
          </View>
        ))}
        
        {combinedFeed.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#65676b', textAlign: 'center' }}>
              No posts yet. Be the first to share something!
            </Text>
          </View>
        )}

      </ScrollView>

      {/* Sidebar */}
      {sidebarVisible && (
        <>
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1000,
            }}
            activeOpacity={1}
            onPress={() => {
              Animated.timing(slideAnim, {
                toValue: -300,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setSidebarVisible(false);
                setIsHistoryExpanded(false);
                setIsProfilesExpanded(false);
                historyDropdownAnim.setValue(0);
                profilesDropdownAnim.setValue(0);
              });
            }}
          />
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              backgroundColor: '#ffffff',
              zIndex: 1001,
              shadowColor: '#000',
              shadowOffset: { width: 2, height: 0 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
              transform: [{ translateX: slideAnim }],
            }}
          >
            <View style={{ paddingTop: 60, paddingHorizontal: 20 }}>
              {/* Sidebar Header */}
              <View style={{ marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#1f2937' }}>Menu</Text>
              </View>

              {/* Sidebar Items */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                onPress={() => {
                  Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setSidebarVisible(false);
                  });
                  navigation.navigate('AddFriends');
                }}
              >
                <MaterialIcons name="person-add" size={24} color={COLORS.darkPurple} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 }}>
                  Add Friends
                </Text>
              </TouchableOpacity>

              {/* Profiles Dropdown */}
              <View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    setIsProfilesExpanded(!isProfilesExpanded);
                    Animated.timing(profilesDropdownAnim, {
                      toValue: isProfilesExpanded ? 0 : 1,
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialIcons name="account-circle" size={24} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 }}>
                      Profiles
                    </Text>
                  </View>
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: profilesDropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      }],
                    }}
                  >
                    <MaterialIcons name="keyboard-arrow-down" size={24} color="#6b7280" />
                  </Animated.View>
                </TouchableOpacity>

                {/* Sub-items */}
                <Animated.View
                  style={{
                    overflow: 'hidden',
                    maxHeight: profilesDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    }),
                    opacity: profilesDropdownAnim,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      paddingLeft: 52,
                      borderRadius: 8,
                      marginBottom: 4,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      Animated.timing(slideAnim, {
                        toValue: -300,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        setSidebarVisible(false);
                      });
                      navigation.navigate('MyPets');
                    }}
                  >
                    <MaterialIcons name="pets" size={20} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#4b5563', marginLeft: 16 }}>
                      My Pets Profile
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      paddingLeft: 52,
                      borderRadius: 8,
                      marginBottom: 8,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      Animated.timing(slideAnim, {
                        toValue: -300,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        setSidebarVisible(false);
                      });
                      navigation.navigate('Profile');
                    }}
                  >
                    <MaterialIcons name="account-circle" size={20} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#4b5563', marginLeft: 16 }}>
                      User Profile
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* History Dropdown */}
              <View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    marginBottom: 8,
                  }}
                  onPress={() => {
                    setIsHistoryExpanded(!isHistoryExpanded);
                    Animated.timing(historyDropdownAnim, {
                      toValue: isHistoryExpanded ? 0 : 1,
                      duration: 200,
                      useNativeDriver: false,
                    }).start();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialIcons name="history" size={24} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 }}>
                      History
                    </Text>
                  </View>
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: historyDropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      }],
                    }}
                  >
                    <MaterialIcons name="keyboard-arrow-down" size={24} color="#6b7280" />
                  </Animated.View>
                </TouchableOpacity>

                {/* Sub-items */}
                <Animated.View
                  style={{
                    overflow: 'hidden',
                    maxHeight: historyDropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    }),
                    opacity: historyDropdownAnim,
                  }}
                >
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      paddingLeft: 52,
                      borderRadius: 8,
                      marginBottom: 4,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      Animated.timing(slideAnim, {
                        toValue: -300,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        setSidebarVisible(false);
                      });
                      navigation.navigate('MyReports');
                    }}
                  >
                    <MaterialIcons name="description" size={20} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#4b5563', marginLeft: 16 }}>
                      Reports History
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      paddingLeft: 52,
                      borderRadius: 8,
                      marginBottom: 8,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      Animated.timing(slideAnim, {
                        toValue: -300,
                        duration: 300,
                        useNativeDriver: true,
                      }).start(() => {
                        setSidebarVisible(false);
                      });
                      navigation.navigate('Tabs', {
                        screen: 'Adopt',
                        params: { openApplications: true }
                      });
                    }}
                  >
                    <MaterialIcons name="assignment" size={20} color={COLORS.darkPurple} />
                    <Text style={{ fontSize: 15, fontWeight: '500', color: '#4b5563', marginLeft: 16 }}>
                      Adoption Application
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                onPress={() => {
                  Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setSidebarVisible(false);
                  });
                  navigation.navigate('PetCareGuide');
                }}
              >
                <MaterialIcons name="book" size={24} color={COLORS.darkPurple} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 }}>
                  Pet Care Guide
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                onPress={() => {
                  Animated.timing(slideAnim, {
                    toValue: -300,
                    duration: 300,
                    useNativeDriver: true,
                  }).start(() => {
                    setSidebarVisible(false);
                  });
                  navigation.navigate('Settings');
                }}
              >
                <MaterialIcons name="settings" size={24} color={COLORS.darkPurple} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1f2937', marginLeft: 16 }}>
                  Settings
                </Text>
              </TouchableOpacity>

              <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: '#fee2e2',
                  }}
                  onPress={async () => {
                    if (isLoggingOut) return;
                    Alert.alert(
                      'Logout',
                      'Are you sure you want to logout?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel',
                        },
                        {
                          text: 'Logout',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              setIsLoggingOut(true);
                              // Log logout activity before signing out
                              if (user?.uid) {
                                // Remove push token to prevent notifications on this device for this user
                                try {
                                  const notificationService = NotificationService.getInstance();
                                  await notificationService.removeTokenFromFirestore(user.uid);
                                } catch (e) {
                                  console.error('Error removing push token:', e);
                                }

                                await logUserActivity(
                                  user.uid,
                                  'Logged out of the mobile app',
                                  'logout',
                                  'User logged out from mobile application'
                                );
                              }
                              
                              await signOut(auth);
                              Animated.timing(slideAnim, {
                                toValue: -300,
                                duration: 300,
                                useNativeDriver: true,
                              }).start(() => {
                                setSidebarVisible(false);
                              });
                            } catch (error) {
                              setIsLoggingOut(false);
                              Alert.alert('Error', 'Failed to logout. Please try again.');
                            }
                          },
                        },
                      ]
                    );
                  }}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <>
                      <MaterialIcons name="logout" size={24} color="#dc2626" />
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#dc2626', marginLeft: 16 }}>
                        Logout
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </>
      )}

      {/* Logout Loading Overlay */}
      <Modal
        visible={isLoggingOut}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            minWidth: 120,
          }}>
            <ActivityIndicator size="large" color={COLORS.darkPurple || '#1877f2'} />
            <Text style={{
              marginTop: 16,
              fontSize: 16,
              fontWeight: '600',
              color: COLORS.text,
              fontFamily: FONTS.family,
            }}>
              Logging out...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f0f2f5' }}>
          {/* Header */}
          <View style={{ 
            backgroundColor: '#ffffff',
            paddingTop: 50,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e4e6eb',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#050505' }}>
                Notifications
              </Text>
              <TouchableOpacity 
                onPress={() => setNotifVisible(false)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#e4e6eb',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="close" size={20} color="#050505" />
              </TouchableOpacity>
            </View>
            
            {/* Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['All', 'Apps', 'Pets', 'Transfers', 'Registration', 'Incidents', 'Strays', 'Found Pets', 'Social', 'Friend Requests', 'Announcements', 'Admin Actions'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setNotifFilter(opt === 'Apps' ? 'Applications' : opt)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#1877f2' : '#e4e6eb',
                    }}
                  >
                    <Text style={{
                      color: (notifFilter === opt || (opt === 'Apps' && notifFilter === 'Applications')) ? '#ffffff' : '#050505',
                      fontWeight: '600',
                      fontSize: 14,
                    }}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Content */}
          <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} showsVerticalScrollIndicator={false}>
            {/* Action Buttons */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#e4e6eb',
            }}>
              <TouchableOpacity 
                onPress={handleMarkAllReadCombined} 
                disabled={(() => {
                  const lastApp = (() => { try { return Number((globalThis.__PAW_LAST_APP__) || 0); } catch (_) { return 0; } })();
                  const lastPet = (() => { try { return Number((globalThis.__PAW_LAST_PET__) || 0); } catch (_) { return 0; } })();
                  const lastIncident = (() => { try { return Number((globalThis.__PAW_LAST_INCIDENT__) || 0); } catch (_) { return 0; } })();
                  const lastFriendRequest = (() => { try { return Number((globalThis.__PAW_LAST_FRIEND_REQUEST__) || 0); } catch (_) { return 0; } })();
                  const hasUnreadApp = (appNotifs || []).some((a) => (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0) > lastApp);
                  const hasUnreadPet = (petNotifs || []).some((p) => (p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0) > lastPet);
                  const hasUnreadIncident = (incidentNotifs || []).some((i) => (i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0) > lastIncident);
                  const hasUnreadFriendRequest = (friendRequestNotifs || []).some((fr) => !fr.read);
                  const hasUnreadSocial = (socialNotifs || []).some((s) => !s.read);
                  return !(hasUnreadApp || hasUnreadPet || hasUnreadIncident || hasUnreadFriendRequest || hasUnreadSocial);
                })()}
                style={{ 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 6, 
                  backgroundColor: '#e4e6eb',
                }}
              >
                <Text style={{ 
                  fontWeight: '600', 
                  fontSize: 13,
                  color: '#1877f2',
                }}>Mark all as read</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleDeleteAllCombined} 
                style={{ 
                  paddingHorizontal: 12, 
                  paddingVertical: 6, 
                  borderRadius: 6, 
                }}
              >
                <MaterialIcons name="delete-outline" size={20} color="#65676b" />
              </TouchableOpacity>
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
                  sub: `${p.petName || 'Pet'} • ${p.breed || 'Unknown breed'}`,
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
                  type: i.type.includes('stray') ? 'stray' : 'incident',
                  ts: i.createdAt?.toDate ? i.createdAt.toDate().getTime() : 0,
                  title: i.type === 'incident_resolved' ? 'Incident Report Resolved' : 
                         i.type === 'incident_declined' ? 'Incident Report Declined' :
                         i.type === 'stray_resolved' ? 'Stray Report Resolved' : 'Stray Report Declined',
                  sub: `${i.location || 'Unknown location'} • ${i.message || (i.type.includes('stray') ? 'Stray report status updated' : 'Incident report status updated')}`,
                  data: i,
                }));
                const foundPets = (foundPetNotifs || [])
                  .filter((f) => !hiddenFoundPetIds.has(f.id))
                  .map((f) => ({
                  id: f.id,
                  type: 'found_pet',
                  ts: f.createdAt ? (typeof f.createdAt === 'string' ? new Date(f.createdAt).getTime() : f.createdAt.toDate ? f.createdAt.toDate().getTime() : 0) : 0,
                  title: f.title || '🔍 Found Pet Alert',
                  sub: `${f.data?.data?.locationName || f.data?.locationName || 'Unknown location'} • ${f.data?.data?.distance ? f.data.data.distance + ' km away' : f.data?.distance ? f.data.distance + ' km away' : 'Nearby'}`,
                  data: f,
                }));
                const social = (socialNotifs || [])
                  .map((s) => ({
                  id: s.id,
                  type: 'social',
                  socialType: s.socialType,
                  ts: s.ts,
                  title: s.title || '',
                  sub: s.sub || '',
                  data: s.data || {},
                  read: s.read || false,
                }));
                const friendRequests = (friendRequestNotifs || [])
                  .filter((fr) => !hiddenFriendRequestIds.has(fr.id))
                  .map((fr) => ({
                  id: fr.id,
                  type: 'friend_request',
                  ts: fr.ts,
                  title: fr.title || 'New Friend Request',
                  sub: fr.sub || fr.body || '',
                  data: fr.data || {},
                  read: fr.read || false,
                }));
                const friendRequestAccepted = (friendRequestAcceptedNotifs || [])
                  .filter((fra) => !hiddenFriendRequestIds.has(fra.id))
                  .map((fra) => ({
                  id: fra.id,
                  type: 'friend_request_accepted',
                  ts: fra.ts,
                  title: fra.title || 'Friend Request Accepted',
                  sub: fra.sub || fra.body || '',
                  data: fra.data || {},
                  read: fra.read || false,
                }));
                const announcements = (announcementNotifs || [])
                  .map((an) => ({
                    id: an.id,
                    type: 'announcement',
                    ts: an.ts,
                    title: an.title || 'New Announcement',
                    sub: an.sub || an.body || '',
                    data: an.data || {},
                    read: an.read || false,
                    announcementId: an.announcementId || null,
                  }));
                const adminActions = (adminActionNotifs || [])
                  .filter((aa) => !hiddenAdminActionIds.has(aa.id))
                  .map((aa) => ({
                    id: aa.id,
                    type: 'admin_action',
                    ts: aa.ts,
                    title: aa.title || 'Admin Action',
                    sub: aa.sub || aa.body || '',
                    data: aa.data || {},
                    read: aa.read || false,
                  }));
                let list = [...apps, ...pets, ...transfers, ...registrations, ...incidents, ...foundPets, ...social, ...friendRequests, ...friendRequestAccepted, ...announcements, ...adminActions].sort((a, b) => b.ts - a.ts);
                if (notifFilter === 'Applications') list = list.filter((n) => n.type === 'app');
                if (notifFilter === 'Pets') list = list.filter((n) => n.type === 'pet');
                if (notifFilter === 'Transfers') list = list.filter((n) => n.type === 'transfer');
                if (notifFilter === 'Registration') list = list.filter((n) => n.type === 'registration');
                if (notifFilter === 'Incidents') list = list.filter((n) => n.type === 'incident');
                if (notifFilter === 'Strays') list = list.filter((n) => n.type === 'stray');
                if (notifFilter === 'Found Pets') list = list.filter((n) => n.type === 'found_pet');
                if (notifFilter === 'Social') list = list.filter((n) => n.type === 'social');
                if (notifFilter === 'Friend Requests') list = list.filter((n) => n.type === 'friend_request' || n.type === 'friend_request_accepted');
                if (notifFilter === 'Announcements') list = list.filter((n) => n.type === 'announcement');
                if (notifFilter === 'Admin Actions') list = list.filter((n) => n.type === 'admin_action');
                if (list.length === 0) return (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: '#65676b', fontSize: 15 }}>No notifications yet.</Text>
                  </View>
                );
                return list.map((n) => {
                  const isUnread = n.type === 'social' || n.type === 'friend_request' || n.type === 'friend_request_accepted' || n.type === 'announcement' || n.type === 'admin_action'
                    ? !n.read 
                    : (n.type === 'app' ? (n.ts > (Number(lastSeenApp) || 0)) : n.type === 'transfer' ? (n.ts > (Number(lastSeenTransfer) || 0)) : n.type === 'registration' ? (n.ts > (Number(lastSeenRegistration) || 0)) : n.type === 'found_pet' ? (n.ts > (Number(globalThis.__PAW_LAST_FOUND_PET__) || 0)) : (n.ts > (Number(lastSeenPet) || 0)));
                  return (
                  <View key={`${n.type}-${n.id}`} style={{ 
                    position: 'relative',
                    backgroundColor: isUnread ? '#f0f2f5' : '#ffffff',
                    borderBottomWidth: 1,
                    borderBottomColor: '#e4e6eb',
                  }}>
                    <TouchableOpacity 
                      onPress={async () => {
                        await markNotificationAsRead(n);
                        setNotifVisible(false);
                        
                        // Navigate based on notification type
                        if (n.type === 'friend_request') {
                          navigation.navigate('FriendRequests');
                        } else if (n.type === 'friend_request_accepted') {
                          navigation.navigate('FriendsList');
                        } else if (n.type === 'app') {
                          // Adoption application notification -> MyReports
                          navigation.navigate('MyReports');
                        } else if (n.type === 'pet') {
                          // New adoptable pet -> Adopt tab
                          navigation.navigate('Adopt');
                        } else if (n.type === 'transfer') {
                          // Pet transfer -> MyPets
                          navigation.navigate('MyPets');
                        } else if (n.type === 'registration') {
                          // Pet registration -> MyPets
                          navigation.navigate('MyPets');
                        } else if (n.type === 'incident' || n.type === 'stray') {
                          // Incident/Stray report -> MyReports
                          navigation.navigate('MyReports');
                        } else if (n.type === 'found_pet') {
                          // Found pet -> MyReports
                          navigation.navigate('MyReports');
                        } else if (n.type === 'social') {
                          // Social notification (like, comment, reply) -> Navigate to specific post
                          const postId = n.data?.postId;
                          if (postId) {
                            // Set the post to scroll to
                            setScrollToPostId(postId);
                            // Ensure we're on the home tab (if not already)
                            // The post will be scrolled to when it's rendered
                          }
                        } else if (n.type === 'announcement') {
                          // Announcement notification -> Scroll to announcement in feed
                          const announcementId = n.announcementId || n.data?.announcementId;
                          if (announcementId) {
                            // Set the announcement to scroll to
                            setScrollToPostId(`announcement_${announcementId}`);
                          }
                        }
                      }} 
                      activeOpacity={0.7}
                      style={{ 
                        flexDirection: 'row', 
                        alignItems: 'flex-start', 
                        padding: 12,
                        paddingHorizontal: 16,
                      }}
                    >
                      {/* Avatar/Icon */}
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: n.type === 'social' 
                          ? '#e3f2fd' 
                          : n.type === 'pet' 
                            ? '#fef3c7' 
                            : n.type === 'transfer' 
                              ? '#ede9fe' 
                              : n.type === 'found_pet' 
                                ? '#d1fae5' 
                                : n.type === 'registration' 
                                  ? (n.data?.type === 'pet_registration_approved' ? '#d1fae5' : '#fee2e2') 
                                  : n.type === 'friend_request'
                                    ? '#e3f2fd'
                                    : n.type === 'friend_request_accepted'
                                      ? '#d1fae5'
                                  : n.type === 'announcement'
                                    ? '#ddd6fe'
                                    : n.type === 'admin_action'
                                      ? '#fef3c7'
                                  : (n.data?.status === 'Approved' ? '#d1fae5' : n.data?.status === 'Declined' ? '#fee2e2' : '#e5e7eb'),
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <MaterialIcons 
                          name={n.type === 'social'
                            ? (n.socialType === 'post_like' 
                                ? 'thumb-up' 
                                : n.socialType === 'comment_like'
                                  ? 'thumb-up'
                                  : n.socialType === 'post_comment'
                                    ? 'comment'
                                    : 'subdirectory-arrow-left')
                            : n.type === 'pet' 
                              ? 'favorite' 
                              : n.type === 'transfer'
                                ? 'pets'
                                : n.type === 'found_pet'
                                  ? 'search'
                              : n.type === 'registration'
                                ? (n.data?.type === 'pet_registration_approved' 
                                    ? 'check-circle' 
                                    : 'cancel')
                                : n.type === 'friend_request'
                                  ? 'person-add'
                                  : n.type === 'friend_request_accepted'
                                    ? 'check-circle'
                                  : n.type === 'announcement'
                                    ? 'campaign'
                                    : n.type === 'admin_action'
                                      ? 'admin-panel-settings'
                                : (n.data?.status === 'Approved' 
                                    ? 'check-circle' 
                                    : (n.data?.status === 'Declined' 
                                        ? 'cancel' 
                                        : 'info'))}
                          size={20}
                          color={n.type === 'social'
                            ? '#1877f2'
                            : n.type === 'pet' 
                              ? '#f59e0b' 
                              : n.type === 'transfer'
                                ? '#8b5cf6'
                                : n.type === 'found_pet'
                                  ? '#16a34a'
                              : n.type === 'registration'
                                ? (n.data?.type === 'pet_registration_approved' 
                                    ? '#16a34a' 
                                    : '#dc2626')
                                : n.type === 'friend_request'
                                  ? '#1877f2'
                                  : n.type === 'friend_request_accepted'
                                    ? '#16a34a'
                                  : n.type === 'announcement'
                                    ? '#7c3aed'
                                : (n.data?.status === 'Declined' 
                                    ? '#dc2626' 
                                    : (n.data?.status === 'Approved' 
                                        ? '#16a34a' 
                                        : '#65676b'))}
                        />
                      </View>
                      
                      {/* Content */}
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ 
                          fontWeight: isUnread ? '700' : '600', 
                          fontSize: 15, 
                          color: '#050505',
                          marginBottom: 4,
                          lineHeight: 20,
                        }}>
                          {n.title}
                        </Text>
                        <Text style={{ 
                          color: '#65676b', 
                          fontSize: 14,
                          marginBottom: 4,
                          lineHeight: 18,
                        }}>
                          {n.sub}
                        </Text>
                        <Text style={{ 
                          color: '#8a8d91', 
                          fontSize: 12,
                        }}>
                          {n.ts ? (() => {
                            const now = new Date();
                            const notifDate = new Date(n.ts);
                            const diffMs = now - notifDate;
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMs / 3600000);
                            const diffDays = Math.floor(diffMs / 86400000);
                            
                            if (diffMins < 1) return 'Just now';
                            if (diffMins < 60) return `${diffMins}m`;
                            if (diffHours < 24) return `${diffHours}h`;
                            if (diffDays < 7) return `${diffDays}d`;
                            return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          })() : ''}
                        </Text>
                      </View>
                      
                      {/* More Options */}
                      <TouchableOpacity 
                        onPress={() => setNotifMenu((m) => (m && m.id === n.id ? null : { type: n.type, id: n.id }))} 
                        style={{ 
                          padding: 8,
                          borderRadius: 20,
                        }}
                      >
                        <MaterialIcons name="more-horiz" size={20} color="#65676b" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {/* Dropdown Menu */}
                    {notifMenu && notifMenu.id === n.id && notifMenu.type === n.type && (
                      <View style={{ 
                        position: 'absolute', 
                        top: 50, 
                        right: 16, 
                        backgroundColor: '#ffffff', 
                        borderWidth: 1, 
                        borderColor: '#e4e6eb', 
                        borderRadius: 8, 
                        overflow: 'hidden', 
                        zIndex: 30,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 5,
                        minWidth: 120,
                      }}>
                        <TouchableOpacity 
                          onPress={() => {
                            handleDeleteNotif(n.type, n.id);
                            setNotifMenu(null);
                          }} 
                          style={{ 
                            paddingVertical: 12, 
                            paddingHorizontal: 16,
                          }}
                        >
                          <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 14 }}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                  );
                });
              })()}
          </ScrollView>
        </View>
      </Modal>
    
    {/* Notification Details Modal - Removed, notifications now navigate directly */}
    {false && (
    <Modal
      visible={false}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setSelectedNotif(null);
        setSelectedReportDetails(null);
      }}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        <View 
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 500,
            height: '85%',
            maxHeight: screenData.height * 0.85,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
            overflow: 'hidden',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#f1f5f9',
            backgroundColor: '#ffffff',
            flexShrink: 0
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f2937' }}>
                {selectedNotif?.title}
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                {selectedNotif?.type === 'app' ? 'Application Update' : 
                 selectedNotif?.type === 'transfer' ? 'Pet Transfer Notification' : 
                 selectedNotif?.type === 'registration' ? 'Pet Registration Update' :
                 selectedNotif?.type === 'incident' ? 'Incident Report Update' :
                 selectedNotif?.type === 'stray' ? 'Stray Report Update' :
                 selectedNotif?.type === 'found_pet' ? 'Found Pet Alert' :
                 'New Pet Available'}
              </Text>
            </View>
          </View>

          {/* Content */}
          {selectedNotif && (
          <ScrollView 
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
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
              ) : selectedNotif?.type === 'transfer' ? (
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
              ) : selectedNotif?.type === 'registration' ? (
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
              ) : selectedNotif?.type === 'incident' ? (
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
              ) : selectedNotif?.type === 'found_pet' ? (
                <>
                  {/* Found Pet Alert Card */}
                  <View style={{
                    backgroundColor: '#dcfce7',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: '#16a34a'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      🔍 Found Pet Alert
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      A pet matching your lost pet report has been found nearby! Check the details below.
                    </Text>
                    {selectedNotif.data?.data?.distance && (
                      <Text style={{ color: '#16a34a', fontSize: 14, marginTop: 8, fontWeight: '600' }}>
                        📍 Distance: {selectedNotif.data.data.distance} km away
                      </Text>
                    )}
                  </View>

                  {/* Found Pet Report Card */}
                  {selectedReportDetails ? (
                    <>
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

                      {/* Report Status */}
                      <View style={{
                        backgroundColor: getStatusColor(selectedReportDetails.status) === COLORS.error ? '#fee2e2' :
                                       getStatusColor(selectedReportDetails.status) === COLORS.warning ? '#fef3c7' : '#dbeafe',
                        padding: 16,
                        borderRadius: 12,
                        marginBottom: 20,
                        borderLeftWidth: 4,
                        borderLeftColor: getStatusColor(selectedReportDetails.status)
                      }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                          Status: {selectedReportDetails.status || 'Found'}
                        </Text>
                        <Text style={{ color: '#374151', fontSize: 14 }}>
                          {selectedReportDetails.status === 'Found' ? 'This pet has been found and is safe!' :
                           selectedReportDetails.status === 'Reunited' ? 'This pet has been reunited with its owner!' :
                           'This is a found pet report.'}
                        </Text>
                      </View>

                      {/* Location Information */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                          📍 Location
                        </Text>
                        <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                          {selectedReportDetails.locationName || 'Unknown Location'}
                        </Text>
                        {selectedReportDetails.location && (
                          <Text style={{ fontSize: 12, color: '#6b7280' }}>
                            Coordinates: {selectedReportDetails.location.latitude.toFixed(6)}, {selectedReportDetails.location.longitude.toFixed(6)}
                          </Text>
                        )}
                      </View>

                      {/* Description */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                          Description
                        </Text>
                        <Text style={{ fontSize: 14, color: '#374151', lineHeight: 20 }}>
                          {selectedReportDetails.description || 'No description provided'}
                        </Text>
                      </View>

                      {/* Report Time */}
                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                          Report Time
                        </Text>
                        <Text style={{ fontSize: 14, color: '#374151' }}>
                          {selectedReportDetails.reportTime ? formatTimeAgo(selectedReportDetails.reportTime) : 'Unknown'}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={{ marginBottom: 20, alignItems: 'center', padding: 20 }}>
                      <ActivityIndicator size="large" color={COLORS.darkPurple} />
                      <Text style={{ marginTop: 12, color: '#6b7280', fontSize: 14 }}>
                        Loading report details...
                      </Text>
                    </View>
                  )}
                </>
              ) : selectedNotif?.type === 'stray' ? (
                <>
                  {/* Stray Status Card */}
                  <View style={{
                    backgroundColor: selectedNotif.data?.type === 'stray_resolved' ? '#dcfce7' : '#fee2e2',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 20,
                    borderLeftWidth: 4,
                    borderLeftColor: selectedNotif.data?.type === 'stray_resolved' ? '#16a34a' : '#dc2626'
                  }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
                      {selectedNotif.data?.type === 'stray_resolved' ? '✅ Stray Report Resolved' : '❌ Stray Report Declined'}
                    </Text>
                    <Text style={{ color: '#374151', fontSize: 14 }}>
                      {selectedNotif.data?.message || (selectedNotif.data?.type === 'stray_resolved' 
                        ? 'Your stray report has been resolved by the animal impound facility. Thank you for reporting this stray animal.' 
                        : 'Your stray report has been declined. Please see the reason below.')}
                    </Text>
                  </View>

                  {/* Stray Information */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                      Report Information
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
                      <Text style={{ fontWeight: '700' }}>Location:</Text> {selectedNotif.data?.location || 'Unknown location'}
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 4 }}>
                      <Text style={{ fontWeight: '700' }}>Report ID:</Text> {selectedNotif.data?.reportId || 'N/A'}
                    </Text>
                  </View>

                  {/* Decline Reason (if declined) */}
                  {selectedNotif.data?.type === 'stray_declined' && selectedNotif.data?.declineReason && (
                    <View style={{ marginBottom: 20 }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#1f2937' }}>
                        Reason for Decline
                      </Text>
                      <View style={{
                        backgroundColor: '#fef2f2',
                        borderWidth: 1,
                        borderColor: '#fecaca',
                        borderRadius: 8,
                        padding: 12
                      }}>
                        <Text style={{ color: '#dc2626', fontSize: 14, lineHeight: 20 }}>
                          {selectedNotif.data.declineReason}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Timestamp */}
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: '#6b7280', fontSize: 12 }}>
                      <Text style={{ fontWeight: '700' }}>Updated:</Text>{' '}
                      {selectedNotif.ts ? new Date(selectedNotif.ts).toLocaleDateString() + ' at ' + new Date(selectedNotif.ts).toLocaleTimeString() : 'Unknown'}
                    </Text>
                  </View>

                  {/* Next Steps */}
                  {selectedNotif.data?.type === 'stray_resolved' ? (
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16
                    }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#92400e' }}>
                        What happens next?
                      </Text>
                      <Text style={{ color: '#92400e', fontSize: 14, lineHeight: 20 }}>
                        • The stray animal has been safely handled by our impound facility{'\n'}
                        • The animal will be cared for and may be made available for adoption{'\n'}
                        • Thank you for helping keep our community safe
                      </Text>
                    </View>
                  ) : (
                    <View style={{ 
                      backgroundColor: '#FEF3C7', 
                      padding: 16, 
                      borderRadius: 12, 
                      marginBottom: 16
                    }}>
                      <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8, color: '#92400e' }}>
                        What can you do?
                      </Text>
                      <Text style={{ color: '#92400e', fontSize: 14, lineHeight: 20 }}>
                        • Review the reason for decline above{'\n'}
                        • You may submit a new stray report if needed{'\n'}
                        • Contact the impound facility for more information
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
          )}

          {/* Footer */}
          <View style={{
            padding: 20,
            borderTopWidth: 1,
            borderTopColor: '#f1f5f9',
            flexDirection: 'row',
            justifyContent: 'flex-end',
            backgroundColor: '#ffffff',
            flexShrink: 0
          }}>
            <TouchableOpacity 
              onPress={() => {
                setSelectedNotif(null);
                setSelectedReportDetails(null);
              }}
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

      {/* Report Details Modal - Only show if not showing found_pet notification modal */}
      {selectedReportDetails && (!selectedNotif || selectedNotif.type !== 'found_pet') && (
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

      {/* User Manual Modal */}
      <UserManualModal 
        visible={userManualVisible} 
        onClose={handleUserManualClose} 
      />
    </View>
  );
};



export default HomeTabScreen; 