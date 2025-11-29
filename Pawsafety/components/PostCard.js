import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { auth, db } from '../services/firebase';
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [commentMenuId, setCommentMenuId] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedAllReplies, setExpandedAllReplies] = useState({});
  const [commentLikes, setCommentLikes] = useState({});
  const [isLikingComment, setIsLikingComment] = useState({});

  const isOwner = user?.uid === post.userId;

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
      borderRadius: 8,
    },
    twoImages: {
      width: (width - 48) / 2 - 1,
      height: 200,
      borderRadius: 8,
    },
    threeImages: {
      width: (width - 48) / 3 - 2,
      height: 150,
      borderRadius: 8,
    },
    fourPlusImages: {
      width: (width - 48) / 3 - 2,
      height: 150,
      borderRadius: 8,
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    imageCountText: {
      color: '#ffffff',
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
      backgroundColor: 'transparent',
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
      zIndex: 1000,
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
      flex: 1,
      fontSize: 15,
      color: '#050505',
      padding: 16,
      textAlignVertical: 'top',
      minHeight: 200,
      fontFamily: FONTS.family,
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

  const handleLike = async () => {
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
  };

  const handleComment = async () => {
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

      await addDoc(collection(db, 'post_comments'), {
        postId: post.id,
        userId: user.uid,
        userName: currentUserName,
        userProfileImage: currentUserProfileImage,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        parentCommentId: null, // Top-level comment
      });

      // Comments are stored in separate collection, no need to update post

      // Send notification to post owner if not the same user
      if (post.userId && post.userId !== user.uid) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: post.userId,
            type: 'post_comment',
            title: 'New Comment',
            body: `${user.displayName || 'Someone'} commented on your post: "${commentText.trim().substring(0, 50)}${commentText.trim().length > 50 ? '...' : ''}"`,
            data: {
              postId: post.id,
              type: 'post_comment',
              commentedBy: user.uid,
              commentedByName: user.displayName || 'Someone',
            },
          });
        } catch (notifError) {
          // Error handled silently - notification is optional
        }
      }

      setCommentText('');
      await loadComments();
      // Update comment count
      await loadCommentsCount();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId) => {
    if (!editCommentText.trim()) {
      Alert.alert('Error', 'Comment text cannot be empty.');
      return;
    }

    try {
      const commentRef = doc(db, 'post_comments', commentId);
      await updateDoc(commentRef, {
        text: editCommentText.trim(),
        updatedAt: serverTimestamp(),
      });
      setEditingCommentId(null);
      setEditCommentText('');
      await loadComments();
    } catch (error) {
      Alert.alert('Error', 'Failed to update comment. Please try again.');
    }
  };

  const handleLikeComment = async (commentId) => {
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
          if (commentData.userId && commentData.userId !== user.uid) {
            try {
              const notificationService = NotificationService.getInstance();
              await notificationService.createNotification({
                userId: commentData.userId,
                type: 'comment_like',
                title: 'New Like',
                body: `${user.displayName || 'Someone'} liked your comment`,
                data: {
                  postId: post.id,
                  commentId: commentId,
                  type: 'comment_like',
                  likedBy: user.uid,
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
  };

  const handleReply = async (parentCommentId) => {
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

      // Get parent comment to find the original comment owner
      const parentCommentDoc = await getDoc(doc(db, 'post_comments', parentCommentId));
      const parentCommentData = parentCommentDoc.data();
      const originalCommentId = parentCommentData?.parentCommentId || parentCommentId;
      const originalCommentDoc = await getDoc(doc(db, 'post_comments', originalCommentId));
      const originalCommentData = originalCommentDoc.data();

      await addDoc(collection(db, 'post_comments'), {
        postId: post.id,
        userId: user.uid,
        userName: currentUserName,
        userProfileImage: currentUserProfileImage,
        text: replyText.trim(),
        createdAt: serverTimestamp(),
        likes: [],
        parentCommentId: parentCommentId,
      });

      // Send notification to parent comment owner if not the same user
      if (parentCommentData?.userId && parentCommentData.userId !== user.uid) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: parentCommentData.userId,
            type: 'comment_reply',
            title: 'New Reply',
            body: `${user.displayName || 'Someone'} replied to your comment`,
            data: {
              postId: post.id,
              commentId: parentCommentId,
              type: 'comment_reply',
              repliedBy: user.uid,
            },
          });
        } catch (notifError) {
          // Error handled silently
        }
      }

      // Also notify original comment owner if different from parent
      if (originalCommentData?.userId && 
          originalCommentData.userId !== parentCommentData?.userId && 
          originalCommentData.userId !== user.uid) {
        try {
          const notificationService = NotificationService.getInstance();
          await notificationService.createNotification({
            userId: originalCommentData.userId,
            type: 'comment_reply',
            title: 'New Reply',
            body: `${user.displayName || 'Someone'} replied to a comment on your post`,
            data: {
              postId: post.id,
              commentId: originalCommentId,
              type: 'comment_reply',
              repliedBy: user.uid,
            },
          });
        } catch (notifError) {
          // Error handled silently
        }
      }

      setReplyText('');
      setReplyingToCommentId(null);
      await loadComments();
    } catch (error) {
      Alert.alert('Error', 'Failed to add reply. Please try again.');
    } finally {
      setIsSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const handleDeleteComment = (commentId) => {
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
  };

  const handleEdit = async () => {
    if (!editText.trim()) {
      Alert.alert('Error', 'Post text cannot be empty.');
      return;
    }

    setIsUpdating(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        text: editText.trim(),
        updatedAt: serverTimestamp(),
      });
      setShowEditModal(false);
      Alert.alert('Success', 'Post updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update post. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
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
  };

  const handleReport = () => {
    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              await addDoc(collection(db, 'post_reports'), {
                postId: post.id,
                reportedBy: user.uid,
                reportedAt: serverTimestamp(),
                reason: 'Inappropriate content',
              });
              Alert.alert('Reported', 'Thank you for reporting. We will review this post.');
              setShowOptionsMenu(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to report post. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleHide = async () => {
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
  };

  const formatTime = (timestamp) => {
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
  };

  const renderImages = () => {
    if (!post.images || post.images.length === 0) return null;

    const imageCount = post.images.length;

    if (imageCount === 1) {
      return (
        <TouchableOpacity onPress={() => { setSelectedImageIndex(0); setShowImageModal(true); }}>
          <Image source={{ uri: post.images[0] }} style={styles.singleImage} resizeMode="cover" />
        </TouchableOpacity>
      );
    }

    if (imageCount === 2) {
      return (
        <View style={styles.imageGrid}>
          {post.images.map((img, idx) => (
            <TouchableOpacity key={idx} onPress={() => { setSelectedImageIndex(idx); setShowImageModal(true); }}>
              <Image source={{ uri: img }} style={styles.twoImages} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (imageCount === 3) {
      return (
        <View style={styles.imageGrid}>
          {post.images.map((img, idx) => (
            <TouchableOpacity key={idx} onPress={() => { setSelectedImageIndex(idx); setShowImageModal(true); }}>
              <Image source={{ uri: img }} style={styles.threeImages} resizeMode="cover" />
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.imageGrid}>
        {post.images.slice(0, 4).map((img, idx) => (
          <TouchableOpacity key={idx} onPress={() => { setSelectedImageIndex(idx); setShowImageModal(true); }}>
            <View style={{ position: 'relative' }}>
              <Image source={{ uri: img }} style={styles.fourPlusImages} resizeMode="cover" />
              {idx === 3 && imageCount > 4 && (
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageCountText}>+{imageCount - 4}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const optionsButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 50, right: 12 });

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
                        setShowEditModal(true);
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
                    <TouchableOpacity
                      style={[styles.optionsMenuItem, styles.optionsMenuItemLast]}
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
            onPress={() => {
              if (post.userId && post.userId !== user?.uid) {
                navigation.navigate('Profile', { userId: post.userId });
              } else {
                navigation.navigate('Profile');
              }
            }}
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
            onPress={() => {
              if (optionsButtonRef.current) {
                optionsButtonRef.current.measureInWindow((x, y, width, height) => {
                  const screenWidth = Dimensions.get('window').width;
                  // Position menu below the button, aligned to the right edge of the button
                  setMenuPosition({
                    top: y + height + 4,
                    right: screenWidth - x - width
                  });
                  setShowOptionsMenu(true);
                });
              } else {
                setShowOptionsMenu(!showOptionsMenu);
              }
            }}
          >
            <MaterialIcons name="more-horiz" size={24} color="#65676b" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.postText}>{post.text}</Text>
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
              <TouchableOpacity onPress={() => setShowComments(true)}>
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
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowComments(true)}>
            <MaterialIcons name="comment" size={20} color="#65676b" />
            <Text style={styles.actionText}>Comment</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                    setExpandedReplies({});
                    setExpandedAllReplies({});
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
                const canDelete = isCommentOwner || isOwner;
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
                        <Text style={styles.commentText}>
                          {comment.text}
                        </Text>
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
                        <TouchableOpacity
                          style={styles.commentActionButton}
                          onPress={() => {
                            setReplyingToCommentId(replyingToCommentId === comment.id ? null : comment.id);
                            setReplyText('');
                          }}
                        >
                          <MaterialIcons name="subdirectory-arrow-left" size={16} color="#65676b" />
                          <Text style={styles.commentActionText}>Reply</Text>
                        </TouchableOpacity>
                        {comment.totalRepliesCount > 0 && (
                          <TouchableOpacity
                            style={styles.viewRepliesButton}
                            onPress={() => {
                              setExpandedReplies(prev => ({
                                ...prev,
                                [comment.id]: !prev[comment.id]
                              }));
                            }}
                          >
                            <Text style={styles.viewRepliesText}>
                              {expandedReplies[comment.id] ? 'Hide' : 'View'} {comment.totalRepliesCount} {comment.totalRepliesCount === 1 ? 'reply' : 'replies'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Reply Input */}
                      {replyingToCommentId === comment.id && (
                        <View style={styles.replyInputContainer}>
                          <TextInput
                            style={styles.replyInput}
                            placeholder="Write a reply..."
                            value={replyText}
                            onChangeText={setReplyText}
                            multiline
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={() => handleReply(comment.id)}
                            disabled={!replyText.trim() || isSubmittingReply[comment.id]}
                          >
                            {isSubmittingReply[comment.id] ? (
                              <ActivityIndicator color="#1877f2" size="small" />
                            ) : (
                              <MaterialIcons 
                                name="send" 
                                size={20} 
                                color={replyText.trim() ? '#1877f2' : '#bcc0c4'} 
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && expandedReplies[comment.id] === true && (
                        <View style={styles.replyContainer}>
                          {(expandedAllReplies[comment.id] ? comment.replies : comment.replies.slice(0, 5)).map((reply) => {
                            const renderReply = (replyItem, depth = 0) => {
                              const isReplyOwner = user?.uid === replyItem.userId;
                              const canDeleteReply = isReplyOwner || isOwner;
                              const canEditReply = isReplyOwner;

                              return (
                                <View key={replyItem.id} style={styles.replyItem}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      if (replyItem.userId && replyItem.userId !== user?.uid) {
                                        navigation.navigate('Profile', { userId: replyItem.userId });
                                      } else {
                                        navigation.navigate('Profile');
                                      }
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    {replyItem.userProfileImage ? (
                                      <Image source={{ uri: replyItem.userProfileImage }} style={[styles.commentProfileImage, { width: Math.max(28, width * 0.07), height: Math.max(28, width * 0.07), borderRadius: Math.max(14, width * 0.035) }]} />
                                    ) : (
                                      <View style={[styles.commentProfileImage, { backgroundColor: '#e4e6eb', justifyContent: 'center', alignItems: 'center', width: Math.max(28, width * 0.07), height: Math.max(28, width * 0.07), borderRadius: Math.max(14, width * 0.035) }]}>
                                        <MaterialIcons name="account-circle" size={28} color="#65676b" />
                                      </View>
                                    )}
                                  </TouchableOpacity>
                                  <View style={[styles.commentContent, { flex: 1, minWidth: 0 }]}>
                                    <View style={styles.commentHeader}>
                                      <TouchableOpacity 
                                        style={{ flex: 1 }}
                                        onPress={() => {
                                          if (replyItem.userId && replyItem.userId !== user?.uid) {
                                            navigation.navigate('Profile', { userId: replyItem.userId });
                                          } else {
                                            navigation.navigate('Profile');
                                          }
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Text style={styles.commentUserName} numberOfLines={1} ellipsizeMode="tail">
                                          {replyItem.userName || 'Pet Lover'}
                                        </Text>
                                        {replyItem.createdAt && (
                                          <Text style={styles.commentTime}>
                                            {formatTime(replyItem.createdAt)}
                                          </Text>
                                        )}
                                      </TouchableOpacity>
                                      {(canEditReply || canDeleteReply) && (
                                        <TouchableOpacity
                                          style={styles.commentMenuButton}
                                          onPress={() => setCommentMenuId(commentMenuId === replyItem.id ? null : replyItem.id)}
                                        >
                                          <MaterialIcons name="more-vert" size={18} color="#65676b" />
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                    
                                    {commentMenuId === replyItem.id && (canEditReply || canDeleteReply) && (
                                      <>
                                        <TouchableWithoutFeedback onPress={() => setCommentMenuId(null)}>
                                          <View style={styles.commentMenuOverlay} />
                                        </TouchableWithoutFeedback>
                                        <View style={styles.commentMenu}>
                                          {canEditReply && (
                                            <TouchableOpacity
                                              style={styles.commentMenuItem}
                                              onPress={() => {
                                                setEditingCommentId(replyItem.id);
                                                setEditCommentText(replyItem.text);
                                                setCommentMenuId(null);
                                              }}
                                            >
                                              <Text style={styles.optionsMenuText}>Edit</Text>
                                            </TouchableOpacity>
                                          )}
                                          {canDeleteReply && (
                                            <TouchableOpacity
                                              style={[styles.commentMenuItem, styles.commentMenuItemLast]}
                                              onPress={() => {
                                                setCommentMenuId(null);
                                                handleDeleteComment(replyItem.id);
                                              }}
                                            >
                                              <Text style={[styles.optionsMenuText, styles.optionsMenuTextDanger]}>Delete</Text>
                                            </TouchableOpacity>
                                          )}
                                        </View>
                                      </>
                                    )}

                                    {editingCommentId === replyItem.id ? (
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
                                            onPress={() => handleEditComment(replyItem.id)}
                                          >
                                            <Text style={[styles.commentEditButtonText, { color: '#ffffff' }]}>Save</Text>
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                    ) : (
                                      <Text style={styles.commentText}>
                                        {replyItem.text}
                                      </Text>
                                    )}

                                    {/* Reply Actions */}
                                    <View style={styles.commentActions}>
                                      <TouchableOpacity
                                        style={styles.commentActionButton}
                                        onPress={() => handleLikeComment(replyItem.id)}
                                        disabled={isLikingComment[replyItem.id]}
                                      >
                                        <MaterialIcons
                                          name="thumb-up"
                                          size={16}
                                          color={commentLikes[replyItem.id]?.isLiked ? '#1877f2' : '#65676b'}
                                          style={{ opacity: commentLikes[replyItem.id]?.isLiked ? 1 : 0.5 }}
                                        />
                                        {commentLikes[replyItem.id]?.count > 0 && (
                                          <Text style={[styles.commentActionText, commentLikes[replyItem.id]?.isLiked && { color: '#1877f2' }]}>
                                            {commentLikes[replyItem.id].count}
                                          </Text>
                                        )}
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={styles.commentActionButton}
                                        onPress={() => {
                                          setReplyingToCommentId(replyingToCommentId === replyItem.id ? null : replyItem.id);
                                          setReplyText('');
                                        }}
                                      >
                                        <MaterialIcons name="subdirectory-arrow-left" size={16} color="#65676b" />
                                        <Text style={styles.commentActionText}>Reply</Text>
                                      </TouchableOpacity>
                                    </View>

                                    {/* Reply to Reply Input */}
                                    {replyingToCommentId === replyItem.id && (
                                      <View style={styles.replyInputContainer}>
                                        <TextInput
                                          style={styles.replyInput}
                                          placeholder="Write a reply..."
                                          value={replyText}
                                          onChangeText={setReplyText}
                                          multiline
                                          autoFocus
                                        />
                                        <TouchableOpacity
                                          onPress={() => handleReply(replyItem.id)}
                                          disabled={!replyText.trim() || isSubmittingReply[replyItem.id]}
                                        >
                                          {isSubmittingReply[replyItem.id] ? (
                                            <ActivityIndicator color="#1877f2" size="small" />
                                          ) : (
                                            <MaterialIcons 
                                              name="send" 
                                              size={20} 
                                              color={replyText.trim() ? '#1877f2' : '#bcc0c4'} 
                                            />
                                          )}
                                        </TouchableOpacity>
                                      </View>
                                    )}

                                    {/* Nested Replies (replies to replies) */}
                                    {replyItem.replies && replyItem.replies.length > 0 && (
                                      <View style={[styles.replyContainer, { marginTop: 8, paddingLeft: Math.max(30, width * 0.075) }]}>
                                        {replyItem.replies.map((nestedReply) => renderReply(nestedReply, depth + 1))}
                                      </View>
                                    )}
                                  </View>
                                </View>
                              );
                            };

                            return renderReply(reply);
                          })}
                          {comment.replies.length > 5 && !expandedAllReplies[comment.id] && (
                            <TouchableOpacity
                              style={styles.viewMoreRepliesButton}
                              onPress={() => {
                                setExpandedAllReplies(prev => ({
                                  ...prev,
                                  [comment.id]: true
                                }));
                              }}
                            >
                              <Text style={styles.viewMoreRepliesText}>
                                View {comment.replies.length - 5} more {comment.replies.length - 5 === 1 ? 'reply' : 'replies'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            {!replyingToCommentId && (
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Write a comment..."
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  editable={!isSubmittingComment}
                />
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
            )}
          </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.editModal}>
            <View style={styles.editModalHeader}>
              <TouchableOpacity 
                onPress={() => setShowEditModal(false)}
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
          <TextInput
            style={styles.editTextInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            placeholder="What's on your mind?"
          />
        </View>
        </SafeAreaView>
      </Modal>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
          <StatusBar barStyle="light-content" />
          <View style={styles.imageModal}>
            <View style={styles.imageModalHeader}>
              <TouchableOpacity 
                onPress={() => setShowImageModal(false)}
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
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
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

