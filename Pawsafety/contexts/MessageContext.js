import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc,
  setDoc,
  arrayUnion
} from 'firebase/firestore';

const MessageContext = createContext();

export const useMessage = () => useContext(MessageContext);

export const MessageProvider = ({ children }) => {
  const [reportChats, setReportChats] = useState([]);
  const [directChats, setDirectChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setReportChats([]);
      setDirectChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let reportLoaded = false;
    let directLoaded = false;

    const checkLoading = () => {
      if (reportLoaded && directLoaded) {
        setLoading(false);
      }
    };

    // Listen to report chats
    const reportChatsRef = collection(db, 'report_chats');
    let qReport;
    try {
      qReport = query(
        reportChatsRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastMessageTime', 'desc')
      );
    } catch (error) {
      // If orderBy fails (e.g., missing index), try without it
      console.warn('OrderBy failed, using simple query:', error);
      qReport = query(
        reportChatsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
    }

    const unsubscribeReport = onSnapshot(qReport, async (snapshot) => {
      const chatsData = [];
      
      for (const docSnap of snapshot.docs) {
        const chatData = { id: docSnap.id, ...docSnap.data(), type: 'report' };
        
        // Skip if this chat is deleted for the current user
        if (chatData.deletedBy && chatData.deletedBy.includes(currentUser.uid)) {
          continue;
        }
        
        const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
        if (!otherUserId) continue;

        // Fetch additional data (report, other user)
        // Note: In a real app, you might want to optimize this by fetching users in batch or caching
        // For now, we'll fetch individually but handle errors gracefully
        
        let report = null;
        if (chatData.reportId) {
          try {
            const reportDoc = await getDoc(doc(db, 'stray_reports', chatData.reportId));
            if (reportDoc.exists()) {
              report = { id: reportDoc.id, ...reportDoc.data() };
            }
          } catch (error) {
            // Silent error
          }
        }

        let otherUser = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            otherUser = {
              id: otherUserId,
              name: userData.displayName || userData.name || 'Pet Lover',
              profileImage: userData.profileImage || null,
            };
          } else {
            otherUser = { id: otherUserId, name: 'Pet Lover', profileImage: null };
          }
        } catch (error) {
          otherUser = { id: otherUserId, name: 'Pet Lover', profileImage: null };
        }

        chatsData.push({
          ...chatData,
          otherUser,
          report,
        });
      }
      // Sort by lastMessageTime if available
      chatsData.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate ? a.lastMessageTime.toDate().getTime() : (a.lastMessageTime || 0);
        const timeB = b.lastMessageTime?.toDate ? b.lastMessageTime.toDate().getTime() : (b.lastMessageTime || 0);
        return timeB - timeA;
      });
      setReportChats(chatsData);
      reportLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('Error listening to report chats:', error);
      reportLoaded = true;
      checkLoading();
    });

    // Listen to direct chats
    const directChatsRef = collection(db, 'direct_chats');
    let qDirect;
    try {
      qDirect = query(
        directChatsRef,
        where('participants', 'array-contains', currentUser.uid),
        orderBy('lastMessageTime', 'desc')
      );
    } catch (error) {
      // If orderBy fails (e.g., missing index), try without it
      console.warn('OrderBy failed, using simple query:', error);
      qDirect = query(
        directChatsRef,
        where('participants', 'array-contains', currentUser.uid)
      );
    }

    const unsubscribeDirect = onSnapshot(qDirect, async (snapshot) => {
      const chatsData = [];
      
      for (const docSnap of snapshot.docs) {
        const chatData = { id: docSnap.id, ...docSnap.data(), type: 'direct' };
        
        // Skip if this chat is deleted for the current user
        if (chatData.deletedBy && chatData.deletedBy.includes(currentUser.uid)) {
          continue;
        }
        
        const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
        if (!otherUserId) continue;

        let otherUser = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            otherUser = {
              id: otherUserId,
              name: userData.displayName || userData.name || 'Pet Lover',
              profileImage: userData.profileImage || null,
            };
          } else {
            otherUser = { id: otherUserId, name: 'Pet Lover', profileImage: null };
          }
        } catch (error) {
          otherUser = { id: otherUserId, name: 'Pet Lover', profileImage: null };
        }

        chatsData.push({
          ...chatData,
          otherUser,
        });
      }
      // Sort by lastMessageTime if available
      chatsData.sort((a, b) => {
        const timeA = a.lastMessageTime?.toDate ? a.lastMessageTime.toDate().getTime() : (a.lastMessageTime || 0);
        const timeB = b.lastMessageTime?.toDate ? b.lastMessageTime.toDate().getTime() : (b.lastMessageTime || 0);
        return timeB - timeA;
      });
      setDirectChats(chatsData);
      directLoaded = true;
      checkLoading();
    }, (error) => {
      console.error('Error listening to direct chats:', error);
      directLoaded = true;
      checkLoading();
    });

    return () => {
      unsubscribeReport();
      unsubscribeDirect();
    };
  }, [currentUser]);

  const unreadCount = useMemo(() => {
    if (!currentUser) return 0;
    
    const reportUnread = reportChats.filter(chat => 
      chat.readBy && !chat.readBy.includes(currentUser.uid)
    ).length;
    
    const directUnread = directChats.filter(chat => 
      chat.readBy && !chat.readBy.includes(currentUser.uid)
    ).length;

    return reportUnread + directUnread;
  }, [reportChats, directChats, currentUser]);

  const markAsRead = async (chatId, type) => {
    if (!currentUser || !chatId) return;

    try {
      const collectionName = type === 'direct' ? 'direct_chats' : 'report_chats';
      const chatRef = doc(db, collectionName, chatId);
      
      await updateDoc(chatRef, {
        readBy: arrayUnion(currentUser.uid)
      });
    } catch (error) {
      console.error(`Error marking ${type} chat as read:`, error);
    }
  };

  return (
    <MessageContext.Provider value={{
      reportChats,
      directChats,
      loading,
      unreadCount,
      markAsRead
    }}>
      {children}
    </MessageContext.Provider>
  );
};

