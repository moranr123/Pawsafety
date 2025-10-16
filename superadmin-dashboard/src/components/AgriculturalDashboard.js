import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  getDoc
} from 'firebase/firestore';
import { getAuth, updateUserProfile } from 'firebase/auth';
import { db } from '../firebase/config';
import { 
  LogOut, 
  Leaf, 
  Users, 
  Dog,
  UserX,
  BarChart3,
  List,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Settings,
  User,
  Bell,
  Shield,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';
import LogoWhite from '../assets/Logowhite.png';

const TabButton = ({ active, label, icon: Icon, onClick, badge = 0 }) => (
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
);

const AgriculturalDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [registeredPets, setRegisteredPets] = useState([]);
  const [pendingPets, setPendingPets] = useState([]);
  const [deactivatedUsers, setDeactivatedUsers] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [showPetModal, setShowPetModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [chartData, setChartData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate chart data from real pet registrations
  const generateChartData = (pets) => {
    const now = new Date();
    const months = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Count pets registered in this month
      const monthPets = pets.filter(pet => {
        const petDate = pet.createdAt?.toDate ? pet.createdAt.toDate() : new Date(pet.createdAt);
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
  };

  // Generate recent activity from pets and users
  const generateRecentActivity = (pets, users) => {
    const activities = [];
    
    // Add recent pet registrations
    pets.slice(0, 5).forEach(pet => {
      activities.push({
        id: `pet-${pet.id}`,
        type: 'pet_registration',
        message: `New pet "${pet.petName}" registered`,
        timestamp: pet.createdAt,
        icon: '🐕'
      });
    });
    
    // Add recent user registrations
    users.slice(0, 3).forEach((user, index) => {
      activities.push({
        id: `user-${user.uid || `unknown-${index}`}`,
        type: 'user_registration',
        message: `New user "${user.email}" registered`,
        timestamp: user.createdAt,
        icon: '👤'
      });
    });
    
    // Sort by timestamp and take most recent 8
    return activities
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB - timeA;
      })
      .slice(0, 8);
  };

  // Helpers for dynamic SVG chart generation (match Impound scaling)
  const generateChartPath = (data, maxValue = 10) => {
    if (!data || data.length === 0) return "M 20,180 L 20,180";
    const points = data.map((d, i) => {
      const x = 20 + (i * 80);
      const y = 180 - Math.min((d.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    if (points.length === 1) {
      return `M ${points[0]} L ${points[0]}`;
    }
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  };

  const generateChartAreaPath = (data, maxValue = 10) => {
    if (!data || data.length === 0) return "M 20,180 L 20,180 L 20,180 Z";
    const points = data.map((d, i) => {
      const x = 20 + (i * 80);
      const y = 180 - Math.min((d.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    return `M ${firstPoint} L ${points.slice(1).join(' L ')} L ${lastPoint.split(',')[0]},180 L 20,180 Z`;
  };

  // Firebase data listeners
  useEffect(() => {
    // Listen to pets collection
    const petsQuery = query(collection(db, 'pets'), orderBy('createdAt', 'desc'));
    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const allPets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Check for new pets and create admin notifications
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const newPet = { id: change.doc.id, ...change.doc.data() };
          console.log('🆕 New pet detected:', newPet.petName);
          
          // Create admin notification for new pet registration
          try {
            await addDoc(collection(db, 'admin_notifications'), {
              type: 'new_registration',
              title: 'New Pet Registration',
              message: `${newPet.ownerFullName || 'Unknown Owner'} has registered a new pet: "${newPet.petName}" (${newPet.petType || 'Unknown Type'})`,
              petId: newPet.id,
              petName: newPet.petName,
              ownerName: newPet.ownerFullName,
              petType: newPet.petType,
              read: false,
              createdAt: new Date()
            });
            console.log('✅ Admin notification created for new pet:', newPet.petName);
          } catch (error) {
            console.error('❌ Error creating admin notification for new pet:', error);
          }
        }
      });
      
      setPets(allPets);
      
      // Auto-register existing pets that don't have a registration status
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
      
      // Filter registered vs pending pets (exclude rejected ones)
      const registered = allPets.filter(pet => pet.registrationStatus === 'registered');
      const pending = allPets.filter(pet => pet.registrationStatus === 'pending' || (!pet.registrationStatus && pet.petName && pet.ownerFullName));
      
      setRegisteredPets(registered);
      setPendingPets(pending);
      
      // Generate chart data
      setChartData(generateChartData(allPets));
    });

    // Listen to all registered users from users collection
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, async (snapshot) => {
      const userMap = new Map();
      
      // Get all users from users collection
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
          profileImage: userData.profileImage || null
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
              hasAdoptionApplication: true
            });
          }
        });
      } catch (error) {
        console.error('Error fetching adoption applications:', error);
      }
      
      const allUsers = Array.from(userMap.values());
      
      // Filter out admin and superadmin users - only show regular users
      const regularUsers = allUsers.filter(user => {
        const role = user.role || 'user';
        return role === 'user' || role === 'regular'; // Only include regular users
      });
      
      console.log('All registered users:', allUsers.length);
      console.log('Regular users (filtered):', regularUsers.length);
      console.log('Filtered out admin users:', allUsers.length - regularUsers.length);
      
      setUsers(regularUsers);
      setDeactivatedUsers(regularUsers.filter(user => user.status === 'deactivated'));
      
      // Generate recent activity
      setRecentActivity(generateRecentActivity(pets, regularUsers));
      
      // Set loading to false when data is loaded
      setIsLoading(false);
    });

    // Listen to admin notifications
    console.log('Setting up admin notifications listener...');
    const adminNotificationsQuery = collection(db, 'admin_notifications');
    const unsubscribeNotifications = onSnapshot(
      adminNotificationsQuery, 
      (snapshot) => {
        console.log('Admin notifications snapshot received:', snapshot.size, 'documents');
        const notificationsList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Sort manually by createdAt (newest first)
        notificationsList.sort((a, b) => {
          const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
          const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        console.log('Parsed notifications:', notificationsList);
        setNotifications(notificationsList);
        
        // Count unread notifications
              const unread = notificationsList.filter(notification => !notification.read).length;
      console.log('Unread notifications count:', unread);
      setUnreadCount(unread);
      
      // Auto-delete test notifications
      const testNotifications = notificationsList.filter(n => n.type === 'test');
      if (testNotifications.length > 0) {
        console.log('Found', testNotifications.length, 'test notifications, deleting...');
        deleteTestNotifications();
      }
    },
    (error) => {
      console.error('Error listening to admin notifications:', error);
    }
  );

    return () => {
      unsubscribePets();
      unsubscribeUsers();
      unsubscribeNotifications();
    };
  }, []);

  // Fetch current user profile information
  useEffect(() => {
  const fetchCurrentUserProfile = async () => {
    if (currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUserProfile({
            uid: currentUser.uid,
            displayName: userData.name || userData.displayName || currentUser.displayName || 'Agricultural Admin',
            email: currentUser.email,
            profileImage: userData.profileImage || null,
            role: userData.role || 'agricultural_admin'
          });
        }
      } catch (error) {
        console.error('Error fetching current user profile:', error);
      }
    }
  };

  fetchCurrentUserProfile();
}, [currentUser]);

// Function to get owner's profile image
const getOwnerProfileImage = (pet) => {
  if (!pet || !pet.userId) return null;
  const owner = users.find(user => user.uid === pet.userId);
  return owner?.profileImage || null;
};

  const handleLogout = async () => {
    const ok = window.confirm('Are you sure you want to logout?');
    if (!ok) return;
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const handleApprovePetRegistration = async (petId) => {
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
    } catch (error) {
      console.error('Error approving registration:', error);
      toast.error('Failed to approve registration');
    }
  };

  const handleRejectPetRegistration = async (petId) => {
    try {
      const petDoc = pets.find(pet => pet.id === petId);
      
      // Create notification for pet owner before deleting
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

      // Delete the pet instead of just marking as rejected
      await deleteDoc(doc(db, 'pets', petId));
      
      toast.success('Pet registration rejected and removed');
    } catch (error) {
      console.error('Error rejecting registration:', error);
      toast.error('Failed to reject registration');
    }
  };

  const handleDeletePet = async (petId, petName) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${petName}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'pets', petId));
      toast.success(`${petName} has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting pet:', error);
      toast.error('Failed to delete pet');
    }
  };

  const handleViewPet = (pet) => {
    setSelectedPet(pet);
    setShowPetModal(true);
  };

  // Filter functions
  const getFilteredPets = (petList) => {
    return petList.filter(pet => {
      const matchesSearch = !searchTerm || 
        pet.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.ownerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || pet.petType === filterType;
      
      return matchesSearch && matchesType;
    });
  };

  const getFilteredRegisteredPets = () => getFilteredPets(registeredPets);
  const getFilteredPendingPets = () => getFilteredPets(pendingPets);

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'admin_notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
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
  };

  const deleteNotification = async (notificationId) => {
    const confirmed = window.confirm('Are you sure you want to delete this notification? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'admin_notifications', notificationId));
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const deleteAllNotifications = async () => {
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
  };

  const handleNotificationClick = async (notification) => {
    // Mark notification as read
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
    }
    // Open notification details modal without closing the list
    setSelectedNotification(notification);
    setShowNotificationModal(true);
  };

  const deleteTestNotifications = async () => {
    try {
      const testNotifications = notifications.filter(n => n.type === 'test');
      const batch = writeBatch(db);
      testNotifications.forEach(notification => {
        batch.delete(doc(db, 'admin_notifications', notification.id));
      });
      await batch.commit();
      console.log('Test notifications deleted');
    } catch (error) {
      console.error('Error deleting test notifications:', error);
    }
  };

  // User Management Functions
  const handleActivateUser = async (userId) => {
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
    } catch (error) {
      console.error('Error activating user:', error);
      toast.error('Failed to activate user');
    }
  };

  const handleDeactivateUser = async (userId) => {
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
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
    }
  };

  // Filter users based on search term
  const getFilteredUsers = () => {
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  };

  // View user details
  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };



  // Close notifications dropdown when clicking outside (ignore clicks on details modal)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showNotifications &&
        !event.target.closest('.notifications-container') &&
        !event.target.closest('[data-notification-detail-modal]')
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
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
                  onClick={() => setSidebarOpen(!sidebarOpen)}
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
                  onClick={() => setShowNotifications(!showNotifications)}
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
                  onClick={() => setShowNotifications(!showNotifications)}
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
              onClick={() => setActiveTab('dashboard')}
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
              onClick={() => setActiveTab('registration')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'registration'
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
              onClick={() => setActiveTab('petManagement')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'petManagement'
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
              onClick={() => setActiveTab('userManagement')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'userManagement'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Shield className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">User Management</span>}
              {deactivatedUsers.length > 0 && (
                <span className={`ml-auto ${(sidebarOpen || sidebarHovered) ? '' : 'hidden'} inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-rose-500 text-white`}>
                  {deactivatedUsers.length > 99 ? '99+' : deactivatedUsers.length}
                </span>
              )}
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
        <div className="fixed left-20 top-6 z-50 notifications-container">
          <div className="w-96 bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
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
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">✕</button>
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
      <main className={`py-6 px-6 transition-all duration-300 ${
        sidebarOpen || sidebarHovered ? 'lg:ml-80' : 'lg:ml-16'
      } pt-8`}>
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

            {/* User Profile Section */}
            {currentUserProfile && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-100 border border-indigo-200 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {currentUserProfile.profileImage ? (
                      <img
                        src={currentUserProfile.profileImage}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold ${currentUserProfile.profileImage ? 'hidden' : 'flex'}`}
                    >
                      {currentUserProfile.displayName?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                      Welcome back, {currentUserProfile.displayName}!
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      {currentUserProfile.email}
                    </p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Agricultural Administrator
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      Last login: {new Date().toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">
                      Dashboard v1.0
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart and Activity Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registered Pets Line Chart */}
              <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-medium text-white mb-4">Registered Pets Trend</h3>
                <div className="h-64">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Chart area fill (dynamic) */}
                    <path
                      d={generateChartAreaPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="url(#chartGradient)"
                    />
                    
                    {/* Chart line (dynamic) */}
                    <path
                      d={generateChartPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    />
                    
                    {/* Data points (dynamic) */}
                    {chartData.map((data, index) => {
                      const maxValue = Math.max(...chartData.map(d => d.count), 1);
                      const x = 20 + (index * 80);
                      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
                      return (
                        <circle 
                          key={index}
                          cx={x} 
                          cy={y} 
                          r="6" 
                          fill="#ffffff" 
                          stroke="#10b981" 
                          strokeWidth="3" 
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        />
                      );
                    })}
                    
                    {/* Labels */}
                    <text x="20" y="195" textAnchor="middle" className="text-xs fill-white">Jan</text>
                    <text x="80" y="195" textAnchor="middle" className="text-xs fill-white">Feb</text>
                    <text x="120" y="195" textAnchor="middle" className="text-xs fill-white">Mar</text>
                    <text x="200" y="195" textAnchor="middle" className="text-xs fill-white">Apr</text>
                    <text x="280" y="195" textAnchor="middle" className="text-xs fill-white">May</text>
                    <text x="360" y="195" textAnchor="middle" className="text-xs fill-white">Jun</text>
                    
                    {/* Y-axis labels (dynamic ticks) */}
                    {(() => {
                      const maxValue = Math.max(...chartData.map(d => d.count), 1);
                      const tickMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
                      const ticks = [0, tickMax * 0.25, tickMax * 0.5, tickMax * 0.75, tickMax];
                      return ticks.map((t, i) => {
                        const y = 180 - Math.min((t / tickMax) * 160, 160);
                        const label = t % 1 === 0 ? t : t.toFixed(0);
                        return (
                          <text key={i} x="10" y={y + 5} textAnchor="end" className="text-xs fill-white">{label}</text>
                        );
                      });
                    })()}
                  </svg>
                </div>
                <div className="mt-4 flex justify-between text-sm text-white">
                  <span>Total Registered: {pets.length}</span>
                  <span>Max (6mo): {Math.max(...chartData.map(d => d.count), 0)}</span>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                <div className="h-64 overflow-y-auto">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="text-2xl">{activity.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium">{activity.message}</p>
                            <p className="text-xs text-gray-600">
                              {activity.timestamp?.toDate ? 
                                activity.timestamp.toDate().toLocaleDateString() : 
                                new Date(activity.timestamp).toLocaleDateString()
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-300">No recent activity</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-between text-sm text-white">
                  <span>Total Activities: {recentActivity.length}</span>
                  <span>Last Updated: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        )}

                 {!isLoading && activeTab === 'registration' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border border-indigo-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Pet Registration Requests</h2>
             
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

            <div className="overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
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
                   {getFilteredPendingPets().map((pet) => (
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
                                     {getFilteredPendingPets().length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                       {searchTerm || filterType !== 'all' ? 'No registrations match your search criteria' : 'No pending registrations'}
                     </td></tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
        )}

                 {!isLoading && activeTab === 'petManagement' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border border-indigo-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Registered Pets Management</h2>
             
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
             
            <div className="overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
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
                   {getFilteredRegisteredPets().map((pet) => (
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
                            onClick={() => handleDeletePet(pet.id, pet.petName)}
                           className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                                     {getFilteredRegisteredPets().length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-600">
                       {searchTerm || filterType !== 'all' ? 'No pets match your search criteria' : 'No registered pets yet'}
                     </td></tr>
                   )}
                </tbody>
              </table>
          </div>

            {/* Summary Stats */}
            {registeredPets.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <div className="flex items-center">
                    <Dog className="h-5 w-5 text-white mr-2" />
                  <div>
                      <p className="text-sm font-medium text-white">Dogs</p>
                      <p className="text-lg font-semibold text-white">
                        {registeredPets.filter(pet => pet.petType === 'dog').length}
                    </p>
                  </div>
                </div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-white mr-2">🐱</span>
                  <div>
                      <p className="text-sm font-medium text-white">Cats</p>
                      <p className="text-lg font-semibold text-white">
                        {registeredPets.filter(pet => pet.petType === 'cat').length}
                    </p>
                  </div>
                </div>
                </div>
                <div className="bg-white bg-opacity-10 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-white mr-2" />
                  <div>
                      <p className="text-sm font-medium text-white">Unique Owners</p>
                      <p className="text-lg font-semibold text-white">
                        {new Set(registeredPets.map(pet => pet.ownerFullName)).size}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        )}

        {!isLoading && activeTab === 'userManagement' && (
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 border border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">User Management</h2>
                <p className="text-sm text-gray-600">Managing regular users only (admin users not displayed)</p>
              </div>
              <div className="text-sm text-gray-900">
                Total Users: {users.length}
              </div>
            </div>
            
            {/* Search Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
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

            <div className="overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pets Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredUsers().map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 transition-all duration-300">
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
                            <p className="text-sm font-medium text-gray-900">{user.displayName || 'Unknown User'}</p>
                            <p className="text-xs text-gray-600">{user.email || 'No email'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div>
                          <p className="text-sm">{user.phone || 'No phone'}</p>
                          <p className="text-xs text-gray-500">{user.email || 'No email'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <p className="max-w-xs truncate">{user.address || 'No address provided'}</p>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'deactivated' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.status === 'deactivated' ? (
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
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {registeredPets.filter(pet => pet.userId === user.uid).length} pets
                  </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center transition-all duration-300"
                          >
                            <User className="h-3 w-3 mr-1" />
                            View
                          </button>
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
                </div>
                      </td>
                    </tr>
                  ))}
                  {getFilteredUsers().length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-600">
                        {searchTerm ? 'No users match your search criteria' : 'No users found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

            {/* Summary Stats */}
            {users.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <ShieldCheck className="h-5 w-5 text-gray-700 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Active Users</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {users.filter(user => user.status !== 'deactivated').length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <ShieldOff className="h-5 w-5 text-gray-700 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Deactivated Users</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {deactivatedUsers.length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-700 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Total Users</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {users.length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                   
                   console.log('=== Pet Image Debug Info ===');
                   console.log('Selected Pet Data:', selectedPet);
                   console.log('Image URL:', imageUrl);
                   console.log('Pet Image Field:', selectedPet.petImage);
                   console.log('Image URL Field:', selectedPet.imageUrl);
                   console.log('Image Field:', selectedPet.image);
                   console.log('=========================');
                   
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
                   
                   console.log('Image Analysis:', {
                     isLocalFile,
                     isValidHttpUrl,
                     isFirebaseUrl,
                     hasImageUrl: !!imageUrl
                   });
                   
                   if (isValidHttpUrl || isFirebaseUrl) {
                     return (
                       <div className="relative">
                         <img 
                           src={imageUrl} 
                           alt={selectedPet.petName || 'Pet Image'}
                           className="w-full h-80 object-cover rounded-lg border"
                           onError={(e) => {
                             console.error('Image failed to load:', imageUrl);
                             console.error('Error details:', e);
                             // Hide failed image and show placeholder
                             e.target.style.display = 'none';
                             const placeholder = e.target.nextElementSibling;
                             if (placeholder) {
                               placeholder.style.display = 'flex';
                             }
                           }}
                           onLoad={() => {
                             console.log('✓ Image loaded successfully:', imageUrl);
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
                   
                   console.log('=== Pet Booklet Debug Info ===');
                   console.log('Booklet URL:', bookletUrl);
                   console.log('Pet Booklet Field:', selectedPet.petBooklet);
                   console.log('Booklet URL Field:', selectedPet.bookletUrl);
                   console.log('============================');
                   
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
                   
                   console.log('Booklet Analysis:', {
                     isLocalFile,
                     isValidHttpUrl,
                     isFirebaseUrl,
                     hasBookletUrl: !!bookletUrl
                   });
                   
                   if (isValidHttpUrl || isFirebaseUrl) {
                     return (
                       <div className="relative">
                         <img 
                           src={bookletUrl} 
                           alt="Pet Booklet"
                           className="w-full h-80 object-cover rounded-lg border"
                           onError={(e) => {
                             console.error('Booklet failed to load:', bookletUrl);
                             console.error('Error details:', e);
                             // Hide failed image and show placeholder
                             e.target.style.display = 'none';
                             const placeholder = e.target.nextElementSibling;
                             if (placeholder) {
                               placeholder.style.display = 'flex';
                             }
                           }}
                           onLoad={() => {
                             console.log('✓ Booklet loaded successfully:', bookletUrl);
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
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Notification Details</h2>
                    <p className="text-blue-100 text-sm">
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

                {/* Pet Owner's Input Details */}
                {selectedNotification.petId && (() => {
                  const petDetails = pets.find(pet => pet.id === selectedNotification.petId);
                  return petDetails ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Pet Owner's Registration Details</label>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        {/* Pet Image */}
                        {petDetails.petImage || petDetails.imageUrl || petDetails.image ? (
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
                        ) : null}
                        
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
                              <span className="text-sm text-gray-600">Registration Date:</span>
                              <p className="text-gray-900 font-medium">
                                {petDetails.createdAt?.toDate ? petDetails.createdAt.toDate().toLocaleDateString() : 'Not available'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Additional Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Notification Information</h4>
                      <p className="text-sm text-blue-700">
                        This notification was generated when a new pet registration was submitted. You can review and manage pet registrations from the Pet Registration tab.
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
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone Number</label>
                      <p className="text-gray-900">{selectedUser.phone || 'No phone provided'}</p>
        </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="text-gray-900">{selectedUser.address || 'No address provided'}</p>
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
    </div>
  );
};

export default AgriculturalDashboard; 