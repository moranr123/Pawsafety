import 'react-native-gesture-handler';
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProfileImageProvider } from './contexts/ProfileImageContext';
// NotificationService is initialized in AppNavigator when user logs in

export default function App() {
  return (
    <ThemeProvider>
      <ProfileImageProvider>
        <AppNavigator />
      </ProfileImageProvider>
    </ThemeProvider>
  );
}
