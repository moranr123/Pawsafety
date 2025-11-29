import 'react-native-gesture-handler';
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProfileImageProvider } from './contexts/ProfileImageContext';
import { TabBarVisibilityProvider } from './contexts/TabBarVisibilityContext';
import { MessageProvider } from './contexts/MessageContext';
// NotificationService is initialized in AppNavigator when user logs in

export default function App() {
  return (
    <ThemeProvider>
      <ProfileImageProvider>
        <TabBarVisibilityProvider>
          <MessageProvider>
            <AppNavigator />
          </MessageProvider>
        </TabBarVisibilityProvider>
      </ProfileImageProvider>
    </ThemeProvider>
  );
}
