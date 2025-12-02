import 'react-native-gesture-handler';
import React, { useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProfileImageProvider } from './contexts/ProfileImageContext';
import { TabBarVisibilityProvider } from './contexts/TabBarVisibilityContext';
import { MessageProvider } from './contexts/MessageContext';
import ErrorBoundary from './components/ErrorBoundary';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Inner component to check for initialization errors
const AppContent = () => {
  // Check if Firebase initialization failed
  if (global.firebaseInitError) {
    throw global.firebaseInitError;
  }

  const onLayoutRootView = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
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
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
