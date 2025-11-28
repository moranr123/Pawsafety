import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const ProfileImageContext = createContext();

export const useProfileImage = () => {
  const context = useContext(ProfileImageContext);
  if (!context) {
    throw new Error('useProfileImage must be used within a ProfileImageProvider');
  }
  return context;
};

export const ProfileImageProvider = ({ children }) => {
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize load function to prevent recreation
  const loadProfileImage = useCallback(async (userId) => {
    if (!userId) {
      setProfileImage(null);
      setIsLoading(false);
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileImage(userData.profileImage || null);
      }
    } catch (error) {
      // Error handled silently - set to null on error
      setProfileImage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Memoize update function
  const updateProfileImage = useCallback(async (imageUrl) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      await setDoc(doc(db, 'users', user.uid), {
        profileImage: imageUrl,
        updatedAt: new Date()
      }, { merge: true });

      setProfileImage(imageUrl);
    } catch (error) {
      throw error;
    }
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      loadProfileImage(user.uid);
    } else {
      setProfileImage(null);
      setIsLoading(false);
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadProfileImage(user.uid);
      } else {
        setProfileImage(null);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [loadProfileImage]);

  // Memoize context value to prevent re-renders
  const value = useMemo(() => ({
    profileImage,
    updateProfileImage,
    isLoading
  }), [profileImage, updateProfileImage, isLoading]);

  return (
    <ProfileImageContext.Provider value={value}>
      {children}
    </ProfileImageContext.Provider>
  );
};
