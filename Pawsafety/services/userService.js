import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Creates a user document in Firestore for a verified user
 * @param {Object} authUser - Firebase Auth user object
 * @returns {Promise<boolean>} - Success status
 */
export const createUserDocument = async (authUser) => {
  if (!authUser) {
    console.error('No auth user provided to createUserDocument');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', authUser.uid);
    
    // Check if user already exists
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log('User document already exists:', authUser.uid);
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
    console.log('User document created successfully:', authUser.uid);
    return true;

  } catch (error) {
    console.error('Error creating user document:', error);
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
    console.error('No UID provided to getUserDocument');
    return null;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      console.log('No user document found for UID:', uid);
      return null;
    }
  } catch (error) {
    console.error('Error getting user document:', error);
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
    console.error('No UID provided to updateUserDocument');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    console.log('User document updated successfully:', uid);
    return true;
  } catch (error) {
    console.error('Error updating user document:', error);
    return false;
  }
};
