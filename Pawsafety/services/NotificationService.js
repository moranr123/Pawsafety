import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, collection, query, where, limit } from 'firebase/firestore';

// Global variable to track push notification preference
let globalPushNotificationsEnabled = true;

// Configure notification handler - checks preference dynamically
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // Check if push notifications are enabled
    if (!globalPushNotificationsEnabled) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

class NotificationService {
  static instance = null;
  expoPushToken = null;
  notificationListeners = [];
  pushNotificationsEnabled = true;

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
      // Load push notification preference on initialization
      NotificationService.instance.loadPushNotificationPreference();
    }
    return NotificationService.instance;
  }

  // Load push notification preference from AsyncStorage
  async loadPushNotificationPreference() {
    try {
      const savedPreference = await AsyncStorage.getItem('PUSH_NOTIFICATIONS_ENABLED');
      if (savedPreference !== null) {
        this.pushNotificationsEnabled = savedPreference === 'true';
        globalPushNotificationsEnabled = this.pushNotificationsEnabled;
      }
    } catch (error) {
      // Error handled silently - use default value
    }
  }

  // Set push notifications enabled/disabled
  setPushNotificationsEnabled(enabled) {
    this.pushNotificationsEnabled = enabled;
    globalPushNotificationsEnabled = enabled;
  }

  // Initialize push notifications
  async initializePushNotifications(userId) {
    try {
      if (!Device.isDevice) {
        // Push notifications require physical device
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: false,
          },
        });
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        // Permission not granted
        return null;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;

      // Save the token to Firestore (compatible with existing Cloud Functions)
      await this.saveTokenToFirestore(userId, token.data);

      // Configure notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token.data;
    } catch (error) {
      // Error handled silently - return null on failure
      return null;
    }
  }

  // Save push token to Firestore (compatible with existing Cloud Functions)
  async saveTokenToFirestore(userId, token) {
    try {
      // Save to user_push_tokens for Cloud Functions compatibility
      await setDoc(doc(db, 'user_push_tokens', userId), {
        expoPushToken: token,
        updatedAt: new Date().toISOString(),
        platform: Platform.OS,
        deviceId: Constants.deviceId || 'unknown',
      }, { merge: true });

      // Also save to userTokens for NotificationService compatibility
      await setDoc(doc(db, 'userTokens', userId), {
        pushToken: token,
        updatedAt: new Date().toISOString(),
        platform: Platform.OS,
        deviceId: Constants.deviceId || 'unknown',
      }, { merge: true });

      // Token saved successfully
    } catch (error) {
      // Error handled silently - token may be saved on retry
    }
  }

  // Send local notification
  async sendLocalNotification(title, body, data = {}) {
    // Check if push notifications are enabled before showing
    if (!this.pushNotificationsEnabled) {
      return;
    }
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  }

  // Set up real-time listeners for notifications
  setupNotificationListeners(userId, onNewNotification) {
    const notificationsRef = collection(db, 'notifications');
    // Query without orderBy first to avoid index requirements
    // If you need ordering, create a Firestore index for (userId, createdAt)
    const notificationQuery = query(
      notificationsRef,
      where('userId', '==', userId),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      notificationQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notificationData = {
              id: change.doc.id,
              ...change.doc.data()
            };

            if (!notificationData.read) {
              // Only show local notification if push notifications are enabled
              if (this.pushNotificationsEnabled) {
                this.sendLocalNotification(
                  notificationData.title,
                  notificationData.body,
                  notificationData.data
                );
              }

              // Always call onNewNotification to update UI (even if notifications are disabled)
              if (onNewNotification) {
                onNewNotification(notificationData);
              }
            }
          }
        });
      },
      (error) => {
        // Error handled silently - notifications will retry on next update
      }
    );

    this.notificationListeners.push(unsubscribe);
    return unsubscribe;
  }

  // Create a notification in Firestore
  async createNotification(notification) {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        ...notification,
        createdAt: new Date().toISOString(),
        read: false,
      });
      return notificationRef.id;
    } catch (error) {
      // Re-throw error for caller to handle
      throw error;
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    try {
      await setDoc(doc(db, 'notifications', notificationId), {
        read: true,
        readAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      // Error handled silently - operation may retry
    }
  }

  // Clean up all listeners
  cleanup() {
    this.notificationListeners.forEach(unsubscribe => unsubscribe());
    this.notificationListeners = [];
  }

  // Get push token
  getPushToken() {
    return this.expoPushToken;
  }
}

export default NotificationService;

