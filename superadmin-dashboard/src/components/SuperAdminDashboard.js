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
  serverTimestamp 
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
  AlertTriangle
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
            {/* Dashboard Overview */}
            <div className="mb-2">
              {(sidebarOpen || sidebarHovered) ? (
                <div className="px-3 py-2 text-sm text-slate-300">
                  Dashboard Overview
                </div>
              ) : (
                <div className="w-full p-3 rounded-xl transition-all duration-300 text-slate-300 hover:text-white hover:bg-slate-700/50">
                  <Settings className="h-6 w-6 mx-auto" />
                </div>
              )}
            </div>
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