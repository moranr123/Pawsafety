import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Platform,
  useWindowDimensions,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useTabBarVisibility } from '../../contexts/TabBarVisibilityContext';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, getDoc, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import ReportChatModal from '../../components/ReportChatModal';
import { auth } from '../../services/firebase';
import { useProfileImage } from '../../contexts/ProfileImageContext';
import NotificationService from '../../services/NotificationService';

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
  onOpenComments,
  commentsCount = 0,
  styles,
  COLORS,
}) => {
  const imageUri = useMemo(() => report?.imageUrl, [report?.imageUrl]);
  const location = useMemo(() => report?.locationName || 'Unknown location', [report?.locationName]);
  const reportTime = useMemo(() => report?.reportTime?.toDate ? report.reportTime.toDate() : null, [report?.reportTime]);
  const date = useMemo(() => reportTime ? reportTime.toLocaleDateString() : 'Unknown', [reportTime]);
  const time = useMemo(() => reportTime ? reportTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown', [reportTime]);
  const petType = useMemo(() => report?.petType ? (report.petType === 'dog' ? '🐕 Dog' : '🐱 Cat') : null, [report?.petType]);
  const status = useMemo(() => report?.status || 'Stray', [report?.status]);
  const description = useMemo(() => report?.description || '', [report?.description]);
  
  const onPressReporter = useCallback(() => {
    if (report.userId) {
      navigation.navigate('Profile', { userId: report.userId });
    }
  }, [report.userId, navigation]);
  
  const onPressMessage = useCallback(() => {
    if (onOpenChat) {
      onOpenChat(report);
    }
  }, [onOpenChat, report]);
  
  const onPressComment = useCallback(() => {
    if (onOpenComments) {
      onOpenComments(report);
    }
  }, [onOpenComments, report]);
  
  const showActions = useMemo(() => {
    const canMessage = report.userId && report.userId !== auth.currentUser?.uid && onOpenChat;
    return canMessage || onOpenComments;
  }, [report.userId, onOpenChat, onOpenComments]);

  return (
  <View style={styles.reportCard}>
    {/* Header with reporter info and status badge */}
    <View style={styles.reportHeader}>
      <TouchableOpacity
        style={styles.reportUserInfo}
        onPress={report.userId ? onPressReporter : undefined}
        activeOpacity={0.8}
        disabled={!report.userId}
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
    {showActions && (
      <View style={styles.reportActions}>
        {report.userId && report.userId !== auth.currentUser?.uid && onOpenChat && (
          <TouchableOpacity
            style={styles.reportActionButton}
            onPress={onPressMessage}
          >
            <MaterialIcons name="message" size={18} color="#65676b" />
            <Text style={styles.reportActionText}>Message</Text>
          </TouchableOpacity>
        )}
        {onOpenComments && (
          <TouchableOpacity
            style={styles.reportActionButton}
            onPress={onPressComment}
          >
            <MaterialIcons name="comment" size={18} color="#65676b" />
            <Text style={styles.reportActionText}>
              Comment{commentsCount > 0 ? ` (${commentsCount})` : ''}
            </Text>
          </TouchableOpacity>
        )}
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
  
  // Comment state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState({}); // { reportId: count }
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});
  const [isLikingComment, setIsLikingComment] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [friends, setFriends] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [filteredFriends, setFilteredFriends] = useState([]);
  const { profileImage } = useProfileImage();
  const user = auth.currentUser;

  // Memoize filter handlers
  const handleFilterAll = useCallback(() => setFilter('All'), []);
  const handleFilterStray = useCallback(() => setFilter('Stray'), []);
  const handleFilterLost = useCallback(() => setFilter('Lost'), []);
  const handleFilterIncident = useCallback(() => setFilter('Incident'), []);
  const handleFilterFound = useCallback(() => setFilter('Found'), []);

  // Optimized: Use built-in hook instead of Dimensions listener
  const { width: currentWidth, height: currentHeight } = useWindowDimensions();
  const isSmallDevice = useMemo(() => currentWidth < 375 || currentHeight < 667, [currentWidth, currentHeight]);
  const isTablet = useMemo(() => currentWidth > 768, [currentWidth]);
  const wp = useCallback((percentage) => (currentWidth * percentage) / 100, [currentWidth]);
  const hp = useCallback((percentage) => (currentHeight * percentage) / 100, [currentHeight]);

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


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // The Firebase listener will automatically update the data
    // Just simulate a brief refresh delay
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const onOpenChat = useCallback((report) => {
    setSelectedReport(report);
    setChatModalVisible(true);
  }, []);

  const onCloseChat = useCallback(() => {
    setChatModalVisible(false);
    setSelectedReport(null);
  }, []);

  const isRecent = useCallback((report) => {
    if (!report.reportTime?.toDate) return false;
    const now = new Date();
    const reportDate = report.reportTime.toDate();
    return (now - reportDate) < 24 * 60 * 60 * 1000;
  }, []);

  const isNearMe = useCallback((report) => {
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
  }, [userLocation]);

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

  // Comment helper functions - memoized
  const extractMentions = useCallback((text) => {
    if (!text || typeof text !== 'string') return [];
    const mentionRegex = /@([a-zA-Z0-9_\s]+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1].trim();
      if (username && !mentions.includes(username)) {
        mentions.push(username);
      }
    }
    return mentions;
  }, []);

  const findMentionedUserIds = useCallback(async (usernames) => {
    if (!usernames || usernames.length === 0) return [];
    const userIds = [];
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        const displayName = userData.displayName || userData.name || '';
        if (usernames.some(username => displayName.toLowerCase().includes(username.toLowerCase()))) {
          userIds.push(doc.id);
        }
      });
    } catch (error) {
      console.error('Error finding mentioned users:', error);
    }
    return userIds;
  }, []);

  const notifyMentionedUsers = useCallback(async (userIds, text, commentId, isReply) => {
    if (!userIds || userIds.length === 0 || !user?.uid) return;
    
    const currentUserIdStr = String(user.uid).trim();
    
    try {
      const notificationService = NotificationService.getInstance();
      for (const userId of userIds) {
        const targetUserIdStr = String(userId).trim();
        
        // IMPORTANT: Don't notify the current user (don't notify yourself)
        if (targetUserIdStr !== currentUserIdStr) {
          await notificationService.createNotification({
            userId: userId,
            type: isReply ? 'comment_reply_mention' : 'comment_mention',
            title: 'You were mentioned',
            body: `${user?.displayName || 'Someone'} mentioned you in a ${isReply ? 'reply' : 'comment'}`,
            data: {
              reportId: selectedReport?.id,
              commentId: commentId,
              type: isReply ? 'comment_reply_mention' : 'comment_mention',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error notifying mentioned users:', error);
    }
  }, [user, selectedReport?.id]);

  // Load comments for a report with real-time updates
  useEffect(() => {
    if (!showComments || !selectedReport?.id) {
      setComments([]);
      return;
    }

    const commentsRef = collection(db, 'report_comments');
    const q = query(
      commentsRef,
      where('reportId', '==', selectedReport.id),
      where('parentCommentId', '==', null),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentsData);
      
      // Update comment likes
      const likesMap = {};
      for (const comment of commentsData) {
        const likes = comment.likes || [];
        likesMap[comment.id] = {
          count: likes.length,
          isLiked: user?.uid ? likes.includes(user.uid) : false,
        };
      }
      setCommentLikes(likesMap);
    }, (error) => {
      console.error('Error loading comments:', error);
    });

    return () => unsubscribe();
  }, [showComments, selectedReport?.id, user?.uid]);

  // Load comment count for all reports
  useEffect(() => {
    if (reports.length === 0) return;
    
    const unsubscribes = reports.map(report => {
      const commentsRef = collection(db, 'report_comments');
      const q = query(
        commentsRef,
        where('reportId', '==', report.id),
        where('parentCommentId', '==', null)
      );
      return onSnapshot(q, (snapshot) => {
        setCommentsCount(prev => ({
          ...prev,
          [report.id]: snapshot.size,
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [reports]);

  // Load friends for mentions
  useEffect(() => {
    if (!user?.uid) return;
    const loadFriends = async () => {
      try {
        const friendsRef = collection(db, 'friends');
        const q = query(
          friendsRef,
          where('userId', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        const friendIds = snapshot.docs.map(doc => {
          const data = doc.data();
          return data.friendId;
        });
        
        // Load friend user data
        const friendData = await Promise.all(
          friendIds.map(async (friendId) => {
            try {
              const friendDoc = await getDoc(doc(db, 'users', friendId));
              if (friendDoc.exists()) {
                const friendUserData = friendDoc.data();
                return {
                  id: friendId,
                  displayName: friendUserData.displayName || friendUserData.name || '',
                  name: friendUserData.displayName || friendUserData.name || '',
                  profileImage: friendUserData.profileImage || null,
                };
              }
            } catch (error) {
              console.error('Error loading friend:', error);
            }
            return null;
          })
        );
        setFriends(friendData.filter(f => f !== null));
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    };
    loadFriends();
  }, [user?.uid]);

  // Handle opening comments modal
  const onOpenComments = useCallback((report) => {
    setSelectedReport(report);
    setShowComments(true);
    // Comments will load automatically via the useEffect when showComments and selectedReport change
  }, []);

  // Handle comment submission
  const handleComment = async () => {
    if (!commentText.trim() || !user?.uid || !selectedReport) return;

    setIsSubmittingComment(true);
    try {
      let currentUserName = user.displayName || 'Pet Lover';
      let currentUserProfileImage = profileImage || null;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          currentUserName = userData.displayName || userData.name || currentUserName;
          currentUserProfileImage = userData.profileImage || currentUserProfileImage;
        }
      } catch (error) {
        // Error handled silently
      }

      const mentionedUsernames = extractMentions(commentText.trim());
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        mentionedUserIds = await findMentionedUserIds(mentionedUsernames);
      }

      const commentRef = await addDoc(collection(db, 'report_comments'), {
        reportId: selectedReport.id,
        userId: user.uid,
        userName: currentUserName,
        userProfileImage: currentUserProfileImage,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        parentCommentId: null,
        mentionedUsers: mentionedUserIds,
      });

      // Send notification to report owner ONLY
      // CRITICAL: Never notify the commenter (current user) - only notify the report owner
      const reportOwnerId = selectedReport?.userId;
      const currentUserId = user?.uid;
      
      if (reportOwnerId && currentUserId) {
        // Normalize IDs for comparison
        const ownerIdStr = String(reportOwnerId).trim();
        const currentIdStr = String(currentUserId).trim();
        
        // Check if the report owner is mentioned
        // We check both original ID and string format to be safe
        const isOwnerMentioned = mentionedUserIds.some(id => 
          String(id).trim() === ownerIdStr
        );

        // Only proceed if:
        // 1. Report owner is NOT the current user (commenter)
        // 2. Report owner is NOT already mentioned (they will get a mention notification instead)
        if (ownerIdStr !== currentIdStr && !isOwnerMentioned) {
          try {
            const notificationService = NotificationService.getInstance();
            await notificationService.createNotification({
              userId: reportOwnerId, // Report owner ID - NEVER the commenter's ID
              type: 'report_comment',
              title: 'New Comment',
              body: `${currentUserName} commented on your report`,
              data: {
                reportId: selectedReport.id,
                type: 'report_comment',
                commentedBy: currentUserId,
                commentedByName: currentUserName,
              },
            });
          } catch (notifError) {
            // Error handled silently
            console.error('Error sending comment notification:', notifError);
          }
        }
      }

      // Send notifications to mentioned users
      if (mentionedUserIds.length > 0) {
        await notifyMentionedUsers(mentionedUserIds, commentText.trim(), commentRef.id, false);
      }

      setCommentText('');
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      setFilteredFriends([]);
      
      // Comments will update automatically via the real-time listener
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle comment text change with mention detection - memoized
  const handleCommentTextChange = useCallback((text) => {
    setCommentText(text);
    
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = text.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1) {
        const query = textAfterAt;
        if (query.length > 0) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          const filtered = friends.filter(friend => {
            const name = (friend.displayName || friend.name || '').toLowerCase();
            return name.includes(query.toLowerCase());
          });
          setFilteredFriends(filtered.slice(0, 10));
        } else {
          setMentionQuery('');
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          setFilteredFriends(friends.slice(0, 10));
        }
      } else if (spaceIndex > 0) {
        const query = textAfterAt.substring(0, spaceIndex);
        const textAfterSpace = textAfterAt.substring(spaceIndex + 1);
        if (query.trim().length > 0 && textAfterSpace.trim().length === 0) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          const filtered = friends.filter(friend => {
            const name = (friend.displayName || friend.name || '').toLowerCase();
            return name.includes(query.toLowerCase());
          });
          setFilteredFriends(filtered.slice(0, 10));
        } else {
          setShowMentionSuggestions(false);
          setMentionQuery('');
          setMentionStartIndex(-1);
        }
      } else {
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
      }
    } else {
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  }, [friends]);

  // Handle selecting a mention - memoized
  const handleSelectMention = useCallback((friend) => {
    const friendName = friend.displayName || friend.name;
    const currentText = commentText;
    const beforeMention = currentText.substring(0, mentionStartIndex);
    const afterMention = currentText.substring(mentionStartIndex + 1 + mentionQuery.length);
    const newText = `${beforeMention}@${friendName} ${afterMention}`;
    
    setShowMentionSuggestions(false);
    setCommentText(newText);
    setMentionQuery('');
    setMentionStartIndex(-1);
    setFilteredFriends([]);
  }, [commentText, mentionStartIndex, mentionQuery]);

  // Handle editing comment
  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) {
      Alert.alert('Error', 'Comment text cannot be empty.');
      return;
    }

    try {
      const mentionedUsernames = extractMentions(editCommentText.trim());
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        mentionedUserIds = await findMentionedUserIds(mentionedUsernames);
      }

      const commentRef = doc(db, 'report_comments', commentId);
      await updateDoc(commentRef, {
        text: editCommentText.trim(),
        updatedAt: serverTimestamp(),
        mentionedUsers: mentionedUserIds,
      });

      const originalCommentDoc = await getDoc(commentRef);
      const originalCommentData = originalCommentDoc.data();
      const previousMentions = originalCommentData?.mentionedUsers || [];
      const newMentions = mentionedUserIds.filter(uid => !previousMentions.includes(uid));
      
      if (newMentions.length > 0) {
        await notifyMentionedUsers(newMentions, editCommentText.trim(), commentId, false);
      }

      setEditingCommentId(null);
      setEditCommentText('');
      // Comments will update automatically via the real-time listener
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    }
  };

  // Handle liking comment
  const handleLikeComment = async (commentId) => {
    if (!user?.uid || isLikingComment[commentId]) return;

    setIsLikingComment(prev => ({ ...prev, [commentId]: true }));
    try {
      const commentRef = doc(db, 'report_comments', commentId);
      const commentDoc = await getDoc(commentRef);
      
      if (commentDoc.exists()) {
        const commentData = commentDoc.data();
        const currentLikes = commentData.likes || [];
        const isLiked = currentLikes.includes(user.uid);
        
        if (isLiked) {
          await updateDoc(commentRef, {
            likes: arrayRemove(user.uid)
          });
        } else {
          await updateDoc(commentRef, {
            likes: arrayUnion(user.uid)
          });
          
          // IMPORTANT: Don't notify if the current user is the comment owner
          const commentOwnerId = commentData.userId;
          const currentUserId = user.uid;
          
          if (commentOwnerId && currentUserId) {
            const ownerIdStr = String(commentOwnerId).trim();
            const currentIdStr = String(currentUserId).trim();
            
            if (ownerIdStr !== currentIdStr) {
              try {
                // Fetch current user's display name for notification
                let likerName = user.displayName || 'Someone';
                try {
                  const userDoc = await getDoc(doc(db, 'users', user.uid));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    likerName = userData.displayName || userData.name || likerName;
                  }
                } catch (error) {
                  // Use existing value if fetch fails
                }
                
                const notificationService = NotificationService.getInstance();
                await notificationService.createNotification({
                  userId: commentOwnerId,
                  type: 'comment_like',
                  title: 'New Like',
                  body: `${likerName} liked your comment`,
                  data: {
                    reportId: selectedReport?.id,
                    commentId: commentId,
                    type: 'comment_like',
                    likedBy: user.uid,
                    likedByName: likerName,
                  },
                });
              } catch (notifError) {
                // Error handled silently
              }
            }
          }
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLikingComment(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // Handle deleting comment - memoized
  const handleDeleteComment = useCallback((commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'report_comments', commentId));
              // Comments will update automatically via the real-time listener
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ]
    );
  }, []);

  // Format time helper - memoized
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, []);

  // Render text with mentions - memoized
  const renderTextWithMentions = useCallback((text, mentionedUsers = []) => {
    if (!text) return null;
    
    const parts = [];
    const mentionRegex = /@([a-zA-Z0-9_\s]+)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const mentionText = match[0];
      const username = match[1].trim();
      parts.push(
        <Text key={match.index} style={{ color: '#1877f2', fontWeight: '600' }}>
          {mentionText}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return <Text style={{ fontSize: 15, color: '#050505', lineHeight: 20 }}>{parts}</Text>;
  }, []);

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
      gap: 8,
    },
    reportActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      borderRadius: 8,
      gap: 6,
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
    // Comment Modal Styles
    commentModal: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    commentModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    commentModalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#050505',
      fontFamily: FONTS.family,
    },
    commentList: {
      flex: 1,
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: SPACING.md,
      paddingBottom: SPACING.md,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f2f5',
    },
    commentProfileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: SPACING.sm,
      backgroundColor: '#e4e6eb',
    },
    commentContent: {
      flex: 1,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    commentUserName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      fontFamily: FONTS.family,
    },
    commentTime: {
      fontSize: 12,
      color: '#65676b',
      fontFamily: FONTS.family,
      marginTop: 2,
    },
    commentMenuButton: {
      padding: SPACING.xs,
    },
    commentMenu: {
      position: 'absolute',
      top: 30,
      right: 0,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.small,
      paddingVertical: SPACING.xs,
      minWidth: 120,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
    },
    commentMenuItem: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    commentMenuItemLast: {
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    commentEditInput: {
      backgroundColor: '#f0f2f5',
      borderRadius: RADIUS.small,
      padding: SPACING.sm,
      fontSize: 15,
      color: '#050505',
      fontFamily: FONTS.family,
      minHeight: 60,
      marginBottom: SPACING.sm,
    },
    commentEditActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: SPACING.sm,
    },
    commentEditButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.small,
      backgroundColor: '#f0f2f5',
    },
    commentEditButtonText: {
      fontSize: 14,
      fontWeight: '600',
      fontFamily: FONTS.family,
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.xs,
    },
    commentActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: SPACING.md,
      gap: SPACING.xs,
    },
    commentActionText: {
      fontSize: 13,
      color: '#65676b',
      fontFamily: FONTS.family,
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      backgroundColor: '#ffffff',
    },
    commentInput: {
      flex: 1,
      backgroundColor: '#f0f2f5',
      borderRadius: RADIUS.large,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: 15,
      color: '#050505',
      fontFamily: FONTS.family,
      maxHeight: 100,
      marginRight: SPACING.sm,
    },
    mentionSuggestionsContainer: {
      position: 'absolute',
      bottom: 50,
      left: SPACING.md,
      right: SPACING.md + 40,
      backgroundColor: '#ffffff',
      borderRadius: RADIUS.medium,
      maxHeight: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: '#e4e6eb',
    },
    mentionSuggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f2f5',
    },
    mentionSuggestionItemLast: {
      borderBottomWidth: 0,
    },
    mentionSuggestionImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: SPACING.sm,
    },
    mentionSuggestionName: {
      fontSize: 15,
      color: '#050505',
      fontFamily: FONTS.family,
    },
    commentMenuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      zIndex: 999,
    },
    optionsMenuText: {
      fontSize: 15,
      color: '#050505',
      fontFamily: FONTS.family,
    },
    optionsMenuTextDanger: {
      color: '#E74C3C',
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
          <FilterButton title="All" active={filter === 'All'} onPress={handleFilterAll} styles={styles} />
          <FilterButton title="Stray" active={filter === 'Stray'} onPress={handleFilterStray} styles={styles} />
          <FilterButton title="Lost" active={filter === 'Lost'} onPress={handleFilterLost} styles={styles} />
          <FilterButton title="Incident" active={filter === 'Incident'} onPress={handleFilterIncident} styles={styles} />
          <FilterButton title="Found" active={filter === 'Found'} onPress={handleFilterFound} styles={styles} />
        </ScrollView>
        </SafeAreaView>
      </View>

      {/* Stray Pets List - virtualized for performance */}
      <FlatList
        data={filteredReports}
        keyExtractor={useCallback((item) => item.id, [])}
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
        renderItem={useCallback(({ item }) => (
          <StrayPetCard
            report={item}
            reporter={reportUsers[item.userId]}
            navigation={navigation}
            onOpenChat={onOpenChat}
            onOpenComments={onOpenComments}
            commentsCount={commentsCount[item.id] || 0}
            styles={styles}
            COLORS={COLORS}
          />
        ), [reportUsers, navigation, onOpenChat, onOpenComments, commentsCount, styles, COLORS])}
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

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        onRequestClose={() => {
          setShowComments(false);
          setCommentMenuId(null);
          setEditingCommentId(null);
          setReplyingToCommentId(null);
          setReplyText('');
          setExpandedReplies({});
          setShowMentionSuggestions(false);
          setMentionQuery('');
          setMentionStartIndex(-1);
          setFilteredFriends([]);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <StatusBar barStyle="dark-content" />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.commentModal}>
              <View style={styles.commentModalHeader}>
                <Text style={styles.commentModalTitle}>Comments</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowComments(false);
                    setCommentMenuId(null);
                    setEditingCommentId(null);
                    setReplyingToCommentId(null);
                    setReplyText('');
                    setExpandedReplies({});
                    setShowMentionSuggestions(false);
                    setMentionQuery('');
                    setMentionStartIndex(-1);
                    setFilteredFriends([]);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={24} color="#050505" />
                </TouchableOpacity>
              </View>
            {commentMenuId && (
              <TouchableWithoutFeedback onPress={() => setCommentMenuId(null)}>
                <View style={styles.commentMenuOverlay} />
              </TouchableWithoutFeedback>
            )}
            <ScrollView 
              style={styles.commentList}
              onScrollBeginDrag={() => setCommentMenuId(null)}
            >
                {comments.map((comment) => {
                const isCommentOwner = user?.uid === comment.userId;
                const isReportOwner = user?.uid === selectedReport?.userId;
                const canDelete = isCommentOwner || isReportOwner;
                const canEdit = isCommentOwner;

                return (
                  <View key={comment.id} style={styles.commentItem}>
                    <TouchableOpacity
                      onPress={() => {
                        if (comment.userId && comment.userId !== user?.uid) {
                          navigation.navigate('Profile', { userId: comment.userId });
                        } else {
                          navigation.navigate('Profile');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                    {comment.userProfileImage ? (
                      <Image source={{ uri: comment.userProfileImage }} style={styles.commentProfileImage} />
                    ) : (
                      <View style={[styles.commentProfileImage, { backgroundColor: '#e4e6eb', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialIcons name="account-circle" size={32} color="#65676b" />
                      </View>
                    )}
                    </TouchableOpacity>
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <TouchableOpacity 
                          style={{ flex: 1 }}
                          onPress={() => {
                            if (comment.userId && comment.userId !== user?.uid) {
                              navigation.navigate('Profile', { userId: comment.userId });
                            } else {
                              navigation.navigate('Profile');
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.commentUserName} numberOfLines={1} ellipsizeMode="tail">
                            {comment.userName || 'Pet Lover'}
                          </Text>
                          {comment.createdAt && (
                            <Text style={styles.commentTime}>
                              {formatTime(comment.createdAt)}
                            </Text>
                          )}
                        </TouchableOpacity>
                        {(canEdit || canDelete) && (
                          <TouchableOpacity
                            style={styles.commentMenuButton}
                            onPress={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                          >
                            <MaterialIcons name="more-vert" size={18} color="#65676b" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {commentMenuId === comment.id && (canEdit || canDelete) && (
                        <>
                          <TouchableWithoutFeedback onPress={() => setCommentMenuId(null)}>
                            <View style={styles.commentMenuOverlay} />
                          </TouchableWithoutFeedback>
                          <View style={styles.commentMenu}>
                            {canEdit && (
                              <TouchableOpacity
                                style={styles.commentMenuItem}
                                onPress={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentText(comment.text);
                                  setCommentMenuId(null);
                                }}
                              >
                                <Text style={styles.optionsMenuText}>Edit</Text>
                              </TouchableOpacity>
                            )}
                            {canDelete && (
                              <TouchableOpacity
                                style={[styles.commentMenuItem, styles.commentMenuItemLast]}
                                onPress={() => {
                                  setCommentMenuId(null);
                                  handleDeleteComment(comment.id);
                                }}
                              >
                                <Text style={[styles.optionsMenuText, styles.optionsMenuTextDanger]}>Delete</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </>
                      )}

                      {editingCommentId === comment.id ? (
                        <View>
                          <TextInput
                            style={styles.commentEditInput}
                            value={editCommentText}
                            onChangeText={setEditCommentText}
                            multiline
                            autoFocus
                          />
                          <View style={styles.commentEditActions}>
                            <TouchableOpacity
                              style={styles.commentEditButton}
                              onPress={() => {
                                setEditingCommentId(null);
                                setEditCommentText('');
                              }}
                            >
                              <Text style={[styles.commentEditButtonText, { color: '#65676b' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.commentEditButton, { backgroundColor: '#1877f2' }]}
                              onPress={() => handleEditComment(comment.id)}
                            >
                              <Text style={[styles.commentEditButtonText, { color: '#ffffff' }]}>Save</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        renderTextWithMentions(comment.text, comment.mentionedUsers)
                      )}
                      
                      {/* Comment Actions (Like) */}
                      <View style={styles.commentActions}>
                        <TouchableOpacity
                          style={styles.commentActionButton}
                          onPress={() => handleLikeComment(comment.id)}
                          disabled={isLikingComment[comment.id]}
                        >
                          <MaterialIcons
                            name="thumb-up"
                            size={16}
                            color={commentLikes[comment.id]?.isLiked ? '#1877f2' : '#65676b'}
                            style={{ opacity: commentLikes[comment.id]?.isLiked ? 1 : 0.5 }}
                          />
                          {commentLikes[comment.id]?.count > 0 && (
                            <Text style={[styles.commentActionText, commentLikes[comment.id]?.isLiked && { color: '#1877f2' }]}>
                              {commentLikes[comment.id].count}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>

                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.commentInputContainer}>
                <View style={{ flex: 1, position: 'relative' }}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChangeText={handleCommentTextChange}
                  multiline
                  editable={!isSubmittingComment}
                />
                  {showMentionSuggestions && filteredFriends.length > 0 && (
                    <View style={styles.mentionSuggestionsContainer}>
                      <ScrollView nestedScrollEnabled>
                        {filteredFriends.map((friend, index) => (
                          <TouchableOpacity
                            key={friend.id}
                            style={[
                              styles.mentionSuggestionItem,
                              index === filteredFriends.length - 1 && styles.mentionSuggestionItemLast
                            ]}
                            onPress={() => handleSelectMention(friend)}
                            activeOpacity={0.7}
                          >
                            {friend.profileImage ? (
                              <Image 
                                source={{ uri: friend.profileImage }} 
                                style={styles.mentionSuggestionImage} 
                              />
                            ) : (
                              <View style={[styles.mentionSuggestionImage, { backgroundColor: '#e4e6eb', justifyContent: 'center', alignItems: 'center' }]}>
                                <MaterialIcons name="account-circle" size={40} color="#65676b" />
                              </View>
                            )}
                            <Text style={styles.mentionSuggestionName}>
                              {friend.displayName || friend.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={handleComment} 
                  disabled={isSubmittingComment || !commentText.trim()}
                  style={{ opacity: isSubmittingComment ? 0.6 : 1 }}
                >
                  {isSubmittingComment ? (
                    <ActivityIndicator color="#1877f2" size="small" />
                  ) : (
                    <MaterialIcons name="send" size={24} color={commentText.trim() ? '#1877f2' : '#bcc0c4'} />
                  )}
                </TouchableOpacity>
              </View>
          </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default StraysScreen; 