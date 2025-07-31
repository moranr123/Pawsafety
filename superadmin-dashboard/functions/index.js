const { onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createAdminUser = onCall({ 
  maxInstances: 10,
  region: 'us-central1'
}, async (request) => {
  const { data, auth } = request;
  
  // Check if the request is authenticated
  if (!auth) {
    throw new Error('User must be authenticated');
  }

  // Check if the user is a superadmin
  const callerUid = auth.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  
  if (!callerDoc.exists || callerDoc.data().role !== 'superadmin') {
    throw new Error('Only superadmins can create admin users');
  }

  try {
    const { name, email, password, role } = data;

    // Validate input
    if (!name || !email || !password || !role) {
      throw new Error('Missing required fields');
    }

    if (!['agricultural_admin', 'impound_admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name
    });

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
    console.error('Error creating admin user:', error);
    throw new Error('Failed to create admin user');
  }
}); 