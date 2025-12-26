import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, where, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { FONTS, SPACING, RADIUS } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileImage } from '../contexts/ProfileImageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

const PostCard = ({ post, onPostDeleted, onPostHidden }) => {
  const { width } = useWindowDimensions();
  const user = auth.currentUser;
  const navigation = useNavigation();
  const { colors: COLORS } = useTheme();
  const { profileImage } = useProfileImage();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState(post.text || '');
  const [editImages, setEditImages] = useState([]); // Array of { uri, isNew, oldUrl }
  const [isUpdating, setIsUpdating] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [commentReportModalVisible, setCommentReportModalVisible] = useState(false);
  const [selectedCommentForReport, setSelectedCommentForReport] = useState(null);
  const [hiddenCommentIds, setHiddenCommentIds] = useState(new Set());
  const [isLiking, setIsLiking] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingCommentId, setSavingCommentId] = useState(null);
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});
  const [isLikingComment, setIsLikingComment] = useState({});
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedAllReplies, setExpandedAllReplies] = useState({});
  const [friends, setFriends] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [showReplyMentionSuggestions, setShowReplyMentionSuggestions] = useState({});
  const [mentionQuery, setMentionQuery] = useState('');
  const [replyMentionQueries, setReplyMentionQueries] = useState({});
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [replyMentionStartIndices, setReplyMentionStartIndices] = useState({});
  const [filteredFriends, setFilteredFriends] = useState([]);
  const [filteredReplyFriends, setFilteredReplyFriends] = useState({});
  const [commentInputRef, setCommentInputRef] = useState(null);
  const [replyInputRefs, setReplyInputRefs] = useState({});

  const isOwner = useMemo(() => user?.uid === post.userId, [user?.uid, post.userId]);

  // Helper function to extract @ mentions from text - memoized
  // Matches @username or @displayName patterns
  const extractMentions = useCallback((text) => {
    if (!text || typeof text !== 'string') return [];
    
    // Match @ followed by alphanumeric characters, underscores, or spaces
    // Pattern: @username or @display name (allows spaces)
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

  // Helper function to find user IDs from usernames/displayNames - memoized
  const findMentionedUserIds = useCallback(async (usernames) => {
    if (!usernames || usernames.length === 0) return [];
    
    const userIds = [];
    const uniqueUsernames = [...new Set(usernames)];
    
    try {
      // Search for users by displayName or name
      // Note: Firestore doesn't support case-insensitive search natively
      // We'll need to fetch and filter, or use a more sophisticated approach
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usernameMap = new Map();
      
      usersSnapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const displayName = (userData.displayName || userData.name || '').toLowerCase().trim();
        const name = (userData.name || '').toLowerCase().trim();
        
        // Create a map of lowercase usernames to user IDs
        if (displayName) {
          usernameMap.set(displayName, doc.id);
        }
        if (name && name !== displayName) {
          usernameMap.set(name, doc.id);
        }
      });
      
      // Match mentioned usernames to user IDs
      uniqueUsernames.forEach((mentionedUsername) => {
        const lowerMentioned = mentionedUsername.toLowerCase().trim();
        const userId = usernameMap.get(lowerMentioned);
        
        if (userId && !userIds.includes(userId)) {
          userIds.push(userId);
        }
      });
      
      return userIds;
    } catch (error) {
      console.error('Error finding mentioned user IDs:', error);
      return [];
    }
  }, []);

  // Helper function to send notifications to mentioned users - memoized
  const notifyMentionedUsers = useCallback(async (mentionedUserIds, commentText, commentId, isReply = false) => {
    if (!mentionedUserIds || mentionedUserIds.length === 0 || !user?.uid) return;
    
    const notificationService = NotificationService.getInstance();
    const currentUserName = user.displayName || 'Someone';
    
    // Filter out the current user (don't notify yourself)
    // Use String comparison to handle any type mismatches
    const usersToNotify = mentionedUserIds.filter(uid => 
      uid !== user.uid && String(uid) !== String(user.uid)
    );
    
    // Send notifications to each mentioned user
    await Promise.all(
      usersToNotify.map(async (mentionedUserId) => {
        try {
          await notificationService.createNotification({
            userId: mentionedUserId,
            type: isReply ? 'comment_mention_reply' : 'comment_mention',
            title: 'You were mentioned',
            body: `${currentUserName} mentioned you ${isReply ? 'reply' : 'comment'}: "${commentText.substring(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
            data: {
              postId: post.id,
              commentId: commentId,
              type: isReply ? 'comment_mention_reply' : 'comment_mention',
              mentionedBy: user.uid,
              mentionedByName: currentUserName,
            },
          });
        } catch (error) {
          // Error handled silently - notification is optional
          console.error('Error sending mention notification:', error);
        }
      })
    );
  }, [user, post.id]);

  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: '#ffffff',
      marginHorizontal: SPACING.md,
      marginTop: SPACING.md,
      borderRadius: 10,
      overflow: 'visible',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      justifyContent: 'space-between',
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    profileImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 10,
    },
    profilePlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#e4e6eb',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    userDetails: {
      flex: 1,
    },
    userName: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
      marginBottom: 2,
    },
    postTime: {
      fontSize: 12,
      color: '#65676b',
    },
    optionsButton: {
      padding: 4,
    },
    content: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    postText: {
      fontSize: 15,
      color: '#050505',
      lineHeight: 20,
      marginBottom: 12,
      fontFamily: FONTS.family,
    },
    imageContainer: {
      marginBottom: 12,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
    },
    singleImage: {
      width: '100%',
      height: 400,
      maxHeight: 600,
      borderRadius: 8,
    },
    twoImages: {
      width: (width - 48) / 2 - 1,
      height: (width - 48) / 2,
      borderRadius: 8,
    },
    gridImage: {
      width: (width - 48) / 2 - 1,
      height: (width - 48) / 2 - 1,
      borderRadius: 8,
    },
    gridImageRow: {
      flexDirection: 'row',
      gap: 2,
      marginBottom: 2,
    },
    gridImageRowLast: {
      flexDirection: 'row',
      gap: 2,
    },
    imageOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageCountText: {
      color: '#ffffff',
      fontSize: 28,
      fontWeight: '700',
      fontSize: 12,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: 8,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#65676b',
      marginLeft: 6,
    },
    actionTextLiked: {
      color: '#1877f2',
    },
    likesComments: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    likesText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#050505',
    },
    commentsText: {
      fontSize: 15,
      color: '#65676b',
    },
    optionsMenuOverlay: {
      position: 'absolute',
      top: -1000,
      left: -1000,
      right: -1000,
      bottom: -1000,
      zIndex: 998,
      backgroundColor: 'transparent',
    },
    optionsMenuContainer: {
      position: 'absolute',
      zIndex: 1001,
      pointerEvents: 'box-none',
      elevation: 1001,
    },
    optionsMenu: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 10,
      minWidth: 150,
      overflow: 'hidden',
    },
    optionsMenuItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    optionsMenuItemLast: {
      borderBottomWidth: 0,
    },
    optionsMenuText: {
      fontSize: 15,
      color: '#050505',
    },
    optionsMenuTextDanger: {
      color: '#dc2626',
    },
    commentModal: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    commentModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Math.max(16, width * 0.04),
      paddingTop: Platform.OS === 'ios' ? Math.max(8, width * 0.02) : Math.max(12, width * 0.03),
      paddingBottom: Math.max(12, width * 0.03),
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      minHeight: Platform.OS === 'ios' ? 60 : 56,
    },
    commentModalTitle: {
      fontSize: Math.max(18, width * 0.05),
      fontWeight: '700',
      color: '#050505',
      flex: 1,
    },
    commentList: {
      flex: 1,
      paddingHorizontal: Math.max(12, width * 0.03),
      paddingVertical: Math.max(12, width * 0.03),
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: Math.max(12, width * 0.03),
      width: '100%',
    },
    commentProfileImage: {
      width: Math.max(32, width * 0.08),
      height: Math.max(32, width * 0.08),
      borderRadius: Math.max(16, width * 0.04),
      marginRight: Math.max(8, width * 0.02),
      minWidth: 32,
      minHeight: 32,
    },
    commentContent: {
      flex: 1,
      backgroundColor: '#f0f2f5',
      borderRadius: 12,
      padding: Math.max(10, width * 0.025),
      minWidth: 0,
      flexShrink: 1,
      position: 'relative',
    },
    commentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    commentUserName: {
      fontSize: Math.max(13, width * 0.035),
      fontWeight: '600',
      color: '#050505',
      flex: 1,
    },
    commentTime: {
      fontSize: Math.max(11, width * 0.03),
      color: '#65676b',
      marginTop: 2,
    },
    commentMenuButton: {
      padding: 4,
    },
    commentText: {
      fontSize: Math.max(14, width * 0.038),
      color: '#050505',
      lineHeight: Math.max(20, width * 0.052),
      flexWrap: 'wrap',
    },
    commentMenuOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 998,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    commentMenu: {
      position: 'absolute',
      top: 30,
      right: 0,
      backgroundColor: '#ffffff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      minWidth: 120,
      zIndex: 1001,
      overflow: 'hidden',
    },
    commentMenuItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    commentMenuItemLast: {
      borderBottomWidth: 0,
    },
    commentEditInput: {
      backgroundColor: '#ffffff',
      borderRadius: 8,
      padding: Math.max(10, width * 0.025),
      fontSize: Math.max(14, width * 0.038),
      color: '#050505',
      borderWidth: 1,
      borderColor: '#e4e6eb',
      minHeight: 60,
      textAlignVertical: 'top',
      fontFamily: FONTS.family,
    },
    commentEditActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 8,
      gap: 8,
    },
    commentEditButton: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 6,
    },
    commentEditButtonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    commentActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 16,
    },
    commentActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    commentActionText: {
      fontSize: 12,
      color: '#65676b',
      fontWeight: '600',
    },
    replyContainer: {
      marginTop: 12,
      paddingLeft: Math.max(40, width * 0.1),
      borderLeftWidth: 2,
      borderLeftColor: '#e4e6eb',
      width: '100%',
      flexShrink: 1,
      overflow: 'hidden',
    },
    replyItem: {
      flexDirection: 'row',
      marginBottom: Math.max(12, width * 0.03),
      width: '100%',
      flexShrink: 1,
    },
    replyInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 8,
    },
    replyInput: {
      flex: 1,
      backgroundColor: '#ffffff',
      borderRadius: 20,
      paddingHorizontal: Math.max(12, width * 0.03),
      paddingVertical: Math.max(8, width * 0.02),
      fontSize: Math.max(14, width * 0.038),
      borderWidth: 1,
      borderColor: '#e4e6eb',
      fontFamily: FONTS.family,
    },
    viewRepliesButton: {
      marginTop: 4,
    },
    viewRepliesText: {
      fontSize: 12,
      color: '#1877f2',
      fontWeight: '600',
    },
    viewMoreRepliesButton: {
      marginTop: 8,
      paddingVertical: 4,
    },
    viewMoreRepliesText: {
      fontSize: 13,
      color: '#1877f2',
      fontWeight: '600',
    },
    commentInputContainer: {
      flexDirection: 'row',
      paddingHorizontal: Math.max(12, width * 0.03),
      paddingVertical: Math.max(12, width * 0.03),
      borderTopWidth: 1,
      borderTopColor: '#e4e6eb',
      alignItems: 'center',
      minHeight: 60,
    },
    commentInput: {
      flex: 1,
      backgroundColor: '#f0f2f5',
      borderRadius: 20,
      paddingHorizontal: Math.max(12, width * 0.03),
      paddingVertical: Math.max(8, width * 0.02),
      marginRight: Math.max(8, width * 0.02),
      fontSize: Math.max(14, width * 0.038),
      maxHeight: 100,
      minHeight: 40,
    },
    editModal: {
      flex: 1,
      backgroundColor: '#ffffff',
    },
    reportModalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
      zIndex: 2000,
    },
    reportModalContent: {
      width: '100%',
      backgroundColor: '#f0f2f5',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: SPACING.lg,
      paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    reportModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#000000', // Using literal color since COLORS.text might be undefined in style block if not memoized with theme, but wait, styles is useMemo(() => StyleSheet.create(...), [COLORS]) so COLORS is available.
      textAlign: 'center',
      marginBottom: SPACING.xs,
    },
    reportModalSubtitle: {
      fontSize: 14,
      color: '#65676b', // COLORS.secondaryText
      textAlign: 'center',
      marginBottom: SPACING.lg,
    },
    reportOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    reportOptionText: {
      fontSize: 16,
      color: '#FF3B30', // COLORS.error
      fontWeight: '500',
    },
    reportCancelButton: {
      marginTop: SPACING.lg,
      alignItems: 'center',
      padding: SPACING.md,
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.medium,
      borderWidth: 1,
      borderColor: '#e4e6eb',
    },
    reportCancelText: {
      fontSize: 16,
      color: '#050505', // COLORS.text
      fontWeight: '600',
    },
    editModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Math.max(16, width * 0.04),
      paddingTop: Platform.OS === 'ios' ? Math.max(8, width * 0.02) : Math.max(16, width * 0.04),
      paddingBottom: Math.max(16, width * 0.04),
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
      minHeight: Platform.OS === 'ios' ? 60 : 56,
    },
    editTextInput: {
      fontSize: 15,
      color: '#050505',
      padding: 16,
      textAlignVertical: 'top',
      minHeight: 200,
      fontFamily: FONTS.family,
    },
    editImageContainer: {
      padding: 16,
      paddingTop: 0,
    },
    editImageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    editImageWrapper: {
      position: 'relative',
      width: (width - 64) / 3,
      height: (width - 64) / 3,
      borderRadius: 8,
      overflow: 'hidden',
    },
    editSelectedImage: {
      width: '100%',
      height: '100%',
    },
    editRemoveImageButton: {
      position: 'absolute',
      top: 4,
      right: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editAddImageButton: {
      width: (width - 64) / 3,
      height: (width - 64) / 3,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#e4e6eb',
      borderStyle: 'dashed',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f0f2f5',
    },
    imageModal: {
      flex: 1,
      backgroundColor: '#000000',
    },
    imageModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Math.max(16, width * 0.04),
      paddingTop: Platform.OS === 'ios' ? Math.max(8, width * 0.02) : Math.max(16, width * 0.04),
      paddingBottom: Math.max(16, width * 0.04),
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      minHeight: Platform.OS === 'ios' ? 60 : 56,
    },
    imageModalImage: {
      width: width,
      height: '100%',
      resizeMode: 'contain',
    },
    mentionSuggestionsContainer: {
      position: 'absolute',
      bottom: 60,
      left: Math.max(12, width * 0.03),
      right: Math.max(12, width * 0.03),
      backgroundColor: '#ffffff',
      borderRadius: 8,
      maxHeight: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 1000,
      borderWidth: 1,
      borderColor: '#e4e6eb',
    },
    mentionSuggestionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: Math.max(12, width * 0.03),
      borderBottomWidth: 1,
      borderBottomColor: '#e4e6eb',
    },
    mentionSuggestionItemLast: {
      borderBottomWidth: 0,
    },
    mentionSuggestionImage: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    mentionSuggestionName: {
      fontSize: Math.max(15, width * 0.04),
      color: '#050505',
      fontWeight: '500',
      flex: 1,
    },
    mentionLink: {
      color: '#1877f2',
      fontWeight: '500',
    },
  }), [COLORS, width]);

  useEffect(() => {
    // Update like state and count when post.likes changes
    if (post.likes && Array.isArray(post.likes)) {
      // Remove duplicates to ensure accurate count
      const uniqueLikes = [...new Set(post.likes)];
      setLikesCount(uniqueLikes.length);
      if (user?.uid) {
        setIsLiked(uniqueLikes.includes(user.uid));
      }
    } else {
      setLikesCount(0);
      setIsLiked(false);
    }
  }, [post.likes, user?.uid]);

  useEffect(() => {
    if (showComments) {
      loadComments();
      
      // Set up real-time listener for comments
      const commentsQuery = query(
        collection(db, 'post_comments'),
        where('postId', '==', post.id)
      );
      
      const unsubscribe = onSnapshot(commentsQuery, async (snapshot) => {
        const commentsData = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const commentData = { id: doc.id, ...doc.data() };
            // Ensure likes array exists
            if (!commentData.likes) {
              commentData.likes = [];
            }
            // Fetch latest user data
            if (commentData.userId) {
              try {
                const userDoc = await getDoc(doc(db, 'users', commentData.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  commentData.userName = userData.displayName || userData.name || commentData.userName || 'Pet Lover';
                  commentData.userProfileImage = userData.profileImage || null;
                }
              } catch (error) {
                // Error handled silently - use existing data
              }
            }
            return commentData;
          })
        );
        
        // Separate top-level comments and replies
        const topLevelComments = commentsData.filter(c => !c.parentCommentId);
        const replies = commentsData.filter(c => c.parentCommentId);
        
        // Sort top-level comments
        const sortedComments = topLevelComments.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return aTime - bTime;
        });
        
        // Helper function to count all nested replies recursively
        const countAllReplies = (commentId) => {
          const directReplies = replies.filter(r => r.parentCommentId === commentId);
          let total = directReplies.length;
          directReplies.forEach(reply => {
            total += countAllReplies(reply.id);
          });
          return total;
        };

        // Helper function to build nested reply structure
        const buildReplyTree = (parentId) => {
          return replies
            .filter(r => r.parentCommentId === parentId)
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
              const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
              return aTime - bTime;
            })
            .map(reply => ({
              ...reply,
              replies: buildReplyTree(reply.id)
            }));
        };

        // Attach replies to their parent comments with nested structure
        const commentsWithReplies = sortedComments.map(comment => ({
          ...comment,
          replies: buildReplyTree(comment.id),
          totalRepliesCount: countAllReplies(comment.id)
        }));
        
        setComments(commentsWithReplies);
        // Count all comments including replies
        setCommentsCount(commentsData.length);
        
        // Update comment likes state
        const likesState = {};
        commentsData.forEach(comment => {
          if (comment.likes && Array.isArray(comment.likes)) {
            const uniqueLikes = [...new Set(comment.likes)];
            likesState[comment.id] = {
              count: uniqueLikes.length,
              isLiked: user?.uid ? uniqueLikes.includes(user.uid) : false
            };
          } else {
            likesState[comment.id] = { count: 0, isLiked: false };
          }
        });
        setCommentLikes(likesState);
      });
      
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  // Load comments count on mount and when post changes
  useEffect(() => {
    loadCommentsCount();
  }, [post.id]);

  // Load user's friends list
  useEffect(() => {
    if (!user?.uid) return;

    const friendsQuery = query(
      collection(db, 'friends'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      friendsQuery,
      async (snapshot) => {
        const friendsList = [];
        
        // Check each friend's status to filter out banned users
        for (const docSnapshot of snapshot.docs) {
          const friendId = docSnapshot.data().friendId;
          try {
            const friendUserDoc = await getDoc(doc(db, 'users', friendId));
            if (friendUserDoc.exists()) {
              const friendUserData = friendUserDoc.data();
              // Only include friends who are not banned
              if (friendUserData.status !== 'banned') {
                const friendName = docSnapshot.data().friendName || friendUserData.displayName || friendUserData.name || 'Unknown';
                friendsList.push({
                  id: friendId,
                  name: friendName,
                  displayName: friendUserData.displayName || friendUserData.name || friendName,
                  profileImage: docSnapshot.data().friendProfileImage || friendUserData.profileImage || null,
                });
              }
            } else {
              // If user doc doesn't exist, still add friend (might be deleted user)
              friendsList.push({
                id: friendId,
                name: docSnapshot.data().friendName || 'Unknown',
                displayName: docSnapshot.data().friendName || 'Unknown',
                profileImage: docSnapshot.data().friendProfileImage || null,
              });
            }
          } catch (error) {
            console.error(`Error checking friend status for ${friendId}:`, error);
            // On error, still include the friend
            friendsList.push({
              id: friendId,
              name: docSnapshot.data().friendName || 'Unknown',
              displayName: docSnapshot.data().friendName || 'Unknown',
              profileImage: docSnapshot.data().friendProfileImage || null,
            });
          }
        }
        
        setFriends(friendsList);
      },
      (error) => {
        console.error('Error fetching friends:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const loadCommentsCount = async () => {
    try {
      // Count all comments including replies
      const commentsQuery = query(
        collection(db, 'post_comments'),
        where('postId', '==', post.id)
      );
      const snapshot = await getDocs(commentsQuery);
      setCommentsCount(snapshot.docs.length);
    } catch (error) {
      console.error('Error loading comments count:', error);
    }
  };

  const loadComments = async () => {
    try {
      const commentsQuery = query(
        collection(db, 'post_comments'),
        where('postId', '==', post.id)
      );
      const snapshot = await getDocs(commentsQuery);
      
      // Fetch latest user data for each comment
      const commentsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const commentData = { id: doc.id, ...doc.data() };
          // Fetch latest user data from Firestore
          if (commentData.userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', commentData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                commentData.userName = userData.displayName || userData.name || commentData.userName || 'Pet Lover';
                commentData.userProfileImage = userData.profileImage || commentData.userProfileImage || null;
              }
            } catch (error) {
              // Error handled silently - use existing data
            }
          }
          return commentData;
        })
      );
      
      // Separate top-level comments and replies
      const topLevelComments = commentsData.filter(c => !c.parentCommentId);
      const replies = commentsData.filter(c => c.parentCommentId);
      
      // Sort top-level comments
      const sortedComments = topLevelComments.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return aTime - bTime;
      });
      
      // Helper function to count all nested replies recursively
      const countAllReplies = (commentId) => {
        const directReplies = replies.filter(r => r.parentCommentId === commentId);
        let total = directReplies.length;
        directReplies.forEach(reply => {
          total += countAllReplies(reply.id);
        });
        return total;
      };

      // Helper function to build nested reply structure
      const buildReplyTree = (parentId) => {
        return replies
          .filter(r => r.parentCommentId === parentId)
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return aTime - bTime;
          })
          .map(reply => ({
            ...reply,
            replies: buildReplyTree(reply.id)
          }));
      };

      // Attach replies to their parent comments with nested structure
      const commentsWithReplies = sortedComments.map(comment => ({
        ...comment,
        replies: buildReplyTree(comment.id),
        totalRepliesCount: countAllReplies(comment.id)
      }));
      
      setComments(commentsWithReplies);
      // Count all comments including replies
      setCommentsCount(commentsData.length);
      
      // Update comment likes state
      const likesState = {};
      commentsData.forEach(comment => {
        if (comment.likes && Array.isArray(comment.likes)) {
          const uniqueLikes = [...new Set(comment.likes)];
          likesState[comment.id] = {
            count: uniqueLikes.length,
            isLiked: user?.uid ? uniqueLikes.includes(user.uid) : false
          };
        } else {
          likesState[comment.id] = { count: 0, isLiked: false };
        }
      });
      setCommentLikes(likesState);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = useCallback(async () => {
    if (!user?.uid || isLiking) return;

    // Prevent duplicate likes by checking if user is already in the array
    const currentLikes = post.likes || [];
    const alreadyLiked = currentLikes.includes(user.uid);
    const newLiked = !alreadyLiked;

    setIsLiking(true);
    try {
      const postRef = doc(db, 'posts', post.id);

      if (newLiked) {
        // Only add if not already in the array
        if (!alreadyLiked) {
          await updateDoc(postRef, {
            likes: arrayUnion(user.uid)
          });
        }

        // Send notification to post owner if not the same user
        if (post.userId && post.userId !== user.uid) {
          try {
            const notificationService = NotificationService.getInstance();
            await notificationService.createNotification({
              userId: post.userId,
              type: 'post_like',
              title: 'New Like',
              body: `${user.displayName || 'Someone'} liked your post`,
              data: {
                postId: post.id,
                type: 'post_like',
                likedBy: user.uid,
                likedByName: user.displayName || 'Someone',
              },
            });
          } catch (notifError) {
            // Error handled silently - notification is optional
          }
        }
      } else {
        // Only remove if already in the array
        if (alreadyLiked) {
          await updateDoc(postRef, {
            likes: arrayRemove(user.uid)
          });
        }
      }
      // Don't update local state - let useEffect handle it when post.likes updates
    } catch (error) {
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLiking(false);
    }
  }, [user, post, isLiking]);

  const handleComment = useCallback(async () => {
    if (!commentText.trim() || !user?.uid) return;

    setIsSubmittingComment(true);
    try {
      // Fetch current user data from Firestore
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
        // Error handled silently - use existing values
      }

      // Extract @ mentions from comment text
      const mentionedUsernames = extractMentions(commentText.trim());
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        mentionedUserIds = await findMentionedUserIds(mentionedUsernames);
      }

      // Create comment document
      const commentRef = await addDoc(collection(db, 'post_comments'), {
        postId: post.id,
        userId: user.uid,
        userName: currentUserName,
        userProfileImage: currentUserProfileImage,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        parentCommentId: null, // Top-level comment
        mentionedUsers: mentionedUserIds, // Store mentioned user IDs
      });

      // Send notification to post owner if not the same user and not mentioned
      // Only notify post owner if they weren't already mentioned
      // IMPORTANT: Don't notify if the current user is the post owner
      if (post.userId && 
          post.userId !== user.uid && 
          String(post.userId) !== String(user.uid) &&
          !mentionedUserIds.includes(post.userId)) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: post.userId,
            type: 'post_comment',
            title: 'New Comment',
            body: `${currentUserName} commented on your post: "${commentText.trim().substring(0, 50)}${commentText.trim().length > 50 ? '...' : ''}"`,
            data: {
              postId: post.id,
              type: 'post_comment',
              commentedBy: user.uid,
              commentedByName: currentUserName,
            },
          });
        } catch (notifError) {
          // Error handled silently - notification is optional
        }
      }

      // Send notifications to mentioned users ONLY (not all users)
      if (mentionedUserIds.length > 0) {
        await notifyMentionedUsers(mentionedUserIds, commentText.trim(), commentRef.id, false);
      }

      // Clear comment text and mention suggestions
      setCommentText('');
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      setFilteredFriends([]);
      
      await loadComments();
      // Update comment count
      await loadCommentsCount();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  }, [user, post, commentText, profileImage, extractMentions, findMentionedUserIds, notifyMentionedUsers, loadComments, loadCommentsCount]);

  const handleEditComment = useCallback(async (commentId) => {
    if (!editCommentText.trim()) {
      Alert.alert('Error', 'Comment text cannot be empty.');
      return;
    }

    setSavingCommentId(commentId);
    try {
      // Extract @ mentions from edited comment text
      const mentionedUsernames = extractMentions(editCommentText.trim());
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        mentionedUserIds = await findMentionedUserIds(mentionedUsernames);
      }

      const commentRef = doc(db, 'post_comments', commentId);
      await updateDoc(commentRef, {
        text: editCommentText.trim(),
        updatedAt: serverTimestamp(),
        mentionedUsers: mentionedUserIds, // Update mentioned user IDs
      });

      // Send notifications to newly mentioned users (only if they weren't already mentioned)
      // Get the original comment to check previous mentions
      const originalCommentDoc = await getDoc(commentRef);
      const originalCommentData = originalCommentDoc.data();
      const previousMentions = originalCommentData?.mentionedUsers || [];
      
      // Find newly mentioned users (not in previous mentions)
      const newMentions = mentionedUserIds.filter(uid => !previousMentions.includes(uid));
      
      if (newMentions.length > 0) {
        await notifyMentionedUsers(newMentions, editCommentText.trim(), commentId, false);
      }

      setEditingCommentId(null);
      setEditCommentText('');
      await loadComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    } finally {
      setSavingCommentId(null);
    }
  }, [editCommentText, extractMentions, findMentionedUserIds, notifyMentionedUsers, loadComments]);

  const handleLikeComment = useCallback(async (commentId) => {
    if (!user?.uid || isLikingComment[commentId]) return;

    setIsLikingComment(prev => ({ ...prev, [commentId]: true }));
    try {
      const commentRef = doc(db, 'post_comments', commentId);
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
          
          // Send notification to comment owner if not the same user
          // IMPORTANT: Don't notify if the current user is the comment owner
          if (commentData.userId && 
              commentData.userId !== user.uid &&
              String(commentData.userId) !== String(user.uid)) {
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
                userId: commentData.userId,
                type: 'comment_like',
                title: 'New Like',
                body: `${likerName} liked your comment`,
                data: {
                  postId: post.id,
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
    } catch (error) {
      Alert.alert('Error', 'Failed to update like. Please try again.');
    } finally {
      setIsLikingComment(prev => ({ ...prev, [commentId]: false }));
    }
  }, [user, post, isLikingComment]);

  const handleReply = useCallback(async (parentCommentId) => {
    if (!replyText.trim() || !user?.uid) return;

    setIsSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));
    try {
      // Fetch current user data from Firestore
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

      // Extract @ mentions from reply text
      const mentionedUsernames = extractMentions(replyText.trim());
      let mentionedUserIds = [];
      
      if (mentionedUsernames.length > 0) {
        mentionedUserIds = await findMentionedUserIds(mentionedUsernames);
      }

      // Get parent comment to find the original comment owner
      const parentCommentDoc = await getDoc(doc(db, 'post_comments', parentCommentId));
      const parentCommentData = parentCommentDoc.data();
      const originalCommentId = parentCommentData?.parentCommentId || parentCommentId;
      const originalCommentDoc = await getDoc(doc(db, 'post_comments', originalCommentId));
      const originalCommentData = originalCommentDoc.data();

      // Create reply document
      const replyRef = await addDoc(collection(db, 'post_comments'), {
        postId: post.id,
        userId: user.uid,
        userName: currentUserName,
        userProfileImage: currentUserProfileImage,
        text: replyText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        parentCommentId: parentCommentId,
        mentionedUsers: mentionedUserIds, // Store mentioned user IDs
      });

      // Send notification to parent comment owner if not the same user
      // IMPORTANT: Don't notify if the current user is the parent comment owner
      if (parentCommentData?.userId && 
          parentCommentData.userId !== user.uid &&
          String(parentCommentData.userId) !== String(user.uid)) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: parentCommentData.userId,
            type: 'comment_reply',
            title: 'New Reply',
            body: `${currentUserName} replied to your comment`,
            data: {
              postId: post.id,
              commentId: parentCommentId,
              type: 'comment_reply',
              repliedBy: user.uid,
              repliedByName: currentUserName,
            },
          });
        } catch (notifError) {
          // Error handled silently
        }
      }

      // Also notify original comment owner if different from parent
      // IMPORTANT: Don't notify if the current user is the original comment owner
      if (originalCommentData?.userId && 
          originalCommentData.userId !== parentCommentData?.userId && 
          originalCommentData.userId !== user.uid &&
          String(originalCommentData.userId) !== String(user.uid)) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: originalCommentData.userId,
            type: 'comment_reply',
            title: 'New Reply',
            body: `${currentUserName} replied to a comment on your post`,
            data: {
              postId: post.id,
              commentId: originalCommentId,
              type: 'comment_reply',
              repliedBy: user.uid,
              repliedByName: currentUserName,
            },
          });
        } catch (notifError) {
          // Error handled silently
        }
      }

      // Send notifications to mentioned users
      if (mentionedUserIds.length > 0) {
        await notifyMentionedUsers(mentionedUserIds, replyText.trim(), replyRef.id, true);
      }

      // Clear reply text and mention suggestions
      setReplyText('');
      setReplyingToCommentId(null);
      setShowReplyMentionSuggestions({});
      setReplyMentionQueries({});
      setReplyMentionStartIndices({});
      setFilteredReplyFriends({});
      
      await loadComments();
    } catch (error) {
      console.error('Error adding reply:', error);
      Alert.alert('Error', 'Failed to add reply. Please try again.');
    } finally {
      setIsSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  }, [user, post, replyText, profileImage, extractMentions, findMentionedUserIds, notifyMentionedUsers, loadComments]);

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
              await deleteDoc(doc(db, 'post_comments', commentId));
              await loadComments();
              await loadCommentsCount();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete comment. Please try again.');
            }
          }
        }
      ]
    );
  }, [loadComments, loadCommentsCount]);

  // Initialize edit images when opening edit modal - memoized
  const openEditModal = useCallback(() => {
    const initialImages = (post.images || []).map(url => ({
      uri: url,
      isNew: false,
      oldUrl: url
    }));
    setEditImages(initialImages);
    setEditText(post.text || '');
    setShowEditModal(true);
  }, [post]);

  // Select images for editing - memoized
  const selectEditImages = useCallback(async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({ 
          uri: asset.uri,
          isNew: true 
        }));
        setEditImages(prev => [...prev, ...newImages].slice(0, 10)); // Limit to 10 images
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  }, []);

  // Remove image from edit list - memoized
  const removeEditImage = useCallback((index) => {
    setEditImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEdit = useCallback(async () => {
    // Both text and images are optional, but at least one must be present
    if (!editText.trim() && editImages.length === 0) {
      Alert.alert('Error', 'Post must have text or images.');
      return;
    }

    setIsUpdating(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      
      // Upload new images and get URLs
      const imageUrls = [];
      const oldUrlsToDelete = [];
      
      for (const image of editImages) {
        if (image.isNew) {
          // Upload new image
          try {
            const response = await fetch(image.uri);
            const blob = await response.blob();
            const imageRef = ref(storage, `posts/${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`);
            await uploadBytes(imageRef, blob);
            const downloadURL = await getDownloadURL(imageRef);
            imageUrls.push(downloadURL);
          } catch (error) {
            console.error('Error uploading image:', error);
          }
        } else {
          // Keep existing image
          imageUrls.push(image.oldUrl);
        }
      }

      // Find images that were removed (in original post but not in editImages)
      const originalUrls = post.images || [];
      const keptUrls = editImages.filter(img => !img.isNew).map(img => img.oldUrl);
      const removedUrls = originalUrls.filter(url => !keptUrls.includes(url));
      
      // Try to delete removed images from storage (may fail if URL format doesn't match)
      // This is optional - old images will remain in storage but won't be referenced
      for (const url of removedUrls) {
        try {
          // Try to extract path from Firebase Storage URL
          // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
          const urlMatch = url.match(/\/o\/([^?]+)/);
          if (urlMatch) {
            const encodedPath = urlMatch[1];
            const decodedPath = decodeURIComponent(encodedPath);
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
          }
        } catch (error) {
          // Error handled silently - image may not exist, already deleted, or URL format doesn't match
          console.error('Error deleting image:', error);
        }
      }

      // Update post with new text and images
      await updateDoc(postRef, {
        text: editText.trim() || '',
        images: imageUrls.length > 0 ? imageUrls : [],
        updatedAt: serverTimestamp(),
      });
      
      setShowEditModal(false);
      Alert.alert('Success', 'Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  }, [post, editText, editImages, user, onPostDeleted]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mark post as deleted instead of actually deleting it
              await updateDoc(doc(db, 'posts', post.id), {
                deleted: true,
                deletedAt: serverTimestamp(),
              });
              if (onPostDeleted) onPostDeleted(post.id);
              Alert.alert('Success', 'Post deleted successfully!');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete post. Please try again.');
            }
          }
        }
      ]
    );
  }, [post, user, onPostDeleted]);

  const handleReport = useCallback(() => {
    setShowOptionsMenu(false);
    setTimeout(() => {
      setReportModalVisible(true);
    }, 500);
  }, []);

  const submitReport = useCallback(async (reason) => {
    if (!user) return;

    // Show confirmation dialog before submitting
    Alert.alert(
      'Confirm Report',
      `Are you sure you want to report this post for "${reason}"? This action cannot be undone and the post will be hidden from your feed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // User cancelled, do nothing
          }
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            // User confirmed, proceed with report submission
            try {
              await addDoc(collection(db, 'post_reports'), {
                postId: post.id,
                postContent: post.text || '',
                postImages: post.images || [],
                postOwnerId: post.userId,
                postOwnerName: post.userName || 'Unknown',
                reportedBy: user.uid,
                reportedByName: user.displayName || 'Unknown',
                reportedAt: serverTimestamp(),
                reason: reason,
                status: 'pending'
              });

              // Hide the reported post from the user who reported it
              try {
                const hiddenPosts = await AsyncStorage.getItem('hidden_posts');
                const hiddenArray = hiddenPosts ? JSON.parse(hiddenPosts) : [];
                if (!hiddenArray.includes(post.id)) {
                  hiddenArray.push(post.id);
                  await AsyncStorage.setItem('hidden_posts', JSON.stringify(hiddenArray));
                  if (onPostHidden) onPostHidden(post.id);
                }
              } catch (hideError) {
                console.error('Error hiding post:', hideError);
                // Don't fail the report submission if hiding fails
              }

              setReportModalVisible(false);
              Alert.alert('Reported', 'Thank you for reporting. We will review this post.');
            } catch (error) {
              console.error('Error reporting post:', error);
              Alert.alert('Error', 'Failed to report post. Please try again.');
            }
          }
        }
      ]
    );
  }, [user, post, onPostHidden]);

  const handleHide = useCallback(async () => {
    try {
      const hiddenPosts = await AsyncStorage.getItem('hidden_posts');
      const hiddenArray = hiddenPosts ? JSON.parse(hiddenPosts) : [];
      if (!hiddenArray.includes(post.id)) {
        hiddenArray.push(post.id);
        await AsyncStorage.setItem('hidden_posts', JSON.stringify(hiddenArray));
        if (onPostHidden) onPostHidden(post.id);
        Alert.alert('Hidden', 'Post has been hidden from your feed.');
      }
      setShowOptionsMenu(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to hide post. Please try again.');
    }
  }, [post, onPostHidden]);

  // Handle comment text change and detect @ mentions - memoized
  const handleCommentTextChange = useCallback((text) => {
    setCommentText(text);
    
    // Find the last @ symbol and check if we're in a mention
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Get text after the @ symbol
      const textAfterAt = text.substring(lastAtIndex + 1);
      
      // Check if there's a space in the text after @
      const spaceIndex = textAfterAt.indexOf(' ');
      
      // Only show suggestions if we're actively typing a mention (no space yet, or space but we're before it)
      if (spaceIndex === -1) {
        // No space found after @ - we're actively typing a mention
        const query = textAfterAt;
        if (query.length > 0) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          
          // Filter friends based on query
          const filtered = friends.filter(friend => {
            const name = (friend.displayName || friend.name || '').toLowerCase();
            return name.includes(query.toLowerCase());
          });
          setFilteredFriends(filtered.slice(0, 10)); // Limit to 10 results
        } else {
          // Just @ with no text yet - show all friends
          setMentionQuery('');
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          setFilteredFriends(friends.slice(0, 10));
        }
      } else if (spaceIndex > 0) {
        // There's text before the space - check if mention is complete
        const query = textAfterAt.substring(0, spaceIndex);
        const textAfterSpace = textAfterAt.substring(spaceIndex + 1);
        
        // Only show dropdown if:
        // 1. There's actual text in the query (not just spaces)
        // 2. There's NO text after the space (meaning we're still typing the mention, cursor is before space)
        // If there's text after the space, the mention is complete - hide dropdown
        if (query.trim().length > 0 && textAfterSpace.trim().length === 0) {
          // We're typing a mention name, no text after space yet - show suggestions
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setShowMentionSuggestions(true);
          
          // Filter friends based on query
          const filtered = friends.filter(friend => {
            const name = (friend.displayName || friend.name || '').toLowerCase();
            return name.includes(query.toLowerCase());
          });
          setFilteredFriends(filtered.slice(0, 10)); // Limit to 10 results
        } else {
          // Mention is complete (has text after space) or invalid - hide suggestions
          setShowMentionSuggestions(false);
          setMentionQuery('');
          setMentionStartIndex(-1);
        }
      } else {
        // Space immediately after @ (spaceIndex === 0) - mention is complete or invalid
        // OR there's a space after a completed mention - hide suggestions
        setShowMentionSuggestions(false);
        setMentionQuery('');
        setMentionStartIndex(-1);
      }
    } else {
      // No @ symbol found - hide suggestions
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  }, [friends]);

  // Handle reply text change and detect @ mentions - memoized
  const handleReplyTextChange = useCallback((text, parentCommentId) => {
    // Update reply text for the specific parent comment
    setReplyText(text);
    
    // Find the last @ symbol and check if we're in a mention
    const lastAtIndex = text.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if there's a space after @ (meaning mention is complete)
      const textAfterAt = text.substring(lastAtIndex + 1);
      const spaceIndex = textAfterAt.indexOf(' ');
      
      if (spaceIndex === -1 || spaceIndex > 0) {
        // We're in a mention - extract the query
        const query = spaceIndex === -1 ? textAfterAt : textAfterAt.substring(0, spaceIndex);
        setReplyMentionQueries(prev => ({ ...prev, [parentCommentId]: query }));
        setReplyMentionStartIndices(prev => ({ ...prev, [parentCommentId]: lastAtIndex }));
        setShowReplyMentionSuggestions(prev => ({ ...prev, [parentCommentId]: true }));
        
        // Filter friends based on query
        const filtered = friends.filter(friend => {
          const name = (friend.displayName || friend.name || '').toLowerCase();
          return name.includes(query.toLowerCase());
        });
        setFilteredReplyFriends(prev => ({ ...prev, [parentCommentId]: filtered.slice(0, 10) }));
      } else {
        setShowReplyMentionSuggestions(prev => ({ ...prev, [parentCommentId]: false }));
      }
    } else {
      setShowReplyMentionSuggestions(prev => ({ ...prev, [parentCommentId]: false }));
    }
  }, [friends]);

  // Handle friend selection from mention suggestions - memoized
  const handleSelectMention = useCallback((friend, isReply = false, parentCommentId = null) => {
    const friendName = friend.displayName || friend.name;
    
    if (isReply && parentCommentId) {
      // Handle reply text
      const currentText = replyText;
      const startIndex = replyMentionStartIndices[parentCommentId] || 0;
      const query = replyMentionQueries[parentCommentId] || '';
      const beforeMention = currentText.substring(0, startIndex);
      const afterMention = currentText.substring(startIndex + 1 + query.length);
      const newText = `${beforeMention}@${friendName} ${afterMention}`;
      setReplyText(newText);
      
      // Hide suggestions immediately
      setShowReplyMentionSuggestions(prev => ({ ...prev, [parentCommentId]: false }));
      setReplyMentionQueries(prev => {
        const updated = { ...prev };
        delete updated[parentCommentId];
        return updated;
      });
      setReplyMentionStartIndices(prev => {
        const updated = { ...prev };
        delete updated[parentCommentId];
        return updated;
      });
    } else {
      // Handle comment text
      const currentText = commentText;
      const beforeMention = currentText.substring(0, mentionStartIndex);
      const afterMention = currentText.substring(mentionStartIndex + 1 + mentionQuery.length);
      const newText = `${beforeMention}@${friendName} ${afterMention}`;
      
      // Hide suggestions immediately before updating text
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      
      // Update text after hiding suggestions to prevent re-triggering
      setCommentText(newText);
    }
  }, [commentText, mentionStartIndex, mentionQuery, replyText, replyMentionStartIndices, replyMentionQueries]);

  // Render text with clickable @ mentions - memoized
  const renderTextWithMentions = useCallback((text, mentionedUserIds = [], textStyle = styles.commentText) => {
    if (!text) return null;

    // Improved regex: @ followed by word characters (letters, numbers, underscore) or spaces
    // Stops at whitespace, punctuation, or end of string
    const mentionRegex = /@([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let mentionIndex = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, match.index),
        });
      }

      // Add the mention (only the @username part)
      const mentionName = match[1].trim();
      const userId = mentionedUserIds && mentionedUserIds.length > mentionIndex 
        ? mentionedUserIds[mentionIndex] 
        : null;
      
      parts.push({
        type: 'mention',
        content: `@${mentionName}`,
        mentionName: mentionName,
        userId: userId,
      });

      mentionIndex++;
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex),
      });
    }

    // If no mentions found, return plain text
    if (parts.length === 0 || (parts.length === 1 && parts[0].type === 'text')) {
      return <Text style={textStyle}>{text}</Text>;
    }

    // Render with clickable mentions - only mentions are styled as links
    return (
      <Text style={textStyle}>
        {parts.map((part, index) => {
          if (part.type === 'mention') {
            return (
              <Text
                key={`mention-${index}`}
                style={[textStyle, styles.mentionLink]}
                onPress={async () => {
                  // If we have the user ID directly, use it
                  if (part.userId) {
                    navigation.navigate('Profile', { userId: part.userId });
                    return;
                  }

                  // Otherwise, try to find by name in friends list first
                  const friend = friends.find(
                    f => (f.displayName || f.name || '').toLowerCase() === part.mentionName.toLowerCase()
                  );
                  
                  if (friend) {
                    navigation.navigate('Profile', { userId: friend.id });
                  } else {
                    // If not in friends, search all users (fallback)
                    try {
                      const usersQuery = query(collection(db, 'users'));
                      const usersSnapshot = await getDocs(usersQuery);
                      
                      for (const doc of usersSnapshot.docs) {
                        const userData = doc.data();
                        const displayName = (userData.displayName || userData.name || '').toLowerCase();
                        if (displayName === part.mentionName.toLowerCase()) {
                          navigation.navigate('Profile', { userId: doc.id });
                          return;
                        }
                      }
                    } catch (error) {
                      console.error('Error finding mentioned user:', error);
                    }
                  }
                }}
              >
                {part.content}
              </Text>
            );
          }
          // Regular text - return as string to inherit parent style
          return part.content;
        })}
      </Text>
    );
  }, [navigation, friends]);

  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  const renderImages = useCallback(() => {
    if (!post.images || post.images.length === 0) return null;

    const imageCount = post.images.length;

    if (imageCount === 1) {
      return (
        <TouchableOpacity onPress={() => handleImagePress(0)}>
          <Image source={{ uri: post.images[0] }} style={styles.singleImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }

    // 2+ images: 2x2 grid layout
    const imagesToShow = imageCount > 4 ? post.images.slice(0, 4) : post.images;
    const remainingCount = imageCount > 4 ? imageCount - 4 : 0;

    return (
      <View>
        {/* First row: 2 images */}
        <View style={styles.gridImageRow}>
          {imagesToShow.slice(0, 2).map((img, idx) => (
            <TouchableOpacity key={idx} onPress={() => handleImagePress(idx)}>
              <Image source={{ uri: img }} style={styles.gridImage} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
        {/* Second row: 2 images (or 1 if 3 total) */}
        {imagesToShow.length > 2 && (
          <View style={styles.gridImageRowLast}>
            {imagesToShow.slice(2, 4).map((img, idx) => {
              const actualIndex = idx + 2;
              const isLastImage = actualIndex === 3 && remainingCount > 0;
              return (
                <TouchableOpacity 
                  key={actualIndex} 
                  onPress={() => handleImagePress(actualIndex)}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: img }} style={styles.gridImage} resizeMode="cover" />
                    {isLastImage && (
                      <View style={styles.imageOverlay}>
                        <Text style={styles.imageCountText}>+{remainingCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }, [post.images, width]);

  const optionsButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 50, right: 12 });

  // Memoize navigation handlers
  const handleProfilePress = useCallback(() => {
    if (post.userId && post.userId !== user?.uid) {
      navigation.navigate('Profile', { userId: post.userId });
    } else {
      navigation.navigate('Profile');
    }
  }, [post.userId, user?.uid, navigation]);

  const handleCommentPress = useCallback(() => {
    setShowComments(true);
  }, []);

  const handleOptionsPress = useCallback(() => {
    if (optionsButtonRef.current) {
      optionsButtonRef.current.measureInWindow((x, y, width, height) => {
        const screenWidth = Dimensions.get('window').width;
        setMenuPosition({
          top: y + height + 4,
          right: screenWidth - x - width
        });
        setShowOptionsMenu(true);
      });
    } else {
      setShowOptionsMenu(!showOptionsMenu);
    }
  }, [showOptionsMenu]);

  const handleImagePress = useCallback((index) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  }, []);

  const handleCloseComments = useCallback(() => {
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
    setShowReplyMentionSuggestions({});
    setReplyMentionQueries({});
    setReplyMentionStartIndices({});
    setFilteredReplyFriends({});
  }, []);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleCloseImageModal = useCallback(() => {
    setShowImageModal(false);
  }, []);

  const handleCloseReportModal = useCallback(() => {
    setReportModalVisible(false);
  }, []);

  const handleCloseCommentReportModal = useCallback(() => {
    setCommentReportModalVisible(false);
    setSelectedCommentForReport(null);
    // Reopen comments modal after closing report modal
    setTimeout(() => {
      setShowComments(true);
    }, 100);
  }, []);

  // Load hidden comments from AsyncStorage
  useEffect(() => {
    const loadHiddenComments = async () => {
      try {
        const hiddenComments = await AsyncStorage.getItem('hidden_comments');
        if (hiddenComments) {
          const hiddenArray = JSON.parse(hiddenComments);
          setHiddenCommentIds(new Set(hiddenArray));
        }
      } catch (error) {
        // Error handled silently
      }
    };
    loadHiddenComments();
  }, []);

  const handleReportComment = useCallback((comment) => {
    setSelectedCommentForReport(comment);
    setCommentMenuId(null);
    // Close comments modal temporarily to show report modal
    setShowComments(false);
    setTimeout(() => {
      setCommentReportModalVisible(true);
    }, 300);
  }, []);

  const submitCommentReport = useCallback(async (reason) => {
    if (!user || !selectedCommentForReport) return;

    // Show confirmation dialog before submitting
    Alert.alert(
      'Confirm Report',
      `Are you sure you want to report this comment for "${reason}"? This action cannot be undone and the comment will be hidden from your view.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // User cancelled, do nothing
          }
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            // User confirmed, proceed with report submission
            try {
              const reportRef = await addDoc(collection(db, 'comment_reports'), {
                commentId: selectedCommentForReport.id,
                commentContent: selectedCommentForReport.text || '',
                commentOwnerId: selectedCommentForReport.userId,
                commentOwnerName: selectedCommentForReport.userName || 'Unknown',
                postId: post.id,
                postOwnerId: post.userId,
                reportedBy: user.uid,
                reportedByName: user.displayName || 'Unknown',
                reportedAt: serverTimestamp(),
                reason: reason,
                status: 'pending'
              });

              // Notify all admins about the new report
              try {
                const adminUsersQuery = query(
                  collection(db, 'users'),
                  where('role', 'in', ['agricultural_admin', 'impound_admin', 'superadmin'])
                );
                const adminSnapshot = await getDocs(adminUsersQuery);
                
                const notificationService = NotificationService.getInstance();
                const adminNotifications = [];
                
                adminSnapshot.forEach((adminDoc) => {
                  const adminId = adminDoc.id;
                  adminNotifications.push(
                    notificationService.createNotification({
                      userId: adminId,
                      type: 'admin_report',
                      title: 'New Comment Report Submitted',
                      body: `${user.displayName || 'A user'} reported a comment. Reason: ${reason}`,
                      data: {
                        type: 'admin_report',
                        commentReportId: reportRef.id,
                        commentId: selectedCommentForReport.id,
                        postId: post.id,
                        reason: reason,
                        reportedBy: user.uid,
                        reportedByName: user.displayName || 'Unknown',
                      },
                    }).catch((err) => {
                      console.error(`Error notifying admin ${adminId}:`, err);
                    })
                  );
                });

                // Also create admin notification in admin_notifications collection
                await addDoc(collection(db, 'admin_notifications'), {
                  type: 'comment_report',
                  commentReportId: reportRef.id,
                  commentId: selectedCommentForReport.id,
                  commentContent: selectedCommentForReport.text || '',
                  commentOwnerId: selectedCommentForReport.userId,
                  commentOwnerName: selectedCommentForReport.userName || 'Unknown',
                  postId: post.id,
                  postOwnerId: post.userId,
                  reportedBy: user.uid,
                  reportedByName: user.displayName || 'Unknown',
                  reason: reason,
                  status: 'pending',
                  read: false,
                  createdAt: serverTimestamp()
                });

                // Wait for all admin notifications to be sent (don't block on errors)
                await Promise.allSettled(adminNotifications);
              } catch (notifError) {
                console.error('Error notifying admins:', notifError);
                // Don't fail the report submission if notification fails
              }

              // Hide the reported comment from the user who reported it
              try {
                const hiddenComments = await AsyncStorage.getItem('hidden_comments');
                const hiddenArray = hiddenComments ? JSON.parse(hiddenComments) : [];
                if (!hiddenArray.includes(selectedCommentForReport.id)) {
                  hiddenArray.push(selectedCommentForReport.id);
                  await AsyncStorage.setItem('hidden_comments', JSON.stringify(hiddenArray));
                  setHiddenCommentIds(prev => new Set([...prev, selectedCommentForReport.id]));
                }
              } catch (hideError) {
                console.error('Error hiding comment:', hideError);
                // Don't fail the report submission if hiding fails
              }

              setCommentReportModalVisible(false);
              setSelectedCommentForReport(null);
              // Reopen comments modal after reporting
              setTimeout(() => {
                setShowComments(true);
              }, 100);
              Alert.alert('Reported', 'Thank you for reporting. We will review this comment.');
            } catch (error) {
              console.error('Error reporting comment:', error);
              Alert.alert('Error', 'Failed to report comment. Please try again.');
            }
          }
        }
      ]
    );
  }, [user, selectedCommentForReport, post]);

  const handleImageScroll = useCallback((e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setSelectedImageIndex(index);
  }, [width]);

  return (
    <>
      {/* Options Menu Overlay Modal - Tap outside to close */}
      <Modal
        visible={showOptionsMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <View style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={() => setShowOptionsMenu(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.3)' }} />
        </TouchableWithoutFeedback>
          {/* Options Menu - Rendered inside Modal to be above overlay */}
          <View style={[styles.optionsMenuContainer, { top: menuPosition.top, right: menuPosition.right }]}>
            <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.optionsMenu}>
            {isOwner ? (
              <>
                <TouchableOpacity
                  style={styles.optionsMenuItem}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    openEditModal();
                  }}
                      activeOpacity={0.7}
                >
                  <Text style={styles.optionsMenuText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionsMenuItem, styles.optionsMenuItemLast]}
                      onPress={() => {
                        setShowOptionsMenu(false);
                        handleDelete();
                      }}
                      activeOpacity={0.7}
                >
                  <Text style={[styles.optionsMenuText, styles.optionsMenuTextDanger]}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Don't show Report option for admin announcements */}
                {!post.isAnnouncement && (
                  <TouchableOpacity
                    style={styles.optionsMenuItem}
                    onPress={() => {
                      setShowOptionsMenu(false);
                      handleReport();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.optionsMenuText}>Report</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.optionsMenuItem, post.isAnnouncement ? styles.optionsMenuItemLast : {}]}
                  onPress={() => {
                    setShowOptionsMenu(false);
                    handleHide();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionsMenuText}>Hide</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
            </TouchableWithoutFeedback>
          </View>
        </View>
      </Modal>

      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.userInfo}
            onPress={handleProfilePress}
            activeOpacity={0.7}
          >
            {post.userProfileImage ? (
              <Image source={{ uri: post.userProfileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <MaterialIcons name="account-circle" size={40} color="#65676b" />
              </View>
            )}
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{post.userName || 'Pet Lover'}</Text>
              <Text style={styles.postTime}>{formatTime(post.createdAt)}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            ref={optionsButtonRef}
            style={styles.optionsButton}
            onPress={handleOptionsPress}
          >
            <MaterialIcons name="more-horiz" size={24} color="#65676b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderTextWithMentions(post.text, post.mentionedUsers, styles.postText)}
          {post.images && post.images.length > 0 && (
            <View style={styles.imageContainer}>
              {renderImages()}
            </View>
          )}
        </View>

        {/* Likes and Comments Count */}
        {(likesCount > 0 || commentsCount > 0) && (
          <View style={styles.likesComments}>
            {likesCount > 0 && (
              <Text style={styles.likesText}>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</Text>
            )}
            {commentsCount > 0 && (
              <TouchableOpacity onPress={handleCommentPress}>
                <Text style={styles.commentsText}>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={handleLike}
            disabled={isLiking}
          >
            <MaterialIcons
              name="thumb-up"
              size={20}
              color={isLiked ? '#1877f2' : '#65676b'}
              style={{ opacity: isLiked ? 1 : 0.5 }}
            />
            <Text style={[styles.actionText, isLiked && styles.actionTextLiked]}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleCommentPress}>
            <MaterialIcons name="comment" size={20} color="#65676b" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        animationType="slide"
        onRequestClose={handleCloseComments}
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
                  onPress={handleCloseComments}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="close" size={24} color="#050505" />
                </TouchableOpacity>
              </View>
            <ScrollView 
              style={styles.commentList}
              onScrollBeginDrag={() => setCommentMenuId(null)}
            >
                {comments.map((comment) => {
                const isCommentOwner = user?.uid === comment.userId;
                const canDelete = isCommentOwner || isOwner;
                const canEdit = isCommentOwner;
                const canReport = !isCommentOwner && user?.uid && !hiddenCommentIds.has(comment.id);

                // Skip hidden comments
                if (hiddenCommentIds.has(comment.id)) {
                  return null;
                }

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
                        {(canEdit || canDelete || canReport) && (
                          <TouchableOpacity
                            style={styles.commentMenuButton}
                            onPress={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                          >
                            <MaterialIcons name="more-vert" size={18} color="#65676b" />
                          </TouchableOpacity>
                        )}
                      </View>
                      
                      {commentMenuId === comment.id && (canEdit || canDelete || canReport) && (
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
                                style={styles.commentMenuItem}
                                onPress={() => {
                                  setCommentMenuId(null);
                                  handleDeleteComment(comment.id);
                                }}
                              >
                                <Text style={[styles.optionsMenuText, styles.optionsMenuTextDanger]}>Delete</Text>
                              </TouchableOpacity>
                            )}
                            {canReport && (
                              <TouchableOpacity
                                style={styles.commentMenuItem}
                                onPress={() => handleReportComment(comment)}
                              >
                                <Text style={styles.optionsMenuText}>Report</Text>
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={[styles.commentMenuItem, styles.commentMenuItemLast]}
                              onPress={() => setCommentMenuId(null)}
                            >
                              <Text style={styles.optionsMenuText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
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
                              disabled={savingCommentId === comment.id}
                            >
                              {savingCommentId === comment.id ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Text style={[styles.commentEditButtonText, { color: '#ffffff' }]}>Save</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        renderTextWithMentions(comment.text, comment.mentionedUsers)
                      )}
                      
                      {/* Comment Actions (Like and Reply) */}
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
                    ref={(ref) => setCommentInputRef(ref)}
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
                            onPress={() => handleSelectMention(friend, false)}
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

      {/* Report Reason Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseReportModal}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            <Text style={styles.reportModalTitle}>Report Post</Text>
            <Text style={styles.reportModalSubtitle}>Please select a reason:</Text>
            
            {['Inappropriate Content', 'Harassment', 'Spam', 'Scam', 'Other'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reportOption}
                onPress={() => submitReport(reason)}
              >
                <Text style={styles.reportOptionText}>{reason}</Text>
                <MaterialIcons name="chevron-right" size={24} color={COLORS.secondaryText} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.reportCancelButton}
              onPress={handleCloseReportModal}
            >
              <Text style={styles.reportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Comment Report Reason Modal */}
      <Modal
        visible={commentReportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseCommentReportModal}
      >
        <View style={styles.reportModalOverlay}>
          <View style={styles.reportModalContent}>
            <Text style={styles.reportModalTitle}>Report Comment</Text>
            <Text style={styles.reportModalSubtitle}>Please select a reason:</Text>
            
            {['Inappropriate Content', 'Harassment', 'Spam', 'Scam', 'Other'].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={styles.reportOption}
                onPress={() => submitCommentReport(reason)}
              >
                <Text style={styles.reportOptionText}>{reason}</Text>
                <MaterialIcons name="chevron-right" size={24} color={COLORS.secondaryText} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.reportCancelButton}
              onPress={handleCloseCommentReportModal}
            >
              <Text style={styles.reportCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity 
                onPress={handleCloseEditModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={{ fontSize: 15, color: '#1877f2', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#050505' }}>Edit Post</Text>
              <TouchableOpacity 
                onPress={handleEdit} 
                disabled={isUpdating}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#1877f2" />
                ) : (
                  <Text style={{ fontSize: 15, color: '#1877f2', fontWeight: '600' }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          <ScrollView style={{ flex: 1 }}>
            <TextInput
              style={styles.editTextInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              placeholder="Tell us something about your pet 🐶🐱"
            />
            
            {/* Image Editing Section */}
            {editImages.length > 0 && (
              <View style={styles.editImageContainer}>
                <View style={styles.editImageGrid}>
                  {editImages.map((image, index) => (
                    <View key={index} style={styles.editImageWrapper}>
                      <Image 
                        source={{ uri: image.uri }} 
                        style={styles.editSelectedImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={styles.editRemoveImageButton}
                        onPress={() => removeEditImage(index)}
                      >
                        <MaterialIcons name="close" size={18} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {editImages.length < 10 && (
                    <TouchableOpacity
                      style={styles.editAddImageButton}
                      onPress={selectEditImages}
                    >
                      <MaterialIcons name="add-photo-alternate" size={32} color="#65676b" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            
            {/* Add Images Button (when no images) */}
            {editImages.length === 0 && (
              <TouchableOpacity
                style={[styles.editAddImageButton, { marginTop: 16, marginHorizontal: 16, alignSelf: 'center' }]}
                onPress={selectEditImages}
              >
                <MaterialIcons name="add-photo-alternate" size={32} color="#65676b" />
                <Text style={{ marginTop: 8, fontSize: 13, color: '#65676b' }}>Add Photos</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
        </SafeAreaView>
      </Modal>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseImageModal}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          <StatusBar barStyle="light-content" />
          <View style={styles.imageModal}>
            <View style={styles.imageModalHeader}>
              <TouchableOpacity 
                onPress={handleCloseImageModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                {selectedImageIndex + 1} / {post.images.length}
              </Text>
              <View style={{ width: 24 }} />
            </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleImageScroll}
          >
            {post.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.imageModalImage} />
            ))}
          </ScrollView>
        </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

export default PostCard;

