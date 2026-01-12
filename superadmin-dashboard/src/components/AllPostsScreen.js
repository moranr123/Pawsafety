import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, getDoc, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FileText, User, Clock, Trash2, Eye, EyeOff, Search, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const AllPostsScreen = ({ currentUser, logActivity }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [postToRemove, setPostToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const POSTS_PER_PAGE = 20;

  // Fetch all posts from Firestore with pagination
  const loadPosts = async (page = 1, reset = false) => {
    if (loadingMore && !reset) return;
    
    try {
      if (reset) {
        setLoading(true);
        setCurrentPage(1);
        lastDocRef.current = null;
      } else {
        setLoadingMore(true);
      }

      let postsQuery;
      if (reset || page === 1) {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          limit(POSTS_PER_PAGE)
        );
      } else {
        if (!lastDocRef.current) {
          // Need to get to the right page
          const skip = (page - 1) * POSTS_PER_PAGE;
          const tempQuery = query(
            collection(db, 'posts'),
            orderBy('createdAt', 'desc'),
            limit(skip)
          );
          const tempSnapshot = await getDocs(tempQuery);
          if (tempSnapshot.empty) {
            setLoadingMore(false);
            setLoading(false);
            return;
          }
          lastDocRef.current = tempSnapshot.docs[tempSnapshot.docs.length - 1];
        }
        
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDocRef.current),
          limit(POSTS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(postsQuery);
      
      if (snapshot.empty) {
        setLoadingMore(false);
        setLoading(false);
        return;
      }

      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      if (reset || page === 1) {
        setPosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }

      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      
      // Estimate total pages (we'll update this as we load more)
      if (snapshot.docs.length === POSTS_PER_PAGE) {
        setTotalPages(prev => Math.max(prev, page + 1));
      } else {
        setTotalPages(page);
      }

      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadPosts(1, true);
  }, []);

  // Fetch user profiles for posts
  useEffect(() => {
    if (posts.length === 0) return;

    const fetchUserProfiles = async () => {
      const userIds = new Set();
      posts.forEach(post => {
        if (post.userId) userIds.add(post.userId);
      });

      const profiles = {};
      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              profiles[userId] = {
                name: userData.displayName || userData.name || 'Unknown',
                email: userData.email || '',
                profileImage: userData.profileImage || null,
                status: userData.status || 'active',
              };
            }
          } catch (error) {
            console.error(`Error fetching user ${userId}:`, error);
          }
        })
      );

      setUserProfiles(profiles);
    };

    fetchUserProfiles();
  }, [posts]);

  // Filter posts based on search term
  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;

    const searchLower = searchTerm.toLowerCase();
    return posts.filter(post => {
      const userName = userProfiles[post.userId]?.name || post.userName || '';
      const postText = post.text || '';
      const userEmail = userProfiles[post.userId]?.email || post.userEmail || '';
      
      return (
        userName.toLowerCase().includes(searchLower) ||
        postText.toLowerCase().includes(searchLower) ||
        userEmail.toLowerCase().includes(searchLower)
      );
    });
  }, [posts, searchTerm, userProfiles]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleRemovePost = (post) => {
    setPostToRemove(post);
    setRemoveModalOpen(true);
  };

  const confirmRemovePost = async () => {
    if (!removeReason.trim()) {
      toast.error('Please provide a reason for removing this post');
      return;
    }

    const post = postToRemove;
    const reasonText = removeReason.trim();
    
    try {
      setIsRemoving(true);
      const postRef = doc(db, 'posts', post.id);
      
      // Mark post as deleted instead of deleting it
      await updateDoc(postRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: 'admin',
        deletionReason: reasonText
      });

      // Log admin activity
      if (logActivity) {
        await logActivity(
          `Removed post by ${userProfiles[post.userId]?.name || post.userName || 'Unknown'}`,
          'post_removed',
          `Post ID: ${post.id}, Reason: ${reasonText}`
        );
      }

      toast.success('Post removed successfully');
      setRemoveModalOpen(false);
      setPostToRemove(null);
      setRemoveReason('');
      if (selectedPost && selectedPost.id === post.id) {
        setSelectedPost(null);
        setShowPostModal(false);
      }
    } catch (error) {
      console.error('Error removing post:', error);
      toast.error('Failed to remove post');
    } finally {
      setIsRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">All User Posts</h2>
          </div>
          <div className="text-sm text-gray-600">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user name, email, or post content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Pagination Controls - Only show when not searching */}
      {!searchTerm && posts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {currentPage} {totalPages > 1 && `of ${totalPages}`} • Showing {posts.length} posts
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    loadPosts(currentPage - 1, true);
                  }
                }}
                disabled={currentPage === 1 || loading}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <button
                onClick={() => {
                  if (currentPage < totalPages || posts.length === POSTS_PER_PAGE) {
                    loadPosts(currentPage + 1, false);
                  }
                }}
                disabled={loadingMore || (posts.length < POSTS_PER_PAGE && currentPage >= totalPages)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading posts...</p>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {!loading && filteredPosts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium mb-2">
            {searchTerm ? 'No posts found matching your search' : 'No posts found'}
          </p>
          <p className="text-gray-500 text-sm">
            {searchTerm ? 'Try adjusting your search terms' : 'Posts will appear here when users create them'}
          </p>
        </div>
      ) : !loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPosts.map((post) => {
            const userProfile = userProfiles[post.userId] || {};
            const isDeleted = post.deleted === true;
            const isHidden = post.isHidden === true;

            return (
              <div
                key={post.id}
                className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-md cursor-pointer ${
                  isDeleted ? 'border-red-300 bg-red-50' : isHidden ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                }`}
                onClick={() => {
                  setSelectedPost(post);
                  setShowPostModal(true);
                }}
              >
                {/* Post Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-start gap-3">
                    {userProfile.profileImage ? (
                      <img
                        src={userProfile.profileImage}
                        alt={userProfile.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {userProfile.name || post.userName || 'Unknown User'}
                        </span>
                        {isDeleted && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            Deleted
                          </span>
                        )}
                        {isHidden && !isDeleted && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                            Hidden
                          </span>
                        )}
                        {userProfile.status === 'banned' && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            Banned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4">
                  {post.text && (
                    <p className="text-gray-800 mb-3 line-clamp-3 break-words">{post.text}</p>
                  )}
                  {post.images && post.images.length > 0 && (
                    <div className="relative">
                      <img
                        src={post.images[0]}
                        alt="Post"
                        className="w-full h-48 object-cover rounded border border-gray-200"
                      />
                      {post.images.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                          +{post.images.length - 1} more
                        </div>
                      )}
                    </div>
                  )}
                  {post.deletionReason && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                      <strong>Deletion Reason:</strong> {post.deletionReason}
                    </div>
                  )}
                </div>

                {/* Post Footer */}
                <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{post.likes?.length || 0} likes</span>
                    <span>{post.shares || 0} shares</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePost(post);
                    }}
                    className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Load more indicator */}
      {loadingMore && (
        <div className="mt-4 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading more posts...</span>
        </div>
      )}

      {/* Post Detail Modal */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Post Details</h3>
                <div className="mt-1 text-sm text-gray-500">
                  Posted by {userProfiles[selectedPost.userId]?.name || selectedPost.userName || 'Unknown User'}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setSelectedPost(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Post Content */}
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                {userProfiles[selectedPost.userId]?.profileImage ? (
                  <img
                    src={userProfiles[selectedPost.userId].profileImage}
                    alt={userProfiles[selectedPost.userId].name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900">
                      {userProfiles[selectedPost.userId]?.name || selectedPost.userName || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{formatTime(selectedPost.createdAt)}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {userProfiles[selectedPost.userId]?.email || selectedPost.userEmail || 'No email'}
                  </div>
                  {selectedPost.deleted && (
                    <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <strong>This post has been deleted</strong>
                      </div>
                      {selectedPost.deletionReason && (
                        <div className="mt-1">
                          <strong>Reason:</strong> {selectedPost.deletionReason}
                        </div>
                      )}
                      {selectedPost.deletedAt && (
                        <div className="mt-1 text-xs">
                          Deleted on: {selectedPost.deletedAt.toDate ? selectedPost.deletedAt.toDate().toLocaleString() : 'N/A'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {selectedPost.text && (
                <p className="text-gray-800 mb-4 whitespace-pre-wrap break-words">{selectedPost.text}</p>
              )}

              {selectedPost.images && selectedPost.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {selectedPost.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Post ${idx + 1}`}
                      className="w-full h-48 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                      onClick={() => window.open(img, '_blank')}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-600 pt-4 border-t border-gray-200">
                <span>{selectedPost.likes?.length || 0} likes</span>
                <span>{selectedPost.shares || 0} shares</span>
                <span>Post ID: {selectedPost.id}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-end gap-3">
              <button
                onClick={() => {
                  setShowPostModal(false);
                  setSelectedPost(null);
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPostModal(false);
                  handleRemovePost(selectedPost);
                }}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Post Modal */}
      {removeModalOpen && postToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <Trash2 className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900">Remove Post</h3>
            </div>

            <p className="text-gray-600 mb-6">
              This action will mark the post as deleted. Please provide a reason for removal.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all resize-none"
                placeholder="Enter the reason for removing this post..."
                rows="3"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setRemoveModalOpen(false);
                  setPostToRemove(null);
                  setRemoveReason('');
                }}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemovePost}
                disabled={isRemoving}
                className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRemoving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  'Confirm Removal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPostsScreen;
