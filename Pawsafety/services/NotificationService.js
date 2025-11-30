import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { doc, setDoc, deleteDoc, getDoc, onSnapshot, collection, query, where, limit, serverTimestamp } from 'firebase/firestore';

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
  currentUserId = null;

  static getInstance() {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Load push notification preference from AsyncStorage for specific user
  async loadPushNotificationPreference(userId) {
    try {
      if (!userId) return;
      this.currentUserId = userId;
      // Use user-specific storage key
      const storageKey = `PUSH_NOTIFICATIONS_ENABLED_${userId}`;
      const savedPreference = await AsyncStorage.getItem(storageKey);
      if (savedPreference !== null) {
        this.pushNotificationsEnabled = savedPreference === 'true';
        globalPushNotificationsEnabled = this.pushNotificationsEnabled;
      } else {
        // Default to enabled if no preference is saved
        this.pushNotificationsEnabled = true;
        globalPushNotificationsEnabled = true;
      }
    } catch (error) {
      // Error handled silently - use default value
      this.pushNotificationsEnabled = true;
      globalPushNotificationsEnabled = true;
    }
  }

  // Set push notifications enabled/disabled for specific user
  setPushNotificationsEnabled(enabled, userId) {
    this.pushNotificationsEnabled = enabled;
    this.currentUserId = userId;
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

  // Send push notification via Expo
  async sendPushNotification(userId, title, body, data = {}) {
    try {
      if (!userId) return;
      
      // Get user's push token
      const tokenDoc = await getDoc(doc(db, 'user_push_tokens', userId));
      if (!tokenDoc.exists()) return;
      
      const tokenData = tokenDoc.data();
      const token = tokenData?.expoPushToken;
      
      if (!token) return;
      
      // Send push notification via Expo API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          to: token,
          sound: 'default',
          title: title,
          body: body,
          data: data,
          priority: 'high',
          channelId: 'default'
        }])
      });
      
      if (!response.ok) {
        console.error('Failed to send push notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      // Don't throw - push notification is optional
    }
  }

  // Create a notification in Firestore and send push notification
  async createNotification(notification) {
    try {
      const notificationRef = doc(collection(db, 'notifications'));
      await setDoc(notificationRef, {
        ...notification,
        createdAt: serverTimestamp(),
        read: false,
      });
      
      // Send push notification
      if (notification.userId) {
        await this.sendPushNotification(
          notification.userId,
          notification.title || 'New Notification',
          notification.body || '',
          notification.data || {}
        );
      }
      
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

  // Delete notification
  async deleteNotification(notificationId) {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
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

