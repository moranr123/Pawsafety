import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import LoadingScreen from '../screens/LoadingScreen';
import { createUserDocument, getUserDocument } from '../services/userService';
import TabNavigator from './TabNavigator';
import RegisterPetScreen from '../screens/RegisterPetScreen';
import StrayReportScreen from '../screens/StrayReportScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import EditReportScreen from '../screens/EditReportScreen';
import MyPetsScreen from '../screens/MyPetsScreen';
import SettingsScreen from '../screens/tabs/SettingsScreen';
import PetCareGuideScreen from '../screens/PetCareGuideScreen';

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
        name="Settings" 
        component={SettingsScreen}
      />
      <MainStack.Screen 
        name="PetCareGuide" 
        component={PetCareGuideScreen}
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
      } else {
        // User doesn't exist in Firestore but is verified, create user record
        console.log('Creating user record for verified user:', authUser.uid);
        const created = await createUserDocument(authUser);
        if (!created) {
          console.error('Failed to create user document');
        }
      }
      
      return authUser;
    } catch (error) {
      console.error('Error checking/creating user status:', error);
      return authUser; // Allow login if there's an error checking status
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const validUser = await checkUserStatus(authUser);
        setUser(validUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe; // Cleanup subscription on unmount
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 