import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import AppNavigator from './navigation/AppNavigator';
import { ThemeProvider } from './contexts/ThemeContext';
import * as Notifications from 'expo-notifications';
import { auth, db } from './services/firebase';
import { doc, setDoc } from 'firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const token = await Notifications.getExpoPushTokenAsync();
        const uid = auth.currentUser?.uid;
        if (uid && token?.data) {
          await setDoc(doc(db, 'user_push_tokens', uid), { expoPushToken: token.data }, { merge: true });
        }
      } catch (e) {}
    })();
  }, []);

  return (
    <ThemeProvider>
      <AppNavigator />
    </ThemeProvider>
  );
}
