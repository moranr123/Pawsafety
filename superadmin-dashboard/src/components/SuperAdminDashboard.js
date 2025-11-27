import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { 
  collection, 
  setDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where,
  orderBy,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';
import { 
  LogOut, 
  Plus, 
  Edit, 
  UserCheck, 
  UserX, 
  Users,
  Shield,
  Settings,
  Activity,
  Clock,
  Search,
  Filter,
  FileText,
  Archive,
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  Calendar,
  X
} from 'lucide-react';
import AdminList from './AdminList';
import CreateAdminModal from './CreateAdminModal';
import EditPasswordModal from './modals/EditPasswordModal';
import LogoWhite from '../assets/Logowhite.png';

const SuperAdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminActivities, setAdminActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');
  const [activityDate, setActivityDate] = useState('');
  const [activityAdminFilter, setActivityAdminFilter] = useState('all');
  const [showAdminFilterModal, setShowAdminFilterModal] = useState(false);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [historyLog, setHistoryLog] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyDate, setHistoryDate] = useState('');
  const [archivedAdmins, setArchivedAdmins] = useState([]);
  const [archivedLoading, setArchivedLoading] = useState(true);
  const [lastLogoutTimes, setLastLogoutTimes] = useState({});
  const [roleFilter, setRoleFilter] = useState('all');

  const logActivity = async (adminId, adminName, adminEmail, action, actionType, details = '') => {
    try {
      await addDoc(collection(db, 'admin_activities'), {
        adminId,
        adminName,
        adminEmail,
        adminRole: 'superadmin',
        action,
        actionType,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('role', 'in', ['agricultural_admin', 'impound_admin'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(admin => !admin.archived);
      setAdmins(adminList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'users'), 
      where('role', 'in', ['agricultural_admin', 'impound_admin'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const archivedList = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(admin => admin.archived === true);
      setArchivedAdmins(archivedList);
      setArchivedLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribe;
    
    const fetchAdminActivities = async () => {
      try {
        setActivitiesLoading(true);
        
        const activitiesQuery = query(
          collection(db, 'admin_activities'),
          orderBy('timestamp', 'desc')
        );
        
        unsubscribe = onSnapshot(
          activitiesQuery, 
          (snapshot) => {
            const allActivities = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            const filteredActivities = allActivities.filter(activity => {
              const actionType = activity.actionType || '';
              const details = activity.details || '';
              const action = activity.action || '';
              const adminEmail = activity.adminEmail || '';
              const adminRole = activity.adminRole || '';
              
              // Check if it's from agricultural_admin or impound_admin
              const isRegularAdmin = 
                details.includes('agricultural_admin') || 
                details.includes('impound_admin') || 
                action.includes('agricultural_admin') || 
                action.includes('impound_admin') ||
                adminEmail.includes('agricultural') ||
                adminEmail.includes('impound') ||
                adminRole === 'agricultural_admin' ||
                adminRole === 'impound_admin';
              
              // Exclude superadmin activities
              const isNotSuperadmin = 
                !details.includes('superadmin') && 
                !action.includes('superadmin') &&
                adminRole !== 'superadmin';
              
              return isRegularAdmin && isNotSuperadmin;
            });
            
            setAdminActivities(filteredActivities);
            setActivitiesLoading(false);
          },
          (error) => {
            console.error('Error fetching admin activities:', error);
            setActivitiesLoading(false);
            setAdminActivities([]);
          }
        );
      } catch (error) {
        console.error('Error setting up admin activities listener:', error);
        setActivitiesLoading(false);
        setAdminActivities([]);
      }
    };

    fetchAdminActivities();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let unsubscribe;
    
    const fetchHistoryLog = async () => {
      try {
        setHistoryLoading(true);
        
        const activitiesQuery = query(
          collection(db, 'admin_activities'),
          orderBy('timestamp', 'desc')
        );
        
        unsubscribe = onSnapshot(
          activitiesQuery, 
          (snapshot) => {
            const allActivities = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            const superAdminActions = allActivities.filter(activity => {
              const actionType = activity.actionType || '';
              const adminRole = activity.adminRole || '';
              const adminId = activity.adminId || '';
              
              // Only show superadmin actions
              const isSuperadminAction = 
                adminRole === 'superadmin' || 
                (adminId === currentUser?.uid && !adminRole);
              
              return isSuperadminAction && 
                     ['create', 'update', 'delete', 'status_change'].includes(actionType);
            });
            
            setHistoryLog(superAdminActions);
            setHistoryLoading(false);
          },
          (error) => {
            console.error('Error fetching history log:', error);
            setHistoryLoading(false);
            setHistoryLog([]);
          }
        );
      } catch (error) {
        console.error('Error setting up history log listener:', error);
        setHistoryLoading(false);
        setHistoryLog([]);
      }
    };

    fetchHistoryLog();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let unsubscribe;
    
    const fetchLastLogoutTimes = async () => {
      try {
        const activitiesQuery = query(
          collection(db, 'admin_activities'),
          orderBy('timestamp', 'desc')
        );
        
        unsubscribe = onSnapshot(
          activitiesQuery, 
          (snapshot) => {
            const allActivities = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Filter for logout activities of agricultural_admin and impound_admin only
            const adminLogouts = allActivities.filter(activity => {
              const actionType = activity.actionType || '';
              const details = activity.details || '';
              const action = activity.action || '';
              const adminEmail = activity.adminEmail || '';
              
              return actionType === 'logout' &&
                     (details.includes('agricultural_admin') || details.includes('impound_admin') || 
                      action.includes('agricultural_admin') || action.includes('impound_admin') ||
                      adminEmail.includes('agricultural') || adminEmail.includes('impound')) &&
                     !details.includes('superadmin') && !action.includes('superadmin') && !adminEmail.includes('superadmin');
            });
            
            // Create a map of adminId to last logout timestamp
            const logoutMap = {};
            adminLogouts.forEach(activity => {
              if (activity.adminId && activity.timestamp) {
                const timestamp = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
                const existingTimestamp = logoutMap[activity.adminId];
                const existingDate = existingTimestamp ? (existingTimestamp.toDate ? existingTimestamp.toDate() : new Date(existingTimestamp)) : null;
                
                // Only keep the most recent logout for each admin
                if (!existingDate || timestamp > existingDate) {
                  logoutMap[activity.adminId] = activity.timestamp;
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
      }
    };

    fetchLastLogoutTimes();
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleCreateAdmin = async (adminData) => {
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const createAdminUser = httpsCallable(functions, 'createAdminUser');
      
      const payload = {
        name: adminData.name,
        email: adminData.email,
        password: adminData.password,
        role: adminData.role
      };

      const result = await createAdminUser(payload);

      if (result.data.error) {
        throw new Error(result.data.error);
      }

      toast.success('Admin account created successfully!');
      
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        `Created new ${adminData.role} account`,
        'create',
        `Created admin account for ${adminData.name} (${adminData.email})`
      );
      
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating admin:', error);
      let friendlyMessage = 'Failed to create admin account. Please try again.';
      if (error?.code === 'functions/permission-denied') {
        friendlyMessage = 'Only superadmins can create admin users';
      } else if (error?.code === 'functions/already-exists') {
        friendlyMessage = 'A user with this email already exists';
      } else if (error?.code === 'functions/invalid-argument') {
        friendlyMessage = 'Invalid input. Please check the form fields.';
      } else if (typeof error?.message === 'string' && error.message.trim()) {
        friendlyMessage = error.message;
      }
      toast.error(friendlyMessage);
    }
  };

  const handleOpenEditPassword = (admin) => {
    setEditingAdmin(admin);
    setShowEditPasswordModal(true);
  };

  const handleUpdatePassword = async (uid, newPassword) => {
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const updateAdminPassword = httpsCallable(functions, 'updateAdminPassword');
      await updateAdminPassword({ uid, newPassword });
      toast.success('Password updated successfully');
      
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        'Updated admin password',
        'update',
        `Updated password for ${editingAdmin.name} (${editingAdmin.email})`
      );
      
      setShowEditPasswordModal(false);
      setEditingAdmin(null);
    } catch (error) {
      console.error('Error updating password:', error);
      let msg = 'Failed to update password';
      if (error?.code === 'functions/invalid-argument') msg = 'Invalid password';
      else if (error?.code === 'functions/not-found') msg = 'Admin not found';
      else if (typeof error?.message === 'string') msg = error.message;
      toast.error(msg);
    }
  };

  const handleArchiveAdmin = async (admin) => {
    const confirmed = window.confirm(`Archive admin ${admin.email}? The admin will be moved to archived admins and can be restored later.`);
    if (!confirmed) return;
    try {
      const adminRef = doc(db, 'users', admin.id);
      
      await updateDoc(adminRef, {
        archived: true,
        archivedAt: serverTimestamp()
      });
      
      toast.success('Admin archived successfully');
      
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        'Archived admin account',
        'status_change',
        `Archived admin account for ${admin.name} (${admin.email})`
      );
    } catch (error) {
      console.error('Error archiving admin:', error);
      toast.error(error.message || 'Failed to archive admin');
    }
  };

  const handleRestoreAdmin = async (admin) => {
    const confirmed = window.confirm(`Restore admin ${admin.email}? The admin will be moved back to active admins.`);
    if (!confirmed) return;
    try {
      const adminRef = doc(db, 'users', admin.id);
      
      await updateDoc(adminRef, {
        archived: false,
        archivedAt: null
      });
      
      toast.success('Admin restored successfully');
      
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        'Restored admin account',
        'status_change',
        `Restored admin account for ${admin.name} (${admin.email})`
      );
    } catch (error) {
      console.error('Error restoring admin:', error);
      toast.error(error.message || 'Failed to restore admin');
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    // Show confirmation when deactivating
    if (currentStatus === 'active') {
      const admin = admins.find(a => a.id === adminId);
      const adminName = admin?.name || admin?.email || 'this admin';
      const confirmed = window.confirm(`Are you sure you want to deactivate ${adminName}? The admin will not be able to access the system until reactivated.`);
      if (!confirmed) return;
    }
    
    try {
      const adminRef = doc(db, 'users', adminId);
      
      await updateDoc(adminRef, {
        status: newStatus
      });

      const admin = admins.find(a => a.id === adminId);
      const adminName = admin?.name || admin?.email || adminId;

      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        `${newStatus === 'active' ? 'Activated' : 'Deactivated'} admin account`,
        'status_change',
        `${newStatus === 'active' ? 'Activated' : 'Deactivated'} admin account for ${adminName}`
      );
      
      toast.success(`Admin account ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error(error.message || 'Failed to update admin status');
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (!confirmed) return;
    
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  // Get unique admins from activities for the filter dropdown
  const getUniqueAdmins = () => {
    const adminMap = new Map();
    (adminActivities || []).forEach(activity => {
      if (activity.adminId && activity.adminName) {
        if (!adminMap.has(activity.adminId)) {
          adminMap.set(activity.adminId, {
            id: activity.adminId,
            name: activity.adminName,
            email: activity.adminEmail || '',
            role: activity.adminRole || ''
          });
        }
      }
    });
    return Array.from(adminMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const uniqueAdmins = getUniqueAdmins();

  const filteredActivities = (adminActivities || []).filter(activity => {
    if (!activity) return false;
    
    const matchesFilter = activityFilter === 'all' || 
                         activity.actionType === activityFilter;
    
    // Admin filtering
    const matchesAdmin = activityAdminFilter === 'all' || 
                        activity.adminId === activityAdminFilter;
    
    // Date filtering
    let matchesDate = true;
    if (activityDate) {
      if (!activity.timestamp) {
        matchesDate = false;
      } else {
        const activityDateObj = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
        const activityDateOnly = new Date(activityDateObj.getFullYear(), activityDateObj.getMonth(), activityDateObj.getDate());
        
        const selectedDate = new Date(activityDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        matchesDate = activityDateOnly.getTime() === selectedDate.getTime();
      }
    }
    
    return matchesFilter && matchesAdmin && matchesDate;
  });

  const filteredHistoryLog = (historyLog || []).filter(activity => {
    if (!activity) return false;
    
    const matchesFilter = historyFilter === 'all' || 
                         activity.actionType === historyFilter;
    
    // Date filtering
    let matchesDate = true;
    if (historyDate) {
      if (!activity.timestamp) {
        matchesDate = false;
      } else {
        const activityDateObj = activity.timestamp.toDate ? activity.timestamp.toDate() : new Date(activity.timestamp);
        const activityDateOnly = new Date(activityDateObj.getFullYear(), activityDateObj.getMonth(), activityDateObj.getDate());
        
        const selectedDate = new Date(historyDate);
        selectedDate.setHours(0, 0, 0, 0);
        
        matchesDate = activityDateOnly.getTime() === selectedDate.getTime();
      }
    }
    
    return matchesFilter && matchesDate;
  });

  const getActivityIcon = (actionType) => {
    switch (actionType) {
      case 'login':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <LogOut className="h-4 w-4 text-red-600" />;
      case 'create':
        return <Plus className="h-4 w-4 text-blue-600" />;
      case 'update':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'delete':
        return <UserX className="h-4 w-4 text-red-600" />;
      case 'export':
        return <FileText className="h-4 w-4 text-teal-600" />;
      case 'status_change':
        return <Settings className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Get admins that have been offline for almost 24 hours (23+ hours)
  const getOfflineAdmins = () => {
    const now = new Date();
    const twentyThreeHoursInMs = 23 * 60 * 60 * 1000; // 23 hours in milliseconds
    
    return admins.filter(admin => {
      // Only check active admins
      if (admin.status !== 'active') return false;
      
      const lastLogout = lastLogoutTimes[admin.id];
      if (!lastLogout) {
        // If no logout record, check if account was created more than 24 hours ago
        if (admin.createdAt) {
          const createdAt = admin.createdAt.toDate ? admin.createdAt.toDate() : new Date(admin.createdAt);
          return (now - createdAt) >= twentyThreeHoursInMs;
        }
        return false;
      }
      
      const logoutDate = lastLogout.toDate ? lastLogout.toDate() : new Date(lastLogout);
      const timeSinceLogout = now - logoutDate;
      
      return timeSinceLogout >= twentyThreeHoursInMs;
    });
  };

  const allOfflineAdmins = getOfflineAdmins();
  
  // Filter offline admins based on role filter
  const offlineAdmins = roleFilter === 'all' 
    ? allOfflineAdmins 
    : allOfflineAdmins.filter(admin => admin.role === roleFilter);

  // Filter admins based on role filter
  const getFilteredAdmins = (adminList) => {
    if (roleFilter === 'all') {
      return adminList;
    }
    return adminList.filter(admin => admin.role === roleFilter);
  };

  const filteredAdmins = getFilteredAdmins(admins);
  const filteredArchivedAdmins = getFilteredAdmins(archivedAdmins);

  if (loading) {
    return (
       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
           <p className="mt-4 text-gray-600">Loading dashboard...</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col lg:flex-row">
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
            <span className="text-white text-base font-semibold">Super Admin</span>
          </div>
          <div className="flex items-center space-x-2">
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

      {mobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-[60px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-[60px] left-0 right-0 z-50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl border-t border-slate-700">
            <nav className="py-2">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveTab('activities');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'activities'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Activity className="h-5 w-5 mr-3" />
                Admin Activities
              </button>
            <button
              onClick={() => {
                setActiveTab('history');
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileText className="h-5 w-5 mr-3" />
              History Log
            </button>
            </nav>
          </div>
        </>
      )}

      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
          sidebarOpen || sidebarHovered ? 'w-80 translate-x-0' : 'w-16 -translate-x-0'
        } lg:${sidebarOpen || sidebarHovered ? 'w-80' : 'w-16'}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={LogoWhite} alt="PawSafety Logo" className="w-full h-full object-contain" />
              </div>
              {(sidebarOpen || sidebarHovered) && (
                <span className="ml-3 text-white text-lg font-semibold">Super Admin</span>
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

          <nav className="p-3 flex-1 space-y-3 overflow-y-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Settings className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Dashboard</span>}
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'activities'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <Activity className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Admin Activities</span>}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <FileText className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">History Log</span>}
            </button>
          </nav>

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

      <main className={`flex-1 py-3 px-3 sm:py-6 sm:px-6 transition-all duration-300 ${
        sidebarOpen || sidebarHovered ? 'lg:ml-80' : 'lg:ml-16'
      } pt-20 lg:pt-12`}>
        <div className="max-w-7xl mx-auto">
          
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
                <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                   <div className="p-4 sm:p-6">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center">
                         <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                           </div>
                         </div>
                         <div className="ml-3 sm:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-blue-600">Total Admins</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">{admins.length}</p>
                         </div>
                       </div>
                       <div className="text-right">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                 </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                   <div className="p-4 sm:p-6">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center">
                         <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                           </div>
                         </div>
                         <div className="ml-3 sm:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-blue-600">Active Admins</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                             {admins.filter(admin => admin.status === 'active').length}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                 </div>

                <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                   <div className="p-4 sm:p-6">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center">
                         <div className="flex-shrink-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <UserX className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                           </div>
                         </div>
                         <div className="ml-3 sm:ml-4">
                          <p className="text-xs sm:text-sm font-medium text-blue-600">Inactive Admins</p>
                          <p className="text-xl sm:text-2xl font-bold text-gray-900">
                             {admins.filter(admin => admin.status === 'inactive').length}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

             {/* Offline Admin Notification */}
             {offlineAdmins.length > 0 && (
               <div className="mb-4 sm:mb-6 lg:mb-8 bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-xl shadow-lg p-4 sm:p-6">
                 <div className="flex items-start">
                   <div className="flex-shrink-0">
                     <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                   </div>
                   <div className="ml-3 sm:ml-4 flex-1">
                     <h3 className="text-base sm:text-lg font-semibold text-orange-900 mb-2">
                       Admin Deactivation Alert
                     </h3>
                     <p className="text-sm sm:text-base text-orange-800 mb-3">
                       The following {offlineAdmins.length} admin{offlineAdmins.length > 1 ? 's have' : ' has'} been offline for almost 24 hours and may need to be deactivated:
                     </p>
                     <div className="space-y-2">
                       {offlineAdmins.map(admin => {
                         const lastLogout = lastLogoutTimes[admin.id];
                         const now = new Date();
                         let hoursOffline = 0;
                         
                         if (lastLogout) {
                           const logoutDate = lastLogout.toDate ? lastLogout.toDate() : new Date(lastLogout);
                           hoursOffline = Math.floor((now - logoutDate) / (1000 * 60 * 60));
                         } else if (admin.createdAt) {
                           const createdAt = admin.createdAt.toDate ? admin.createdAt.toDate() : new Date(admin.createdAt);
                           hoursOffline = Math.floor((now - createdAt) / (1000 * 60 * 60));
                         }
                         
                         return (
                           <div key={admin.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-200">
                             <div className="flex-1">
                               <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                               <p className="text-xs text-gray-600">{admin.email}</p>
                               <p className="text-xs text-orange-700 mt-1">
                                 Offline for {hoursOffline} hour{hoursOffline !== 1 ? 's' : ''}
                               </p>
                             </div>
                             <button
                               onClick={() => handleToggleStatus(admin.id, admin.status)}
                               className="ml-3 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                             >
                               Deactivate
                             </button>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               </div>
             )}

             <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200">
               <div className="px-3 py-4 sm:px-4 sm:py-5 lg:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                   <h2 className="text-base sm:text-lg font-medium text-gray-900">
                     Admin Management
                   </h2>
                   <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                     <button
                       onClick={() => setActiveTab('archived')}
                       className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-md transition-all duration-300 shadow-md hover:shadow-lg"
                     >
                       <Archive className="h-4 w-4 mr-2" />
                       View Archive
                       {archivedAdmins.length > 0 && (
                         <span className="ml-2 bg-white text-orange-600 text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center font-semibold">
                           {archivedAdmins.length > 99 ? '99+' : archivedAdmins.length}
                         </span>
                       )}
                     </button>
                     <button
                       onClick={() => setShowCreateModal(true)}
                       className="flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
                     >
                       <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                       Create Admin
                     </button>
                   </div>
                 </div>

                 {/* Filter Dropdown */}
                 <div className="mb-4 sm:mb-6">
                   <div className="relative sm:w-64">
                     <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                     <select
                       value={roleFilter}
                       onChange={(e) => setRoleFilter(e.target.value)}
                       className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                     >
                       <option value="all">All Admins</option>
                       <option value="agricultural_admin">Agricultural Personnel</option>
                       <option value="impound_admin">Impound Personnel</option>
                     </select>
                   </div>
                 </div>

                 <div className="overflow-x-auto -mx-3 sm:mx-0">
                   <div className="inline-block min-w-full align-middle">
                   <AdminList
                     admins={filteredAdmins}
                     onToggleStatus={handleToggleStatus}
                     onEdit={handleOpenEditPassword}
                     onDelete={handleArchiveAdmin}
                     lastLogoutTimes={lastLogoutTimes}
                     offlineAdmins={offlineAdmins}
                   />
                   </div>
                 </div>
               </div>
             </div>
            </>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                  <div className="flex items-center">
                    <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Admin Activities</h2>
                      <p className="text-xs sm:text-sm text-gray-600">Track all actions of agricultural and impound admins</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-indigo-700">
                      {(adminActivities || []).length} total
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-indigo-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </div>
                  </div>
                </div>

                {/* Filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
                  {/* Admin Filter Button */}
                  <div className="relative sm:w-48">
                    <button
                      onClick={() => setShowAdminFilterModal(true)}
                      className="w-full flex items-center justify-between pl-3 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-700">
                          {activityAdminFilter === 'all' 
                            ? 'All Admins' 
                            : (() => {
                                const selectedAdmin = uniqueAdmins.find(a => a.id === activityAdminFilter);
                                return selectedAdmin ? selectedAdmin.name : 'Selected Admin';
                              })()}
                        </span>
                      </div>
                      {activityAdminFilter !== 'all' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivityAdminFilter('all');
                          }}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                          title="Clear admin filter"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </button>
                  </div>

                  <div className="relative sm:w-48">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                      <option value="all">All Activities</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="export">Export</option>
                      <option value="status_change">Status Change</option>
                    </select>
                  </div>
                  
                  {/* Date Filter */}
                  <div className="relative sm:w-48">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={activityDate}
                      onChange={(e) => setActivityDate(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {activityDate && (
                      <button
                        onClick={() => setActivityDate('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {activitiesLoading ? (
                    <div className="p-6 sm:p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm sm:text-base text-gray-600">Loading activities...</p>
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <Activity className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-500">No activities found</p>
                      <p className="text-xs sm:text-sm text-gray-400">Admin activities will appear here</p>
                    </div>
                  ) : (
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                      {filteredActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.actionType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                  {activity.adminName || 'Unknown Admin'}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {activity.actionType || 'activity'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimestamp(activity.timestamp)}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                {activity.action || 'Performed an action'}
                              </p>
                              {activity.details && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {activity.details}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3" />
                    <div>
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900">History Log</h2>
                      <p className="text-xs sm:text-sm text-gray-600">Track SuperAdmin actions</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-indigo-700">
                      {(historyLog || []).length} total
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-indigo-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </div>
                  </div>
                </div>

                {/* Filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="relative sm:w-48">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                      <option value="all">All Actions</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="status_change">Status Change</option>
                    </select>
                  </div>
                  
                  {/* Date Filter */}
                  <div className="relative sm:w-48">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      type="date"
                      value={historyDate}
                      onChange={(e) => setHistoryDate(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    {historyDate && (
                      <button
                        onClick={() => setHistoryDate('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear date"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {historyLoading ? (
                    <div className="p-6 sm:p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm sm:text-base text-gray-600">Loading history...</p>
                    </div>
                  ) : filteredHistoryLog.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-500">No history found</p>
                      <p className="text-xs sm:text-sm text-gray-400">SuperAdmin actions will appear here</p>
                    </div>
                  ) : (
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                      {filteredHistoryLog.map((activity) => (
                        <div
                          key={activity.id}
                          className="p-3 sm:p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-2 sm:space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.actionType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                  {activity.adminName || 'Super Admin'}
                                </p>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                  <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {activity.actionType || 'action'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimestamp(activity.timestamp)}
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                {activity.action || 'Performed an action'}
                              </p>
                              {activity.details && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {activity.details}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'archived' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center justify-center p-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-md transition-all duration-300 hover:shadow-md"
                      title="Go back to Dashboard"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center">
                      <Archive className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600 mr-2 sm:mr-3" />
                      <div>
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Archived Admins</h2>
                        <p className="text-xs sm:text-sm text-gray-600">View and restore archived admin accounts</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-white/50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-indigo-700">
                      {(archivedAdmins || []).length} archived
                    </div>
                  </div>
                </div>

                {/* Filter Dropdown for Archived */}
                <div className="mb-4 sm:mb-6">
                  <div className="relative sm:w-64">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white cursor-pointer"
                    >
                      <option value="all">All Admins</option>
                      <option value="agricultural_admin">Agricultural Personnel</option>
                      <option value="impound_admin">Impound Personnel</option>
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {archivedLoading ? (
                    <div className="p-6 sm:p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-sm sm:text-base text-gray-600">Loading archived admins...</p>
                    </div>
                  ) : filteredArchivedAdmins.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <Archive className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-500">No archived admins</p>
                      <p className="text-xs sm:text-sm text-gray-400">Archived admins will appear here</p>
                    </div>
                  ) : (
                    <AdminList
                      admins={filteredArchivedAdmins}
                      onToggleStatus={handleToggleStatus}
                      onEdit={handleOpenEditPassword}
                      onDelete={handleArchiveAdmin}
                      onRestore={handleRestoreAdmin}
                      isArchiveView={true}
                      lastLogoutTimes={lastLogoutTimes}
                      offlineAdmins={offlineAdmins}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showCreateModal && (
        <CreateAdminModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAdmin}
        />
      )}

      {showEditPasswordModal && editingAdmin && (
        <EditPasswordModal
          admin={editingAdmin}
          onClose={() => { setShowEditPasswordModal(false); setEditingAdmin(null); }}
          onSubmit={(newPassword) => handleUpdatePassword(editingAdmin.id, newPassword)}
        />
      )}

      {/* Admin Filter Modal */}
      {showAdminFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">Select Admin to Track</h2>
              </div>
              <button
                onClick={() => {
                  setShowAdminFilterModal(false);
                  setAdminSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search admins by name or email..."
                  value={adminSearchTerm}
                  onChange={(e) => setAdminSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Admin List */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* All Admins Option */}
              <button
                onClick={() => {
                  setActivityAdminFilter('all');
                  setShowAdminFilterModal(false);
                  setAdminSearchTerm('');
                }}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  activityAdminFilter === 'all'
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">All Admins</p>
                    <p className="text-xs text-gray-500">Track all admin activities</p>
                  </div>
                  {activityAdminFilter === 'all' && (
                    <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>

              {/* Filtered Admin List */}
              {uniqueAdmins
                .filter(admin => {
                  const searchLower = adminSearchTerm.toLowerCase();
                  return (
                    admin.name.toLowerCase().includes(searchLower) ||
                    admin.email.toLowerCase().includes(searchLower) ||
                    (admin.role && admin.role.toLowerCase().includes(searchLower))
                  );
                })
                .map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => {
                      setActivityAdminFilter(admin.id);
                      setShowAdminFilterModal(false);
                      setAdminSearchTerm('');
                    }}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                      activityAdminFilter === admin.id
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{admin.name}</p>
                        <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                        {admin.role && (
                          <p className="text-xs text-indigo-600 mt-1">
                            {admin.role === 'agricultural_admin' ? 'Agricultural Personnel' : 'Impound Personnel'}
                          </p>
                        )}
                      </div>
                      {activityAdminFilter === admin.id && (
                        <div className="ml-3 flex-shrink-0 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}

              {/* No Results */}
              {uniqueAdmins.filter(admin => {
                const searchLower = adminSearchTerm.toLowerCase();
                return (
                  admin.name.toLowerCase().includes(searchLower) ||
                  admin.email.toLowerCase().includes(searchLower) ||
                  (admin.role && admin.role.toLowerCase().includes(searchLower))
                );
              }).length === 0 && adminSearchTerm && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No admins found</p>
                  <p className="text-xs text-gray-400">Try a different search term</p>
                </div>
              )}

              {/* Empty State */}
              {uniqueAdmins.length === 0 && !adminSearchTerm && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No admins available</p>
                  <p className="text-xs text-gray-400">Admin activities will appear here</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAdminFilterModal(false);
                  setAdminSearchTerm('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard; 