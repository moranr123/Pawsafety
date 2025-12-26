const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
// Expo push notifications for mobile app
const fetch = require('node-fetch');
async function sendExpoPush(to, title, body, data = {}) {
  if (!to) {
    console.log('No push token provided');
    return;
  }
  try {
    const message = {
      to: to,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: 'default'
    };
    
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([message]) // Expo API expects an array
    });
    
    const result = await response.json();
    console.log('Expo push notification sent:', JSON.stringify(result));
    
    if (result.data && result.data[0] && result.data[0].status === 'error') {
      console.error('Expo push error:', result.data[0].message);
    }
  } catch (e) {
    console.error('Expo push error', e);
  }
}


exports.createAdminUser = onCall({ 
  maxInstances: 10,
  region: 'us-central1'
}, async (request) => {
  const { data, auth } = request;
  
  // Check if the request is authenticated
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Check if the user is a superadmin
  const callerUid = auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only superadmins can create admin users');
  }

  try {
    const { name, email, password, role } = data;

    // Validate input
    if (!name || !email || !password || !role) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    if (!['agricultural_admin', 'impound_admin'].includes(role)) {
      throw new HttpsError('invalid-argument', 'Invalid role');
    }

    // Create user in Firebase Authentication
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });
    } catch (err) {
      // Map Admin SDK errors to HttpsError for clearer client messages
      switch (err?.code) {
        case 'auth/email-already-exists':
          throw new HttpsError('already-exists', 'A user with this email already exists');
        case 'auth/invalid-password':
          throw new HttpsError('invalid-argument', 'Password is invalid or too weak');
        case 'auth/invalid-email':
          throw new HttpsError('invalid-argument', 'Email address is invalid');
        default:
          console.error('Unhandled createUser error:', err);
          throw new HttpsError('internal', 'Failed to create admin user');
      }
    }

    // Store user data in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name,
      email: email,
      role: role,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      uid: userRecord.uid,
      message: 'Admin user created successfully'
    };

  } catch (error) {
    // If already converted to HttpsError above, rethrow as-is
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error creating admin user:', error);
    throw new HttpsError('internal', 'Failed to create admin user');
  }
}); 

// Trigger: notify applicant when their application status changes
exports.onApplicationUpdated = onDocumentUpdated({ region: 'us-central1', document: 'adoption_applications/{appId}' }, async (event) => {
  try {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (!before || !after) return;
    if (before.status === after.status) return;
    const userId = after.userId;
    if (!userId) return;
    
    const title = 'Adoption Application Update';
    const body = `Your application for ${after.petName || after.petBreed || 'a pet'} was ${after.status}.`;
    const notificationData = { 
      type: 'app', 
      status: after.status, 
      appId: event.params.appId 
    };
    
    // Create notification in Firestore (for NotificationService to detect)
    await admin.firestore().collection('notifications').add({
      title,
      body,
      type: 'app',
      userId,
      read: false,
      data: notificationData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Also send direct push notification (for when app is closed)
    const tokenDoc = await admin.firestore().collection('user_push_tokens').doc(userId).get();
    const token = tokenDoc.exists ? tokenDoc.data().expoPushToken : null;
    if (token) {
      await sendExpoPush(token, title, body, notificationData);
    }
  } catch (e) {
    console.error('onApplicationUpdated error', e);
  }
});

// Trigger: notify all users when a new pet is posted (basic broadcast via topic collection)
exports.onAdoptablePetCreated = onDocumentCreated({ region: 'us-central1', document: 'adoptable_pets/{petId}' }, async (event) => {
  console.log('onAdoptablePetCreated triggered for petId:', event.params.petId);
  try {
    const data = event.data?.data();
    console.log('Pet data:', JSON.stringify(data));
    if (!data) {
      console.log('No data found in document');
      return;
    }
    
    // Only send notifications if pet is ready for adoption
    if (data.readyForAdoption === false) {
      console.log('Pet is not ready for adoption, skipping notification');
      return;
    }
    
    const title = 'New Pet for Adoption';
    const body = `${data.petName || data.breed || 'A pet'} is now available for adoption!`;
    const notificationData = { type: 'pet', petId: event.params.petId };
    
    // Fetch all user tokens (for demo scale; for production, consider topics/subscriptions)
    const snapshot = await admin.firestore().collection('user_push_tokens').get();
    console.log(`Found ${snapshot.size} user push tokens`);
    
    if (snapshot.empty) {
      console.log('No push tokens found in database');
      return;
    }
    
    // Create notifications in Firestore for each user (for NotificationService to detect)
    const notificationPromises = [];
    const pushPromises = [];
    
    snapshot.forEach((docSnap) => {
      const userId = docSnap.id;
      const token = docSnap.data()?.expoPushToken;
      
      // Create notification document in Firestore
      notificationPromises.push(
        admin.firestore().collection('notifications').add({
          title,
          body,
          type: 'pet',
          userId,
          read: false,
          data: notificationData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      );
      
      // Also send direct push notification (for when app is closed)
      if (token) {
        pushPromises.push(sendExpoPush(token, title, body, notificationData));
      }
    });
    
    // Create all notifications in Firestore
    await Promise.all(notificationPromises);
    console.log(`Created ${notificationPromises.length} notifications in Firestore`);
    
    // Send direct push notifications
    console.log(`Sending ${pushPromises.length} push notifications`);
    await Promise.all(pushPromises);
    console.log('All push notifications sent successfully');
  } catch (e) {
    console.error('onAdoptablePetCreated error:', e);
    console.error('Error stack:', e.stack);
  }
});

exports.updateAdminPassword = onCall({
  maxInstances: 10,
  region: 'us-central1'
}, async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only superadmins can update admin passwords');
  }

  const { uid, newPassword } = data || {};
  if (!uid || !newPassword) {
    throw new HttpsError('invalid-argument', 'Missing uid or newPassword');
  }

  // Prevent changing superadmin password via this route (optional safety)
  const targetDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!targetDoc.exists) {
    throw new HttpsError('not-found', 'Admin not found');
  }
  if (targetDoc.data().role === 'superadmin') {
    throw new HttpsError('permission-denied', 'Cannot change password for superadmin via this endpoint');
  }

  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    // Track modification metadata
    await admin.firestore().collection('users').doc(uid).update({
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
      modifiedBy: callerDoc.data().email || 'superadmin'
    });
    // Notify user if they have an Expo token saved
    const tokenDoc = await admin.firestore().collection('user_push_tokens').doc(uid).get();
    const token = tokenDoc.exists ? tokenDoc.data().expoPushToken : null;
    if (token) {
      await sendExpoPush(token, 'Account Update', 'Your admin account password has been updated.', { type: 'account_update' });
    }
    return { success: true, message: 'Password updated successfully' };
  } catch (err) {
    switch (err?.code) {
      case 'auth/user-not-found':
        throw new HttpsError('not-found', 'Admin user not found');
      case 'auth/invalid-password':
        throw new HttpsError('invalid-argument', 'Password is invalid or too weak');
      default:
        console.error('Unhandled updateUser error:', err);
        throw new HttpsError('internal', 'Failed to update password');
    }
  }
});

exports.deleteAdminUser = onCall({
  maxInstances: 10,
  region: 'us-central1'
}, async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const callerUid = auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
    throw new HttpsError('permission-denied', 'Only superadmins can delete admin users');
  }

  const { uid } = data || {};
  if (!uid) {
    throw new HttpsError('invalid-argument', 'Missing uid');
  }
  if (uid === callerUid) {
    throw new HttpsError('failed-precondition', 'You cannot delete your own account');
  }

  const targetRef = admin.firestore().collection('users').doc(uid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    throw new HttpsError('not-found', 'Admin not found');
  }
  if (targetDoc.data().role === 'superadmin') {
    throw new HttpsError('permission-denied', 'Cannot delete a superadmin');
  }

  try {
    await admin.auth().deleteUser(uid);
    await targetRef.delete();
    // Notify user of account deletion if push token exists
    const tokenDoc = await admin.firestore().collection('user_push_tokens').doc(uid).get();
    const token = tokenDoc.exists ? tokenDoc.data().expoPushToken : null;
    if (token) {
      await sendExpoPush(token, 'Account Update', 'Your admin account has been removed.', { type: 'account_removed' });
    }
    return { success: true, message: 'Admin deleted successfully' };
  } catch (err) {
    switch (err?.code) {
      case 'auth/user-not-found':
        // Ensure Firestore doc is removed if auth user is already missing
        await targetRef.delete();
        return { success: true, message: 'Admin record removed' };
      default:
        console.error('Unhandled deleteUser error:', err);
        throw new HttpsError('internal', 'Failed to delete admin user');
    }
  }
});

// Rate limiting configurations
const RATE_LIMIT_CONFIGS = {
  login_attempt: {
    maxAttempts: 5,
    windowMinutes: 15
  },
  signup_attempt: {
    maxAttempts: 3,
    windowMinutes: 60
  },
  email_verification_resend: {
    maxAttempts: 3,
    windowMinutes: 60
  }
};

/**
 * Check rate limit for authentication actions
 * This function is called from the client to verify if an action is allowed
 */
exports.checkRateLimit = onCall({
  maxInstances: 20,
  region: 'us-central1'
}, async (request) => {
  const { data } = request;
  const { action, identifier } = data || {};

  if (!action || !identifier) {
    throw new HttpsError('invalid-argument', 'Missing action or identifier');
  }

  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) {
    // Unknown action, allow it
    return {
      allowed: true,
      remainingAttempts: Infinity,
      resetTime: null,
      attemptCount: 0
    };
  }

  try {
    // Calculate window start time
    const windowStart = new Date();
    windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

    // Query recent attempts
    const attemptsRef = admin.firestore().collection('rate_limits');
    // Query by action and identifier, then filter by timestamp in memory
    // This avoids needing a composite index
    const snapshot = await attemptsRef
      .where('action', '==', action)
      .where('identifier', '==', identifier.toLowerCase())
      .get();
    
    // Filter by timestamp in memory and only count FAILED attempts (success = false)
    const windowStartTimestamp = admin.firestore.Timestamp.fromDate(windowStart);
    const validAttempts = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only count failed attempts (success === false or undefined)
      if (data.timestamp && data.timestamp >= windowStartTimestamp && data.success === false) {
        validAttempts.push(data);
      }
    });

    const attemptCount = validAttempts.length;
    const remainingAttempts = Math.max(0, config.maxAttempts - attemptCount);
    const allowed = attemptCount < config.maxAttempts;

    // Calculate reset time
    let resetTime = null;
    if (!allowed && validAttempts.length > 0) {
      const timestamps = validAttempts
        .map(attempt => attempt.timestamp ? attempt.timestamp.toDate() : null)
        .filter(t => t !== null);
      
      if (timestamps.length > 0) {
        const oldestAttempt = new Date(Math.min(...timestamps.map(t => t.getTime())));
        resetTime = new Date(oldestAttempt.getTime() + config.windowMinutes * 60 * 1000);
      }
    }

    return {
      allowed,
      remainingAttempts,
      resetTime: resetTime ? resetTime.toISOString() : null,
      attemptCount,
      maxAttempts: config.maxAttempts,
      windowMinutes: config.windowMinutes
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    // On error, allow the action (fail open)
    return {
      allowed: true,
      remainingAttempts: Infinity,
      resetTime: null,
      attemptCount: 0
    };
  }
});

/**
 * Record a rate limit attempt
 * This is called after an authentication attempt to track it
 */
exports.recordRateLimitAttempt = onCall({
  maxInstances: 20,
  region: 'us-central1'
}, async (request) => {
  const { data } = request;
  const { action, identifier, success = false } = data || {};

  if (!action || !identifier) {
    throw new HttpsError('invalid-argument', 'Missing action or identifier');
  }

  const config = RATE_LIMIT_CONFIGS[action];
  if (!config) {
    // Unknown action, don't record
    return { success: true };
  }

  try {
    await admin.firestore().collection('rate_limits').add({
      action,
      identifier: identifier.toLowerCase(),
      success,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error recording rate limit attempt:', error);
    // Don't throw - rate limiting shouldn't break the app
    return { success: false, error: error.message };
  }
});