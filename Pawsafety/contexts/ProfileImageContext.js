import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // Load profile image from Firestore when user changes
  useEffect(() => {
    const loadProfileImage = async () => {
      if (auth.currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfileImage(userData.profileImage || null);
          }
        } catch (error) {
          console.error('Error loading profile image:', error);
        }
      } else {
        setProfileImage(null);
      }
      setIsLoading(false);
    };

    loadProfileImage();

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadProfileImage();
      } else {
        setProfileImage(null);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const updateProfileImage = async (imageUrl) => {
    if (!auth.currentUser) return;

    try {
      // Update Firestore
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        profileImage: imageUrl,
        updatedAt: new Date()
      }, { merge: true });

      // Update local state
      setProfileImage(imageUrl);
    } catch (error) {
      console.error('Error updating profile image:', error);
      throw error;
    }
  };

  const value = {
    profileImage,
    updateProfileImage,
    isLoading
  };

  return (
    <ProfileImageContext.Provider value={value}>
      {children}
    </ProfileImageContext.Provider>
  );
};
