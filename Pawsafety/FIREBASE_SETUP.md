# Firebase Setup Guide for PawSafety

## Prerequisites
1. A Google account
2. Access to the Firebase Console

## Steps to Set Up Firebase

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `pawsafety` (or your preferred name)
4. Follow the setup steps

### 2. Enable Authentication
1. In your Firebase project, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### 3. Create a Web App
1. In your project overview, click the web icon `</>`
2. Register your app with nickname: `PawSafety`
3. Copy the Firebase configuration object

### 4. Update Configuration
Replace the configuration in `services/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 5. Optional: Set Up Firestore
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location

## Testing
After setup, you can:
1. Run the app with `npm start`
2. Test sign up functionality
3. Test login functionality
4. Verify logout works correctly

## Security Notes
- Never commit your actual Firebase configuration to public repositories
- Use environment variables for production apps
- Set up proper Firestore security rules before production 