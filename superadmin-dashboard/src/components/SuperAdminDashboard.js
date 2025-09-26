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

const SuperAdminDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);


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

      toast.success(`Admin ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
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
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
           <p className="mt-4 text-gray-600">Loading dashboard...</p>
         </div>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 shadow-lg flex flex-col">
        <div className="p-6">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-white mr-3" />
            <h1 className="text-xl font-bold text-white">
              Super Admin
            </h1>
          </div>
        </div>
        
        <div className="flex-1 px-6 pb-6">
          <div className="space-y-2">
            <div className="text-sm text-gray-300 mb-4">
              Dashboard Overview
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white border-opacity-20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto py-6 px-6">
         {/* Stats Cards */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-gradient-to-br from-blue-50 to-cyan-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
             <div className="p-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="flex-shrink-0">
                     <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center">
                       <Users className="h-6 w-6 text-white" />
                     </div>
                   </div>
                   <div className="ml-4">
                     <p className="text-sm font-medium text-blue-600">Total Admins</p>
                     <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                 </div>
               </div>
             </div>
           </div>

           <div className="bg-gradient-to-br from-green-50 to-emerald-100 border border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
             <div className="p-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="flex-shrink-0">
                     <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                       <UserCheck className="h-6 w-6 text-white" />
                     </div>
                   </div>
                   <div className="ml-4">
                     <p className="text-sm font-medium text-green-600">Active Admins</p>
                     <p className="text-2xl font-bold text-gray-900">
                       {admins.filter(admin => admin.status === 'active').length}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                 </div>
               </div>
             </div>
           </div>

           <div className="bg-gradient-to-br from-orange-50 to-red-100 border border-orange-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105">
             <div className="p-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <div className="flex-shrink-0">
                     <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                       <UserX className="h-6 w-6 text-white" />
                     </div>
                   </div>
                   <div className="ml-4">
                     <p className="text-sm font-medium text-orange-600">Inactive Admins</p>
                     <p className="text-2xl font-bold text-gray-900">
                       {admins.filter(admin => admin.status === 'inactive').length}
                     </p>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                 </div>
               </div>
             </div>
           </div>
         </div>

        {/* Admin Management Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                Admin Management
              </h2>
               <button
                 onClick={() => setShowCreateModal(true)}
                 className="flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
               >
                <Plus className="h-4 w-4 mr-2" />
                Create Admin
              </button>
            </div>

            <AdminList
              admins={admins}
              onToggleStatus={handleToggleStatus}
              onEdit={handleOpenEditPassword}
              onDelete={handleDeleteAdmin}
            />
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