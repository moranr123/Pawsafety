const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
// Expo push notifications for mobile app
const fetch = require('node-fetch');
async function sendExpoPush(to, title, body, data = {}) {
  if (!to) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, title, body, data })
    });
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
    const tokenDoc = await admin.firestore().collection('user_push_tokens').doc(userId).get();
    const token = tokenDoc.exists ? tokenDoc.data().expoPushToken : null;
    if (!token) return;
    const title = 'Adoption Application Update';
    const body = `Your application for ${after.petName || after.petBreed || 'a pet'} was ${after.status}.`;
    await sendExpoPush(token, title, body, { type: 'application_status', status: after.status, appId: event.params.appId });
  } catch (e) {
    console.error('onApplicationUpdated error', e);
  }
});

// Trigger: notify all users when a new pet is posted (basic broadcast via topic collection)
exports.onAdoptablePetCreated = onDocumentCreated({ region: 'us-central1', document: 'adoptable_pets/{petId}' }, async (event) => {
  try {
    const data = event.data?.data();
    if (!data) return;
    // Fetch all user tokens (for demo scale; for production, consider topics/subscriptions)
    const snapshot = await admin.firestore().collection('user_push_tokens').get();
    const title = 'New Pet for Adoption';
    const body = `${data.petName || data.breed || 'A pet'} is now available for adoption!`;
    const pushes = [];
    snapshot.forEach((docSnap) => {
      const token = docSnap.data()?.expoPushToken;
      if (token) pushes.push(sendExpoPush(token, title, body, { type: 'new_pet', petId: event.params.petId }));
    });
    await Promise.all(pushes);
  } catch (e) {
    console.error('onAdoptablePetCreated error', e);
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