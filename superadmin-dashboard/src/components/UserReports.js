import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AlertCircle, CheckCircle, Trash2, UserX, MessageSquare, Image as ImageIcon, FileText, Flag, X, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const UserReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banDuration, setBanDuration] = useState('');
  const [reportToBan, setReportToBan] = useState(null);
  const [filter, setFilter] = useState('pending'); // pending, resolved, dismissed

  useEffect(() => {
    // Fetch both post_reports and message_reports
    const unsubPost = onSnapshot(query(collection(db, 'post_reports'), orderBy('reportedAt', 'desc')), (snapshot) => {
      const postReports = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        type: 'post', 
        reportedAt: doc.data().reportedAt,
        ...doc.data() 
      }));
      
      // Fetch message reports inside to combine
      // Note: In a real app with many reports, separate listeners or pagination would be better
      // But here we combine them client-side for simplicity
      const unsubMessage = onSnapshot(query(collection(db, 'message_reports'), orderBy('createdAt', 'desc')), (msgSnapshot) => {
        const messageReports = msgSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          type: 'message', 
          reportedAt: doc.data().createdAt, 
          ...doc.data() 
        }));
        
        // Merge and sort
        const allReports = [...postReports, ...messageReports].sort((a, b) => 
          (b.reportedAt?.toMillis() || 0) - (a.reportedAt?.toMillis() || 0)
        );
        setReports(allReports);
        setLoading(false);
      });
      
      return () => unsubMessage();
    });

    return () => unsubPost && unsubPost();
  }, []);

  const handleAction = async (report, action, onSuccess) => {
    if (action === 'ban_user') {
      setReportToBan(report);
      setBanModalOpen(true);
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action.replace('_', ' ')} this report?`)) return;

    try {
      const reportCollection = report.type === 'post' ? 'post_reports' : 'message_reports';
      const reportRef = doc(db, reportCollection, report.id);
      
      if (action === 'resolve') {
        await updateDoc(reportRef, { status: 'resolved', resolvedAt: serverTimestamp() });
        toast.success('Report marked as resolved');
      } else if (action === 'dismiss') {
        await updateDoc(reportRef, { status: 'dismissed', dismissedAt: serverTimestamp() });
        toast.success('Report dismissed');
      } else if (action === 'delete_content') {
        // Delete the actual content
        if (report.type === 'post' && report.postId) {
          await deleteDoc(doc(db, 'posts', report.postId));
        } else if (report.type === 'message' && report.messageId) {
          const messageCollection = report.chatType === 'report' ? 'report_messages' : 'direct_messages';
          await deleteDoc(doc(db, messageCollection, report.messageId));
        }
        await updateDoc(reportRef, { status: 'resolved', resolution: 'content_deleted', resolvedAt: serverTimestamp() });
        toast.success('Content deleted and report resolved');
      } else if (action === 'ban_user') {
        // Ban user logic
        const userIdToBan = report.reportedUser || report.postOwnerId;
        if (userIdToBan) {
          await updateDoc(doc(db, 'users', userIdToBan), { 
            status: 'banned', 
            bannedAt: serverTimestamp(),
            bannedBy: 'admin'
          });
          await updateDoc(reportRef, { status: 'resolved', resolution: 'user_banned', resolvedAt: serverTimestamp() });
          toast.success('User banned and report resolved');
        } else {
          toast.error('Could not find user to ban');
        }
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error taking action:', error);
      toast.error('Failed to take action');
    }
  };

  const confirmBan = async () => {
    if (!banDuration || isNaN(banDuration) || parseInt(banDuration) <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    const days = parseInt(banDuration);
    const report = reportToBan;
    
    try {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + days);
      
      const reportRef = doc(db, report.type === 'post' ? 'post_reports' : 'message_reports', report.id);
      const userIdToBan = report.reportedUser || report.postOwnerId;
      
      if (userIdToBan) {
        await updateDoc(doc(db, 'users', userIdToBan), { 
          status: 'banned', 
          bannedAt: serverTimestamp(),
          bannedBy: 'admin',
          banDuration: days,
          banExpiresAt: Timestamp.fromDate(expiry)
        });
        
        await updateDoc(reportRef, { 
           status: 'resolved', 
           resolution: 'user_banned', 
           resolvedAt: serverTimestamp(),
           banDuration: days
        });
        
        toast.success(`User banned for ${days} days`);
        setBanModalOpen(false);
        setReportToBan(null);
        setBanDuration('');
        
        if (selectedReport && selectedReport.id === report.id) setSelectedReport(null);
      } else {
        toast.error('Could not find user to ban');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const filteredReports = reports.filter(r => filter === 'all' || (r.status || 'pending') === filter);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading reports...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Flag className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-gray-800">User Reports</h2>
        </div>
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {['pending', 'resolved', 'dismissed', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                filter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 text-gray-700 font-semibold uppercase border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Reason</th>
              <th className="px-6 py-4">Reported User</th>
              <th className="px-6 py-4">Content</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedReport(report)}>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.type === 'post' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {report.type === 'post' ? <FileText className="w-3 h-3 mr-1.5" /> : <MessageSquare className="w-3 h-3 mr-1.5" />}
                    {report.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-red-600 bg-red-50 px-2 py-1 rounded">{report.reason}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{report.reportedUserName || report.postOwnerName || 'Unknown'}</span>
                    <span className="text-xs text-gray-500 font-mono">{report.reportedUser || report.postOwnerId}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="truncate font-medium text-gray-800">
                      {report.messageText || report.postContent || (report.postImages?.length ? 'Image Post' : 'No text content')}
                    </div>
                    {(report.messageImages?.length > 0 || report.postImages?.length > 0) && (
                      <div className="flex items-center mt-1 text-xs text-blue-600">
                        <ImageIcon className="w-3 h-3 mr-1" />
                        Has images
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                  {report.reportedAt?.toDate().toLocaleDateString()}
                  <div className="text-xs">{report.reportedAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    report.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    report.status === 'resolved' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status || 'pending'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 justify-end">
                    {(!report.status || report.status === 'pending') && (
                      <>
                        <button onClick={() => handleAction(report, 'resolve')} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Mark Resolved">
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleAction(report, 'delete_content')} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Content & Resolve">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleAction(report, 'ban_user')} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition-colors" title="Ban User & Resolve">
                          <UserX className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleAction(report, 'dismiss')} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors" title="Dismiss">
                          <AlertCircle className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredReports.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <Flag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p>No {filter !== 'all' ? filter : ''} reports found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Report Details</h3>
                <p className="text-sm text-gray-500">ID: {selectedReport.id}</p>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto">
              <div className={`p-4 rounded-lg border ${
                selectedReport.status === 'resolved' ? 'bg-green-50 border-green-200 text-green-800' :
                selectedReport.status === 'dismissed' ? 'bg-gray-50 border-gray-200 text-gray-800' :
                'bg-yellow-50 border-yellow-200 text-yellow-800'
              } flex items-center gap-3`}>
                {selectedReport.status === 'resolved' ? <CheckCircle className="w-5 h-5" /> :
                 selectedReport.status === 'dismissed' ? <AlertCircle className="w-5 h-5" /> :
                 <Flag className="w-5 h-5" />}
                <div>
                  <p className="font-semibold capitalize">Status: {selectedReport.status || 'Pending'}</p>
                  {selectedReport.resolution && <p className="text-sm opacity-90">Resolution: {selectedReport.resolution}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Report Type</label>
                    <div className="mt-1 flex items-center gap-2 text-gray-900 font-medium capitalize">
                      {selectedReport.type === 'post' ? <FileText className="w-4 h-4 text-blue-600" /> : <MessageSquare className="w-4 h-4 text-purple-600" />}
                      {selectedReport.type}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</label>
                    <p className="mt-1 text-red-600 font-medium">{selectedReport.reason}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</label>
                    <p className="mt-1 text-gray-900">{selectedReport.reportedAt?.toDate().toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                   <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reported User</label>
                    <div className="mt-1">
                      <p className="font-medium text-gray-900">{selectedReport.reportedUserName || selectedReport.postOwnerName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 font-mono">{selectedReport.reportedUser || selectedReport.postOwnerId}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reporter</label>
                    <div className="mt-1">
                      <p className="font-medium text-gray-900">{selectedReport.reporterName || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 font-mono">{selectedReport.reporterId}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Reported Content</label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                  {(selectedReport.messageText || selectedReport.postContent) && (
                    <div className="p-4 border-b border-gray-200 last:border-0">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {selectedReport.messageText || selectedReport.postContent}
                      </p>
                    </div>
                  )}
                  
                  {(selectedReport.messageImages?.length > 0 || selectedReport.postImages?.length > 0) && (
                    <div className="p-4 grid grid-cols-2 gap-2">
                      {(selectedReport.messageImages || selectedReport.postImages).map((img, idx) => (
                        <div key={idx} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                          <img src={img} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                   
                   {!(selectedReport.messageText || selectedReport.postContent || selectedReport.messageImages?.length || selectedReport.postImages?.length) && (
                     <div className="p-8 text-center text-gray-400 italic">No content available to display</div>
                   )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
               {(!selectedReport.status || selectedReport.status === 'pending') ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(selectedReport, 'dismiss', () => setSelectedReport(null)); }} className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">Dismiss</button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(selectedReport, 'ban_user', () => setSelectedReport(null)); }} className="px-4 py-2 bg-orange-100 text-orange-700 font-medium hover:bg-orange-200 rounded-lg transition-colors">Ban User</button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(selectedReport, 'delete_content', () => setSelectedReport(null)); }} className="px-4 py-2 bg-red-100 text-red-700 font-medium hover:bg-red-200 rounded-lg transition-colors">Delete Content</button>
                    <button onClick={(e) => { e.stopPropagation(); handleAction(selectedReport, 'resolve', () => setSelectedReport(null)); }} className="px-4 py-2 bg-green-600 text-white font-medium hover:bg-green-700 rounded-lg transition-colors shadow-sm">Mark Resolved</button>
                  </>
               ) : (
                  <button onClick={() => setSelectedReport(null)} className="px-4 py-2 bg-gray-900 text-white font-medium hover:bg-gray-800 rounded-lg transition-colors">Close</button>
               )}
            </div>
          </div>
        </div>
      )}

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
                  setReportToBan(null);
                  setBanDuration('');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                className="px-4 py-2 bg-orange-600 text-white font-medium hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserReports;
