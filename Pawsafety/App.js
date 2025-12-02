import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProfileImageProvider } from './contexts/ProfileImageContext';
import { TabBarVisibilityProvider } from './contexts/TabBarVisibilityContext';
import { MessageProvider } from './contexts/MessageContext';
import ErrorBoundary from './components/ErrorBoundary';
// NotificationService is initialized in AppNavigator when user logs in

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <ProfileImageProvider>
            <TabBarVisibilityProvider>
              <MessageProvider>
                <AppNavigator />
              </MessageProvider>
            </TabBarVisibilityProvider>
          </ProfileImageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
