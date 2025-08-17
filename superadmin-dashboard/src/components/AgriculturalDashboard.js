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
  getDocs
} from 'firebase/firestore';
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
  Bell
} from 'lucide-react';

const TabButton = ({ active, label, icon: Icon, onClick, badge = 0 }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={active}
    className={`group flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
      active
        ? 'bg-green-600 text-white border-green-600 hover:bg-green-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <Icon className="h-5 w-5 mr-2 text-current" />
    <span>{label}</span>
    {badge > 0 && (
      <span
        className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs ${
          active ? 'bg-white text-green-700' : 'bg-red-600 text-white'
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
    });

    // Listen to users from adoption applications to get user count
    const usersQuery = query(collection(db, 'adoption_applications'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const userMap = new Map();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.userId && data.applicant) {
          userMap.set(data.userId, {
            uid: data.userId,
            displayName: data.applicant.fullName,
            email: data.applicant.email,
            phone: data.applicant.phone,
            address: data.applicant.address,
            status: data.userStatus || 'active'
          });
        }
      });
      const allUsers = Array.from(userMap.values());
      setUsers(allUsers);
      setDeactivatedUsers(allUsers.filter(user => user.status === 'deactivated'));
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
    
    // If it's a pet registration notification, find and show the pet details
    if (notification.type === 'new_registration' && notification.petId) {
      const pet = pets.find(p => p.id === notification.petId);
      if (pet) {
        setSelectedPet(pet);
        setShowPetModal(true);
        setShowNotifications(false);
        
        // Switch to registration tab if not already there
        if (activeTab !== 'registration') {
          setActiveTab('registration');
        }
      }
    }
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



  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Leaf className="h-8 w-8 text-white mr-3" />
              <h1 className="text-2xl font-bold text-white">Agricultural Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Bell className="h-5 w-5 text-gray-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={deleteAllNotifications}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete all
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Notifications List */}
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
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                {notification.type === 'new_registration' ? (
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <Dog className="h-4 w-4 text-green-600" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                    <Bell className="h-4 w-4 text-gray-600" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {notification.title}
                                  </p>
                                  {!notification.read && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-400">
                                    {notification.createdAt?.toDate?.()?.toLocaleString() || 'Recently'}
                                  </p>
                                  {notification.type === 'new_registration' && (
                                    <span className="text-xs text-blue-600 font-medium">
                                      Click to view details →
              </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.filter(n => n.type !== 'test').length > 10 && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                        <p className="text-sm text-gray-500 text-center">
                          Showing 10 of {notifications.filter(n => n.type !== 'test').length} notifications
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>


              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 flex-wrap">
          <TabButton
            active={activeTab === 'dashboard'}
            label="Dashboard"
            icon={BarChart3}
            onClick={() => setActiveTab('dashboard')}
          />
          <TabButton
            active={activeTab === 'registration'}
            label="Pet Registration"
            icon={List}
            badge={pendingPets.length}
            onClick={() => setActiveTab('registration')}
          />
          <TabButton
            active={activeTab === 'petManagement'}
            label="Pet Management"
            icon={Settings}
            badge={registeredPets.length}
            onClick={() => setActiveTab('petManagement')}
          />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Dog className="h-8 w-8 text-green-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Registered Pets</p>
                    <p className="text-2xl font-semibold text-gray-900">{registeredPets.length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <UserX className="h-8 w-8 text-red-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Deactivated Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{deactivatedUsers.length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Clock className="h-8 w-8 text-yellow-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Registrations</p>
                    <p className="text-2xl font-semibold text-gray-900">{pendingPets.length}</p>
                </div>
              </div>
            </div>
          </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registration Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pet Registration Status</h3>
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Registered</span>
                    <span className="text-sm font-medium text-green-600">{registeredPets.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <span className="text-sm font-medium text-yellow-600">{pendingPets.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Pets</span>
                    <span className="text-sm font-medium text-gray-900">{pets.length}</span>
              </div>
            </div>
          </div>

              {/* User Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">User Status</h3>
              <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Users</span>
                    <span className="text-sm font-medium text-green-600">{users.length - deactivatedUsers.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Deactivated Users</span>
                    <span className="text-sm font-medium text-red-600">{deactivatedUsers.length}</span>
                </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Users</span>
                    <span className="text-sm font-medium text-gray-900">{users.length}</span>
                </div>
              </div>
            </div>
            </div>
          </div>
        )}

                 {activeTab === 'registration' && (
           <div className="bg-white shadow rounded-lg p-6">
             <h2 className="text-lg font-medium text-gray-900 mb-4">Pet Registration Requests</h2>
             
             {/* Search and Filter Controls */}
             <div className="mb-6 flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                 <input
                   type="text"
                   placeholder="Search by pet name, owner, or breed..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                 />
               </div>
               <div className="flex gap-2">
                 <select
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                   className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                   className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                 >
                   Clear
                 </button>
          </div>
        </div>

             <div className="overflow-hidden ring-1 ring-black ring-opacity-5 rounded-md">
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
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{pet.petName || 'Unnamed Pet'}</td>
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
                             className="px-2 py-1 text-xs rounded border text-blue-700 border-blue-200 hover:bg-blue-50"
                           >
                             View
                           </button>
                           <button 
                             onClick={() => handleApprovePetRegistration(pet.id)}
                             className="px-2 py-1 text-xs rounded border text-green-700 border-green-200 hover:bg-green-50"
                           >
                             Approve
                </button>
                           <button 
                             onClick={() => handleRejectPetRegistration(pet.id)}
                             className="px-2 py-1 text-xs rounded border text-red-700 border-red-200 hover:bg-red-50"
                           >
                             Reject
                </button>
                         </div>
                       </td>
                    </tr>
                  ))}
                                     {getFilteredPendingPets().length === 0 && (
                     <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                       {searchTerm || filterType !== 'all' ? 'No registrations match your search criteria' : 'No pending registrations'}
                     </td></tr>
                   )}
                </tbody>
              </table>
            </div>
          </div>
        )}

                 {activeTab === 'petManagement' && (
           <div className="bg-white shadow rounded-lg p-6">
             <h2 className="text-lg font-medium text-gray-900 mb-4">Registered Pets Management</h2>
             
             {/* Search and Filter Controls */}
             <div className="mb-6 flex flex-col sm:flex-row gap-4">
               <div className="flex-1">
                 <input
                   type="text"
                   placeholder="Search by pet name, owner, or breed..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                 />
               </div>
               <div className="flex gap-2">
                 <select
                   value={filterType}
                   onChange={(e) => setFilterType(e.target.value)}
                   className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                   className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                 >
                   Clear
                </button>
              </div>
            </div>
             
             <div className="overflow-hidden ring-1 ring-black ring-opacity-5 rounded-md">
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
                    <tr key={pet.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900 font-medium">{pet.petName || 'Unnamed Pet'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{pet.ownerFullName || 'Unknown Owner'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <div className="flex flex-col">
                          <span className="font-medium">{pet.petType?.charAt(0).toUpperCase() + pet.petType?.slice(1) || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{pet.breed || 'Unknown breed'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          pet.petGender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
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
                            className="px-2 py-1 text-xs rounded border text-blue-700 border-blue-200 hover:bg-blue-50"
                          >
                            View
                          </button>
                          <button 
                            onClick={() => handleDeletePet(pet.id, pet.petName)}
                            className="px-2 py-1 text-xs rounded border text-red-700 border-red-200 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                                     {getFilteredRegisteredPets().length === 0 && (
                     <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">
                       {searchTerm || filterType !== 'all' ? 'No pets match your search criteria' : 'No registered pets yet'}
                     </td></tr>
                   )}
                </tbody>
              </table>
          </div>

            {/* Summary Stats */}
            {registeredPets.length > 0 && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Dog className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                      <p className="text-sm font-medium text-green-900">Dogs</p>
                      <p className="text-lg font-semibold text-green-700">
                        {registeredPets.filter(pet => pet.petType === 'dog').length}
                    </p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <span className="text-purple-600 mr-2">🐱</span>
                  <div>
                      <p className="text-sm font-medium text-purple-900">Cats</p>
                      <p className="text-lg font-semibold text-purple-700">
                        {registeredPets.filter(pet => pet.petType === 'cat').length}
                    </p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                      <p className="text-sm font-medium text-blue-900">Unique Owners</p>
                      <p className="text-lg font-semibold text-blue-700">
                        {new Set(registeredPets.map(pet => pet.ownerFullName)).size}
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
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                      <User className="h-8 w-8 text-gray-400" />
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
    </div>
  );
};

export default AgriculturalDashboard; 