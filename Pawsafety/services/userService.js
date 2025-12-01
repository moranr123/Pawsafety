import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates a user document in Firestore for a verified user
 * @param {Object} authUser - Firebase Auth user object
 * @returns {Promise<boolean>} - Success status
 */
export const createUserDocument = async (authUser) => {
  if (!authUser) {
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', authUser.uid);
    
    // Check if user already exists
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return true;
    }

    // Create new user document
    const userData = {
      uid: authUser.uid,
      name: authUser.displayName || 'User',
      email: authUser.email,
      role: 'user', // Default role for regular users
      status: 'active',
      emailVerified: authUser.emailVerified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userDocRef, userData);
    return true;

  } catch (error) {
    // Error handled silently - return false on failure
    return false;
  }
};

/**
 * Gets user data from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} - User data or null
 */
export const getUserDocument = async (uid) => {
  if (!uid) {
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      return null;
    }
  } catch (error) {
    // Error handled silently - return null on failure
    return null;
  }
};

/**
 * Updates user document in Firestore
 * @param {string} uid - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<boolean>} - Success status
 */
export const updateUserDocument = async (uid, updateData) => {
  if (!uid) {
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    // Error handled silently - return false on failure
    return false;
  }
};

/**
 * Logs user activity to user_activities collection
 * @param {string} userId - User ID
 * @param {string} action - Action description (e.g., "Logged out of the mobile app")
 * @param {string} actionType - Action type (e.g., "logout", "login")
 * @param {string} details - Additional details (optional)
 * @returns {Promise<boolean>} - Success status
 */
export const logUserActivity = async (userId, action, actionType, details = '') => {
  if (!userId) {
    return false;
  }

  try {
    await addDoc(collection(db, 'user_activities'), {
      userId,
      action,
      actionType,
      details,
      timestamp: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    // Error handled silently - return false on failure
    console.error('Error logging user activity:', error);
    return false;
  }
};
