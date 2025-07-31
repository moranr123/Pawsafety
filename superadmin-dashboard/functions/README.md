# Cloud Functions Setup

This directory contains Firebase Cloud Functions for the Superadmin Dashboard.

## Setup Instructions

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase Functions** (if not already done):
   ```bash
   firebase init functions
   ```

4. **Install Dependencies**:
   ```bash
   cd functions
   npm install
   ```

5. **Update Project ID**:
   - Edit `.firebaserc` in the root directory
   - Replace `"your-project-id"` with your actual Firebase project ID

6. **Deploy Functions**:
   ```bash
   firebase deploy --only functions
   ```

## Functions

### createAdminUser
- **Purpose**: Creates new admin users in Firebase Authentication and Firestore
- **Authentication**: Requires superadmin role
- **Parameters**:
  - `name`: Admin's full name
  - `email`: Admin's email address
  - `password`: Admin's password
  - `role`: Either 'agricultural_admin' or 'impound_admin'

## Security
- Only authenticated superadmins can call this function
- Input validation ensures proper data format
- Users are created with 'active' status by default

## Testing
You can test the function locally using the Firebase emulator:
```bash
firebase emulators:start --only functions
``` 