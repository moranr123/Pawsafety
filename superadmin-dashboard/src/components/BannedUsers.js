import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, getDocs, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserX, UserCheck, Clock, Calendar, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BannedUsers = () => {
  const [bannedUsers, setBannedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Fetch all banned users
    const q = query(collection(db, 'users'), where('status', '==', 'banned'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => {
        const userData = doc.data();
        return {
          id: doc.id,
          displayName: userData.name || userData.displayName || 'Unknown User',
          email: userData.email || 'No email',
          ...userData
        };
      });
      setBannedUsers(users);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching banned users:', error);
      toast.error('Failed to load banned users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUnban = async (user) => {
    if (!window.confirm(`Are you sure you want to lift the ban for ${user.displayName || user.email || 'this user'}?`)) return;

    try {
      const userId = user.id;
      
      // Get user document to restore archived data
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const archivedData = userData.archivedProfileData || {};
      
      // Restore user status and profile data
      await updateDoc(doc(db, 'users', userId), { 
        status: 'active', 
        bannedAt: null,
        bannedBy: null,
        banDuration: null,
        banExpiresAt: null,
        // Restore archived profile data
        displayName: archivedData.displayName || userData.displayName || userData.name || null,
        name: archivedData.displayName || userData.displayName || userData.name || null,
        profileImage: archivedData.profileImage || null,
        isProfileVisible: true,
        archivedProfileData: null // Clear archived data
      });
      
      // Unhide user's content
      const batch = writeBatch(db);
      
      // Unhide posts
      const postsQuery = query(collection(db, 'posts'), where('userId', '==', userId));
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: false });
      });
      
      // Unhide pets
      const petsQuery = query(collection(db, 'pets'), where('userId', '==', userId));
      const petsSnapshot = await getDocs(petsQuery);
      petsSnapshot.forEach(doc => {
        batch.update(doc.ref, { isHidden: false });
      });
      
      await batch.commit();
      
      toast.success('Ban lifted successfully');
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to lift ban');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const isBanExpired = (banExpiresAt) => {
    if (!banExpiresAt) return false;
    try {
      const expiryDate = banExpiresAt.toDate ? banExpiresAt.toDate() : new Date(banExpiresAt);
      return expiryDate < new Date();
    } catch (error) {
      return false;
    }
  };

  const getDaysRemaining = (banExpiresAt) => {
    if (!banExpiresAt) return null;
    try {
      const expiryDate = banExpiresAt.toDate ? banExpiresAt.toDate() : new Date(banExpiresAt);
      const now = new Date();
      const diffTime = expiryDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return bannedUsers;
    
    const searchLower = searchTerm.toLowerCase();
    return bannedUsers.filter(user => 
      (user.displayName && user.displayName.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.id && user.id.toLowerCase().includes(searchLower))
    );
  }, [bannedUsers, searchTerm]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">Loading banned users...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <UserX className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-800">Banned Users</h2>
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {bannedUsers.length} {bannedUsers.length === 1 ? 'user' : 'users'}
            </span>
          </div>
          <div className="flex-1 sm:flex-none sm:w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-semibold uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Ban Duration</th>
              <th className="px-6 py-4">Banned At</th>
              <th className="px-6 py-4">Expires At</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.map((user) => {
              const expired = isBanExpired(user.banExpiresAt);
              const daysRemaining = getDaysRemaining(user.banExpiresAt);
              
              return (
                <tr 
                  key={user.id} 
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">
                        {user.displayName || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{user.email || 'No email'}</span>
                      <span className="text-xs text-gray-400 font-mono mt-1">{user.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.banDuration ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {user.banDuration} {user.banDuration === 1 ? 'day' : 'days'}
                      </span>
                    ) : (
                      <span className="text-gray-400">Permanent</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {user.bannedAt ? formatDate(user.bannedAt) : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {user.banExpiresAt ? (
                      <div className="flex flex-col">
                        <span className={expired ? 'text-green-600 font-medium' : 'text-gray-700'}>
                          {formatDate(user.banExpiresAt)}
                        </span>
                        {!expired && daysRemaining !== null && (
                          <span className="text-xs text-gray-500 mt-1">
                            {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expires today'}
                          </span>
                        )}
                        {expired && (
                          <span className="text-xs text-green-600 font-medium mt-1">
                            Expired
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Permanent</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {expired ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <UserX className="w-3 h-3 mr-1" />
                        Active Ban
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleUnban(user)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      title="Lift Ban"
                    >
                      <UserCheck className="w-4 h-4 mr-1.5" />
                      Lift Ban
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  <UserX className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p>
                    {searchTerm 
                      ? 'No banned users match your search criteria' 
                      : 'No banned users found'}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Banned User Details</h3>
                <div className="mt-1">
                  <span className="font-medium text-gray-900">
                    {selectedUser.displayName || 'Unknown User'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Info */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">User Information</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Display Name</label>
                    <p className="text-gray-900 font-medium">{selectedUser.displayName || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedUser.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">User ID</label>
                    <p className="text-gray-900 text-xs font-mono break-all">{selectedUser.id}</p>
                  </div>
                </div>
              </div>

              {/* Ban Details */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase mb-3">Ban Details</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Ban Duration</label>
                    <p className="text-gray-900">
                      {selectedUser.banDuration 
                        ? `${selectedUser.banDuration} ${selectedUser.banDuration === 1 ? 'day' : 'days'}`
                        : 'Permanent Ban'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Banned At</label>
                    <p className="text-gray-900">
                      {selectedUser.bannedAt ? formatDate(selectedUser.bannedAt) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Banned By</label>
                    <p className="text-gray-900">{selectedUser.bannedBy || 'Admin'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Expires At</label>
                    <p className="text-gray-900">
                      {selectedUser.banExpiresAt 
                        ? formatDate(selectedUser.banExpiresAt)
                        : 'Permanent (No expiration)'}
                    </p>
                    {selectedUser.banExpiresAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        {isBanExpired(selectedUser.banExpiresAt) 
                          ? 'This ban has expired'
                          : `${getDaysRemaining(selectedUser.banExpiresAt)} days remaining`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleUnban(selectedUser);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Lift Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BannedUsers;

