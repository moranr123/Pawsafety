import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, addDoc, serverTimestamp, Timestamp, writeBatch, getDocs, where, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserX, MessageSquare, FileText, Flag, X, Clock, User, Trash2, Ban, History, ArrowLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const UserReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [contentToBan, setContentToBan] = useState(null);
  const [restrictModalOpen, setRestrictModalOpen] = useState(false);
  const [restrictDuration, setRestrictDuration] = useState('');
  const [restrictDurationType, setRestrictDurationType] = useState('days'); // 'days' or 'hours'
  const [restrictReason, setRestrictReason] = useState('');
  const [contentToRestrict, setContentToRestrict] = useState(null);
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [contentToRemove, setContentToRemove] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending', 'resolved', or 'archive'
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [selectedHistoryContent, setSelectedHistoryContent] = useState(null);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [isCheckingRestrict, setIsCheckingRestrict] = useState(false);
  const [isRestricting, setIsRestricting] = useState(false);
  const [isCheckingBan, setIsCheckingBan] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  
  // Pagination state
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [hasMoreReports, setHasMoreReports] = useState(true);
  const postReportsPaginationRef = useRef({ lastDoc: null, hasMore: true });
  const messageReportsPaginationRef = useRef({ lastDoc: null, hasMore: true });
  const reportReportsPaginationRef = useRef({ lastDoc: null, hasMore: true });
  const commentReportsPaginationRef = useRef({ lastDoc: null, hasMore: true });
  const ITEMS_PER_PAGE = 25;

  // Load more reports function
  const loadMoreReports = useCallback(async () => {
    if (loadingMoreReports || !hasMoreReports) return;
    
    try {
      setLoadingMoreReports(true);
      
      const [postSnapshot, messageSnapshot, reportSnapshot, commentSnapshot] = await Promise.all([
        postReportsPaginationRef.current.hasMore && postReportsPaginationRef.current.lastDoc
          ? getDocs(query(
              collection(db, 'post_reports'),
              orderBy('reportedAt', 'desc'),
              startAfter(postReportsPaginationRef.current.lastDoc),
              limit(ITEMS_PER_PAGE)
            ))
          : Promise.resolve({ docs: [], empty: true }),
        messageReportsPaginationRef.current.hasMore && messageReportsPaginationRef.current.lastDoc
          ? getDocs(query(
              collection(db, 'message_reports'),
              orderBy('createdAt', 'desc'),
              startAfter(messageReportsPaginationRef.current.lastDoc),
              limit(ITEMS_PER_PAGE)
            ))
          : Promise.resolve({ docs: [], empty: true }),
        reportReportsPaginationRef.current.hasMore && reportReportsPaginationRef.current.lastDoc
          ? getDocs(query(
              collection(db, 'report_reports'),
              orderBy('reportedAt', 'desc'),
              startAfter(reportReportsPaginationRef.current.lastDoc),
              limit(ITEMS_PER_PAGE)
            ))
          : Promise.resolve({ docs: [], empty: true }),
        commentReportsPaginationRef.current.hasMore && commentReportsPaginationRef.current.lastDoc
          ? getDocs(query(
              collection(db, 'comment_reports'),
              orderBy('reportedAt', 'desc'),
              startAfter(commentReportsPaginationRef.current.lastDoc),
              limit(ITEMS_PER_PAGE)
            ))
          : Promise.resolve({ docs: [], empty: true })
      ]);
      
      const newPostReports = postSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        type: 'post', 
        reportedAt: doc.data().reportedAt,
        ...doc.data() 
      }));
      
      const newMessageReports = messageSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        type: 'message', 
        reportedAt: doc.data().createdAt, 
        ...doc.data() 
      }));
      
      const newReportReports = reportSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'report',
        reportedAt: doc.data().reportedAt,
        ...doc.data()
      }));
      
      const newCommentReports = commentSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'comment',
        reportedAt: doc.data().reportedAt,
        ...doc.data()
      }));
      
      // Update pagination refs
      if (!postSnapshot.empty) {
        postReportsPaginationRef.current.lastDoc = postSnapshot.docs[postSnapshot.docs.length - 1];
        postReportsPaginationRef.current.hasMore = postSnapshot.docs.length === ITEMS_PER_PAGE;
      } else {
        postReportsPaginationRef.current.hasMore = false;
      }
      
      if (!messageSnapshot.empty) {
        messageReportsPaginationRef.current.lastDoc = messageSnapshot.docs[messageSnapshot.docs.length - 1];
        messageReportsPaginationRef.current.hasMore = messageSnapshot.docs.length === ITEMS_PER_PAGE;
      } else {
        messageReportsPaginationRef.current.hasMore = false;
      }
      
      if (!reportSnapshot.empty) {
        reportReportsPaginationRef.current.lastDoc = reportSnapshot.docs[reportSnapshot.docs.length - 1];
        reportReportsPaginationRef.current.hasMore = reportSnapshot.docs.length === ITEMS_PER_PAGE;
      } else {
        reportReportsPaginationRef.current.hasMore = false;
      }
      
      if (!commentSnapshot.empty) {
        commentReportsPaginationRef.current.lastDoc = commentSnapshot.docs[commentSnapshot.docs.length - 1];
        commentReportsPaginationRef.current.hasMore = commentSnapshot.docs.length === ITEMS_PER_PAGE;
      } else {
        commentReportsPaginationRef.current.hasMore = false;
      }
      
      // Check if any collection has more
      const anyHasMore = postReportsPaginationRef.current.hasMore || 
                        messageReportsPaginationRef.current.hasMore || 
                        reportReportsPaginationRef.current.hasMore || 
                        commentReportsPaginationRef.current.hasMore;
      setHasMoreReports(anyHasMore);
      
      // Merge with existing reports
      const allNewReports = [...newPostReports, ...newMessageReports, ...newReportReports, ...newCommentReports];
      if (allNewReports.length > 0) {
        setReports(prev => {
          const merged = [...prev, ...allNewReports];
          return merged.sort((a, b) => 
            (b.reportedAt?.toMillis() || 0) - (a.reportedAt?.toMillis() || 0)
          );
        });
      }
    } catch (error) {
      console.error('Error loading more reports:', error);
      toast.error('Failed to load more reports');
    } finally {
      setLoadingMoreReports(false);
    }
  }, [loadingMoreReports, hasMoreReports]);

  useEffect(() => {
    // Fetch post_reports, message_reports, and report_reports - Limited initial load
    const unsubPost = onSnapshot(query(
      collection(db, 'post_reports'), 
      orderBy('reportedAt', 'desc'),
      limit(ITEMS_PER_PAGE)
    ), (snapshot) => {
      const postReports = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        type: 'post', 
        reportedAt: doc.data().reportedAt,
        ...doc.data() 
      }));
      
      // Initialize pagination ref
      if (!postReportsPaginationRef.current.lastDoc && !snapshot.empty) {
        postReportsPaginationRef.current.lastDoc = snapshot.docs[snapshot.docs.length - 1];
        postReportsPaginationRef.current.hasMore = snapshot.docs.length === ITEMS_PER_PAGE;
      }
      
      // Fetch message reports inside to combine - Limited initial load
      const unsubMessage = onSnapshot(query(
        collection(db, 'message_reports'), 
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE)
      ), (msgSnapshot) => {
        const messageReports = msgSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          type: 'message', 
          reportedAt: doc.data().createdAt, 
          ...doc.data() 
        }));
        
        // Initialize pagination ref
        if (!messageReportsPaginationRef.current.lastDoc && !msgSnapshot.empty) {
          messageReportsPaginationRef.current.lastDoc = msgSnapshot.docs[msgSnapshot.docs.length - 1];
          messageReportsPaginationRef.current.hasMore = msgSnapshot.docs.length === ITEMS_PER_PAGE;
        }
        
        // Fetch report_reports (reports about stray reports) - Limited initial load
        const unsubReport = onSnapshot(query(
          collection(db, 'report_reports'), 
          orderBy('reportedAt', 'desc'),
          limit(ITEMS_PER_PAGE)
        ), (reportSnapshot) => {
          const reportReports = reportSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'report',
            reportedAt: doc.data().reportedAt,
            ...doc.data()
          }));
          
          // Initialize pagination ref
          if (!reportReportsPaginationRef.current.lastDoc && !reportSnapshot.empty) {
            reportReportsPaginationRef.current.lastDoc = reportSnapshot.docs[reportSnapshot.docs.length - 1];
            reportReportsPaginationRef.current.hasMore = reportSnapshot.docs.length === ITEMS_PER_PAGE;
          }
          
          // Fetch comment_reports (reports about comments) - Limited initial load
          const unsubComment = onSnapshot(query(
            collection(db, 'comment_reports'), 
            orderBy('reportedAt', 'desc'),
            limit(ITEMS_PER_PAGE)
          ), (commentSnapshot) => {
            const commentReports = commentSnapshot.docs.map(doc => ({
              id: doc.id,
              type: 'comment',
              reportedAt: doc.data().reportedAt,
              ...doc.data()
            }));
            
            // Initialize pagination ref
            if (!commentReportsPaginationRef.current.lastDoc && !commentSnapshot.empty) {
              commentReportsPaginationRef.current.lastDoc = commentSnapshot.docs[commentSnapshot.docs.length - 1];
              commentReportsPaginationRef.current.hasMore = commentSnapshot.docs.length === ITEMS_PER_PAGE;
            }
            
            // Check if any collection has more
            const anyHasMore = postReportsPaginationRef.current.hasMore || 
                              messageReportsPaginationRef.current.hasMore || 
                              reportReportsPaginationRef.current.hasMore || 
                              commentReportsPaginationRef.current.hasMore;
            setHasMoreReports(anyHasMore);
            
            // Merge and sort
            const allReports = [...postReports, ...messageReports, ...reportReports, ...commentReports].sort((a, b) => 
              (b.reportedAt?.toMillis() || 0) - (a.reportedAt?.toMillis() || 0)
            );
            setReports(allReports);
            setLoading(false);
          });
          
          return () => unsubComment && unsubComment();
        });
        
        return () => unsubReport && unsubReport();
      });
      
      return () => unsubMessage && unsubMessage();
    });

    return () => unsubPost && unsubPost();
  }, []);

  const sendNotification = async (userId, title, body, data = {}) => {
    if (!userId) return;
    try {
      // Check for duplicate notifications (same userId, title, and action within last 5 seconds)
      const recentNotificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('title', '==', title),
        where('type', '==', 'admin_action'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const recentSnapshot = await getDocs(recentNotificationsQuery);
      if (!recentSnapshot.empty) {
        const recentNotif = recentSnapshot.docs[0].data();
        const recentTime = recentNotif.createdAt?.toDate ? recentNotif.createdAt.toDate().getTime() : 0;
        const now = Date.now();
        // If notification was created within last 5 seconds with same title, skip to prevent duplicates
        if (now - recentTime < 5000 && recentNotif.body === body) {
          console.log('Duplicate notification prevented for user:', userId, 'title:', title);
          return;
        }
      }

      // Create notification document in Firestore
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        body,
        type: 'admin_action',
        read: false,
        data: data,
        createdAt: serverTimestamp()
      });

      console.log('Notification created in Firestore:', notificationRef.id, 'for user:', userId, 'title:', title);
      
      // Note: Push notifications are handled by Cloud Function trigger (onNotificationCreated)
      // The mobile app will also receive the notification via Firestore listener
    } catch (error) {
      console.error('Error sending notification:', error, 'for user:', userId);
    }
  };

  const handleDismissAll = async (content) => {
    if (!window.confirm(`Are you sure you want to dismiss all pending reports for this ${content.type}?`)) return;
    
    try {
        const pendingReports = content.reports.filter(r => !r.status || r.status === 'pending');
        const batch = writeBatch(db);
        
        pendingReports.forEach(r => {
             const collectionName = r.type === 'post' ? 'post_reports' : r.type === 'message' ? 'message_reports' : r.type === 'report' ? 'report_reports' : 'comment_reports';
             const rRef = doc(db, collectionName, r.id);
             batch.update(rRef, { 
               status: 'dismissed',
               dismissedAt: serverTimestamp()
             });
        });
        
        await batch.commit();
        
      const uniqueReporters = [...new Set(pendingReports.map(r => r.reportedBy || r.reporterId).filter(id => id))];
      uniqueReporters.forEach(reporterId => {
        const contentType = content.type === 'post' ? 'post' : content.type === 'message' ? 'message' : content.type === 'report' ? 'stray report' : 'comment';
        sendNotification(
          reporterId, 
          'Report Update - Dismissed', 
          `We have reviewed your report about a ${contentType} and decided to dismiss it as it does not violate our community guidelines.`
        );
      });
        
        toast.success('Reports dismissed successfully');
        if (selectedContent && selectedContent.id === content.id) setSelectedContent(null);
    } catch (error) {
        console.error('Error dismissing reports:', error);
        toast.error('Failed to dismiss reports');
    }
  };

  const handleRemovePost = (content) => {
    setContentToRemove(content);
    setRemoveModalOpen(true);
  };

  const confirmRemovePost = async () => {
    if (!removeReason.trim()) {
      toast.error('Please provide a reason for removing this content');
      return;
    }

    const content = contentToRemove;
    // Preserve the reason before clearing state
    const reasonText = removeReason.trim();
    
    try {
      const pendingReports = content.reports.filter(r => !r.status || r.status === 'pending');
      const batch = writeBatch(db);
      
      // Mark the reported content as deleted (DO NOT actually delete from Firestore)
      if (content.type === 'post' && content.contentId) {
        const postRef = doc(db, 'posts', content.contentId);
        // IMPORTANT: Mark as deleted instead of deleting the document
        // This allows for recovery and audit trails
        batch.update(postRef, { 
          deleted: true, 
          deletedAt: serverTimestamp(),
          deletedBy: 'admin',
          deletionReason: reasonText
        });
      } else if (content.type === 'message' && content.contentId) {
        // Find the message collection from the first report
        const firstReport = pendingReports[0] || content.reports[0];
        const collectionName = firstReport?.chatType === 'report' ? 'report_messages' : 'direct_messages';
        const msgRef = doc(db, collectionName, content.contentId);
        batch.delete(msgRef);
      } else if (content.type === 'report' && content.contentId) {
        // Delete the reported stray report
        const reportRef = doc(db, 'stray_reports', content.contentId);
        batch.delete(reportRef);
      } else if (content.type === 'comment' && content.contentId) {
        // Delete the reported comment
        // Check if it's a post comment or report comment
        const firstReport = pendingReports[0] || content.reports[0];
        if (firstReport?.postId) {
          const commentRef = doc(db, 'post_comments', content.contentId);
          batch.delete(commentRef);
        } else if (firstReport?.reportId) {
          const commentRef = doc(db, 'report_comments', content.contentId);
          batch.delete(commentRef);
        }
      }
      
      // Resolve all pending reports for this content
      pendingReports.forEach(r => {
        const collectionName = r.type === 'post' ? 'post_reports' : r.type === 'message' ? 'message_reports' : r.type === 'report' ? 'report_reports' : 'comment_reports';
        const rRef = doc(db, collectionName, r.id);
        batch.update(rRef, { 
          status: 'resolved', 
          resolution: 'content_removed',
          resolvedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      // Send notification to the content owner (only once, no duplicates)
      let userId = content.ownerId || content.reportOwnerId || content.commentOwnerId || content.reportedUser;
      
      // For posts, if we don't have userId from content object, try to get it from the post document
      if (!userId && content.type === 'post' && content.contentId) {
        try {
          const postDoc = await getDoc(doc(db, 'posts', content.contentId));
          if (postDoc.exists()) {
            userId = postDoc.data().userId;
          }
        } catch (error) {
          console.error('Error fetching post document:', error);
        }
      }
      
      // Also check the first report for postOwnerId as fallback
      if (!userId && content.type === 'post' && content.reports && content.reports.length > 0) {
        userId = content.reports[0].postOwnerId || content.reports[0].reportedUser;
      }
      
      if (userId) {
        // For posts, use more specific message
        if (content.type === 'post') {
          await sendNotification(
            userId, 
            'Post Deleted', 
            `Your posted feed has been deleted for being reported. Reason: ${reasonText}`,
            { postId: content.contentId, action: 'post_deleted', reason: reasonText }
          );
        } else {
          const contentType = content.type === 'message' ? 'message' : content.type === 'report' ? 'stray report' : 'comment';
          await sendNotification(
            userId, 
            'Content Removed', 
            `Your ${contentType} has been removed. Reason: ${reasonText}`,
            { contentId: content.contentId, contentType: content.type, action: 'content_removed', reason: reasonText }
          );
        }
      } else {
        console.error('Could not find userId for content:', content.type, 'contentId:', content.contentId, 'content object:', content);
        toast.error('Could not find user ID to send notification. Post was deleted but notification was not sent.');
      }
      
      // Send notifications to reporters (only unique reporters, no duplicates)
      const uniqueReporters = [...new Set(pendingReports.map(r => r.reportedBy || r.reporterId).filter(id => id))];
      uniqueReporters.forEach(reporterId => {
        const contentType = content.type === 'post' ? 'post' : content.type === 'message' ? 'message' : content.type === 'report' ? 'stray report' : 'comment';
        sendNotification(
          reporterId, 
          'Report Resolved - Content Removed', 
          `We have reviewed your report and removed the reported ${contentType}. Reason: ${reasonText}`,
          { contentId: content.contentId, contentType: content.type, action: 'report_resolved', reason: reasonText }
        );
      });
      
      const contentType = content.type === 'post' ? 'Post' : content.type === 'message' ? 'Message' : content.type === 'report' ? 'Stray Report' : 'Comment';
      toast.success(`${contentType} removed successfully. ${pendingReports.length} report(s) resolved.`);
      setRemoveModalOpen(false);
      setContentToRemove(null);
      setRemoveReason('');
      if (selectedContent && selectedContent.id === content.id) setSelectedContent(null);
    } catch (error) {
      console.error('Error removing content:', error);
      toast.error('Failed to remove content');
    }
  };

  const handleRestrictChat = async (content) => {
    const userId = content.ownerId;
    if (!userId) {
      toast.error('Could not find user to restrict');
      return;
    }

    setIsCheckingRestrict(true);
    // Check if user has active punishment
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const now = new Date();
        
        // Check if user is banned
        if (userData.status === 'banned' && userData.banExpiresAt) {
          const banExpiry = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
          if (banExpiry > now) {
            toast.error(`This user is already banned until ${banExpiry.toLocaleDateString()}. Please wait for the ban to expire or unban the user first.`);
            setIsCheckingRestrict(false);
            return;
          }
        }
        
        // Check if user is already restricted
        if (userData.chatRestricted && userData.chatRestrictionExpiresAt) {
          const restrictExpiry = userData.chatRestrictionExpiresAt.toDate ? userData.chatRestrictionExpiresAt.toDate() : new Date(userData.chatRestrictionExpiresAt);
          if (restrictExpiry > now) {
            toast.error(`This user is already restricted until ${restrictExpiry.toLocaleDateString()}. Please wait for the restriction to expire or remove the restriction first.`);
            setIsCheckingRestrict(false);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      toast.error('Failed to check user status');
      setIsCheckingRestrict(false);
      return;
    }

    setIsCheckingRestrict(false);
    setContentToRestrict(content);
    setRestrictModalOpen(true);
  };

  const confirmRestrictChat = async () => {
    if (!restrictDuration || isNaN(restrictDuration) || parseInt(restrictDuration) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    if (!restrictReason.trim()) {
      toast.error('Please provide a reason for the chat restriction');
      return;
    }

    const duration = parseInt(restrictDuration);
    const content = contentToRestrict;
    const userId = content.ownerId;
    
    if (!userId) {
      toast.error('Could not find user to restrict');
      return;
    }

    // Check if user already has an active punishment
    setIsRestricting(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const now = new Date();
        
        // Check if user is banned
        if (userData.status === 'banned' && userData.banExpiresAt) {
          const banExpiry = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
          if (banExpiry > now) {
            toast.error(`This user is already banned until ${banExpiry.toLocaleDateString()}. Please wait for the ban to expire or unban the user first.`);
            setIsRestricting(false);
            setRestrictModalOpen(false);
            setContentToRestrict(null);
            setRestrictDuration('');
            setRestrictReason('');
            setRestrictDurationType('days');
            return;
          }
        }
        
        // Check if user is already restricted
        if (userData.chatRestricted && userData.chatRestrictionExpiresAt) {
          const restrictExpiry = userData.chatRestrictionExpiresAt.toDate ? userData.chatRestrictionExpiresAt.toDate() : new Date(userData.chatRestrictionExpiresAt);
          if (restrictExpiry > now) {
            toast.error(`This user is already restricted until ${restrictExpiry.toLocaleDateString()}. Please wait for the restriction to expire or remove the restriction first.`);
            setIsRestricting(false);
            setRestrictModalOpen(false);
            setContentToRestrict(null);
            setRestrictDuration('');
            setRestrictReason('');
            setRestrictDurationType('days');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      toast.error('Failed to check user status');
      setIsRestricting(false);
      return;
    }

    try {
      const expiry = new Date();
      if (restrictDurationType === 'hours') {
        expiry.setHours(expiry.getHours() + duration);
      } else {
        expiry.setDate(expiry.getDate() + duration);
      }

      const batch = writeBatch(db);
      
      // Restrict chat for the user
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, { 
        chatRestricted: true,
        chatRestrictedAt: serverTimestamp(),
        chatRestrictedBy: 'admin',
        chatRestrictionDuration: duration,
        chatRestrictionDurationType: restrictDurationType,
        chatRestrictionExpiresAt: Timestamp.fromDate(expiry),
        chatRestrictionReason: restrictReason.trim()
      });
      
      // Resolve all pending reports for this content
      const pendingReports = content.reports.filter(r => !r.status || r.status === 'pending');
      pendingReports.forEach(r => {
        const rRef = doc(db, r.type === 'post' ? 'post_reports' : 'message_reports', r.id);
        batch.update(rRef, { 
          status: 'resolved', 
          resolution: 'user_chat_restricted',
          resolvedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      const durationText = restrictDurationType === 'hours' 
        ? `${duration} ${duration === 1 ? 'hour' : 'hours'}` 
        : `${duration} ${duration === 1 ? 'day' : 'days'}`;
      
      await sendNotification(userId, 'Chat Restricted', `Your ability to send messages has been restricted for ${durationText}. Reason: ${restrictReason.trim()}`);
      
      const uniqueReporters = [...new Set(pendingReports.map(r => r.reportedBy || r.reporterId).filter(id => id))];
      uniqueReporters.forEach(reporterId => {
        sendNotification(
          reporterId, 
          'Report Resolved - User Chat Restricted', 
          `We have reviewed your report and restricted the reported user's ability to send messages for ${durationText}. Reason: ${restrictReason.trim()}`
        );
      });
      
      toast.success(`Chat restricted for ${content.ownerName} for ${durationText}. ${pendingReports.length} report(s) resolved.`);
      setIsRestricting(false);
      setRestrictModalOpen(false);
      setContentToRestrict(null);
      setRestrictDuration('');
      setRestrictReason('');
      setRestrictDurationType('days');
      if (selectedContent && selectedContent.id === content.id) setSelectedContent(null);
    } catch (error) {
      console.error('Error restricting chat:', error);
      toast.error('Failed to restrict chat');
      setIsRestricting(false);
    }
  };

  const confirmBan = async () => {
    if (!banDuration || isNaN(banDuration) || parseInt(banDuration) <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    const days = parseInt(banDuration);
    const content = contentToBan;
    const userIdToBan = content.ownerId || content.postOwnerId || content.reportedUser;
    
    if (!userIdToBan) {
       toast.error('Could not find user to ban');
       return;
    }

    // Check if user already has an active ban
    setIsBanning(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', userIdToBan));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const now = new Date();
        
        // Check if user is already banned
        if (userData.status === 'banned' && userData.banExpiresAt) {
          const banExpiry = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
          if (banExpiry > now) {
            toast.error(`This user is already banned until ${banExpiry.toLocaleDateString()}. Please wait for the ban to expire or unban the user first.`);
            setIsBanning(false);
            setBanModalOpen(false);
            setContentToBan(null);
            setBanDuration('');
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking user ban status:', error);
      toast.error('Failed to check user ban status');
      setIsBanning(false);
       return;
    }

    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      
      // First, get the current user data to archive it
      const userDocRef = doc(db, 'users', userIdToBan);
      const userDoc = await getDoc(userDocRef);
      const currentUserData = userDoc.exists() ? userDoc.data() : {};
      
      const batch = writeBatch(db);
      
      // 1. Ban the user and archive profile data
      const userRef = doc(db, 'users', userIdToBan);
      batch.update(userRef, { 
          status: 'banned', 
          bannedAt: serverTimestamp(),
          bannedBy: 'admin',
          banDuration: days,
          banExpiresAt: Timestamp.fromDate(expiry),
          // Archive original profile data for restoration
          archivedProfileData: {
            displayName: currentUserData.displayName || currentUserData.name || null,
            name: currentUserData.displayName || currentUserData.name || null,
            profileImage: currentUserData.profileImage || null,
            archivedAt: serverTimestamp()
          },
          // Hide profile by setting profile fields to null/empty
          displayName: null,
          name: null,
          profileImage: null,
          isProfileVisible: false
      });
      
      // 2. Resolve ALL pending reports for this content AND DELETE CONTENT
      const pendingReports = content.reports.filter(r => !r.status || r.status === 'pending');
      const reportedPostIds = new Set();
      
      let resolveCount = 0;
      pendingReports.forEach(r => {
         const rRef = doc(db, r.type === 'post' ? 'post_reports' : 'message_reports', r.id);
         batch.update(rRef, { 
           status: 'resolved', 
           resolution: 'user_banned_content_deleted', 
           resolvedAt: serverTimestamp(),
           banDuration: days
         });
         
         // Delete reported content permanently
         if (r.type === 'post' && r.postId) {
             reportedPostIds.add(r.postId);
             const postRef = doc(db, 'posts', r.postId);
             batch.delete(postRef);
         } else if (r.type === 'message' && r.messageId) {
             const collectionName = r.chatType === 'report' ? 'report_messages' : 'direct_messages';
             const msgRef = doc(db, collectionName, r.messageId);
             batch.delete(msgRef);
         }
         resolveCount++;
      });
      
      // 3. Hide REMAINING user's content (posts and pets) - exclude deleted posts
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userIdToBan));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach(doc => {
          // Only hide if not already being deleted
          if (!reportedPostIds.has(doc.id)) {
              batch.update(doc.ref, { isHidden: true });
          }
      });
      
      const petsQuery = query(collection(db, 'pets'), where('userId', '==', userIdToBan));
      const petsSnapshot = await getDocs(petsQuery);
      petsSnapshot.forEach(doc => {
          batch.update(doc.ref, { isHidden: true });
      });
      
      await batch.commit();
      
      const uniqueReporters = [...new Set(pendingReports.map(r => r.reportedBy || r.reporterId).filter(id => id))];
      uniqueReporters.forEach(reporterId => {
        sendNotification(
          reporterId, 
          'Report Resolved - User Banned', 
          `We have reviewed your report and banned the reported user for ${days} ${days === 1 ? 'day' : 'days'}. The reported content has also been removed.`
        );
      });
      
      toast.success(`User banned for ${days} days. ${resolveCount} report(s) resolved.`);
      setIsBanning(false);
      setBanModalOpen(false);
      setContentToBan(null);
      setBanDuration('');
      
      if (selectedContent && (selectedContent.ownerId === userIdToBan || selectedContent.postOwnerId === userIdToBan || selectedContent.reportedUser === userIdToBan)) {
         setSelectedContent(null);
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
      setIsBanning(false);
    }
  };


  const [userProfiles, setUserProfiles] = useState({});
  const [historyUserStatus, setHistoryUserStatus] = useState({});

  // Fetch user profiles for owner and reporters
  useEffect(() => {
    if (reports.length === 0) return;

    const fetchUserProfiles = async () => {
      const userIds = new Set();
      
      // Collect all user IDs (owners and reporters)
      reports.forEach(report => {
        const ownerId = report.postOwnerId || report.reportedUser;
        const reporterId = report.reportedBy || report.reporterId;
        if (ownerId) userIds.add(ownerId);
        if (reporterId) userIds.add(reporterId);
      });

      const profiles = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              profiles[userId] = {
                name: userData.displayName || userData.name || 'Unknown',
                profileImage: userData.profileImage || null,
              };
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        })
      );
      
      setUserProfiles(profiles);
    };

    fetchUserProfiles();
  }, [reports]);

  const groupedContent = useMemo(() => {
    const groups = {};
    // Only process pending reports and group by content (postId, messageId, reportId, or commentId)
    reports.filter(report => !report.status || report.status === 'pending').forEach(report => {
      const contentId = report.postId || report.messageId || report.reportId || report.commentId;
      if (!contentId) return;
      
      const contentKey = `${report.type}_${contentId}`;
      const ownerId = report.postOwnerId || report.reportedUser || report.reportOwnerId || report.commentOwnerId;
      const reporterId = report.reportedBy || report.reporterId;
      
      if (!groups[contentKey]) {
        const ownerProfile = userProfiles[ownerId] || {};
        groups[contentKey] = {
          id: contentKey,
          type: report.type,
          contentId: contentId,
          ownerId: ownerId,
          ownerName: report.postOwnerName || report.reportedUserName || report.reportOwnerName || report.commentOwnerName || ownerProfile.name || 'Unknown',
          ownerProfileImage: ownerProfile.profileImage || null,
          content: report.postContent || report.messageText || report.reportContent || report.commentContent || '',
          images: report.postImages || report.messageImages || (report.reportImage ? [report.reportImage] : []),
          reports: [],
          latestDate: report.reportedAt || report.createdAt,
        };
      }
      
      const reporterProfile = userProfiles[reporterId] || {};
      groups[contentKey].reports.push({
        ...report,
        reporterName: report.reportedByName || report.reporterName || reporterProfile.name || 'Unknown',
        reporterId: reporterId,
        reporterProfileImage: reporterProfile.profileImage || null,
        reason: report.reason,
        timestamp: report.reportedAt || report.createdAt
      });
      
      const reportDate = report.reportedAt || report.createdAt;
      if (reportDate && (!groups[contentKey].latestDate || reportDate > groups[contentKey].latestDate)) {
        groups[contentKey].latestDate = reportDate;
      }
    });
    
    return Object.values(groups).sort((a, b) => (b.latestDate?.toMillis() || 0) - (a.latestDate?.toMillis() || 0));
  }, [reports, userProfiles]);

  const groupedHistoryContent = useMemo(() => {
    const groups = {};
    // Process resolved/dismissed reports (exclude archived)
    reports.filter(report => (report.status === 'resolved' || report.status === 'dismissed') && !report.archived).forEach(report => {
      const contentId = report.postId || report.messageId || report.reportId || report.commentId;
      if (!contentId) return;
      
      const contentKey = `${report.type}_${contentId}`;
      const ownerId = report.postOwnerId || report.reportedUser || report.reportOwnerId || report.commentOwnerId;
      const reporterId = report.reportedBy || report.reporterId;
      
      if (!groups[contentKey]) {
        const ownerProfile = userProfiles[ownerId] || {};
        groups[contentKey] = {
          id: contentKey,
          type: report.type,
          contentId: contentId,
          ownerId: ownerId,
          ownerName: report.postOwnerName || report.reportedUserName || report.reportOwnerName || report.commentOwnerName || ownerProfile.name || 'Unknown',
          ownerProfileImage: ownerProfile.profileImage || null,
          content: report.postContent || report.messageText || report.reportContent || report.commentContent || '',
          images: report.postImages || report.messageImages || (report.reportImage ? [report.reportImage] : []),
          reports: [],
          latestDate: report.resolvedAt || report.dismissedAt || report.reportedAt || report.createdAt,
          resolution: report.resolution || report.status,
          resolvedAt: report.resolvedAt || report.dismissedAt,
        };
      }
      
      const reporterProfile = userProfiles[reporterId] || {};
      groups[contentKey].reports.push({
        ...report,
        reporterName: report.reportedByName || report.reporterName || reporterProfile.name || 'Unknown',
        reporterId: reporterId,
        reporterProfileImage: reporterProfile.profileImage || null,
        reason: report.reason,
        timestamp: report.reportedAt || report.createdAt
      });
      
      const reportDate = report.resolvedAt || report.dismissedAt || report.reportedAt || report.createdAt;
      if (reportDate && (!groups[contentKey].latestDate || reportDate > groups[contentKey].latestDate)) {
        groups[contentKey].latestDate = reportDate;
      }
    });
    
    return Object.values(groups).sort((a, b) => (b.latestDate?.toMillis() || 0) - (a.latestDate?.toMillis() || 0));
  }, [reports, userProfiles]);

  const filteredHistoryContent = useMemo(() => {
    let filtered = groupedHistoryContent;
    
    // Apply date filter
    if (historyDateFilter) {
      const filterDate = new Date(historyDateFilter);
      filterDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(filterDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filtered = filtered.filter(content => {
        const contentDate = content.resolvedAt || content.latestDate;
        if (!contentDate) return false;
        
        const date = contentDate.toDate ? contentDate.toDate() : new Date(contentDate);
        date.setHours(0, 0, 0, 0);
        
        return date >= filterDate && date < nextDay;
      });
    }
    
    // Apply search filter
    if (historySearchTerm.trim()) {
      const searchLower = historySearchTerm.toLowerCase();
      filtered = filtered.filter(content => {
        const matchesOwnerName = content.ownerName?.toLowerCase().includes(searchLower);
        const matchesContent = content.content?.toLowerCase().includes(searchLower);
        const matchesReporter = content.reports.some(report => 
          report.reporterName?.toLowerCase().includes(searchLower) ||
          report.reason?.toLowerCase().includes(searchLower)
        );
        const matchesResolution = content.resolution?.toLowerCase().includes(searchLower);
        
        return matchesOwnerName || matchesContent || matchesReporter || matchesResolution;
      });
    }
    
    return filtered;
  }, [groupedHistoryContent, historySearchTerm, historyDateFilter]);

  const groupedArchivedContent = useMemo(() => {
    const groups = {};
    // Process archived reports
    reports.filter(report => report.archived === true).forEach(report => {
      const contentId = report.postId || report.messageId || report.reportId || report.commentId;
      if (!contentId) return;
      
      const contentKey = `${report.type}_${contentId}`;
      const ownerId = report.postOwnerId || report.reportedUser || report.reportOwnerId || report.commentOwnerId;
      const reporterId = report.reportedBy || report.reporterId;
      
      if (!groups[contentKey]) {
        const ownerProfile = userProfiles[ownerId] || {};
        groups[contentKey] = {
          id: contentKey,
          type: report.type,
          contentId: contentId,
          ownerId: ownerId,
          ownerName: report.postOwnerName || report.reportedUserName || report.reportOwnerName || report.commentOwnerName || ownerProfile.name || 'Unknown',
          ownerProfileImage: ownerProfile.profileImage || null,
          content: report.postContent || report.messageText || report.reportContent || report.commentContent || '',
          images: report.postImages || report.messageImages || (report.reportImage ? [report.reportImage] : []),
          reports: [],
          latestDate: report.archivedAt || report.resolvedAt || report.dismissedAt || report.reportedAt || report.createdAt,
          resolution: report.resolution || report.status,
          resolvedAt: report.resolvedAt || report.dismissedAt,
          archivedAt: report.archivedAt,
        };
      }
      
      const reporterProfile = userProfiles[reporterId] || {};
      groups[contentKey].reports.push({
        ...report,
        reporterName: report.reportedByName || report.reporterName || reporterProfile.name || 'Unknown',
        reporterId: reporterId,
        reporterProfileImage: reporterProfile.profileImage || null,
        reason: report.reason,
        timestamp: report.reportedAt || report.createdAt
      });
      
      const reportDate = report.archivedAt || report.resolvedAt || report.dismissedAt || report.reportedAt || report.createdAt;
      if (reportDate && (!groups[contentKey].latestDate || reportDate > groups[contentKey].latestDate)) {
        groups[contentKey].latestDate = reportDate;
      }
    });
    
    return Object.values(groups).sort((a, b) => (b.latestDate?.toMillis() || 0) - (a.latestDate?.toMillis() || 0));
  }, [reports, userProfiles]);

  const filteredArchivedContent = useMemo(() => {
    if (!archiveSearchTerm.trim()) return groupedArchivedContent;
    
    const searchLower = archiveSearchTerm.toLowerCase();
    return groupedArchivedContent.filter(content => {
      const matchesOwnerName = content.ownerName?.toLowerCase().includes(searchLower);
      const matchesContent = content.content?.toLowerCase().includes(searchLower);
      const matchesResolution = content.resolution?.toLowerCase().includes(searchLower);
      
      return matchesOwnerName || matchesContent || matchesResolution;
    });
  }, [groupedArchivedContent, archiveSearchTerm]);

  // Fetch user status for history items
  useEffect(() => {
    if (activeTab !== 'resolved' || groupedHistoryContent.length === 0) {
      setHistoryUserStatus({});
      return;
    }

    const fetchUserStatus = async () => {
      const userIds = new Set();
      groupedHistoryContent.forEach(content => {
        if (content.ownerId) userIds.add(content.ownerId);
      });

      const statuses = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              statuses[userId] = {
                status: userData.status || 'active',
                chatRestricted: userData.chatRestricted || false
              };
            }
          } catch (error) {
            console.error(`Error fetching user status ${userId}:`, error);
          }
        })
      );
      
      setHistoryUserStatus(statuses);
    };

    fetchUserStatus();
  }, [activeTab, groupedHistoryContent]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading reports...</div>;
  }

  // eslint-disable-next-line no-unused-vars
  const handleUndoBan = async (content) => {
    const userId = content.ownerId;
    if (!userId) {
      toast.error('Could not find user');
      return;
    }

    if (!window.confirm(`Are you sure you want to lift the ban for ${content.ownerName}?`)) return;

    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const archivedData = userData.archivedProfileData || {};
      
      const batch = writeBatch(db);
      
      // Restore user status and profile data
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, { 
        status: 'active', 
        bannedAt: null,
        bannedBy: null,
        banDuration: null,
        banExpiresAt: null,
        displayName: archivedData.displayName || userData.displayName || userData.name || null,
        name: archivedData.displayName || userData.displayName || userData.name || null,
        profileImage: archivedData.profileImage || null,
        isProfileVisible: true,
        archivedProfileData: null
      });
      
      // Unhide user's content
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
        const postsSnapshot = await getDocs(postsQuery);
        postsSnapshot.forEach(doc => {
            batch.update(doc.ref, { isHidden: false });
        });
        
      const petsQuery = query(collection(db, 'pets'), where('userId', '==', userId));
        const petsSnapshot = await getDocs(petsQuery);
        petsSnapshot.forEach(doc => {
            batch.update(doc.ref, { isHidden: false });
        });
        
        await batch.commit();
        
        toast.success('Ban lifted successfully');
    } catch (error) {
      console.error('Error lifting ban:', error);
      toast.error('Failed to lift ban');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleUndoRestrict = async (content) => {
    const userId = content.ownerId;
    if (!userId) {
      toast.error('Could not find user');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove the chat restriction for ${content.ownerName}?`)) return;

    try {
      await updateDoc(doc(db, 'users', userId), { 
        chatRestricted: false,
        chatRestrictedAt: null,
        chatRestrictedBy: null,
        chatRestrictionDuration: null,
        chatRestrictionDurationType: null,
        chatRestrictionExpiresAt: null,
        chatRestrictionReason: null
      });
      
      await sendNotification(userId, 'Chat Restriction Lifted', 'Your chat restriction has been removed. You can now send messages again.');
      
      toast.success('Chat restriction lifted successfully');
    } catch (error) {
      console.error('Error lifting chat restriction:', error);
      toast.error('Failed to lift chat restriction');
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleArchiveHistory = async (content) => {
    if (!window.confirm(`Are you sure you want to archive this report history?`)) return;

    try {
      const batch = writeBatch(db);
      
      // Archive all reports for this content
      content.reports.forEach(report => {
        const reportRef = doc(db, report.type === 'post' ? 'post_reports' : 'message_reports', report.id);
        batch.update(reportRef, {
          archived: true,
          archivedAt: serverTimestamp()
        });
      });
      
      await batch.commit();
      
      toast.success('Report history archived successfully');
      if (selectedHistoryContent && selectedHistoryContent.id === content.id) {
        setSelectedHistoryContent(null);
      }
    } catch (error) {
      console.error('Error archiving report history:', error);
      toast.error('Failed to archive report history');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getActionBadge = (resolution) => {
    if (resolution === 'user_banned_content_deleted' || resolution === 'user_banned') {
      return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">Banned</span>;
    }
    if (resolution === 'user_chat_restricted') {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Chat Restricted</span>;
    }
    if (resolution === 'content_removed') {
      return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Removed</span>;
    }
    if (resolution === 'dismissed') {
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">Dismissed</span>;
    }
    return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Resolved</span>;
  };

  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
          <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-bold text-gray-800">User Reports</h2>
        </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Flag className="w-4 h-4" />
                Pending
              </div>
            </button>
            <button
              onClick={() => setActiveTab('resolved')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'resolved'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <History className="w-4 h-4" />
                Resolved
              </div>
            </button>
        </div>
      </div>
      
        {activeTab === 'pending' && (
          <>
            {groupedContent.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Flag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No pending reports found.</p>
                  </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groupedContent.map((content) => (
              <div 
                key={content.id} 
                className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden hover:shadow-md hover:border-gray-600 transition-all cursor-pointer flex flex-col"
                onClick={() => setSelectedContent(content)}
              >
                {/* Reported Content */}
                <div className="p-3 border-b border-gray-700">
                  <div className="flex items-start gap-2">
                    {content.ownerProfileImage ? (
                      <img 
                        src={content.ownerProfileImage} 
                        alt={content.ownerName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-600"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {content.type === 'post' ? (
                          <FileText className="w-4 h-4 text-gray-400" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-semibold text-sm text-gray-100 truncate">{content.ownerName}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{formatTime(content.latestDate)}</span>
                      </div>
                      {content.content && (
                        <p className="text-xs text-gray-300 mb-2 line-clamp-2 break-words">{content.content}</p>
                      )}
                      {content.images && content.images.length > 0 && (
                        <div className="mt-2">
                          <img 
                            src={content.images[0]} 
                            alt="Content"
                            className="w-full h-24 object-cover rounded border border-gray-700"
                          />
                          {content.images.length > 1 && (
                            <div className="text-xs text-gray-400 mt-1">+{content.images.length - 1} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reporters Section */}
                <div className="p-3 bg-gray-900 flex-1">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Flag className="w-3 h-3 text-red-500" />
                    <span className="text-xs font-semibold text-gray-300">
                      {content.reports.length} {content.reports.length === 1 ? 'Report' : 'Reports'}
                  </span>
                  </div>
                  
                  {/* Reporters list - compact */}
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {content.reports.map((report, idx) => (
                      <div key={report.id || idx} className="bg-gray-800 rounded p-2 border border-gray-700">
                        <div className="flex items-start gap-1.5">
                          {report.reporterProfileImage ? (
                            <img 
                              src={report.reporterProfileImage} 
                              alt={report.reporterName}
                              className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-gray-600"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3 text-blue-400" />
                    </div>
                  )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-200 truncate">{report.reporterName}</p>
                            <p className="text-xs text-red-400 font-medium">{report.reason}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-gray-500" />
                              <span className="text-xs text-gray-400">{formatTime(report.timestamp)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
          ))}
        </div>
      </div>
      
                {/* Actions */}
                <div className="p-2 border-t border-gray-700 flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleDismissAll(content)}
                    className="px-2 py-1 text-xs text-gray-300 font-medium hover:bg-gray-700 rounded transition-colors"
                  >
                    Dismiss
                        </button>
                  <button 
                    onClick={() => handleRemovePost(content)}
                    className="px-2 py-1 bg-red-600 text-white font-medium hover:bg-red-700 rounded transition-colors text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Remove
                        </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination Controls - Only show when not searching */}
        {activeTab === 'pending' && groupedContent.length > 0 && hasMoreReports && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={loadMoreReports}
              disabled={loadingMoreReports}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loadingMoreReports ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <span>Load More Reports</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
                      </>
                    )}

        {activeTab === 'resolved' && (
          <>
            {/* Header with View Archive Button */}
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 w-full">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by owner name, content, reporter, reason, or resolution..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <input
                    type="date"
                    value={historyDateFilter}
                    onChange={(e) => setHistoryDateFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Filter by date"
                  />
                  {(historySearchTerm || historyDateFilter) && (
                    <button
                      onClick={() => {
                        setHistorySearchTerm('');
                        setHistoryDateFilter('');
                      }}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredHistoryContent.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">
                  {(historySearchTerm || historyDateFilter) ? 'No history found matching your filters.' : 'No history found.'}
                </p>
              </div>
            ) : (
              <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Taken</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved At</th>
            </tr>
          </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistoryContent.map((content) => (
                      <tr 
                        key={content.id} 
                        className="hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                        onClick={() => setSelectedHistoryContent(content)}
                      >
                        <td className="px-4 py-2 text-sm">
                          <div className="flex items-center">
                            {content.ownerProfileImage ? (
                              <img 
                                src={content.ownerProfileImage} 
                                alt={content.ownerName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                {content.type === 'post' ? (
                                  <FileText className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <MessageSquare className="w-5 h-5 text-gray-500" />
                                )}
                              </div>
                            )}
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{content.ownerName}</p>
                            </div>
                  </div>
                </td>
                        <td className="px-4 py-2 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {content.type === 'post' ? (
                              <>
                                <FileText className="w-3 h-3 mr-1" />
                                Post
                              </>
                            ) : (
                              <>
                                <MessageSquare className="w-3 h-3 mr-1" />
                                Message
                              </>
                            )}
                  </span>
                </td>
                        <td className="px-4 py-2 text-sm">
                          <div className="max-w-md">
                            {content.content && (
                              <p className="text-sm text-gray-900 line-clamp-2 break-words">{content.content}</p>
                            )}
                            {content.images && content.images.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                                <span>📷 {content.images.length} {content.images.length === 1 ? 'image' : 'images'}</span>
                    </div>
                  )}
                            {!content.content && (!content.images || content.images.length === 0) && (
                              <span className="text-sm text-gray-400 italic">No content preview</span>
                            )}
                          </div>
                </td>
                        <td className="px-4 py-2 text-sm">
                          {getActionBadge(content.resolution)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {content.resolvedAt?.toDate ? content.resolvedAt.toDate().toLocaleString() : 'N/A'}
                        </td>
              </tr>
            ))}
                    {filteredHistoryContent.length === 0 && (
              <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                          {(historySearchTerm || historyDateFilter) ? 'No history found matching your filters.' : 'No history found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
              </div>
            )}
                      </>
                    )}

        {activeTab === 'archive' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('resolved')}
                  className="flex items-center justify-center p-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-all duration-300 hover:shadow-md"
                  title="Go back to Resolved"
                >
                  <ArrowLeft className="h-5 w-5" />
                      </button>
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Archived Reports</h2>
                  <p className="text-xs sm:text-sm text-gray-600">View archived report history</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium">
                {groupedArchivedContent.length} archived
              </div>
            </div>

            {/* Search Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by owner name, content, or resolution..."
                  value={archiveSearchTerm}
                  onChange={(e) => setArchiveSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setArchiveSearchTerm('')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300 whitespace-nowrap"
              >
                Clear
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Taken</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredArchivedContent.map((content) => (
                    <tr 
                      key={content.id} 
                      className="hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                      onClick={() => setSelectedHistoryContent(content)}
                    >
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center">
                          {content.ownerProfileImage ? (
                            <img 
                              src={content.ownerProfileImage} 
                              alt={content.ownerName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              {content.type === 'post' ? (
                                <FileText className="w-5 h-5 text-gray-500" />
                              ) : (
                                <MessageSquare className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          )}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{content.ownerName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {content.type === 'post' ? (
                            <>
                              <FileText className="w-3 h-3 mr-1" />
                              Post
                            </>
                          ) : (
                            <>
                              <MessageSquare className="w-3 h-3 mr-1" />
                              Message
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="max-w-md">
                          {content.content && (
                            <p className="text-sm text-gray-900 line-clamp-2 break-words">{content.content}</p>
                          )}
                          {content.images && content.images.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                              <span>📷 {content.images.length} {content.images.length === 1 ? 'image' : 'images'}</span>
                            </div>
                          )}
                          {!content.content && (!content.images || content.images.length === 0) && (
                            <span className="text-sm text-gray-400 italic">No content preview</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {getActionBadge(content.resolution)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {content.archivedAt?.toDate ? content.archivedAt.toDate().toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                  {filteredArchivedContent.length === 0 && (
              <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                        {archiveSearchTerm ? 'No archived reports match your search criteria' : 'No archived reports yet'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
            </div>
            
            {/* Pagination Controls for Archive Tab */}
            {activeTab === 'archive' && filteredArchivedContent.length > 0 && hasMoreReports && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMoreReports}
                  disabled={loadingMoreReports}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loadingMoreReports ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Reports</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedContent && !selectedContent.resolution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report Details</h3>
                <div className="mt-1">
                  <span className="text-sm text-gray-500">
                    {selectedContent.type === 'post' ? 'Post' : 'Message'} by {selectedContent.ownerName}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedContent(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Reported Content */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start gap-3">
                {selectedContent.ownerProfileImage ? (
                  <img 
                    src={selectedContent.ownerProfileImage} 
                    alt={selectedContent.ownerName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {selectedContent.type === 'post' ? (
                      <FileText className="w-6 h-6 text-gray-600" />
                    ) : (
                      <MessageSquare className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{selectedContent.ownerName}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{formatTime(selectedContent.latestDate)}</span>
                  </div>
                  {selectedContent.content && (
                    <p className="text-gray-800 mb-3 whitespace-pre-wrap break-words">{selectedContent.content}</p>
                  )}
                  {selectedContent.images && selectedContent.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedContent.images.map((img, idx) => (
                              <img 
                                key={idx}
                                src={img} 
                          alt={`Content ${idx + 1}`}
                          className="w-full h-48 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                onClick={() => window.open(img, '_blank')}
                              />
                            ))}
                          </div>
                        )}
                </div>
              </div>
            </div>

            {/* Reporters List */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Flag className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-gray-900">
                  {selectedContent.reports.length} {selectedContent.reports.length === 1 ? 'Person Reported' : 'People Reported'} This
                </h4>
              </div>
              
              <div className="space-y-3">
                {selectedContent.reports.map((report, idx) => (
                  <div key={report.id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start gap-3">
                      {report.reporterProfileImage ? (
                        <img 
                          src={report.reporterProfileImage} 
                          alt={report.reporterName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{report.reporterName}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{formatTime(report.timestamp)}</span>
                        </div>
                        <div className="mt-2">
                          <span className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                            {report.reason}
                        </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-3">
              <button onClick={() => handleDismissAll(selectedContent)} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">Dismiss</button>
              <button onClick={() => handleRemovePost(selectedContent)} className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Remove Post
              </button>
              <button 
                onClick={() => handleRestrictChat(selectedContent)} 
                disabled={isCheckingRestrict}
                className="px-4 py-2 bg-yellow-600 text-white font-medium hover:bg-yellow-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingRestrict ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                <Ban className="w-4 h-4" />
                Restrict Chat
                  </>
                )}
              </button>
              <button 
                onClick={() => { setContentToBan(selectedContent); setBanModalOpen(true); }} 
                disabled={isCheckingBan}
                className="px-4 py-2 bg-orange-600 text-white font-medium hover:bg-orange-700 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCheckingBan ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                      <UserX className="w-4 h-4" />
                      Ban User & Resolve All
                  </>
                )}
                    </button>
            </div>
          </div>
        </div>
      )}

      {banModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-orange-600">
              <UserX className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900">Ban User</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Enter the duration for the ban in days. The user will be automatically logged out and prevented from logging in until the ban expires.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (Days)
              </label>
              <input
                type="number"
                min="1"
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="e.g., 3"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setBanModalOpen(false);
                  setContentToBan(null);
                  setBanDuration('');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                disabled={isBanning}
                className="px-4 py-2 bg-orange-600 text-white font-medium hover:bg-orange-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isBanning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Banning...</span>
                  </>
                ) : (
                  'Confirm Ban'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {restrictModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-yellow-600">
              <Ban className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900">Restrict Chat</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Restrict this user from sending messages. Enter the duration and reason for the restriction.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration Type
              </label>
              <select
                value={restrictDurationType}
                onChange={(e) => setRestrictDurationType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration ({restrictDurationType === 'hours' ? 'Hours' : 'Days'})
              </label>
              <input
                type="number"
                min="1"
                value={restrictDuration}
                onChange={(e) => setRestrictDuration(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all"
                placeholder={restrictDurationType === 'hours' ? 'e.g., 24' : 'e.g., 3'}
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={restrictReason}
                onChange={(e) => setRestrictReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all resize-none"
                placeholder="Enter the reason for chat restriction..."
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRestrictModalOpen(false);
                  setContentToRestrict(null);
                  setRestrictDuration('');
                  setRestrictReason('');
                  setRestrictDurationType('days');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRestrictChat}
                disabled={isRestricting}
                className="px-4 py-2 bg-yellow-600 text-white font-medium hover:bg-yellow-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRestricting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Restricting...</span>
                  </>
                ) : (
                  'Confirm Restriction'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <Trash2 className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900">Remove {contentToRemove?.type === 'post' ? 'Post' : 'Message'}</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              This action will permanently delete the {contentToRemove?.type || 'content'}. Please provide a reason for removal.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                placeholder="Enter the reason for removing this content..."
                rows="3"
                autoFocus
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRemoveModalOpen(false);
                  setContentToRemove(null);
                  setRemoveReason('');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePost}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Details Modal */}
      {selectedHistoryContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">History Details</h3>
                <div className="mt-1">
                  <span className="text-sm text-gray-500">
                    {selectedHistoryContent.type === 'post' ? 'Post' : 'Message'} by {selectedHistoryContent.ownerName}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHistoryContent(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Reported Content */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start gap-3">
                {selectedHistoryContent.ownerProfileImage ? (
                  <img 
                    src={selectedHistoryContent.ownerProfileImage} 
                    alt={selectedHistoryContent.ownerName}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    {selectedHistoryContent.type === 'post' ? (
                      <FileText className="w-6 h-6 text-gray-600" />
                    ) : (
                      <MessageSquare className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">{selectedHistoryContent.ownerName}</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{formatTime(selectedHistoryContent.resolvedAt)}</span>
                  </div>
                  {selectedHistoryContent.content && (
                    <p className="text-gray-800 mb-3 whitespace-pre-wrap break-words">{selectedHistoryContent.content}</p>
                  )}
                  {selectedHistoryContent.images && selectedHistoryContent.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedHistoryContent.images.map((img, idx) => (
                        <img 
                          key={idx}
                          src={img} 
                          alt={`Content ${idx + 1}`}
                          className="w-full h-48 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => window.open(img, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Taken */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Action Taken</h4>
              </div>
              <div className="flex items-center gap-2">
                {getActionBadge(selectedHistoryContent.resolution)}
                <span className="text-sm text-gray-500">
                  Resolved on {selectedHistoryContent.resolvedAt?.toDate ? selectedHistoryContent.resolvedAt.toDate().toLocaleString() : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-3">
              <button 
                onClick={() => setSelectedHistoryContent(null)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserReports;
