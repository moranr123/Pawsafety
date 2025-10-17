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
  AlertTriangle,
  Activity,
  Clock,
  Search,
  Filter,
  FileText
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
  const [adminActivities, setAdminActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityFilter, setActivityFilter] = useState('all');
  const [historyLog, setHistoryLog] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilter, setHistoryFilter] = useState('all');

  // Helper function to log admin activities
  const logActivity = async (adminId, adminName, adminEmail, action, actionType, details = '') => {
    try {
      await addDoc(collection(db, 'admin_activities'), {
        adminId,
        adminName,
        adminEmail,
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
    // Listen for real-time updates on admin users
    const q = query(collection(db, 'users'), where('role', 'in', ['agricultural_admin', 'impound_admin']));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adminList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdmins(adminList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch admin activities
  useEffect(() => {
    let unsubscribe;
    
    const fetchAdminActivities = async () => {
      try {
        setActivitiesLoading(true);
        
        // Fetch activities from admin_activities collection (excluding superadmin activities)
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
            
            // Filter to only show agricultural and impound admin login/logout activities
            const filteredActivities = allActivities.filter(activity => {
              const actionType = activity.actionType || '';
              const details = activity.details || '';
              const action = activity.action || '';
              
              // Only show login and logout activities for agricultural and impound admins
              // Exclude all SuperAdmin management actions (create, update, delete, status_change)
              return (actionType === 'login' || actionType === 'logout') &&
                     (details.includes('agricultural_admin') || details.includes('impound_admin') || 
                      action.includes('agricultural_admin') || action.includes('impound_admin')) &&
                     !details.includes('superadmin') && !action.includes('superadmin');
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

  // Fetch history log (SuperAdmin actions)
  useEffect(() => {
    let unsubscribe;
    
    const fetchHistoryLog = async () => {
      try {
        setHistoryLoading(true);
        
        // Fetch activities from admin_activities collection (only SuperAdmin actions)
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
            
            // Filter to only show SuperAdmin management actions (create, update, delete, status_change)
            const superAdminActions = allActivities.filter(activity => {
              const actionType = activity.actionType || '';
              return ['create', 'update', 'delete', 'status_change'].includes(actionType);
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

  const handleCreateAdmin = async (adminData) => {
    try {
      // Call the Cloud Function in the same region it is deployed (us-central1)
      const functions = getFunctions(undefined, 'us-central1');
      const createAdminUser = httpsCallable(functions, 'createAdminUser');
      
      // Send only serializable fields that the function expects
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
      
      // Log admin creation activity
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
      // Surface clearer Firebase Function errors when available
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
      
      // Log password update activity
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

  const handleDeleteAdmin = async (admin) => {
    const confirmed = window.confirm(`Delete admin ${admin.email}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      const functions = getFunctions(undefined, 'us-central1');
      const deleteAdminUser = httpsCallable(functions, 'deleteAdminUser');
      await deleteAdminUser({ uid: admin.id });
      toast.success('Admin deleted successfully');
      
      // Log admin deletion activity
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        'Deleted admin account',
        'delete',
        `Deleted admin account for ${admin.name} (${admin.email})`
      );
    } catch (error) {
      console.error('Error deleting admin:', error);
      let msg = 'Failed to delete admin';
      if (error?.code === 'functions/failed-precondition') msg = 'You cannot delete your own account';
      else if (error?.code === 'functions/permission-denied') msg = 'Not allowed to delete this account';
      else if (typeof error?.message === 'string') msg = error.message;
      toast.error(msg);
    }
  };

  const handleToggleStatus = async (adminId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const adminRef = doc(db, 'users', adminId);
      
      await updateDoc(adminRef, {
        status: newStatus
      });

      // Log status change activity
      await logActivity(
        currentUser.uid,
        currentUser.displayName || currentUser.email,
        currentUser.email,
        `${newStatus === 'active' ? 'Activated' : 'Deactivated'} admin account`,
        'status_change',
        `${newStatus === 'active' ? 'Activated' : 'Deactivated'} admin account for ${adminId}`
      );

      // Alert removed for activation/deactivation
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

  // Filter and search activities (only agricultural and impound admin activities)
  const filteredActivities = (adminActivities || []).filter(activity => {
    if (!activity) return false;
    
    const matchesSearch = activity.adminName?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                         activity.action?.toLowerCase().includes(activitySearchTerm.toLowerCase()) ||
                         activity.details?.toLowerCase().includes(activitySearchTerm.toLowerCase());
    
    const matchesFilter = activityFilter === 'all' || 
                         activity.actionType === activityFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Filter and search history log (SuperAdmin actions)
  const filteredHistoryLog = (historyLog || []).filter(activity => {
    if (!activity) return false;
    
    const matchesSearch = activity.adminName?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                         activity.action?.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                         activity.details?.toLowerCase().includes(historySearchTerm.toLowerCase());
    
    const matchesFilter = historyFilter === 'all' || 
                         activity.actionType === historyFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Get activity icon based on action type
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
      case 'status_change':
        return <Settings className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Format timestamp
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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

          {/* Nav */}
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

      {/* Mobile menu button */}
      <button
        onClick={() => {
          setSidebarOpen(!sidebarOpen);
          setSidebarHovered(false);
        }}
        className="fixed top-4 left-4 z-50 lg:hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Main Content */}
      <main className={`flex-1 py-6 px-6 transition-all duration-300 ${
        sidebarOpen || sidebarHovered ? 'lg:ml-80' : 'lg:ml-16'
      } pt-12`}>
        <div className="max-w-7xl mx-auto">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
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
                          <p className="text-sm font-medium text-blue-600">Total Admins</p>
                          <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
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
                            <UserCheck className="h-6 w-6 text-white" />
                           </div>
                         </div>
                         <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Active Admins</p>
                          <p className="text-2xl font-bold text-gray-900">
                             {admins.filter(admin => admin.status === 'active').length}
                           </p>
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
                            <UserX className="h-6 w-6 text-white" />
                           </div>
                         </div>
                         <div className="ml-4">
                          <p className="text-sm font-medium text-blue-600">Inactive Admins</p>
                          <p className="text-2xl font-bold text-gray-900">
                             {admins.filter(admin => admin.status === 'inactive').length}
                           </p>
                         </div>
                       </div>
                       <div className="text-right">
                        <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>

             {/* Admin Management Section */}
             <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200">
               <div className="px-4 py-5 sm:p-6">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                   <h2 className="text-lg font-medium text-gray-900">
                     Admin Management
                   </h2>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 w-full sm:w-auto justify-center"
                    >
                     <Plus className="h-4 w-4 mr-2" />
                     Create Admin
                   </button>
                 </div>

                 <div className="overflow-x-auto">
                   <AdminList
                     admins={admins}
                     onToggleStatus={handleToggleStatus}
                     onEdit={handleOpenEditPassword}
                     onDelete={handleDeleteAdmin}
                   />
                 </div>
               </div>
             </div>
            </>
          )}

          {/* Admin Activities Tab */}
          {activeTab === 'activities' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="flex items-center">
                    <Activity className="h-8 w-8 text-indigo-600 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Admin Activities</h2>
                      <p className="text-sm text-gray-600">Track agricultural and impound admin login/logout activities</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-white/50 px-3 py-1 rounded-full text-sm font-medium text-indigo-700">
                      {(adminActivities || []).length} total activities
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-indigo-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search activities..."
                      value={activitySearchTerm}
                      onChange={(e) => setActivitySearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Activities</option>
                      <option value="login">Login</option>
                      <option value="logout">Logout</option>
                    </select>
                  </div>
                </div>

                {/* Activities List */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {activitiesLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading activities...</p>
                    </div>
                  ) : filteredActivities.length === 0 ? (
                    <div className="p-8 text-center">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No activities found</p>
                      <p className="text-sm text-gray-400">Agricultural and impound admin activities will appear here</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {filteredActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.actionType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">
                                  {activity.adminName || 'Unknown Admin'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {activity.actionType || 'activity'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimestamp(activity.timestamp)}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
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

          {/* History Log Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg border border-indigo-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="flex items-center">
                    <FileText className="h-8 w-8 text-indigo-600 mr-3" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">History Log</h2>
                      <p className="text-sm text-gray-600">Track all SuperAdmin management actions</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="bg-white/50 px-3 py-1 rounded-full text-sm font-medium text-indigo-700">
                      {(historyLog || []).length} total actions
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-indigo-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Live</span>
                    </div>
                  </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search history..."
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="all">All Actions</option>
                      <option value="create">Create</option>
                      <option value="update">Update</option>
                      <option value="delete">Delete</option>
                      <option value="status_change">Status Change</option>
                    </select>
                  </div>
                </div>

                {/* History List */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {historyLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading history...</p>
                    </div>
                  ) : filteredHistoryLog.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No history found</p>
                      <p className="text-sm text-gray-400">SuperAdmin management actions will appear here</p>
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto">
                      {filteredHistoryLog.map((activity) => (
                        <div
                          key={activity.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.actionType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-900">
                                  {activity.adminName || 'Super Admin'}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {activity.actionType || 'action'}
                                  </span>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimestamp(activity.timestamp)}
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
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
        </div>
      </main>

      {/* Create Admin Modal */}
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
    </div>
  );
};

export default SuperAdminDashboard; 