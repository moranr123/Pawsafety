import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { 
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  LogOut, 
  Users, 
  Dog,
  UserX,
  BarChart3,
  List,
  CheckCircle2,
  Clock,
  FileText,
  Settings,
  User,
  Bell,
  Shield,
  ShieldCheck,
  ShieldOff,
  Archive,
  ArrowLeft,
  Flag,
  Megaphone,
  X,
  Ban,
  RotateCcw,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import LogoWhite from '../assets/Logowhite.png';
import LogoBlue from '../assets/LogoBlue.png';
import UserReports from './UserReports';

// eslint-disable-next-line no-unused-vars
const TabButton = React.memo(({ active, label, icon: Icon, onClick, badge = 0 }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={active}
    className={`group flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transform hover:scale-105 ${
      active
        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600 hover:from-indigo-700 hover:to-purple-700'
        : 'bg-white text-indigo-700 border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50'
    }`}
  >
    <Icon className="h-5 w-5 mr-2 text-current" />
    <span>{label}</span>
    {badge > 0 && (
      <span
        className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs ${
          active ? 'bg-white text-indigo-700' : 'bg-red-500 text-white'
        }`}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
));

const AgriculturalDashboard = () => {
  const { currentUser, logout } = useAuth();
  
  // Helper function to log admin activities - memoized
  const logActivity = useCallback(async (action, actionType, details = '') => {
    try {
      await addDoc(collection(db, 'admin_activities'), {
        adminId: currentUser?.uid || '',
        adminName: currentUser?.displayName || currentUser?.email || 'Agricultural Admin',
        adminEmail: currentUser?.email || '',
        adminRole: 'agricultural_admin',
        action,
        actionType,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }, [currentUser]);
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [registeredPets, setRegisteredPets] = useState([]);
  const [pendingPets, setPendingPets] = useState([]);
  const [archivedPets, setArchivedPets] = useState([]);
  const [archivedRegisteredPets, setArchivedRegisteredPets] = useState([]);
  const [deactivatedUsers, setDeactivatedUsers] = useState([]);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [showArchivedUsers, setShowArchivedUsers] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterBreed, setFilterBreed] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'restricted', 'deactivated', 'banned'
  const [showInactiveAlert, setShowInactiveAlert] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [userToBan, setUserToBan] = useState(null);
  const [restrictModalOpen, setRestrictModalOpen] = useState(false);
  const [restrictDuration, setRestrictDuration] = useState('');
  const [restrictDurationType, setRestrictDurationType] = useState('days');
  const [restrictReason, setRestrictReason] = useState('');
  const [userToRestrict, setUserToRestrict] = useState(null);
  const [checkingRestrict, setCheckingRestrict] = useState(new Set());
  const [restricting, setRestricting] = useState(new Set());
  const [checkingBan, setCheckingBan] = useState(new Set());
  const [banning, setBanning] = useState(new Set());
  const [lastLogoutTimes, setLastLogoutTimes] = useState({});
  const [inactiveUsers, setInactiveUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [userChartData, setUserChartData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [userReportCounts, setUserReportCounts] = useState({});
  const notificationsRef = useRef([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementImage, setAnnouncementImage] = useState(null);
  const [announcementImagePreview, setAnnouncementImagePreview] = useState(null);
  const [isCreatingAnnouncement, setIsCreatingAnnouncement] = useState(false);
  const [showReportHistoryModal, setShowReportHistoryModal] = useState(false);
  const [selectedUserForReports, setSelectedUserForReports] = useState(null);
  const [userReports, setUserReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const generateChartData = useCallback((pets, year = null) => {
    // Filter only registered pets
    const registeredPets = pets.filter(pet => 
      pet.registrationStatus === 'registered' && !pet.archived
    );
    
    const targetYear = year || new Date().getFullYear();
    const months = [];
    
    // Generate data for all 12 months of the selected year
    for (let i = 0; i < 12; i++) {
      const date = new Date(targetYear, i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthPets = registeredPets.filter(pet => {
        // Use registeredAt date if available, otherwise fall back to createdAt
        let petDate;
        if (pet.registeredAt?.toDate) {
          petDate = pet.registeredAt.toDate();
        } else if (pet.registeredAt) {
          petDate = new Date(pet.registeredAt);
        } else if (pet.createdAt?.toDate) {
          petDate = pet.createdAt.toDate();
        } else {
          petDate = new Date(pet.createdAt || 0);
        }
        
        return petDate.getMonth() === date.getMonth() && 
               petDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        count: monthPets.length,
        date: date
      });
    }
    
    return months;
  }, []);

  const generateUserChartData = useCallback((users, year = null) => {
    const targetYear = year || new Date().getFullYear();
    const months = [];
    
    // Generate data for all 12 months of the selected year
    for (let i = 0; i < 12; i++) {
      const date = new Date(targetYear, i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      const monthUsers = users.filter(user => {
        let userDate;
        if (user.createdAt?.toDate) {
          userDate = user.createdAt.toDate();
        } else if (user.createdAt) {
          userDate = new Date(user.createdAt);
        } else {
          userDate = new Date(user.createdAt || 0);
        }
        
        return userDate.getMonth() === date.getMonth() && 
               userDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        count: monthUsers.length,
        date: date
      });
    }
    
    return months;
  }, []);


  const generateChartPath = useCallback((data, maxValue = 10) => {
    if (!data || data.length === 0) return "M 20,180 L 20,180";
    const spacing = 360 / Math.max(data.length, 1);
    const points = data.map((d, i) => {
      const x = 20 + (i * spacing);
      const y = 180 - Math.min((d.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    if (points.length === 1) {
      return `M ${points[0]} L ${points[0]}`;
    }
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  }, []);

  const generateChartAreaPath = useCallback((data, maxValue = 10) => {
    if (!data || data.length === 0) return "M 20,180 L 20,180 L 20,180 Z";
    const spacing = 360 / Math.max(data.length, 1);
    const points = data.map((d, i) => {
      const x = 20 + (i * spacing);
      const y = 180 - Math.min((d.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    return `M ${firstPoint} L ${points.slice(1).join(' L ')} L ${lastPoint.split(',')[0]},180 L 20,180 Z`;
  }, []);

  // Firebase data listeners
  useEffect(() => {
    // Listen to pets collection
    const petsQuery = query(collection(db, 'pets'), orderBy('createdAt', 'desc'));
    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const allPets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const newPet = { id: change.doc.id, ...change.doc.data() };
          try {
            await addDoc(collection(db, 'admin_notifications'), {
              type: 'new_registration',
              title: 'New Pet Registration',
              message: `${newPet.ownerFullName || 'Unknown Owner'} has registered a new pet: "${newPet.petName || 'Unknown Pet'}" (${newPet.petType || 'Unknown Type'})`,
              petId: newPet.id,
              petName: newPet.petName || 'Unknown Pet',
              ownerName: newPet.ownerFullName || 'Unknown Owner',
              petType: newPet.petType || 'Unknown Type',
              read: false,
              createdAt: new Date()
            });
          } catch (error) {
            console.error('Error creating admin notification for new pet:', error);
          }
        } else if (change.type === 'removed') {
          const deletedPet = { id: change.doc.id, ...change.doc.data() };
          
          const recentDeceasedNotifications = notificationsRef.current.filter(n => 
            n.type === 'pet_deceased' && 
            n.petId === deletedPet.id &&
            n.createdAt && 
            (n.createdAt.toDate ? n.createdAt.toDate() : new Date(n.createdAt)) > new Date(Date.now() - 5000) // Within last 5 seconds
          );
          
          if (recentDeceasedNotifications.length === 0) {
            try {
              await addDoc(collection(db, 'admin_notifications'), {
                type: 'pet_deleted',
                title: 'Pet Deleted',
                message: `Pet "${deletedPet.petName || 'Unknown Pet'}" (${deletedPet.petType || 'Unknown Type'}) has been deleted by ${deletedPet.ownerFullName || 'Unknown Owner'}`,
                petId: deletedPet.id,
                petName: deletedPet.petName || 'Unknown Pet',
                ownerName: deletedPet.ownerFullName || 'Unknown Owner',
                petType: deletedPet.petType || 'Unknown Type',
                read: false,
                createdAt: new Date()
              });
            } catch (error) {
              console.error('Error creating admin notification for pet deletion:', error);
            }
          }
        }
      });
      
      setPets(allPets);
      
      allPets.forEach(async (pet) => {
        if (!pet.registrationStatus && pet.petName && pet.ownerFullName) {
          try {
            await updateDoc(doc(db, 'pets', pet.id), {
              registrationStatus: 'registered',
              registeredAt: serverTimestamp(),
              registeredBy: 'system_migration'
            });
          } catch (error) {
            console.error('Error migrating pet:', pet.id, error);
          }
        }
      });
      
      const registered = allPets
        .filter(pet => pet.registrationStatus === 'registered' && !pet.archived)
        .sort((a, b) => {
          const dateA = a.registeredAt?.toDate 
            ? a.registeredAt.toDate() 
            : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
          const dateB = b.registeredAt?.toDate 
            ? b.registeredAt.toDate() 
            : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
          
          return dateB.getTime() - dateA.getTime();
        });
      const pending = allPets.filter(pet => 
        (pet.registrationStatus === 'pending' || (!pet.registrationStatus && pet.petName && pet.ownerFullName)) &&
        !pet.archived
      );
      
      const archived = allPets
        .filter(pet => (pet.archived === true && pet.registrationStatus === 'rejected') || pet.registrationStatus === 'rejected')
        .sort((a, b) => {
          const dateA = a.rejectedAt?.toDate 
            ? a.rejectedAt.toDate() 
            : (a.archivedAt?.toDate ? a.archivedAt.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)));
          const dateB = b.rejectedAt?.toDate 
            ? b.rejectedAt.toDate() 
            : (b.archivedAt?.toDate ? b.archivedAt.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)));
          
          return dateB.getTime() - dateA.getTime();
        });

      const archivedRegistered = allPets
        .filter(pet => pet.registrationStatus === 'registered' && pet.archived === true)
        .sort((a, b) => {
          const dateA = a.archivedAt?.toDate 
            ? a.archivedAt.toDate() 
            : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
          const dateB = b.archivedAt?.toDate 
            ? b.archivedAt.toDate() 
            : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
          
          return dateB.getTime() - dateA.getTime();
        });
      
      setRegisteredPets(registered);
      setPendingPets(pending);
      setArchivedPets(archived);
      setArchivedRegisteredPets(archivedRegistered);
      
      // Use only registered pets for chart data
      setChartData(generateChartData(registered, selectedYear));
    });

    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
      const userMap = new Map();
      
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        userMap.set(doc.id, {
          uid: doc.id,
          displayName: userData.name || userData.displayName || 'Unknown User',
          email: userData.email || 'No email',
          phone: userData.phone || 'No phone',
          address: userData.address || 'No address',
          status: userData.status || 'active',
          role: userData.role || 'user',
          emailVerified: userData.emailVerified || false,
          createdAt: userData.createdAt,
          profileImage: userData.profileImage || null,
          chatRestricted: userData.chatRestricted || false,
          chatRestrictionExpiresAt: userData.chatRestrictionExpiresAt || null,
          archived: userData.archived || false
        });
      });
      
      // Enhance with adoption application data if available
      try {
        const adoptionAppsQuery = query(collection(db, 'adoption_applications'));
        const adoptionAppsSnapshot = await getDocs(adoptionAppsQuery);
        
        adoptionAppsSnapshot.docs.forEach(doc => {
          const appData = doc.data();
          if (appData.userId && userMap.has(appData.userId) && appData.applicant) {
            const existingUser = userMap.get(appData.userId);
            userMap.set(appData.userId, {
              ...existingUser,
              // Override with more detailed info from adoption application if available
              displayName: appData.applicant.fullName || existingUser.displayName,
              phone: appData.applicant.phone || existingUser.phone,
              address: appData.applicant.address || existingUser.address,
              hasAdoptionApplication: true,
              // Preserve archived status
              archived: existingUser.archived || false
            });
          }
        });
      } catch (error) {
        console.error('Error fetching adoption applications:', error);
      }
      
      const allUsers = Array.from(userMap.values());
      
      const regularUsers = allUsers.filter(user => {
        const role = user.role || 'user';
        // Explicitly check that archived is not true (handles undefined, null, false)
        return (role === 'user' || role === 'regular') && user.archived !== true;
      });

      const archivedUsersList = allUsers.filter(user => {
        const role = user.role || 'user';
        // Explicitly check that archived is true
        return (role === 'user' || role === 'regular') && user.archived === true;
      });
      
      
      setUsers(regularUsers);
      setDeactivatedUsers(regularUsers.filter(user => user.status === 'deactivated'));
      setArchivedUsers(archivedUsersList);
      
      // Generate user chart data
      setUserChartData(generateUserChartData(regularUsers, selectedYear));
      
      setIsLoading(false);
    });

    const adminNotificationsQuery = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
    const unsubscribeNotifications = onSnapshot(
      adminNotificationsQuery, 
      (snapshot) => {
        const notificationsList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Sort manually by createdAt (newest first)
        notificationsList.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : (a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt));
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : (b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt));
          return dateB.getTime() - dateA.getTime();
        });
        
        setNotifications(notificationsList);
        notificationsRef.current = notificationsList;
        
        // Count unread notifications
        const unread = notificationsList.filter(notification => !notification.read).length;
        setUnreadCount(unread);
      },
      (error) => {
        console.error('Error listening to admin notifications:', error);
      }
    );

    // Fetch last logout times for users
    let unsubscribeLogoutTimes;
    try {
      // Check user_activities collection for logout activities
      const activitiesQuery = query(
        collection(db, 'user_activities'),
        orderBy('timestamp', 'desc')
      );
      
      unsubscribeLogoutTimes = onSnapshot(
        activitiesQuery, 
        (snapshot) => {
          const allActivities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Filter for logout activities
          const userLogouts = allActivities.filter(activity => {
            const actionType = activity.actionType || '';
            const action = activity.action || '';
            return actionType === 'logout' || action.toLowerCase().includes('logout');
          });
          
          // Create a map of userId to last logout timestamp
          const logoutMap = {};
          userLogouts.forEach(activity => {
            if (activity.userId && activity.timestamp) {
              const timestamp = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
              const existingTimestamp = logoutMap[activity.userId];
              const existingDate = existingTimestamp ? (existingTimestamp.toDate ? existingTimestamp.toDate() : new Date(existingTimestamp)) : null;
              
              // Only keep the most recent logout for each user
              if (!existingDate || timestamp > existingDate) {
                logoutMap[activity.userId] = activity.timestamp;
              }
            }
          });
          
          setLastLogoutTimes(logoutMap);
        },
        (error) => {
          console.error('Error fetching last logout times:', error);
          setLastLogoutTimes({});
        }
      );
    } catch (error) {
      console.error('Error setting up last logout times listener:', error);
      setLastLogoutTimes({});
      unsubscribeLogoutTimes = () => {};
    }

    // Fetch report counts for users
    let unsubscribePostReports;
    let unsubscribeMessageReports;
    try {
      const updateReportCounts = async () => {
        try {
          const [postSnapshot, messageSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'post_reports'))),
            getDocs(query(collection(db, 'message_reports')))
          ]);
          
          const counts = {};
          
          // Count post reports (exclude dismissed reports)
          postSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Only count if status is not 'dismissed'
            if (data.status !== 'dismissed') {
              const userId = data.postOwnerId || data.userId || data.ownerId || data.reportedUser;
              if (userId) {
                counts[userId] = (counts[userId] || 0) + 1;
              }
            }
          });
          
          // Count message reports (exclude dismissed reports)
          messageSnapshot.docs.forEach(doc => {
            const data = doc.data();
            // Only count if status is not 'dismissed'
            if (data.status !== 'dismissed') {
              const userId = data.userId || data.ownerId || data.reportedUser || data.messageOwnerId;
              if (userId) {
                counts[userId] = (counts[userId] || 0) + 1;
              }
            }
          });
          
          setUserReportCounts(counts);
        } catch (error) {
          console.error('Error fetching report counts:', error);
        }
      };
      
      // Initial fetch
      updateReportCounts();
      
      // Listen to changes in post_reports
      const postReportsQuery = query(collection(db, 'post_reports'));
      unsubscribePostReports = onSnapshot(postReportsQuery, () => {
        updateReportCounts();
      });

      // Listen to changes in message_reports
      const messageReportsQuery = query(collection(db, 'message_reports'));
      unsubscribeMessageReports = onSnapshot(messageReportsQuery, () => {
        updateReportCounts();
      });
    } catch (error) {
      console.error('Error setting up report counts listener:', error);
      unsubscribePostReports = () => {};
      unsubscribeMessageReports = () => {};
    }

    return () => {
      unsubscribePets();
      unsubscribeUsers();
      unsubscribeNotifications();
      if (unsubscribeLogoutTimes) unsubscribeLogoutTimes();
      if (unsubscribePostReports) unsubscribePostReports();
      if (unsubscribeMessageReports) unsubscribeMessageReports();
    };
  }, [generateChartData]);

  // Update chart data when year changes
  useEffect(() => {
    if (registeredPets.length > 0) {
      setChartData(generateChartData(registeredPets, selectedYear));
    }
    if (users.length > 0) {
      setUserChartData(generateUserChartData(users, selectedYear));
    }
  }, [selectedYear, registeredPets, users, generateChartData, generateUserChartData]);


  // Function to get owner's profile image - memoized
  const getOwnerProfileImage = useCallback((pet) => {
    if (!pet || !pet.userId) return null;
    const owner = users.find(user => user.uid === pet.userId);
    return owner?.profileImage || null;
  }, [users]);

  const handleLogout = useCallback(async () => {
    const ok = window.confirm('Are you sure you want to logout?');
    if (!ok) return;
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  }, [logout]);

  const handleApprovePetRegistration = useCallback(async (petId) => {
    try {
      const petDoc = pets.find(pet => pet.id === petId);
      
      await updateDoc(doc(db, 'pets', petId), {
        registrationStatus: 'registered',
        registeredAt: serverTimestamp(),
        registeredBy: currentUser?.email || 'agricultural_admin'
      });

      // Create notification for pet owner
      if (petDoc && petDoc.userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: petDoc.userId,
          type: 'pet_registration_approved',
          title: 'Pet Registration Approved',
          message: `Your pet "${petDoc.petName}" has been approved and registered successfully!`,
          petId: petId,
          petName: petDoc.petName,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      toast.success('Pet registration approved');
      
      // Log activity
      await logActivity(
        `Approved pet registration for "${petDoc?.petName || 'Unknown Pet'}"`,
        'update',
        `Approved registration for pet: ${petDoc?.petName} (${petDoc?.petType || 'Unknown Type'}) owned by ${petDoc?.ownerFullName || 'Unknown Owner'}`
      );
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error('Failed to approve registration');
    }
  }, [pets, currentUser, logActivity]);

  const handleRejectPetRegistration = useCallback(async (petId) => {
      const petDoc = pets.find(pet => pet.id === petId);
    const petName = petDoc?.petName || 'Unnamed Pet';
    const ownerName = petDoc?.ownerFullName || 'Unknown Owner';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to reject this pet registration?\n\n` +
      `Pet: ${petName}\n` +
      `Owner: ${ownerName}\n\n` +
      `This will:\n` +
      `• Archive the pet registration\n` +
      `• Send a rejection notification to the pet owner\n` +
      `• Move the pet to the Archive page\n\n` +
      `Click OK to reject or Cancel to abort.`
    );
    
    if (!confirmed) {
      return; // User cancelled the action
    }
    
    try {
      // Create notification for pet owner before archiving
      if (petDoc && petDoc.userId) {
        await addDoc(collection(db, 'notifications'), {
          userId: petDoc.userId,
          type: 'pet_registration_rejected',
          title: 'Pet Registration Rejected',
          message: `Your pet "${petDoc.petName}" registration has been rejected. Please review the requirements and try again.`,
          petId: petId,
          petName: petDoc.petName,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      // Archive the pet instead of deleting
      const petRef = doc(db, 'pets', petId);
      await updateDoc(petRef, {
        archived: true,
        registrationStatus: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser?.email || 'agricultural_admin'
      });
      
      toast.success('Pet registration rejected and archived');
      
      // Log activity
      await logActivity(
        `Rejected pet registration for "${petName}"`,
        'update',
        `Rejected registration for pet: ${petName} (${petDoc?.petType || 'Unknown Type'}) owned by ${ownerName}`
      );
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error('Failed to reject registration');
    }
  }, [pets, currentUser, logActivity]);

  const handleImageSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setAnnouncementImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnnouncementImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setAnnouncementImage(null);
    setAnnouncementImagePreview(null);
  }, []);

  const handleCreateAnnouncement = useCallback(async () => {
    if (!announcementTitle.trim() && !announcementMessage.trim() && !announcementImage) {
      toast.error('Please add at least a title, message, or image');
      return;
    }

    setIsCreatingAnnouncement(true);
    try {
      let imageUrl = null;
      
      // Upload image if selected
      if (announcementImage) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, `announcements/${Date.now()}_${announcementImage.name}`);
          await uploadBytes(imageRef, announcementImage);
          imageUrl = await getDownloadURL(imageRef);
        } catch (error) {
          console.error('Error uploading image:', error);
          toast.error('Failed to upload image. Please try again.');
          setIsCreatingAnnouncement(false);
          return;
        }
      }

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const userIds = [];
      usersSnapshot.forEach((userDoc) => {
        userIds.push(userDoc.id);
      });

      // Create announcement document
      const announcementRef = await addDoc(collection(db, 'announcements'), {
        title: announcementTitle.trim() || 'Announcement',
        message: announcementMessage.trim() || '',
        imageUrl: imageUrl,
        createdBy: 'Pawsafety',
        createdById: currentUser?.uid || '',
        createdByEmail: currentUser?.email || 'agricultural_admin',
        createdAt: serverTimestamp(),
        targetUsers: 'all', // All users
        isActive: true,
        userName: 'Pawsafety',
        userProfileImage: LogoBlue // Store the path, will be used in mobile app
      });

      // Create notifications for all users and send push notifications
      const pushNotificationPromises = [];

      // Get push tokens for all users
      const pushTokensMap = new Map();
      const pushTokensSnapshot = await getDocs(collection(db, 'user_push_tokens'));
      pushTokensSnapshot.forEach((tokenDoc) => {
        const tokenData = tokenDoc.data();
        const token = tokenData?.expoPushToken || tokenData?.pushToken;
        if (token) {
          pushTokensMap.set(tokenDoc.id, token);
        }
      });

      // Prepare notification title and body
      const notificationTitle = announcementTitle.trim() || 'New Announcement from Pawsafety';
      const notificationBody = announcementMessage.trim() || 'Check out the latest announcement!';

      // Split into batches of 500 (Firestore batch limit)
      const BATCH_SIZE = 500;
      const batches = [];
      for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        batches.push(userIds.slice(i, i + BATCH_SIZE));
      }

      // Process each batch
      let totalNotifications = 0;
      for (const userBatch of batches) {
        const batch = writeBatch(db);
        
        userBatch.forEach((userId) => {
          // Create Firestore notification
          const notificationRef = doc(collection(db, 'notifications'));
          batch.set(notificationRef, {
            userId: userId,
            title: notificationTitle,
            body: notificationBody,
            type: 'announcement',
            announcementId: announcementRef.id,
            read: false,
            createdAt: serverTimestamp(),
            data: {
              type: 'announcement',
              announcementId: announcementRef.id
            }
          });

          // Send push notification if token exists
          const pushToken = pushTokensMap.get(userId);
          if (pushToken) {
            pushNotificationPromises.push(
              fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Accept-Encoding': 'gzip, deflate',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                  to: pushToken,
                  sound: 'default',
                  title: notificationTitle,
                  body: notificationBody,
                  data: {
                    type: 'announcement',
                    announcementId: announcementRef.id
                  },
                  priority: 'high',
                  channelId: 'default'
                }])
              }).catch(error => {
                console.error(`Error sending push to user ${userId}:`, error);
                return null; // Don't fail the whole operation
              })
            );
          }
        });

        // Commit this batch
        await batch.commit();
        totalNotifications += userBatch.length;
      }

      console.log(`✅ Created ${totalNotifications} notifications in Firestore`);

      // Send all push notifications (don't await, let them run in background)
      Promise.all(pushNotificationPromises).then(results => {
        const successful = results.filter(r => r && r.ok).length;
        console.log(`📱 Sent ${successful}/${pushNotificationPromises.length} push notifications`);
      }).catch(error => {
        console.error('Error sending some push notifications:', error);
      });

      // Log activity
      await logActivity(
        `Created announcement: "${announcementTitle.trim()}"`,
        'create',
        `Sent announcement to ${userIds.length} users`
      );

      toast.success(`Announcement sent to ${userIds.length} users!`);
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementImage(null);
      setAnnouncementImagePreview(null);
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error('Failed to create announcement');
    } finally {
      setIsCreatingAnnouncement(false);
    }
  }, [announcementTitle, announcementMessage, announcementImage, currentUser, logActivity]);

  const handleArchivePet = useCallback(async (petId, petName) => {
    const confirmed = window.confirm(
      `Are you sure you want to archive ${petName}?\n\n` +
      `This will:\n` +
      `• Move the pet to the Archive page\n` +
      `• Remove it from the active pet management list\n` +
      `• Preserve all pet data\n\n` +
      `Click OK to archive or Cancel to abort.`
    );
    
    if (!confirmed) return;

    try {
      const petRef = doc(db, 'pets', petId);
      await updateDoc(petRef, {
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: currentUser?.email || 'agricultural_admin'
      });
      
      toast.success(`${petName} has been archived successfully`);
      
      // Log activity
      await logActivity(
        `Archived pet "${petName}"`,
        'update',
        `Archived pet: ${petName}`
      );
    } catch (error) {
      console.error('Error archiving pet:', error);
      toast.error('Failed to archive pet');
    }
  }, [currentUser, logActivity]);

  const handleViewPet = useCallback((pet) => {
    setSelectedPet(pet);
    setShowPetModal(true);
  }, []);

  // Filter functions - memoized
  const getFilteredPets = useCallback((petList) => {
    // Get archived user IDs
    const archivedUserIds = new Set(archivedUsers.map(user => user.uid || user.id));
    
    return petList.filter(pet => {
      // Exclude pets from archived users
      if (pet.userId && archivedUserIds.has(pet.userId)) return false;
      
      const matchesSearch = !searchTerm || 
        pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || pet.petType === filterType;
      
      return matchesSearch && matchesType;
    });
  }, [searchTerm, filterType, archivedUsers]);

  // Get unique breeds from registered pets - memoized
  const getUniqueBreeds = useMemo(() => {
    const breeds = registeredPets
      .map(pet => pet.breed)
      .filter(breed => breed && breed.trim() !== '')
      .filter((breed, index, self) => self.indexOf(breed) === index)
      .sort();
    return breeds;
  }, [registeredPets]);

  // Filter registered pets with additional filters - memoized
  const getFilteredRegisteredPets = useMemo(() => {
    // Get archived user IDs
    const archivedUserIds = new Set(archivedUsers.map(user => user.uid || user.id));
    
    return registeredPets.filter(pet => {
      // Exclude pets from archived users
      if (pet.userId && archivedUserIds.has(pet.userId)) return false;
      
      const matchesSearch = !searchTerm || 
        pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || pet.petType === filterType;
      
      const matchesGender = filterGender === 'all' || pet.petGender === filterGender;
      
      const matchesBreed = filterBreed === 'all' || pet.breed === filterBreed;
      
      const matchesDate = (() => {
        if (filterDate === 'all') return true;
        
        const petDate = pet.registeredAt?.toDate 
          ? pet.registeredAt.toDate() 
          : (pet.createdAt?.toDate ? pet.createdAt.toDate() : new Date(pet.createdAt || 0));
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        switch (filterDate) {
          case 'today':
            return petDate >= today;
          case 'week':
            return petDate >= weekAgo;
          case 'month':
            return petDate >= monthAgo;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesType && matchesGender && matchesBreed && matchesDate;
    });
  }, [registeredPets, archivedUsers, searchTerm, filterType, filterGender, filterBreed, filterDate]);
  
  const getFilteredPendingPets = useMemo(() => getFilteredPets(pendingPets), [getFilteredPets, pendingPets]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      await updateDoc(doc(db, 'admin_notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        if (!notification.read) {
          batch.update(doc(db, 'admin_notifications', notification.id), { read: true });
        }
      });
      await batch.commit();
      setShowNotifications(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId) => {
    const confirmed = window.confirm('Are you sure you want to delete this notification? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'admin_notifications', notificationId));
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    const confirmed = window.confirm('Are you sure you want to delete all notifications? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        batch.delete(doc(db, 'admin_notifications', notification.id));
      });
      await batch.commit();
      setShowNotifications(false);
      toast.success('All notifications deleted successfully');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      toast.error('Failed to delete notifications');
    }
  }, [notifications]);

  const handleNotificationClick = useCallback(async (notification) => {
    // Mark notification as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    // Open notification details modal without closing the list
    setSelectedNotification(notification);
    setShowNotificationModal(true);
  }, [markNotificationAsRead]);


  // User Management Functions - memoized
  const handleActivateUser = useCallback(async (userId) => {
    // Find user details for confirmation dialog
    const user = users.find(u => u.uid === userId);
    const userName = user?.displayName || 'Unknown User';
    const userEmail = user?.email || 'No email';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to activate this user account?\n\n` +
      `User: ${userName}\n` +
      `Email: ${userEmail}\n\n` +
      `This will:\n` +
      `• Allow the user to log into the mobile app\n` +
      `• Restore full access to their account\n` +
      `• Enable all app features for this user\n\n` +
      `Click OK to activate or Cancel to abort.`
    );
    
    if (!confirmed) {
      return; // User cancelled the action
    }
    
    try {
      // Update user status in adoption_applications collection
      const appsQuery = query(collection(db, 'adoption_applications'), where('userId', '==', userId));
      const appsSnapshot = await getDocs(appsQuery);
      
      const batch = writeBatch(db);
      appsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { userStatus: 'active' });
      });
      
      // Create or update user status in users collection
      const userDocRef = doc(db, 'users', userId);
      batch.set(userDocRef, { 
        status: 'active',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'agricultural_admin'
      }, { merge: true });
      
      await batch.commit();
      
      toast.success(`${userName} has been activated successfully`);
      
      // Log activity
      await logActivity(
        `Activated user account for ${userName}`,
        'status_change',
        `Activated user: ${userName} (${userEmail})`
      );
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  }, [users, currentUser, logActivity]);

  const handleDeactivateUser = useCallback(async (userId) => {
    // Find user details for confirmation dialog
    const user = users.find(u => u.uid === userId);
    const userName = user?.displayName || 'Unknown User';
    const userEmail = user?.email || 'No email';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to deactivate this user account?\n\n` +
      `User: ${userName}\n` +
      `Email: ${userEmail}\n\n` +
      `This will:\n` +
      `• Sign out the user from the mobile app immediately\n` +
      `• Prevent them from logging back in\n` +
      `• Keep their data but restrict access\n\n` +
      `Click OK to deactivate or Cancel to abort.`
    );
    
    if (!confirmed) {
      return; // User cancelled the action
    }
    
    try {
      // Update user status in adoption_applications collection
      const appsQuery = query(collection(db, 'adoption_applications'), where('userId', '==', userId));
      const appsSnapshot = await getDocs(appsQuery);
      
      const batch = writeBatch(db);
      appsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { userStatus: 'deactivated' });
      });
      
      // Create or update user status in users collection
      const userDocRef = doc(db, 'users', userId);
      batch.set(userDocRef, { 
        status: 'deactivated',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'agricultural_admin'
      }, { merge: true });
      
      await batch.commit();
      
      toast.success(`${userName} has been deactivated successfully`);
      
      // Log activity
      await logActivity(
        `Deactivated user account for ${userName}`,
        'status_change',
        `Deactivated user: ${userName} (${userEmail})`
      );
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
    }
  }, [users, currentUser, logActivity]);

  const handleArchiveUser = useCallback(async (userId) => {
    // Find user details for confirmation dialog
    const user = users.find(u => u.uid === userId);
    const userName = user?.displayName || 'Unknown User';
    const userEmail = user?.email || 'No email';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to archive this user account?\n\n` +
      `User: ${userName}\n` +
      `Email: ${userEmail}\n\n` +
      `This will:\n` +
      `• Move the user to archived users\n` +
      `• Hide them from the main user list\n` +
      `• Keep their data intact\n\n` +
      `Click OK to archive or Cancel to abort.`
    );
    
    if (!confirmed) {
      return; // User cancelled the action
    }
    
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { 
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: currentUser?.email || 'agricultural_admin',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'agricultural_admin'
      });
      
      toast.success(`${userName} has been archived successfully`);
      
      // Log activity
      await logActivity(
        `Archived user account for ${userName}`,
        'archive',
        `Archived user: ${userName} (${userEmail})`
      );
    } catch (error) {
      console.error('Error archiving user:', error);
      console.error('Error details:', error.message, error.code);
      toast.error(`Failed to archive user: ${error.message || 'Unknown error'}`);
    }
  }, [users, currentUser, logActivity]);

  const handleRestoreUser = useCallback(async (userId) => {
    // Find user details for confirmation dialog
    const user = archivedUsers.find(u => u.uid === userId);
    const userName = user?.displayName || 'Unknown User';
    const userEmail = user?.email || 'No email';
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to restore this archived user account?\n\n` +
      `User: ${userName}\n` +
      `Email: ${userEmail}\n\n` +
      `This will:\n` +
      `• Move the user back to the main user list\n` +
      `• Make them visible again\n\n` +
      `Click OK to restore or Cancel to abort.`
    );
    
    if (!confirmed) {
      return; // User cancelled the action
    }
    
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { 
        archived: false,
        restoredAt: serverTimestamp(),
        restoredBy: currentUser?.email || 'agricultural_admin',
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'agricultural_admin'
      });
      
      toast.success(`${userName} has been restored successfully`);
      
      // Log activity
      await logActivity(
        `Restored archived user account for ${userName}`,
        'restore',
        `Restored user: ${userName} (${userEmail})`
      );
    } catch (error) {
      console.error('Error restoring user:', error);
      toast.error('Failed to restore user');
    }
  }, [archivedUsers, currentUser, logActivity]);

  // Filter users based on search term - memoized
  // Helper function to check if chat restriction is still active
  const isChatRestrictionActive = useCallback((user) => {
    if (!user.chatRestricted || !user.chatRestrictionExpiresAt) {
      return false;
    }
    
    try {
      const expiry = user.chatRestrictionExpiresAt.toDate 
        ? user.chatRestrictionExpiresAt.toDate() 
        : new Date(user.chatRestrictionExpiresAt);
      const now = new Date();
      return expiry > now;
    } catch (error) {
      console.error('Error checking restriction expiry:', error);
      return user.chatRestricted; // Fallback to the boolean value
    }
  }, []);

  const getFilteredUsers = useMemo(() => {
    const userList = showArchivedUsers ? archivedUsers : users;
    return userList.filter(user => {
      const matchesSearch = !searchTerm || 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by user status (only for non-archived view)
      let matchesStatus = true;
      if (!showArchivedUsers) {
        if (userStatusFilter === 'restricted') {
          matchesStatus = isChatRestrictionActive(user);
        } else if (userStatusFilter === 'deactivated') {
          matchesStatus = user.status === 'deactivated';
        } else if (userStatusFilter === 'banned') {
          matchesStatus = user.status === 'banned';
        }
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [users, archivedUsers, showArchivedUsers, searchTerm, userStatusFilter, isChatRestrictionActive]);

  // View user details - memoized
  const handleViewUser = useCallback((user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  }, []);

  // Handle viewing user report history
  const handleViewUserReports = useCallback(async (user) => {
    setSelectedUserForReports(user);
    setLoadingReports(true);
    setShowReportHistoryModal(true);
    
    try {
      // Fetch all post reports and filter client-side (since Firestore doesn't support OR queries)
      const allPostReportsSnapshot = await getDocs(query(collection(db, 'post_reports')));
      const postReports = allPostReportsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.postOwnerId === user.uid || 
                 data.userId === user.uid || 
                 data.ownerId === user.uid || 
                 data.reportedUser === user.uid;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'post',
            content: data.postContent || data.content || data.postText || 'Post content',
            images: data.postImages || data.images || [],
            reason: data.reason || data.reportReason || 'No reason provided',
            date: data.reportedAt || data.createdAt || data.timestamp,
            status: data.status || 'pending',
            ...data
          };
        });

      // Fetch all message reports and filter client-side
      const allMessageReportsSnapshot = await getDocs(query(collection(db, 'message_reports')));
      const messageReports = allMessageReportsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.userId === user.uid || 
                 data.ownerId === user.uid || 
                 data.reportedUser === user.uid ||
                 data.messageOwnerId === user.uid;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'message',
            content: data.messageContent || data.content || data.messageText || 'Message content',
            reason: data.reason || data.reportReason || 'No reason provided',
            date: data.createdAt || data.reportedAt || data.timestamp,
            status: data.status || 'pending',
            ...data
          };
        });

      // Combine and sort by date
      const allReports = [...postReports, ...messageReports].sort((a, b) => {
        const dateA = a.date?.toDate ? a.date.toDate() : (a.date ? new Date(a.date) : new Date(0));
        const dateB = b.date?.toDate ? b.date.toDate() : (b.date ? new Date(b.date) : new Date(0));
        return dateB - dateA;
      });

      setUserReports(allReports);
    } catch (error) {
      console.error('Error fetching user reports:', error);
      toast.error('Failed to load report history');
      setUserReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  // Format timestamp helper
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'Never';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      // Format as: "MM/DD/YYYY, HH:MM AM/PM"
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${formattedDate}, ${formattedTime}`;
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown';
    }
  }, []);

  // Get users that have been inactive for more than 1 month
  const getInactiveUsers = useMemo(() => {
    const now = new Date();
    const oneMonthInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    return users.filter(user => {
      // Skip banned and deactivated users
      if (user.status === 'banned' || user.status === 'deactivated') return false;
      
      const lastLogout = lastLogoutTimes[user.uid];
      if (!lastLogout) {
        // If no logout record, check if account was created more than 1 month ago
        if (user.createdAt) {
          const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
          return (now - createdAt) >= oneMonthInMs;
        }
        return false;
      }
      
      const logoutDate = lastLogout.toDate ? lastLogout.toDate() : new Date(lastLogout);
      const timeSinceLogout = now - logoutDate;
      
      return timeSinceLogout >= oneMonthInMs;
    });
  }, [users, lastLogoutTimes]);

  // Helper function to check if a user is inactive
  const isUserInactive = useCallback((user) => {
    // Skip banned and deactivated users
    if (user.status === 'banned' || user.status === 'deactivated') return false;
    
    const now = new Date();
    const oneMonthInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    const lastLogout = lastLogoutTimes[user.uid];
    if (!lastLogout) {
      // If no logout record, check if account was created more than 1 month ago
      if (user.createdAt) {
        const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        return (now - createdAt) >= oneMonthInMs;
      }
      return false;
    }
    
    const logoutDate = lastLogout.toDate ? lastLogout.toDate() : new Date(lastLogout);
    const timeSinceLogout = now - logoutDate;
    
    return timeSinceLogout >= oneMonthInMs;
  }, [lastLogoutTimes]);

  // Update inactive users when getInactiveUsers changes
  useEffect(() => {
    setInactiveUsers(getInactiveUsers);
  }, [getInactiveUsers]);

  // Send notification helper function
  const sendNotification = useCallback(async (userId, title, body) => {
    if (!userId) return;
    try {
      // Create notification document in Firestore
      await addDoc(collection(db, 'notifications'), {
        userId,
        title,
        body,
        type: 'admin_action',
        read: false,
        createdAt: serverTimestamp()
      });

      // Send push notification
      try {
        const tokenDoc = await getDoc(doc(db, 'user_push_tokens', userId));
        
        if (tokenDoc.exists()) {
          const tokenData = tokenDoc.data();
          const token = tokenData?.expoPushToken || tokenData?.pushToken;
          
          if (token) {
            // Send push notification via Expo API
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([{
                to: token,
                sound: 'default',
                title: title,
                body: body,
                data: {
                  type: 'admin_action',
                  userId: userId
                },
                priority: 'high',
                channelId: 'default'
              }])
            });
            
            if (!response.ok) {
              console.error('Failed to send push notification:', response.statusText);
            }
          }
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Don't throw - Firestore notification was already created
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  // Handle ban user
  const handleBanUser = useCallback(async (user) => {
    setCheckingBan(prev => new Set(prev).add(user.uid));
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const now = new Date();
        
        // Check if user is already banned
        if (userData.status === 'banned' && userData.banExpiresAt) {
          const banExpiry = userData.banExpiresAt.toDate ? userData.banExpiresAt.toDate() : new Date(userData.banExpiresAt);
          if (banExpiry > now) {
            toast.error(`This user is already banned until ${banExpiry.toLocaleDateString()}. Please wait for the ban to expire or unban the user first.`);
            setCheckingBan(prev => {
              const next = new Set(prev);
              next.delete(user.uid);
              return next;
            });
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking user ban status:', error);
      toast.error('Failed to check user ban status');
      setCheckingBan(prev => {
        const next = new Set(prev);
        next.delete(user.uid);
        return next;
      });
      return;
    }

    setCheckingBan(prev => {
      const next = new Set(prev);
      next.delete(user.uid);
      return next;
    });
    setUserToBan(user);
    setBanModalOpen(true);
  }, []);

  // Confirm ban user
  const confirmBanUser = useCallback(async () => {
    if (!banDuration || isNaN(banDuration) || parseInt(banDuration) <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    const days = parseInt(banDuration);
    const user = userToBan;
    
    if (!user || !user.uid) {
      toast.error('Could not find user to ban');
      return;
    }

    setBanning(prev => new Set(prev).add(user.uid));
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      
      // Get the current user data to archive it
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const currentUserData = userDoc.exists() ? userDoc.data() : {};
      
      const batch = writeBatch(db);
      
      // Ban the user and archive profile data
      const userRef = doc(db, 'users', user.uid);
      batch.update(userRef, { 
        status: 'banned', 
        bannedAt: serverTimestamp(),
        bannedBy: currentUser?.email || 'agricultural_admin',
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
      
      // Hide user's content (posts and pets)
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.uid));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: true });
      });
      
      const petsQuery = query(collection(db, 'pets'), where('userId', '==', user.uid));
      const petsSnapshot = await getDocs(petsQuery);
      petsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: true });
      });
      
      await batch.commit();
      
      await sendNotification(user.uid, 'Account Banned', `Your account has been banned for ${days} ${days === 1 ? 'day' : 'days'}.`);
      
      toast.success(`User banned for ${days} days.`);
      setBanning(prev => {
        const next = new Set(prev);
        next.delete(user.uid);
        return next;
      });
      setBanModalOpen(false);
      setUserToBan(null);
      setBanDuration('');
      
      await logActivity(
        `Banned user ${user.displayName || user.email}`,
        'user_ban',
        `Banned user: ${user.displayName || user.email} for ${days} days`
      );
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
      setBanning(prev => {
        const next = new Set(prev);
        next.delete(user.uid);
        return next;
      });
    }
  }, [banDuration, userToBan, currentUser, sendNotification, logActivity]);

  // Handle restrict chat
  const handleRestrictChat = useCallback(async (user) => {
    const userId = user.uid;
    if (!userId) {
      toast.error('Could not find user to restrict');
      return;
    }

    setCheckingRestrict(prev => new Set(prev).add(userId));
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
            setCheckingRestrict(prev => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            return;
          }
        }
        
        // Check if user is already restricted
        if (userData.chatRestricted && userData.chatRestrictionExpiresAt) {
          const restrictExpiry = userData.chatRestrictionExpiresAt.toDate ? userData.chatRestrictionExpiresAt.toDate() : new Date(userData.chatRestrictionExpiresAt);
          if (restrictExpiry > now) {
            toast.error(`This user is already restricted until ${restrictExpiry.toLocaleDateString()}. Please wait for the restriction to expire or remove the restriction first.`);
            setCheckingRestrict(prev => {
              const next = new Set(prev);
              next.delete(userId);
              return next;
            });
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      toast.error('Failed to check user status');
      setCheckingRestrict(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      return;
    }

    setCheckingRestrict(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setUserToRestrict(user);
    setRestrictModalOpen(true);
  }, []);

  // Confirm restrict chat
  const confirmRestrictChat = useCallback(async () => {
    if (!restrictDuration || isNaN(restrictDuration) || parseInt(restrictDuration) <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    if (!restrictReason.trim()) {
      toast.error('Please provide a reason for the chat restriction');
      return;
    }

    const duration = parseInt(restrictDuration);
    const user = userToRestrict;
    const userId = user.uid;
    
    if (!userId) {
      toast.error('Could not find user to restrict');
      return;
    }

    setRestricting(prev => new Set(prev).add(userId));
    try {
      const expiry = new Date();
      if (restrictDurationType === 'hours') {
        expiry.setHours(expiry.getHours() + duration);
      } else {
        expiry.setDate(expiry.getDate() + duration);
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        chatRestricted: true,
        chatRestrictedAt: serverTimestamp(),
        chatRestrictedBy: currentUser?.email || 'agricultural_admin',
        chatRestrictionDuration: duration,
        chatRestrictionDurationType: restrictDurationType,
        chatRestrictionExpiresAt: Timestamp.fromDate(expiry),
        chatRestrictionReason: restrictReason.trim()
      });
      
      const durationText = restrictDurationType === 'hours' 
        ? `${duration} ${duration === 1 ? 'hour' : 'hours'}` 
        : `${duration} ${duration === 1 ? 'day' : 'days'}`;
      
      await sendNotification(userId, 'Chat Restricted', `Your ability to send messages has been restricted for ${durationText}. Reason: ${restrictReason.trim()}`);
      
      toast.success(`Chat restricted for ${user.displayName || user.email} for ${durationText}.`);
      setRestricting(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      setRestrictModalOpen(false);
      setUserToRestrict(null);
      setRestrictDuration('');
      setRestrictReason('');
      setRestrictDurationType('days');
      
      await logActivity(
        `Restricted chat for ${user.displayName || user.email}`,
        'user_restrict',
        `Restricted chat for: ${user.displayName || user.email} for ${durationText}`
      );
    } catch (error) {
      console.error('Error restricting chat:', error);
      toast.error('Failed to restrict chat');
      setRestricting(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, [restrictDuration, restrictDurationType, restrictReason, userToRestrict, currentUser, sendNotification, logActivity]);

  // Handle unban user
  const handleUnbanUser = useCallback(async (user) => {
    if (!window.confirm(`Are you sure you want to lift the ban for ${user.displayName || user.email}?`)) return;

    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const archivedData = userData.archivedProfileData || {};
      
      const batch = writeBatch(db);
      
      // Restore user status and profile data
      const userRef = doc(db, 'users', user.uid);
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
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', user.uid));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: false });
      });
      
      const petsQuery = query(collection(db, 'pets'), where('userId', '==', user.uid));
      const petsSnapshot = await getDocs(petsQuery);
      petsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: false });
      });
      
      await batch.commit();
      
      await sendNotification(user.uid, 'Ban Lifted', 'Your account ban has been lifted. You can now access your account again.');
      
      toast.success('Ban lifted successfully');
      
      await logActivity(
        `Unbanned user ${user.displayName || user.email}`,
        'user_unban',
        `Unbanned user: ${user.displayName || user.email}`
      );
    } catch (error) {
      console.error('Error lifting ban:', error);
      toast.error('Failed to lift ban');
    }
  }, [sendNotification, logActivity]);

  // Handle unrestrict chat
  const handleUnrestrictChat = useCallback(async (user) => {
    if (!window.confirm(`Are you sure you want to remove the chat restriction for ${user.displayName || user.email}?`)) return;

    try {
      await updateDoc(doc(db, 'users', user.uid), { 
        chatRestricted: false,
        chatRestrictedAt: null,
        chatRestrictedBy: null,
        chatRestrictionDuration: null,
        chatRestrictionDurationType: null,
        chatRestrictionExpiresAt: null,
        chatRestrictionReason: null
      });
      
      await sendNotification(user.uid, 'Chat Restriction Lifted', 'Your chat restriction has been removed. You can now send messages again.');
      
      toast.success('Chat restriction lifted successfully');
      
      await logActivity(
        `Unrestricted chat for ${user.displayName || user.email}`,
        'user_unrestrict',
        `Unrestricted chat for: ${user.displayName || user.email}`
      );
    } catch (error) {
      console.error('Error lifting chat restriction:', error);
      toast.error('Failed to lift chat restriction');
    }
  }, [sendNotification, logActivity]);



  // Memoize tab change handlers
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  const handleToggleNotifications = useCallback(() => {
    setShowNotifications(prev => !prev);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleCloseNotifications = useCallback(() => {
    setShowNotifications(false);
  }, []);

  const handleClickOutside = useCallback((event) => {
    if (
      showNotifications &&
      !event.target.closest('.notifications-container') &&
      !event.target.closest('[data-notification-detail-modal]')
    ) {
      setShowNotifications(false);
    }
  }, [showNotifications]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col lg:block">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleMobileMenu}
              className="p-2 text-white hover:bg-slate-700 rounded-lg transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img src={LogoWhite} alt="PawSafety Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-base font-semibold">Agriculture</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleNotifications}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-[1rem] px-1 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-all"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-[60px]"
            onClick={handleCloseNotifications}
          />
          <div className="lg:hidden fixed top-[60px] left-0 right-0 z-50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl border-t border-slate-700 max-h-[calc(100vh-60px)] overflow-y-auto">
            <nav className="py-2">
              <button
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                Dashboard
              </button>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Pet Management</div>
              
              <button
                onClick={() => handleTabChange('registered')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'registered'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-3" />
                  Registered Pets
                </div>
                {registeredPets.length > 0 && (
                  <span className="bg-green-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {registeredPets.length > 99 ? '99+' : registeredPets.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => handleTabChange('pending')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'pending'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-3" />
                  Pending Approval
                </div>
                {pendingPets.length > 0 && (
                  <span className="bg-yellow-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {pendingPets.length > 99 ? '99+' : pendingPets.length}
                  </span>
                )}
              </button>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">User Management</div>
              
              <button
                onClick={() => handleTabChange('users')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3" />
                  User Management
                </div>
              </button>

              <button
                onClick={() => handleTabChange('reports')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <Flag className="h-5 w-5 mr-3" />
                  User Reports
                </div>
              </button>
              
            </nav>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
          sidebarOpen || sidebarHovered ? 'w-80 translate-x-0' : 'w-16 -translate-x-0'
        } lg:${sidebarOpen || sidebarHovered ? 'w-80' : 'w-16'}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl flex flex-col">
          {/* Brand / Toggle */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={LogoWhite} alt="PawSafety Logo" className="w-full h-full object-contain" />
            </div>
              {(sidebarOpen || sidebarHovered) && (
                <span className="ml-3 text-white text-lg font-semibold">Agriculture</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(sidebarOpen || sidebarHovered) && (
                <button
                  onClick={handleToggleSidebar}
                  className="px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
                  aria-label="Toggle sidebar"
                >
                  {sidebarOpen ? '‹' : '›'}
                </button>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="p-3 flex-1 space-y-3 overflow-y-auto">
            {/* Notifications (separate from title) */}
            <div className="mb-2">
              {(sidebarOpen || sidebarHovered) ? (
                <button
                  onClick={handleToggleNotifications}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 relative"
                >
                  <Bell className="h-5 w-5 mr-2" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
              </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleToggleNotifications}
                  className="w-full p-3 rounded-xl transition-all duration-300 relative text-slate-300 hover:text-white hover:bg-slate-700/50"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6 mx-auto" />
                          {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[1rem] px-1 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                  )}
                </button>
                          )}
                        </div>
                            <button
              onClick={() => handleTabChange('dashboard')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <BarChart3 className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Dashboard</span>}
                            </button>
            <button
              onClick={() => handleTabChange('pending')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'pending'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <List className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Pet Registration</span>}
              {pendingPets.length > 0 && (
                <span className={`ml-auto ${(sidebarOpen || sidebarHovered) ? '' : 'hidden'} inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white`}>
                  {pendingPets.length > 99 ? '99+' : pendingPets.length}
                </span>
              )}
            </button>
                            <button
              onClick={() => handleTabChange('registered')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'registered'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Settings className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Pet Management</span>}
              {registeredPets.length > 0 && (
                <span className={`ml-auto ${(sidebarOpen || sidebarHovered) ? '' : 'hidden'} inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-white text-indigo-700`}>
                  {registeredPets.length > 99 ? '99+' : registeredPets.length}
                </span>
              )}
                            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'users'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Shield className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">User Management</span>}
            </button>
            <button
              onClick={() => handleTabChange('reports')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Flag className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">User Reports</span>}
            </button>

            {/* Notifications quick button removed; now at top */}

          </nav>
          {/* Logout pinned to bottom */}
          <div className="p-3 pt-0 mt-auto">
            {(sidebarOpen || sidebarHovered) ? (
                          <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
                          >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
                          </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full p-3 rounded-xl transition-all duration-300 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                aria-label="Logout"
              >
                <LogOut className="h-6 w-6 mx-auto" />
              </button>
            )}
                        </div>
                      </div>
      </aside>

      {/* Floating notifications panel (same as before, anchored near sidebar) */}
      {showNotifications && (
        <div className="fixed left-4 top-20 lg:left-20 lg:top-6 z-50 notifications-container max-w-[calc(100vw-2rem)] sm:max-w-md w-full sm:w-96">
          <div className="w-full bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 mr-2" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    deleteAllNotifications();
                    setShowNotifications(false);
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors border border-red-200 hover:border-red-300 text-xs font-medium"
                  title="Delete all notifications"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete All</span>
                </button>
                <button onClick={handleCloseNotifications} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No notifications yet</p>
                          <p className="text-sm text-gray-400">New pet registrations will appear here</p>
                        </div>
                      ) : (
                        notifications.filter(n => n.type !== 'test').slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <Dog className="h-4 w-4 text-green-600" />
                                  </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">{notification.title}</p>
                          <div className="flex items-center space-x-2">
                          {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors border border-red-200 hover:border-red-300 text-xs font-medium"
                            title="Delete notification"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                          </div>
                                </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                                <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">{notification.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}</p>
                          <button
                            onClick={() => handleNotificationClick(notification)}
                            className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
                          >
                            Click to view details →
                          </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                      </div>
                  </div>
                )}

      {/* Content */}
      <main className={`py-3 px-3 sm:py-6 sm:px-6 transition-all duration-300 ${
        sidebarOpen || sidebarHovered ? 'lg:ml-80' : 'lg:ml-16'
      } pt-20 lg:pt-8`}>
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              <p className="text-gray-600 text-xl font-medium">Loading dashboard data...</p>
              <p className="text-gray-500 text-sm">Please wait while we fetch your data</p>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Header with Create Announcement Button */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Megaphone className="h-5 w-5" />
                <span>Create Announcement</span>
              </button>
            </div>

            {/* Overview Cards (match Impound UI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Total Users</p>
                        <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Dog className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Registered Pets</p>
                        <p className="text-2xl font-bold text-gray-900">{registeredPets.length}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Clock className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Pending Registrations</p>
                        <p className="text-2xl font-bold text-gray-900">{pendingPets.length}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Chart Layout */}
            <div className="grid grid-cols-1 gap-6">
              {/* Year Filter */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">Filter by Year:</h3>
                  <div className="flex gap-2 flex-wrap">
                    {(() => {
                      const currentYear = new Date().getFullYear();
                      const years = [];
                      for (let i = currentYear; i >= currentYear - 5; i--) {
                        years.push(i);
                      }
                      return years.map(year => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(year)}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            selectedYear === year
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {year}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Registered Pets Line Chart */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Registered Pets Trend ({selectedYear})</h3>
                  <span className="text-xs text-gray-300">Total: {registeredPets.length}</span>
                </div>
                <div className="h-48 sm:h-64">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                    {/* Dark grid lines */}
                    <defs>
                      <pattern id="gridDark" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridDark)" />
                    
                    {/* Chart area fill */}
                    <path
                      d={generateChartAreaPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="#3b82f6"
                      fillOpacity="0.2"
                    />
                    
                    {/* Chart line */}
                    <path
                      d={generateChartPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points */}
                    {chartData.map((data, index) => {
                      const maxValue = Math.max(...chartData.map(d => d.count), 1);
                      const spacing = 360 / Math.max(chartData.length, 1);
                      const x = 20 + (index * spacing);
                      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
                      return (
                        <circle 
                          key={index}
                          cx={x} 
                          cy={y} 
                          r="4" 
                          fill="#3b82f6" 
                          stroke="#1e293b"
                          strokeWidth="2"
                        />
                      );
                    })}
                    
                    {/* Month labels */}
                    {chartData.map((data, index) => {
                      const spacing = 360 / Math.max(chartData.length, 1);
                      const x = 20 + (index * spacing);
                      return (
                        <text 
                          key={index}
                          x={x} 
                          y="195" 
                          textAnchor="middle" 
                          className="text-xs fill-gray-300"
                        >
                          {data.month}
                        </text>
                      );
                    })}
                    
                    {/* Y-axis labels */}
                    {(() => {
                      const maxValue = Math.max(...chartData.map(d => d.count), 1);
                      const tickMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
                      const ticks = [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];
                      return ticks.map((t, i) => {
                        const y = 180 - Math.min((t / tickMax) * 160, 160);
                        const label = t % 1 === 0 ? t : t.toFixed(0);
                        return (
                          <text 
                            key={i}
                            x="15" 
                            y={y + 4} 
                            textAnchor="end" 
                            className="text-xs fill-gray-300"
                          >
                            {label}
                          </text>
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className="mt-3 flex justify-between text-xs text-gray-300">
                  <span>Period Total: {chartData.reduce((sum, d) => sum + d.count, 0)}</span>
                  <span>Peak: {Math.max(...chartData.map(d => d.count), 0)}</span>
                </div>
              </div>

              {/* Total Users Line Chart */}
              <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Total Users Trend ({selectedYear})</h3>
                  <span className="text-xs text-gray-300">Total: {users.length}</span>
                </div>
                <div className="h-48 sm:h-64">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                    {/* Dark grid lines */}
                    <defs>
                      <pattern id="gridDarkUsers" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridDarkUsers)" />
                    
                    {/* Chart area fill */}
                    <path
                      d={generateChartAreaPath(userChartData, Math.max(...userChartData.map(d => d.count), 1))}
                      fill="#10b981"
                      fillOpacity="0.2"
                    />
                    
                    {/* Chart line */}
                    <path
                      d={generateChartPath(userChartData, Math.max(...userChartData.map(d => d.count), 1))}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Data points */}
                    {userChartData.map((data, index) => {
                      const maxValue = Math.max(...userChartData.map(d => d.count), 1);
                      const spacing = 360 / Math.max(userChartData.length, 1);
                      const x = 20 + (index * spacing);
                      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
                      return (
                        <circle 
                          key={index}
                          cx={x} 
                          cy={y} 
                          r="4" 
                          fill="#10b981" 
                          stroke="#1e293b"
                          strokeWidth="2"
                        />
                      );
                    })}
                    
                    {/* Month labels */}
                    {userChartData.map((data, index) => {
                      const spacing = 360 / Math.max(userChartData.length, 1);
                      const x = 20 + (index * spacing);
                      return (
                        <text 
                          key={index}
                          x={x} 
                          y="195" 
                          textAnchor="middle" 
                          className="text-xs fill-gray-300"
                        >
                          {data.month}
                        </text>
                      );
                    })}
                    
                    {/* Y-axis labels */}
                    {(() => {
                      const maxValue = Math.max(...userChartData.map(d => d.count), 1);
                      const tickMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
                      const ticks = [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];
                      return ticks.map((t, i) => {
                        const y = 180 - Math.min((t / tickMax) * 160, 160);
                        const label = t % 1 === 0 ? t : t.toFixed(0);
                        return (
                          <text 
                            key={i}
                            x="15" 
                            y={y + 4} 
                            textAnchor="end" 
                            className="text-xs fill-gray-300"
                          >
                            {label}
                          </text>
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className="mt-3 flex justify-between text-xs text-gray-300">
                  <span>Period Total: {userChartData.reduce((sum, d) => sum + d.count, 0)}</span>
                  <span>Peak: {Math.max(...userChartData.map(d => d.count), 0)}</span>
                </div>
              </div>

            </div>
          </div>
        )}

                 {!isLoading && activeTab === 'pending' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-medium text-gray-900">Pet Registration Requests</h2>
              <button
                onClick={() => handleTabChange('archive')}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-md transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Archive className="h-4 w-4 mr-2" />
                View Archive
                {archivedPets.length > 0 && (
                  <span className="ml-2 bg-white text-orange-600 text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center font-semibold">
                    {archivedPets.length > 99 ? '99+' : archivedPets.length}
                  </span>
                )}
              </button>
            </div>
             
             {/* Search and Filter Controls */}
             <div className="mb-6 flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                 <input
                   type="text"
                   placeholder="Search by pet name, owner, or breed..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               <div className="flex gap-2">
                 <select
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-200 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                  <option value="all">All Types</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                 </select>
                 <button
                   onClick={() => {
                     setSearchTerm('');
                     setFilterType('all');
                   }}
                  className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300"
                 >
                   Clear
                </button>
          </div>
        </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {getFilteredPendingPets.map((pet) => (
                <div key={pet.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {pet.petName || 'Unnamed Pet'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{pet.ownerFullName || 'Unknown Owner'}</p>
                    </div>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 whitespace-nowrap">
                      Pending
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Type/Breed:</span>
                      <span className="text-gray-900 text-right">{pet.petType} - {pet.breed}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewPet(pet)}
                      className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleApprovePetRegistration(pet.id)}
                      className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectPetRegistration(pet.id)}
                      className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {getFilteredPendingPets.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-600 bg-white rounded-lg border border-gray-200">
                  {searchTerm || filterType !== 'all' ? 'No registrations match your search criteria' : 'No pending registrations'}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Breed</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {getFilteredPendingPets.map((pet) => (
                   <tr key={pet.id} className="hover:bg-gray-50 transition-all duration-300">
                     <td className="px-4 py-2 text-sm text-gray-900 font-medium">{pet.petName || 'Unnamed Pet'}</td>
                     <td className="px-4 py-2 text-sm text-gray-700">{pet.ownerFullName || 'Unknown Owner'}</td>
                     <td className="px-4 py-2 text-sm text-gray-700">{pet.petType} - {pet.breed}</td>
                      <td className="px-4 py-2 text-sm">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </td>
                                             <td className="px-4 py-2 text-right text-sm">
                         <div className="inline-flex gap-2">
                           <button 
                             onClick={() => handleViewPet(pet)}
                           className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
                           >
                             View
                </button>
                           <button 
                             onClick={() => handleApprovePetRegistration(pet.id)}
                           className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-all duration-300"
                           >
                             Approve
                </button>
                           <button 
                             onClick={() => handleRejectPetRegistration(pet.id)}
                           className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                           >
                             Reject
                </button>
              </div>
                       </td>
                    </tr>
                  ))}
                                     {getFilteredPendingPets.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                       {searchTerm || filterType !== 'all' ? 'No registrations match your search criteria' : 'No pending registrations'}
                     </td></tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
        )}

                 {!isLoading && activeTab === 'registered' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <h2 className="text-base sm:text-lg font-medium text-gray-900">Registered Pets Management</h2>
              <button
                onClick={() => handleTabChange('archived-registered')}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-md transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Archive className="h-4 w-4 mr-2" />
                View Archive
                {archivedRegisteredPets.length > 0 && (
                  <span className="ml-2 bg-white text-orange-600 text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center font-semibold">
                    {archivedRegisteredPets.length > 99 ? '99+' : archivedRegisteredPets.length}
                  </span>
                )}
              </button>
            </div>
             
             {/* Search and Filter Controls */}
             <div className="mb-6 space-y-4">
               {/* Search Bar */}
               <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                 <input
                   type="text"
                   placeholder="Search by pet name, owner, or breed..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
                 <button
                   onClick={() => {
                     setSearchTerm('');
                     setFilterType('all');
                     setFilterGender('all');
                     setFilterBreed('all');
                     setFilterDate('all');
                   }}
                   className="px-4 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300 whitespace-nowrap"
                 >
                   Clear All
                 </button>
               </div>

               {/* Filter Buttons Row */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 {/* Type Filter */}
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                 <select
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                  <option value="all">All Types</option>
                  <option value="dog">Dogs</option>
                  <option value="cat">Cats</option>
                 </select>
                 </div>

                 {/* Gender Filter */}
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                   <select
                     value={filterGender}
                     onChange={(e) => setFilterGender(e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value="all">All Genders</option>
                     <option value="male">♂ Male</option>
                     <option value="female">♀ Female</option>
                   </select>
                 </div>

                 {/* Breed Filter */}
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Breed</label>
                   <select
                     value={filterBreed}
                     onChange={(e) => setFilterBreed(e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   >
                     <option value="all">All Breeds</option>
                     {getUniqueBreeds.map(breed => (
                       <option key={breed} value={breed}>{breed}</option>
                     ))}
                   </select>
                 </div>

                 {/* Date Filter */}
                 <div>
                   <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                   <select
                     value={filterDate}
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 >
                     <option value="all">All Time</option>
                     <option value="today">Today</option>
                     <option value="week">This Week</option>
                     <option value="month">This Month</option>
                   </select>
                 </div>
              </div>
            </div>
             
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {getFilteredRegisteredPets.map((pet) => (
                <div key={pet.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {pet.petName || 'Unnamed Pet'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{pet.ownerFullName || 'Unknown Owner'}</p>
                    </div>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Registered
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Type/Breed:</span>
                      <span className="text-gray-900 text-right">{pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1) || 'Unknown'} - {pet.breed || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Gender:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        pet.petGender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {pet.petGender === 'male' ? '♂ Male' : '♀ Female'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Contact:</span>
                      <span className="text-gray-900 text-right">{pet.contactNumber || 'No contact'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Registered:</span>
                      <span className="text-gray-900">
                        {pet.registeredAt?.toDate ? pet.registeredAt.toDate().toLocaleDateString() : 
                         pet.registeredDate ? new Date(pet.registeredDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewPet(pet)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleArchivePet(pet.id, pet.petName)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {getFilteredRegisteredPets.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-600 bg-white rounded-lg border border-gray-200">
                  {searchTerm || filterType !== 'all' || filterGender !== 'all' || filterBreed !== 'all' || filterDate !== 'all' 
                    ? 'No pets match your filter criteria' 
                    : 'No registered pets yet'}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-50">
                  <tr>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Breed</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered Date</th>
                   <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                   <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                   {getFilteredRegisteredPets.map((pet) => (
                   <tr key={pet.id} className="hover:bg-gray-50 transition-all duration-300">
                     <td className="px-4 py-2 text-sm text-gray-900 font-medium">{pet.petName || 'Unnamed Pet'}</td>
                     <td className="px-4 py-2 text-sm text-gray-700">{pet.ownerFullName || 'Unknown Owner'}</td>
                     <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex flex-col">
                         <span className="font-medium text-gray-900">{pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1) || 'Unknown'}</span>
                         <span className="text-xs text-gray-500">{pet.breed || 'Unknown breed'}</span>
                        </div>
                      </td>
                     <td className="px-4 py-2 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                         pet.petGender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {pet.petGender === 'male' ? '♂ Male' : '♀ Female'}
                        </span>
                      </td>
                     <td className="px-4 py-2 text-sm text-gray-700">{pet.contactNumber || 'No contact'}</td>
                     <td className="px-4 py-2 text-sm text-gray-700">
                        {pet.registeredAt?.toDate ? pet.registeredAt.toDate().toLocaleDateString() : 
                         pet.registeredDate ? new Date(pet.registeredDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Registered
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button 
                            onClick={() => handleViewPet(pet)}
                           className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleArchivePet(pet.id, pet.petName)}
                           className="px-2 py-1 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 transition-all duration-300 flex items-center"
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                                     {getFilteredRegisteredPets.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-600">
                       {searchTerm || filterType !== 'all' || filterGender !== 'all' || filterBreed !== 'all' || filterDate !== 'all' 
                         ? 'No pets match your filter criteria' 
                         : 'No registered pets yet'}
                     </td></tr>
                   )}
                </tbody>
              </table>
          </div>

            {/* Summary Stats */}
            {registeredPets.length > 0 && (
              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-white bg-opacity-10 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <Dog className="h-4 w-4 sm:h-5 sm:w-5 text-white mr-2" />
                  <div>
                      <p className="text-xs sm:text-sm font-medium text-white">Dogs</p>
                      <p className="text-base sm:text-lg font-semibold text-white">
                        {registeredPets.filter(pet => pet.petType === 'dog').length}
                    </p>
                  </div>
                </div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <span className="text-white mr-2 text-base sm:text-lg">🐱</span>
                  <div>
                      <p className="text-xs sm:text-sm font-medium text-white">Cats</p>
                      <p className="text-base sm:text-lg font-semibold text-white">
                        {registeredPets.filter(pet => pet.petType === 'cat').length}
                    </p>
                  </div>
                </div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white mr-2" />
                  <div>
                      <p className="text-xs sm:text-sm font-medium text-white">Unique Owners</p>
                      <p className="text-base sm:text-lg font-semibold text-white">
                        {new Set(registeredPets.map(pet => pet.ownerFullName)).size}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'reports' && (
          <UserReports />
        )}

        {!isLoading && activeTab === 'users' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-medium text-gray-900">
                  {showArchivedUsers ? 'Archived Users' : 'User Management'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  {showArchivedUsers 
                    ? 'View and restore archived users' 
                    : 'Managing regular users only (admin users not displayed)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {showArchivedUsers ? (
                  <button
                    onClick={() => setShowArchivedUsers(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Users
                  </button>
                ) : (
                  <button
                    onClick={() => setShowArchivedUsers(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    <Archive className="h-4 w-4" />
                    View Archived ({archivedUsers.length})
                  </button>
                )}
              </div>
            </div>

            {/* Inactive Users Alert - Only show when not viewing archived users */}
            {!showArchivedUsers && inactiveUsers.length > 0 && showInactiveAlert && (
              <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg relative">
                <button
                  onClick={() => setShowInactiveAlert(false)}
                  className="absolute top-2 right-2 text-orange-600 hover:text-orange-800 transition-colors"
                  aria-label="Close alert"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 pr-6">
                    <h3 className="text-sm font-semibold text-orange-900 mb-1">
                      Inactive Users Alert
                    </h3>
                    <p className="text-xs text-orange-800 mb-2">
                      The following {inactiveUsers.length} user{inactiveUsers.length > 1 ? 's have' : ' has'} been inactive for more than 1 month and may need attention:
                    </p>
                    <div className="space-y-1">
                      {inactiveUsers.slice(0, 5).map(user => {
                        const lastLogout = lastLogoutTimes[user.uid];
                        const now = new Date();
                        let daysInactive = 0;
                        
                        if (lastLogout) {
                          const logoutDate = lastLogout.toDate ? lastLogout.toDate() : new Date(lastLogout);
                          daysInactive = Math.floor((now - logoutDate) / (1000 * 60 * 60 * 24));
                        } else if (user.createdAt) {
                          const createdAt = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
                          daysInactive = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
                        }
                        
                        return (
                          <div key={user.uid} className="text-xs text-orange-700 bg-orange-100 rounded px-2 py-1">
                            <span className="font-medium">{user.displayName || user.email}</span> - Inactive for {daysInactive} day{daysInactive !== 1 ? 's' : ''}
                          </div>
                        );
                      })}
                      {inactiveUsers.length > 5 && (
                        <div className="text-xs text-orange-700 font-medium">
                          ...and {inactiveUsers.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Search Controls */}
            <div className="mb-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
              
              {/* User Status Filter Buttons - Only show when not viewing archived users */}
              {!showArchivedUsers && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setUserStatusFilter('all')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                      userStatusFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All Users
                  </button>
                  <button
                    onClick={() => setUserStatusFilter('restricted')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                      userStatusFilter === 'restricted'
                        ? 'bg-yellow-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Restricted
                  </button>
                  <button
                    onClick={() => setUserStatusFilter('deactivated')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                      userStatusFilter === 'deactivated'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Deactivated
                  </button>
                  <button
                    onClick={() => setUserStatusFilter('banned')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                      userStatusFilter === 'banned'
                        ? 'bg-red-800 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Banned
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {getFilteredUsers.map((user) => {
                const userInactive = isUserInactive(user);
                return (
                <div key={user.uid} className={`bg-white border rounded-lg shadow-sm p-4 space-y-3 ${userInactive ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                      {user.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt="Profile"
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center ${user.profileImage ? 'hidden' : 'flex'}`}
                      >
                        <User className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {user.displayName || 'Unknown User'}
                        </h3>
                        {userInactive && (
                          <AlertTriangle className="h-4 w-4 text-orange-600 ml-2 flex-shrink-0" title="Inactive for more than 1 month" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">{user.email || 'No email'}</p>
                      <div className="mt-1 flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'banned'
                            ? 'bg-orange-100 text-orange-800'
                            : user.status === 'deactivated' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {user.status === 'banned' ? (
                            <>
                              <UserX className="h-3 w-3 mr-1" />
                              Banned
                            </>
                          ) : user.status === 'deactivated' ? (
                            <>
                              <ShieldOff className="h-3 w-3 mr-1" />
                              Deactivated
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Active
                            </>
                          )}
                        </span>
                        {isChatRestrictionActive(user) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Ban className="h-3 w-3 mr-1" />
                            Chat Restricted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Pets:</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {registeredPets.filter(pet => pet.userId === user.uid).length} pets
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Last Logged In:</span>
                      {userInactive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Inactive for more than 1 month">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {formatTimestamp(lastLogoutTimes[user.uid])}
                        </span>
                      ) : (
                        <span className="text-gray-900">{formatTimestamp(lastLogoutTimes[user.uid])}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Total Reports:</span>
                      <button
                        onClick={() => handleViewUserReports(user)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 hover:shadow-lg transition-all duration-200 cursor-pointer shadow-md border-2 border-red-600 hover:border-red-700 transform hover:scale-105 active:scale-95"
                        title="Click to view all reports for this user"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View {userReportCounts[user.uid] || 0} Reports</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewUser(user)}
                      className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      <User className="h-3 w-3 mr-1" />
                      View
                    </button>
                    {user.status === 'banned' ? (
                      <button
                        onClick={() => handleUnbanUser(user)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBanUser(user)}
                        disabled={checkingBan.has(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingBan.has(user.uid) ? (
                          <>
                            <div className="w-3 h-3 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                            Checking...
                          </>
                        ) : (
                          <>
                            <UserX className="h-3 w-3 mr-1" />
                            Ban
                          </>
                        )}
                      </button>
                    )}
                    {isChatRestrictionActive(user) ? (
                      <button
                        onClick={() => handleUnrestrictChat(user)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Unrestrict
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRestrictChat(user)}
                        disabled={checkingRestrict.has(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-yellow-600 bg-yellow-50 hover:bg-yellow-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {checkingRestrict.has(user.uid) ? (
                          <>
                            <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                            Checking...
                          </>
                        ) : (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Restrict
                          </>
                        )}
                      </button>
                    )}
                    {user.status === 'deactivated' ? (
                      <button
                        onClick={() => handleActivateUser(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Activate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeactivateUser(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                      >
                        <ShieldOff className="h-3 w-3 mr-1" />
                        Deactivate
                      </button>
                    )}
                    {showArchivedUsers ? (
                      <button
                        onClick={() => handleRestoreUser(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => handleArchiveUser(user.uid)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
              {getFilteredUsers.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-600 bg-white rounded-lg border border-gray-200">
                  {searchTerm ? 'No users match your search criteria' : 'No users found'}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pets Count</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Reports</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Logged In</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredUsers.map((user) => {
                    const userInactive = isUserInactive(user);
                    return (
                    <tr key={user.uid} className={`hover:bg-gray-50 transition-all duration-300 ${userInactive ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt="Profile"
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className={`w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold ${user.profileImage ? 'hidden' : 'flex'}`}
                            >
                              <User className="h-5 w-5 text-white" />
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="text-sm font-medium text-gray-900">{user.displayName || 'Unknown User'}</p>
                              {userInactive && (
                                <AlertTriangle className="h-4 w-4 text-orange-600 ml-2" title="Inactive for more than 1 month" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{user.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'banned'
                              ? 'bg-orange-100 text-orange-800'
                              : user.status === 'deactivated' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {user.status === 'banned' ? (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Banned
                              </>
                            ) : user.status === 'deactivated' ? (
                              <>
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Deactivated
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Active
                              </>
                            )}
                          </span>
                          {isChatRestrictionActive(user) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Ban className="h-3 w-3 mr-1" />
                              Chat Restricted
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {registeredPets.filter(pet => pet.userId === user.uid).length} pets
                  </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <button
                          onClick={() => handleViewUserReports(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 hover:shadow-lg transition-all duration-200 cursor-pointer shadow-md border-2 border-red-600 hover:border-red-700 transform hover:scale-105 active:scale-95"
                          title="Click to view all reports for this user"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View {userReportCounts[user.uid] || 0} Reports</span>
                        </button>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex items-center">
                          {userInactive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Inactive for more than 1 month">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {formatTimestamp(lastLogoutTimes[user.uid])}
                            </span>
                          ) : (
                            <span>{formatTimestamp(lastLogoutTimes[user.uid])}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2 flex-wrap justify-end">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center transition-all duration-300"
                          >
                            <User className="h-3 w-3 mr-1" />
                            View
                          </button>
                          {!showArchivedUsers && (
                            <>
                              {user.status === 'banned' ? (
                                <button
                                  onClick={() => handleUnbanUser(user)}
                                  className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center transition-all duration-300"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Unban
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBanUser(user)}
                                  disabled={checkingBan.has(user.uid)}
                                  className="px-3 py-1 text-xs rounded bg-orange-600 text-white hover:bg-orange-700 flex items-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {checkingBan.has(user.uid) ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <UserX className="h-3 w-3 mr-1" />
                                      Ban
                                    </>
                                  )}
                                </button>
                              )}
                              {isChatRestrictionActive(user) ? (
                                <button
                                  onClick={() => handleUnrestrictChat(user)}
                                  className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center transition-all duration-300"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Unrestrict
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestrictChat(user)}
                                  disabled={checkingRestrict.has(user.uid)}
                                  className="px-3 py-1 text-xs rounded bg-yellow-600 text-white hover:bg-yellow-700 flex items-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {checkingRestrict.has(user.uid) ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                      Checking...
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-3 w-3 mr-1" />
                                      Restrict
                                    </>
                                  )}
                                </button>
                              )}
                              {user.status === 'deactivated' ? (
                                <button
                                  onClick={() => handleActivateUser(user.uid)}
                                  className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center transition-all duration-300"
                                >
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeactivateUser(user.uid)}
                                  className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 flex items-center transition-all duration-300"
                                >
                                  <ShieldOff className="h-3 w-3 mr-1" />
                                  Deactivate
                                </button>
                              )}
                              <button
                                onClick={() => handleArchiveUser(user.uid)}
                                className="px-3 py-1 text-xs rounded bg-purple-600 text-white hover:bg-purple-700 flex items-center transition-all duration-300"
                              >
                                <Archive className="h-3 w-3 mr-1" />
                                Archive
                              </button>
                            </>
                          )}
                          {showArchivedUsers && (
                            <button
                              onClick={() => handleRestoreUser(user.uid)}
                              className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 flex items-center transition-all duration-300"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {getFilteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                        {searchTerm ? 'No users match your search criteria' : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

            {/* Summary Stats */}
            {users.length > 0 && (
              <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex items-center">
                    <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 mr-2" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Active Users</p>
                      <p className="text-base sm:text-lg font-semibold text-gray-900">
                        {users.filter(user => user.status !== 'deactivated').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex items-center">
                    <ShieldOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700 mr-2" />
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-900">Deactivated Users</p>
                      <p className="text-base sm:text-lg font-semibold text-gray-900">
                        {deactivatedUsers.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Archived Registered Pets Tab - Pet Management Archive */}
        {!isLoading && activeTab === 'archived-registered' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTabChange('registered')}
                  className="flex items-center justify-center p-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-all duration-300 hover:shadow-md"
                  title="Go back to Pet Management"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Archived Registered Pets</h2>
                  <p className="text-xs sm:text-sm text-gray-600">View archived registered pets from pet management</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium">
                {archivedRegisteredPets.length} archived
              </div>
            </div>

            {/* Search Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by pet name, owner, or breed..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300 whitespace-nowrap"
              >
                Clear
              </button>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {archivedRegisteredPets.filter(pet => {
                const matchesSearch = !searchTerm || 
                  pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).map((pet) => (
                <div key={pet.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {pet.petName || 'Unnamed Pet'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{pet.ownerFullName || 'Unknown Owner'}</p>
                    </div>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Type/Breed:</span>
                      <span className="text-gray-900 text-right">{pet.petType} - {pet.breed}</span>
                    </div>
                    {pet.archivedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Archived:</span>
                        <span className="text-gray-900">
                          {pet.archivedAt?.toDate ? pet.archivedAt.toDate().toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewPet(pet)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              {archivedRegisteredPets.filter(pet => {
                const matchesSearch = !searchTerm || 
                  pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8 text-sm text-gray-600 bg-white rounded-lg border border-gray-200">
                  {searchTerm ? 'No archived pets match your search criteria' : 'No archived registered pets yet'}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Breed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {archivedRegisteredPets.filter(pet => {
                    const matchesSearch = !searchTerm || 
                      pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).map((pet) => (
                    <tr key={pet.id} className="hover:bg-gray-50 transition-all duration-300">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{pet.petName || 'Unnamed Pet'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{pet.ownerFullName || 'Unknown Owner'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1) || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{pet.breed || 'Unknown breed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pet.petGender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {pet.petGender === 'male' ? '♂ Male' : '♀ Female'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{pet.contactNumber || 'No contact'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {pet.archivedAt?.toDate ? pet.archivedAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button 
                            onClick={() => handleViewPet(pet)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {archivedRegisteredPets.filter(pet => {
                    const matchesSearch = !searchTerm || 
                      pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-600">
                        {searchTerm ? 'No archived pets match your search criteria' : 'No archived registered pets yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Archive Tab - Archived Pet Registrations */}
        {!isLoading && activeTab === 'archive' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-4 sm:p-6 border border-indigo-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleTabChange('pending')}
                  className="flex items-center justify-center p-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-all duration-300 hover:shadow-md"
                  title="Go back to Pet Registration"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-medium text-gray-900">Archived Pet Registrations</h2>
                  <p className="text-xs sm:text-sm text-gray-600">View archived pet registration requests</p>
                </div>
              </div>
              <div className="text-xs sm:text-sm text-gray-900 font-medium">
                {archivedPets.length} archived
              </div>
            </div>

            {/* Search Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by pet name, owner, or breed..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 placeholder-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-all duration-300 whitespace-nowrap"
              >
                Clear
              </button>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {archivedPets.filter(pet => {
                const matchesSearch = !searchTerm || 
                  pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).map((pet) => (
                <div key={pet.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {pet.petName || 'Unnamed Pet'}
                      </h3>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{pet.ownerFullName || 'Unknown Owner'}</p>
                    </div>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Type/Breed:</span>
                      <span className="text-gray-900 text-right">{pet.petType} - {pet.breed}</span>
                    </div>
                    {pet.rejectedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Archived:</span>
                        <span className="text-gray-900">
                          {pet.rejectedAt?.toDate ? pet.rejectedAt.toDate().toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleViewPet(pet)}
                      className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
              {archivedPets.filter(pet => {
                const matchesSearch = !searchTerm || 
                  pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSearch;
              }).length === 0 && (
                <div className="text-center py-8 text-sm text-gray-600 bg-white rounded-lg border border-gray-200">
                  {searchTerm ? 'No archived pets match your search criteria' : 'No archived pet registrations yet'}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Breed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {archivedPets.filter(pet => {
                    const matchesSearch = !searchTerm || 
                      pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).map((pet) => (
                    <tr key={pet.id} className="hover:bg-gray-50 transition-all duration-300">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{pet.petName || 'Unnamed Pet'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{pet.ownerFullName || 'Unknown Owner'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1) || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{pet.breed || 'Unknown breed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pet.petGender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                        }`}>
                          {pet.petGender === 'male' ? '♂ Male' : '♀ Female'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {pet.rejectedAt?.toDate ? pet.rejectedAt.toDate().toLocaleDateString() : 
                         pet.archivedAt?.toDate ? pet.archivedAt.toDate().toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Archive className="h-3 w-3 mr-1" />
                          Archived
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button 
                            onClick={() => handleViewPet(pet)}
                            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {archivedPets.filter(pet => {
                    const matchesSearch = !searchTerm || 
                      pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesSearch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-600">
                        {searchTerm ? 'No archived pets match your search criteria' : 'No archived pet registrations yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Pet Details Modal */}
      {showPetModal && selectedPet && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Pet Details</h3>
              <button 
                onClick={() => setShowPetModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
                             {/* Pet Image Section */}
               <div className="mb-6">
                 {(() => {
                   const imageUrl = selectedPet.petImage || selectedPet.imageUrl || selectedPet.image;
                   
                   // Check if it's a local file path that can't be displayed in web
                   const isLocalFile = imageUrl && (
                     imageUrl.startsWith('file://') || 
                     imageUrl.includes('/var/mobile/') || 
                     imageUrl.includes('/data/') ||
                     imageUrl.includes('ExponentExperienceData') ||
                     imageUrl.includes('ImagePicker')
                   );
                   const isValidHttpUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
                   const isFirebaseUrl = imageUrl && imageUrl.includes('firebasestorage.googleapis.com');
                   
                   if (isValidHttpUrl || isFirebaseUrl) {
                     return (
                       <div className="relative">
                         <img 
                           src={imageUrl} 
                           alt={selectedPet.petName || 'Pet Image'}
                           className="w-full h-80 object-cover rounded-lg border"
                           onError={(e) => {
                             // Hide failed image and show placeholder
                             e.target.style.display = 'none';
                             const placeholder = e.target.nextElementSibling;
                             if (placeholder) {
                               placeholder.style.display = 'flex';
                             }
                           }}
                         />
                         <div className="image-placeholder w-full h-80 bg-gray-100 rounded-lg border items-center justify-center" style={{display: 'none'}}>
                           <div className="text-center">
                             <Dog className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                             <p className="text-gray-500 text-sm">Failed to load pet image</p>
                             <p className="text-gray-400 text-xs mt-1">URL: {imageUrl?.substring(0, 50)}...</p>
                           </div>
                         </div>
                       </div>
                     );
                   } else {
                     return (
                       <div className="image-placeholder w-full h-80 bg-gray-100 rounded-lg border flex items-center justify-center">
                         <div className="text-center">
                           <Dog className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                           <p className="text-gray-500 text-sm">
                             {isLocalFile 
                               ? 'Image stored locally on mobile device' 
                               : imageUrl 
                                 ? 'Invalid image format'
                                 : 'No pet image available'
                             }
                           </p>
                           {isLocalFile && (
                             <div className="mt-2 text-center">
                               <p className="text-gray-400 text-xs">
                                 Pet images from mobile app need cloud upload
                               </p>
                               <p className="text-gray-400 text-xs mt-1">
                                 Update mobile app and re-register pet
                               </p>
                             </div>
                           )}
                           {imageUrl && (
                             <p className="text-gray-400 text-xs mt-2 break-all">
                               URL: {imageUrl?.substring(0, 80)}...
                             </p>
                           )}
                         </div>
                       </div>
                     );
                   }
                 })()}
               </div>

               {/* Pet Booklet Section */}
               <div className="mb-6">
                 <h5 className="text-md font-semibold text-gray-900 mb-3">Pet Booklet</h5>
                 {(() => {
                   const bookletUrl = selectedPet.petBooklet || selectedPet.bookletUrl;
                   
                   // Check if it's a local file path that can't be displayed in web
                   const isLocalFile = bookletUrl && (
                     bookletUrl.startsWith('file://') || 
                     bookletUrl.includes('/var/mobile/') || 
                     bookletUrl.includes('/data/') ||
                     bookletUrl.includes('ExponentExperienceData') ||
                     bookletUrl.includes('ImagePicker')
                   );
                   const isValidHttpUrl = bookletUrl && (bookletUrl.startsWith('http://') || bookletUrl.startsWith('https://'));
                   const isFirebaseUrl = bookletUrl && bookletUrl.includes('firebasestorage.googleapis.com');
                   
                   if (isValidHttpUrl || isFirebaseUrl) {
                     return (
                       <div className="relative">
                         <img 
                           src={bookletUrl} 
                           alt="Pet Booklet"
                           className="w-full h-80 object-cover rounded-lg border"
                           onError={(e) => {
                             // Hide failed image and show placeholder
                             e.target.style.display = 'none';
                             const placeholder = e.target.nextElementSibling;
                             if (placeholder) {
                               placeholder.style.display = 'flex';
                             }
                           }}
                         />
                         <div className="image-placeholder w-full h-80 bg-gray-100 rounded-lg border items-center justify-center" style={{display: 'none'}}>
                           <div className="text-center">
                             <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                             <p className="text-gray-500 text-sm">Failed to load pet booklet</p>
                             <p className="text-gray-400 text-xs mt-1">URL: {bookletUrl?.substring(0, 50)}...</p>
                           </div>
                         </div>
                       </div>
                     );
                   } else {
                     return (
                       <div className="image-placeholder w-full h-80 bg-gray-100 rounded-lg border flex items-center justify-center">
                         <div className="text-center">
                           <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                           <p className="text-gray-500 text-sm">
                             {isLocalFile 
                               ? 'Booklet stored locally on mobile device' 
                               : bookletUrl 
                                 ? 'Invalid booklet format'
                                 : 'No pet booklet available'
                             }
                           </p>
                           {isLocalFile && (
                             <div className="mt-2 text-center">
                               <p className="text-gray-400 text-xs">
                                 Pet booklets from mobile app need cloud upload
                               </p>
                               <p className="text-gray-400 text-xs mt-1">
                                 Update mobile app and re-register pet
                               </p>
                             </div>
                           )}
                           {bookletUrl && (
                             <p className="text-gray-400 text-xs mt-2 break-all">
                               URL: {bookletUrl?.substring(0, 80)}...
                             </p>
                           )}
          </div>
                       </div>
                     );
                   }
                 })()}
               </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">{selectedPet.petName || 'Unnamed Pet'}</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Pet Type</label>
                      <p className="text-gray-900">{selectedPet.petType?.charAt(0).toUpperCase() + selectedPet.petType?.slice(1) || 'Unknown'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Breed</label>
                      <p className="text-gray-900">{selectedPet.breed || 'Unknown breed'}</p>
                </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gender</label>
                      <p className="text-gray-900">
                        {selectedPet.petGender === 'male' ? '♂ Male' : '♀ Female'}
                      </p>
              </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Registration Status</label>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Registered
                  </span>
                </div>
              </div>
                </div>
                
                <div>
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Owner Information</h5>
                  
                  {/* Owner Profile Image */}
                  <div className="flex items-center mb-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                      {getOwnerProfileImage(selectedPet) ? (
                        <img
                          src={getOwnerProfileImage(selectedPet)}
                          alt="Owner Profile"
                          className="w-16 h-16 rounded-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold ${getOwnerProfileImage(selectedPet) ? 'hidden' : 'flex'}`}
                      >
                        <User className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{selectedPet.ownerFullName || 'Unknown Owner'}</p>
                      <p className="text-sm text-gray-500">Pet Owner</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact Number</label>
                      <p className="text-gray-900">{selectedPet.contactNumber || 'No contact provided'}</p>
                </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registered Date</label>
                      <p className="text-gray-900">
                        {selectedPet.registeredAt?.toDate ? selectedPet.registeredAt.toDate().toLocaleDateString() : 
                         selectedPet.registeredDate ? new Date(selectedPet.registeredDate).toLocaleDateString() : 'N/A'}
                      </p>
              </div>
            </div>
          </div>
        </div>
              
              {selectedPet.description && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">{selectedPet.description}</p>
                </div>
              )}
              

            </div>
            
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowPetModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {showNotificationModal && selectedNotification && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => {
              setShowNotificationModal(false);
              setSelectedNotification(null);
              // Keep notifications panel open
            }}
          />
          {/* Modal */}
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[60] border border-gray-200 overflow-hidden"
            data-notification-detail-modal
          >
            {/* Header */}
            <div className={`p-6 text-white ${
              selectedNotification.type === 'pet_deleted' 
                ? 'bg-gradient-to-r from-red-600 to-red-700'
                : selectedNotification.type === 'pet_deceased'
                ? 'bg-gradient-to-r from-gray-600 to-gray-700'
                : 'bg-gradient-to-r from-blue-600 to-purple-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    {selectedNotification.type === 'pet_deleted' ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ) : selectedNotification.type === 'pet_deceased' ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                    <FileText className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Notification Details</h2>
                    <p className="text-white/80 text-sm">
                      {selectedNotification.title || 'Pet Registration Notification'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedNotification(null);
                  }}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">

                {/* Notification Message */}
                <div className={`p-4 rounded-lg border ${
                  selectedNotification.type === 'pet_deleted' 
                    ? 'bg-red-50 border-red-200'
                    : selectedNotification.type === 'pet_deceased'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start">
                    {selectedNotification.type === 'pet_deleted' ? (
                      <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ) : selectedNotification.type === 'pet_deceased' ? (
                      <svg className="h-5 w-5 text-gray-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div>
                      <h4 className={`text-sm font-semibold mb-1 ${
                        selectedNotification.type === 'pet_deleted' 
                          ? 'text-red-900'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'text-gray-900'
                          : 'text-blue-900'
                      }`}>
                        {selectedNotification.title || 'Notification'}
                      </h4>
                      <p className={`text-sm ${
                        selectedNotification.type === 'pet_deleted' 
                          ? 'text-red-700'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'text-gray-700'
                          : 'text-blue-700'
                      }`}>
                        {selectedNotification.message || 'No additional details available.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pet Details - Only show if pet exists and notification has petId */}
                {selectedNotification.petId && (() => {
                  const petDetails = pets.find(pet => pet.id === selectedNotification.petId);
                  return petDetails ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {selectedNotification.type === 'pet_deleted' 
                          ? 'Deleted Pet Information'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'Deceased Pet Information'
                          : 'Pet Registration Details'
                        }
                      </label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {/* Pet Image - Only show for non-deleted pets */}
                        {selectedNotification.type !== 'pet_deleted' && (petDetails.petImage || petDetails.imageUrl || petDetails.image) && (
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pet Image</label>
                            <div className="relative">
                              <img 
                                src={petDetails.petImage || petDetails.imageUrl || petDetails.image} 
                                alt={petDetails.petName || 'Pet Image'}
                                className="w-full h-64 object-cover rounded-lg border"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  const placeholder = e.target.nextElementSibling;
                                  if (placeholder) {
                                    placeholder.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="image-placeholder w-full h-64 bg-gray-100 rounded-lg border items-center justify-center" style={{display: 'none'}}>
                                <div className="text-center">
                                  <Dog className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-500 text-sm">Failed to load pet image</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Pet Details */}
                          <div className="space-y-3">
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Pet Information</h4>
                            <div>
                              <span className="text-sm text-gray-600">Pet Name:</span>
                              <p className="text-gray-900 font-medium">{petDetails.petName || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Pet Type:</span>
                              <p className="text-gray-900 font-medium">{petDetails.petType?.charAt(0).toUpperCase() + petDetails.petType?.slice(1) || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Breed:</span>
                              <p className="text-gray-900 font-medium">{petDetails.breed || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Gender:</span>
                              <p className="text-gray-900 font-medium">
                                {petDetails.petGender === 'male' ? '♂ Male' : '♀ Female'}
                              </p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Age:</span>
                              <p className="text-gray-900 font-medium">{petDetails.age || 'Not provided'}</p>
                            </div>
                            {petDetails.description && (
                              <div>
                                <span className="text-sm text-gray-600">Description:</span>
                                <p className="text-gray-900 font-medium">{petDetails.description}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Owner Details */}
                          <div className="space-y-3">
                            <h4 className="text-md font-semibold text-gray-800 mb-3">Owner Information</h4>
                            <div>
                              <span className="text-sm text-gray-600">Owner Name:</span>
                              <p className="text-gray-900 font-medium">{petDetails.ownerFullName || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Contact Number:</span>
                              <p className="text-gray-900 font-medium">{petDetails.contactNumber || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">Address:</span>
                              <p className="text-gray-900 font-medium">{petDetails.address || 'Not provided'}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-600">
                                {selectedNotification.type === 'pet_deleted' 
                                  ? 'Deleted Date:'
                                  : selectedNotification.type === 'pet_deceased'
                                  ? 'Deceased Date:'
                                  : 'Registration Date:'
                                }
                              </span>
                              <p className="text-gray-900 font-medium">
                                {selectedNotification.createdAt?.toDate ? selectedNotification.createdAt.toDate().toLocaleDateString() : 
                                 petDetails.createdAt?.toDate ? petDetails.createdAt.toDate().toLocaleDateString() : 'Not available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg border ${
                      selectedNotification.type === 'pet_deleted' 
                        ? 'bg-red-50 border-red-200'
                        : selectedNotification.type === 'pet_deceased'
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <div className="flex items-start">
                        {selectedNotification.type === 'pet_deleted' ? (
                          <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        ) : selectedNotification.type === 'pet_deceased' ? (
                          <svg className="h-5 w-5 text-gray-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        )}
                        <div>
                          <h4 className={`text-sm font-semibold mb-1 ${
                            selectedNotification.type === 'pet_deleted' 
                              ? 'text-red-900'
                              : selectedNotification.type === 'pet_deceased'
                              ? 'text-gray-900'
                              : 'text-yellow-900'
                          }`}>
                            {selectedNotification.type === 'pet_deleted' 
                              ? 'Pet No Longer Available'
                              : selectedNotification.type === 'pet_deceased'
                              ? 'Pet Information Unavailable'
                              : 'Pet Details Not Found'
                            }
                          </h4>
                          <p className={`text-sm ${
                            selectedNotification.type === 'pet_deleted' 
                              ? 'text-red-700'
                              : selectedNotification.type === 'pet_deceased'
                              ? 'text-gray-700'
                              : 'text-yellow-700'
                          }`}>
                            {selectedNotification.type === 'pet_deleted' 
                              ? 'This pet has been permanently deleted from the system and its details are no longer available.'
                              : selectedNotification.type === 'pet_deceased'
                              ? 'This pet has been marked as deceased and its details may no longer be accessible.'
                              : 'The pet details referenced in this notification could not be found in the system.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Additional Information */}
                <div className={`border rounded-lg p-4 ${
                  selectedNotification.type === 'pet_deleted' 
                    ? 'bg-red-50 border-red-200'
                    : selectedNotification.type === 'pet_deceased'
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start">
                    {selectedNotification.type === 'pet_deleted' ? (
                      <svg className="h-5 w-5 text-red-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : selectedNotification.type === 'pet_deceased' ? (
                      <svg className="h-5 w-5 text-gray-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    )}
                    <div>
                      <h4 className={`text-sm font-semibold mb-1 ${
                        selectedNotification.type === 'pet_deleted' 
                          ? 'text-red-900'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'text-gray-900'
                          : 'text-blue-900'
                      }`}>
                        {selectedNotification.type === 'pet_deleted' 
                          ? 'Deletion Information'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'Deceased Pet Information'
                          : 'Notification Information'
                        }
                      </h4>
                      <p className={`text-sm ${
                        selectedNotification.type === 'pet_deleted' 
                          ? 'text-red-700'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'text-gray-700'
                          : 'text-blue-700'
                      }`}>
                        {selectedNotification.type === 'pet_deleted' 
                          ? 'This notification was generated when a pet was permanently deleted from the system. The pet owner has been notified of this action.'
                          : selectedNotification.type === 'pet_deceased'
                          ? 'This notification was generated when a pet was marked as deceased. The pet owner has been notified of this status change.'
                          : 'This notification was generated when a new pet registration was submitted. You can review and manage pet registrations from the Pet Registration tab.'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button 
                onClick={() => setShowUserModal(false)} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {/* User Profile Section */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                    {selectedUser.profileImage ? (
                      <img
                        src={selectedUser.profileImage}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white text-lg font-bold ${selectedUser.profileImage ? 'hidden' : 'flex'}`}
                    >
                      <User className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900">{selectedUser.displayName || 'Unknown User'}</h4>
                    <p className="text-sm text-gray-500">User Account</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      selectedUser.status === 'deactivated' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {selectedUser.status === 'deactivated' ? (
                        <>
                          <ShieldOff className="h-3 w-3 mr-1" />
                          Deactivated
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Active
                        </>
                      )}
                  </span>
                </div>
              </div>
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Contact Information</h5>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email Address</label>
                      <p className="text-gray-900">{selectedUser.email || 'No email provided'}</p>
          </div>
                    
                  </div>
                </div>
                
                <div>
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Account Statistics</h5>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Registered Pets</label>
                      <p className="text-gray-900">
                        {registeredPets.filter(pet => pet.userId === selectedUser.uid).length} pets
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Account Status</label>
                      <p className="text-gray-900">
                        {selectedUser.status === 'deactivated' ? 'Deactivated' : 'Active'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">User ID</label>
                      <p className="text-gray-900 text-xs font-mono break-all">{selectedUser.uid}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User's Pets Section */}
              {registeredPets.filter(pet => pet.userId === selectedUser.uid).length > 0 && (
                <div className="mt-6">
                  <h5 className="text-md font-semibold text-gray-900 mb-4">Registered Pets</h5>
                  <div className="space-y-2">
                    {registeredPets.filter(pet => pet.userId === selectedUser.uid).map((pet) => (
                      <div key={pet.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <Dog className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{pet.petName || 'Unnamed Pet'}</p>
                            <p className="text-xs text-gray-500">{pet.petType} - {pet.breed}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Registered
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Close
              </button>
              {selectedUser.status === 'deactivated' ? (
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    handleActivateUser(selectedUser.uid);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                >
                  Activate User
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowUserModal(false);
                    handleDeactivateUser(selectedUser.uid);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
                >
                  Deactivate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Report History Modal */}
      {showReportHistoryModal && selectedUserForReports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report History</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedUserForReports.displayName || 'Unknown User'} - {userReports.length} total report{userReports.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowReportHistoryModal(false);
                  setSelectedUserForReports(null);
                  setUserReports([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <span className="ml-3 text-gray-600">Loading reports...</span>
                </div>
              ) : userReports.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No reports found for this user</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userReports.map((report) => {
                        const reportDate = report.date?.toDate 
                          ? report.date.toDate() 
                          : (report.date ? new Date(report.date) : new Date());
                        const formattedDate = reportDate.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        return (
                          <tr key={report.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                report.type === 'post' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {report.type === 'post' ? (
                                  <>
                                    <FileText className="h-3 w-3 mr-1" />
                                    Post
                                  </>
                                ) : (
                                  <>
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Message
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-md">
                                <p className="text-sm text-gray-900 truncate mb-2" title={report.content}>
                                  {report.content || 'No content available'}
                                </p>
                                {report.type === 'post' && report.images && report.images.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {report.images.slice(0, 3).map((image, idx) => (
                                      <img
                                        key={idx}
                                        src={image}
                                        alt={`Post ${idx + 1}`}
                                        className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity hover:border-blue-400"
                                        onClick={() => {
                                          setSelectedImage(report.images);
                                          setSelectedImageIndex(idx);
                                          setShowImageModal(true);
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ))}
                                    {report.images.length > 3 && (
                                      <div 
                                        className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500 font-medium cursor-pointer hover:bg-gray-200 transition-colors"
                                        onClick={() => {
                                          setSelectedImage(report.images);
                                          setSelectedImageIndex(3);
                                          setShowImageModal(true);
                                        }}
                                      >
                                        +{report.images.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="max-w-md">
                                <p className="text-sm text-gray-700" title={report.reason}>
                                  {report.reason || 'No reason provided'}
                                </p>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formattedDate}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                report.status === 'resolved' 
                                  ? 'bg-green-100 text-green-800'
                                  : report.status === 'dismissed'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {report.status === 'resolved' ? 'Resolved' : report.status === 'dismissed' ? 'Dismissed' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => {
                  setShowReportHistoryModal(false);
                  setSelectedUserForReports(null);
                  setUserReports([]);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageModal && selectedImage && selectedImage.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            {selectedImage.length > 1 && (
              <>
                <button
                  onClick={() => {
                    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : selectedImage.length - 1));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all z-10"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => {
                    setSelectedImageIndex((prev) => (prev < selectedImage.length - 1 ? prev + 1 : 0));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all z-10 transform rotate-180"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
              </>
            )}
            
            <div className="max-w-7xl max-h-full flex flex-col items-center">
              <img
                src={selectedImage[selectedImageIndex]}
                alt={`${selectedImageIndex + 1} of ${selectedImage.length}`}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
              {selectedImage.length > 1 && (
                <div className="mt-4 text-white text-sm">
                  Image {selectedImageIndex + 1} of {selectedImage.length}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Megaphone className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Create Announcement</h2>
                    <p className="text-sm text-gray-500">Send an announcement to all users</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setAnnouncementTitle('');
                    setAnnouncementMessage('');
                    setAnnouncementImage(null);
                    setAnnouncementImagePreview(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  placeholder="Enter announcement title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-gray-500">{announcementTitle.length}/100 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={announcementMessage}
                  onChange={(e) => setAnnouncementMessage(e.target.value)}
                  placeholder="Enter announcement message..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-500">{announcementMessage.length}/500 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image (Optional)
                </label>
                {announcementImagePreview ? (
                  <div className="relative">
                    <img 
                      src={announcementImagePreview} 
                      alt="Preview" 
                      className="w-full h-64 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">What happens next?</p>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>This announcement will be sent to all registered users</li>
                      <li>It will appear as a post on their home screen (like Facebook posts)</li>
                      <li>Users will see "Pawsafety" as the author with the app logo</li>
                      <li>Users will receive a notification about the announcement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setAnnouncementTitle('');
                  setAnnouncementMessage('');
                  setAnnouncementImage(null);
                  setAnnouncementImagePreview(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isCreatingAnnouncement}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAnnouncement}
                disabled={isCreatingAnnouncement || (!announcementTitle.trim() && !announcementMessage.trim() && !announcementImage)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreatingAnnouncement ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4" />
                    <span>Send Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
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
                  setUserToBan(null);
                  setBanDuration('');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBanUser}
                disabled={userToBan && banning.has(userToBan.uid)}
                className="px-4 py-2 bg-orange-600 text-white font-medium hover:bg-orange-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {userToBan && banning.has(userToBan.uid) ? (
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

      {/* Restrict Chat Modal */}
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
                  setUserToRestrict(null);
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
                disabled={userToRestrict && restricting.has(userToRestrict.uid)}
                className="px-4 py-2 bg-yellow-600 text-white font-medium hover:bg-yellow-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {userToRestrict && restricting.has(userToRestrict.uid) ? (
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
    </div>
  );
};

export default AgriculturalDashboard; 