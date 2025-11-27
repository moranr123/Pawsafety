import React from 'react';
import { Edit, UserCheck, UserX, Archive, ArchiveRestore, AlertTriangle } from 'lucide-react';

const AdminList = ({ admins, onToggleStatus, onEdit, onDelete, onRestore, isArchiveView = false, lastLogoutTimes = {}, offlineAdmins = [] }) => {
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'agricultural_admin':
        return 'Agricultural Personnel Admin';
      case 'impound_admin':
        return 'Impound Personnel Admin';
      default:
        return role;
    }
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <UserCheck className="h-3 w-3 mr-1" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <UserX className="h-3 w-3 mr-1" />
        Inactive
      </span>
    );
  };

  const isOffline = (adminId) => {
    return offlineAdmins.some(admin => admin.id === adminId);
  };

  if (admins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <UserX className="h-12 w-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No admins</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new admin account.
        </p>
      </div>
    );
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <div className="block md:hidden space-y-3">
        {admins.map((admin) => (
          <div key={admin.id} className={`bg-white border rounded-lg shadow-sm p-4 space-y-3 ${isOffline(admin.id) ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {admin.name}
                  </h3>
                  {isOffline(admin.id) && (
                    <AlertTriangle className="h-4 w-4 text-orange-600 ml-2 flex-shrink-0" title="Offline for almost 24 hours" />
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate mt-0.5">{admin.email}</p>
              </div>
              <div className="ml-2">
                <div className="flex flex-col items-end space-y-1">
                  {isOffline(admin.id) ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Needs Attention
                    </span>
                  ) : (
                    getStatusBadge(admin.status)
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Role:</span>
                <span className="text-gray-900">{getRoleDisplay(admin.role)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Last Logged In:</span>
                <span className="text-gray-900">{formatTimestamp(lastLogoutTimes[admin.id])}</span>
              </div>
            </div>

            {!isArchiveView && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => onEdit(admin)}
                className="flex-1 min-w-[80px] flex items-center justify-center px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </button>
              <button
                onClick={() => onToggleStatus(admin.id, admin.status)}
                className={`flex-1 min-w-[80px] flex items-center justify-center px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  admin.status === 'active'
                    ? 'text-red-600 bg-red-50 hover:bg-red-100'
                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                }`}
              >
                {admin.status === 'active' ? (
                  <>
                    <UserX className="h-3 w-3 mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="h-3 w-3 mr-1" />
                    Activate
                  </>
                )}
              </button>
              <button
                onClick={() => onDelete(admin)}
                  className="flex-1 min-w-[80px] flex items-center justify-center px-3 py-2 text-xs font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
              >
                  <Archive className="h-3 w-3 mr-1" />
                  Archive
              </button>
            </div>
            )}
            {isArchiveView && (
              <div className="pt-2 border-t border-gray-100">
                {onRestore ? (
                  <button
                    onClick={() => onRestore(admin)}
                    className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                  >
                    <ArchiveRestore className="h-3 w-3 mr-1" />
                    Restore
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 italic">
                    Archived
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Last Logged In
              </th>
              <th
                scope="col"
                className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {admins.map((admin) => (
              <tr key={admin.id} className={`hover:bg-gray-50 ${isOffline(admin.id) ? 'bg-orange-50' : ''}`}>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {admin.name}
                    </div>
                    {isOffline(admin.id) && (
                      <AlertTriangle className="h-4 w-4 text-orange-600 ml-2" title="Offline for almost 24 hours" />
                    )}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{admin.email}</div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {getRoleDisplay(admin.role)}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {isOffline(admin.id) ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title="Offline for almost 24 hours">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Needs Attention
                      </span>
                    ) : (
                      getStatusBadge(admin.status)
                    )}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatTimestamp(lastLogoutTimes[admin.id])}
                  </div>
                </td>
                <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {!isArchiveView ? (
                  <div className="flex justify-end space-x-2 lg:space-x-3">
                    <button
                      onClick={() => onEdit(admin)}
                      className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        title="Edit admin"
                    >
                      <Edit className="h-4 w-4 lg:mr-1" />
                      <span className="hidden lg:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => onToggleStatus(admin.id, admin.status)}
                      className={`flex items-center ${
                        admin.status === 'active'
                          ? 'text-red-600 hover:text-red-900'
                          : 'text-green-600 hover:text-green-900'
                      }`}
                      title={`${admin.status === 'active' ? 'Deactivate' : 'Activate'} this admin account`}
                    >
                      {admin.status === 'active' ? (
                        <>
                          <UserX className="h-4 w-4 lg:mr-1" />
                          <span className="hidden lg:inline">Deactivate</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 lg:mr-1" />
                          <span className="hidden lg:inline">Activate</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => onDelete(admin)}
                        className="text-orange-600 hover:text-orange-900 flex items-center"
                        title="Archive admin"
                    >
                        <Archive className="h-4 w-4 lg:mr-1" />
                        <span className="hidden lg:inline">Archive</span>
                    </button>
                  </div>
                  ) : (
                    <div className="flex justify-end">
                      {onRestore ? (
                        <button
                          onClick={() => onRestore(admin)}
                          className="text-green-600 hover:text-green-900 flex items-center"
                          title="Restore admin"
                        >
                          <ArchiveRestore className="h-4 w-4 lg:mr-1" />
                          <span className="hidden lg:inline">Restore</span>
                        </button>
                      ) : (
                        <div className="text-gray-500 italic text-xs">
                          Archived
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default AdminList; 