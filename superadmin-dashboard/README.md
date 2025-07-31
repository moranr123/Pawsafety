# Superadmin Dashboard

A comprehensive web dashboard for superadmin management built with React, Firebase, and Tailwind CSS.

## Features

### 🔐 Authentication
- **Superadmin Login**: Secure login using email and password
- **Role-based Access**: Only superadmins can access the dashboard
- **Account Status Check**: Prevents deactivated accounts from logging in

### 🧑‍💼 Admin Management
- **Create New Admins**: Add Agricultural Personnel Admin and Impound Personnel Admin
- **Input Fields**: Name, email, password, and role selection
- **Firebase Integration**: Stores user data in Firestore with proper structure
- **Real-time Updates**: Changes reflect immediately across all users

### 🔁 Account Management
- **Activate/Deactivate**: Toggle admin account status
- **Status Control**: Inactive admins cannot log in
- **Real-time Status**: Updates reflect immediately in the UI

### 📋 Admin List View
- **Comprehensive Table**: Display all admins with key information
- **Real-time Data**: Live updates from Firestore
- **Action Buttons**: Edit and Activate/Deactivate functionality
- **Status Indicators**: Clear visual status badges

## Tech Stack

- **Frontend**: React 18
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Routing**: React Router DOM

## Setup Instructions

### 1. Firebase Configuration

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Update the Firebase config in `src/firebase/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 2. Firestore Security Rules

Set up Firestore security rules to protect your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superadmin');
    }
  }
}
```

### 3. Create Superadmin Account

1. Create a superadmin user in Firebase Authentication
2. Add the user to Firestore with the following structure:

```javascript
{
  uid: "user-uid",
  name: "Superadmin Name",
  email: "superadmin@example.com",
  role: "superadmin",
  status: "active",
  createdAt: timestamp
}
```

### 4. Install Dependencies

```bash
cd superadmin-dashboard
npm install
```

### 5. Start Development Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
superadmin-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── AdminList.js
│   │   ├── CreateAdminModal.js
│   │   └── PrivateRoute.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── firebase/
│   │   └── config.js
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Features in Detail

### Authentication Flow
1. User enters email and password
2. Firebase Authentication validates credentials
3. System checks user role in Firestore
4. Only superadmins are allowed access
5. System checks account status (active/inactive)
6. User is redirected to dashboard or shown error

### Admin Creation Process
1. Superadmin fills out admin creation form
2. System creates Firebase Authentication account
3. User data is stored in Firestore with proper structure
4. Admin can immediately log in (if active)

### Real-time Updates
- All admin data updates in real-time using Firestore listeners
- Status changes reflect immediately across all users
- No page refresh required for updates

### Security Features
- Role-based access control
- Account status validation
- Secure password handling
- Protected routes

## Usage

### Login
1. Navigate to the login page
2. Enter superadmin credentials
3. Access the dashboard

### Create Admin
1. Click "Create Admin" button
2. Fill out the form with admin details
3. Select role (Agricultural or Impound Personnel)
4. Submit to create the account

### Manage Admins
1. View all admins in the table
2. Click "Activate" or "Deactivate" to change status
3. Click "Edit" to modify admin details (future feature)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License. 