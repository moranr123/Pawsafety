import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Alert } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';
import NotificationService from '../services/NotificationService';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import EmailVerificationScreen from '../screens/EmailVerificationScreen';
import LoadingScreen from '../screens/LoadingScreen';
import { createUserDocument, getUserDocument } from '../services/userService';
import TabNavigator from './TabNavigator';
import RegisterPetScreen from '../screens/RegisterPetScreen';
import StrayReportScreen from '../screens/StrayReportScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import EditReportScreen from '../screens/EditReportScreen';
import MyPetsScreen from '../screens/MyPetsScreen';
import ArchivedPetsScreen from '../screens/ArchivedPetsScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';
import PetCareGuideScreen from '../screens/PetCareGuideScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import FriendsListScreen from '../screens/FriendsListScreen';
import AddFriendsScreen from '../screens/AddFriendsScreen';
import FriendRequestsScreen from '../screens/FriendRequestsScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';

const Stack = createStackNavigator();
const MainStack = createStackNavigator();

// Main app stack with tabs and additional screens
const MainStackNavigator = () => {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.background },
      }}
    >
      <MainStack.Screen 
        name="Tabs" 
        component={TabNavigator}
      />
      <MainStack.Screen 
        name="RegisterPet" 
        component={RegisterPetScreen}
      />
      <MainStack.Screen 
        name="StrayReport" 
        component={StrayReportScreen}
      />
      <MainStack.Screen 
        name="MyReports" 
        component={MyReportsScreen}
      />
      <MainStack.Screen 
        name="EditReport" 
        component={EditReportScreen}
      />
      <MainStack.Screen 
        name="MyPets" 
        component={MyPetsScreen}
      />
      <MainStack.Screen 
        name="ArchivedPets" 
        component={ArchivedPetsScreen}
      />
      <MainStack.Screen 
        name="Settings" 
        component={SettingsScreen}
      />
      <MainStack.Screen 
        name="Profile" 
        component={ProfileScreen}
      />
      <MainStack.Screen 
        name="PetCareGuide" 
        component={PetCareGuideScreen}
      />
      <MainStack.Screen 
        name="CreatePost" 
        component={CreatePostScreen}
      />
      <MainStack.Screen 
        name="FriendsList" 
        component={FriendsListScreen}
      />
      <MainStack.Screen 
        name="AddFriends" 
        component={AddFriendsScreen}
      />
      <MainStack.Screen 
        name="FriendRequests" 
        component={FriendRequestsScreen}
      />
      <MainStack.Screen 
        name="BlockedUsers" 
        component={BlockedUsersScreen}
      />
    </MainStack.Navigator>
  );
};

const AppNavigator = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check user status in database and create user record if needed
  const checkUserStatus = async (authUser) => {
    if (!authUser) return null;
    
    // First check if email is verified
    if (!authUser.emailVerified) {
      // User email is not verified, sign them out
      await signOut(auth);
      return null;
    }
    
    try {
      const userDocRef = doc(db, 'users', authUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.status === 'deactivated') {
          // User is deactivated, sign them out
          await signOut(auth);
          Alert.alert(
            'Account Deactivated',
            'Your account has been deactivated by an administrator. Please contact support for assistance.',
            [{ text: 'OK' }]
          );
          return null;
        }
        
        if (userData.status === 'banned') {
          // User is banned, sign them out
          await signOut(auth);
          let message = 'Your account has been banned.';
          if (userData.banExpiresAt) {
            const expiryDate = userData.banExpiresAt.toDate();
            message += `\n\nBan expires on: ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`;
          }
          Alert.alert('Account Banned', message, [{ text: 'OK' }]);
          return null;
        }
      } else {
        // User doesn't exist in Firestore but is verified, create user record
        await createUserDocument(authUser);
      }
      
      return authUser;
    } catch (error) {
      // Error handled - allow login to proceed
      return authUser; // Allow login if there's an error checking status
    }
  };

  useEffect(() => {
    const notificationService = NotificationService.getInstance();
    let notificationUnsubscribe = null;
    let userStatusUnsubscribe = null;

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      // Cleanup previous user listener if any
      if (userStatusUnsubscribe) {
        userStatusUnsubscribe();
        userStatusUnsubscribe = null;
      }

      if (authUser) {
        const validUser = await checkUserStatus(authUser);
        setUser(validUser);
        
        // Initialize push notifications when user logs in
        if (validUser) {
          // Setup real-time user status listener
          const userDocRef = doc(db, 'users', validUser.uid);
          userStatusUnsubscribe = onSnapshot(userDocRef, async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              if (userData.status === 'banned' || userData.status === 'deactivated') {
                await signOut(auth);
                
                let title = userData.status === 'banned' ? 'Account Banned' : 'Account Deactivated';
                let message = userData.status === 'banned' 
                  ? 'Your account has been banned.' 
                  : 'Your account has been deactivated by an administrator.';
                  
                if (userData.status === 'banned' && userData.banExpiresAt) {
                   const expiryDate = userData.banExpiresAt.toDate();
                   message += `\n\nBan expires on: ${expiryDate.toLocaleDateString()} at ${expiryDate.toLocaleTimeString()}`;
                }
                
                Alert.alert(title, message, [{ text: 'OK' }]);
              }
            }
          });

          // Load user-specific push notification preference
          await notificationService.loadPushNotificationPreference(validUser.uid);
          
          const token = await notificationService.initializePushNotifications(validUser.uid);
          
          // Set up notification listeners
          notificationUnsubscribe = notificationService.setupNotificationListeners(
            validUser.uid,
            (newNotification) => {
              // Notification will be shown automatically via sendLocalNotification
            }
          );
        }
      } else {
        setUser(null);
        // Cleanup notification listeners on logout
        if (notificationUnsubscribe) {
          notificationUnsubscribe();
          notificationUnsubscribe = null;
        }
        if (userStatusUnsubscribe) {
          userStatusUnsubscribe();
          userStatusUnsubscribe = null;
        }
        notificationService.cleanup();
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
      }
      if (userStatusUnsubscribe) {
        userStatusUnsubscribe();
      }
      notificationService.cleanup();
    };
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: COLORS.background },
        }}
      >
        {user ? (
          // User is authenticated - show main app with bottom tabs
          <Stack.Screen 
            name="MainApp" 
            component={MainStackNavigator}
            options={{
              headerShown: false,
            }}
          />
        ) : (
          // User is not authenticated - show auth screens
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen}
            />
            <Stack.Screen 
              name="SignUp" 
              component={SignUpScreen}
            />
            <Stack.Screen 
              name="EmailVerification" 
              component={EmailVerificationScreen}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 