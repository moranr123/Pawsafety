import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

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
      // Don't throw error to prevent login/logout failures
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user exists in Firestore and get their role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User not found in database');
      }
      
      const userData = userDoc.data();
      
      // Check if user is active
      if (userData.status !== 'active') {
        await signOut(auth);
        throw new Error('Account is deactivated. Please contact the administrator.');
      }
      
      setUserRole(userData.role);
      
      // Log login activity (only for agricultural and impound admins, not superadmin)
      if (userData.role !== 'superadmin') {
        await logActivity(
          user.uid,
          userData.displayName || userData.name || 'Unknown Admin',
          user.email,
          'Logged into the system',
          'login',
          `Logged in as ${userData.role}`
        );
      }
      
      // Redirect based on role
      switch (userData.role) {
        case 'superadmin':
          navigate('/superadmin-dashboard');
          break;
        case 'agricultural_admin':
          navigate('/agricultural-dashboard');
          break;
        case 'impound_admin':
          navigate('/impound-dashboard');
          break;
        default:
          throw new Error('Invalid user role');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Log logout activity before signing out (only for agricultural and impound admins, not superadmin)
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Only log logout for agricultural and impound admins
          if (userData.role !== 'superadmin') {
            await logActivity(
              currentUser.uid,
              userData.displayName || userData.name || 'Unknown Admin',
              currentUser.email,
              'Logged out of the system',
              'logout',
              `Logged out from ${userData.role} dashboard`
            );
          }
        }
      }
      
      await signOut(auth);
      setCurrentUser(null);
      setUserRole(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser(user);
            setUserRole(userData.role);
                  } else {
          // User doesn't exist in Firestore, sign them out
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
        }
        } catch (error) {
          console.error('Error fetching user data:', error);
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 