# PawSafety 🐾

A comprehensive pet safety and management mobile application built with React Native and Expo, featuring real-time reporting, pet registration, adoption services, and administrative dashboards.

## 📱 Features

### Mobile App (React Native/Expo)
- **Pet Registration**: Register pets with QR codes for identification
- **Lost & Found Reports**: Report lost pets or found strays with location tracking
- **Stray Reports**: Report stray animals with photos and location
- **Adoption Services**: Browse and apply for pet adoptions
- **Social Features**: Add friends, send messages, and share posts
- **Real-time Notifications**: Push notifications for reports and messages
- **Location Services**: Google Maps integration for location-based features
- **Dark/Light Theme**: Customizable theme support

### Super Admin Dashboard (React Web)
- **Admin Management**: Create and manage agricultural and impound personnel
- **Report Management**: View and manage all stray, lost, and incident reports
- **Adoption Management**: Process adoption applications
- **User Management**: Ban/unban users, view user reports
- **Analytics Dashboard**: View statistics and insights

## 🏗️ Project Structure

```
CAPSTONE_PAWSAFETY/
├── Pawsafety/                 # React Native mobile app
│   ├── assets/                # Images and static assets
│   ├── components/            # Reusable React components
│   ├── contexts/              # React Context providers
│   ├── navigation/            # Navigation configuration
│   ├── screens/               # App screens
│   ├── services/              # Firebase and API services
│   ├── utils/                 # Utility functions
│   ├── app.config.js          # Expo configuration
│   └── package.json
│
├── superadmin-dashboard/       # React web dashboard
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # Auth context
│   │   └── firebase/          # Firebase configuration
│   ├── functions/             # Firebase Cloud Functions
│   └── package.json
│
└── README.md
```

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g expo-cli`)
- **EAS CLI** (`npm install -g eas-cli`) - for building
- **Firebase account** - for backend services
- **Google Maps API key** - for location features

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd CAPSTONE_PAWSAFETY
```

### 2. Install dependencies

#### Mobile App
```bash
cd Pawsafety
npm install
```

#### Super Admin Dashboard
```bash
cd superadmin-dashboard
npm install
```

#### Firebase Functions
```bash
cd superadmin-dashboard/functions
npm install
```

## ⚙️ Environment Variables Setup

### Mobile App (Pawsafety)

1. Copy the example environment file:
```bash
cd Pawsafety
cp env.example .env
```

2. Edit `.env` and add your Firebase and Google Maps credentials:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Maps API Key
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Note**: Never commit your `.env` file to version control. It's already in `.gitignore`.

### Super Admin Dashboard

Create a `.env` file in `superadmin-dashboard/`:

```env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Setting up EAS Environment Variables (for builds)

For production builds, set up environment variables in EAS:

```bash
cd Pawsafety
# Run the setup script
bash create-all-eas-env.sh
```

Or manually:
```bash
eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_key
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value your_key
# ... repeat for other variables
```

## 🏃 Running the Project

### Mobile App (Development)

```bash
cd Pawsafety
npm start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your device

### Super Admin Dashboard

```bash
cd superadmin-dashboard
npm start
```

The dashboard will open at `http://localhost:3000`

### Firebase Functions

```bash
cd superadmin-dashboard/functions
npm run serve
```

## 📦 Building for Production

### Mobile App

#### Android
```bash
cd Pawsafety
npm run build:android
```

#### iOS
```bash
cd Pawsafety
npm run build:ios
```

#### Preview Build (APK)
```bash
cd Pawsafety
npm run build:preview
```

### Super Admin Dashboard

```bash
cd superadmin-dashboard
npm run build
```

The production build will be in the `build/` directory.

## 🛠️ Technologies Used

### Mobile App
- **React Native** - Mobile framework
- **Expo** - Development platform
- **Firebase** - Backend (Firestore, Authentication, Storage, Cloud Functions)
- **React Navigation** - Navigation library
- **React Native Maps** - Maps integration
- **Expo Notifications** - Push notifications
- **React Native QR Code** - QR code generation

### Super Admin Dashboard
- **React** - UI library
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **Firebase** - Backend services
- **React Hot Toast** - Notifications
- **Lucide React** - Icons

### Backend
- **Firebase Firestore** - Database
- **Firebase Authentication** - User authentication
- **Firebase Storage** - File storage
- **Firebase Cloud Functions** - Serverless functions
- **Expo Push Notifications** - Push notification service

## 📝 Available Scripts

### Mobile App (Pawsafety)
- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run on web
- `npm run build:android` - Build Android production app
- `npm run build:ios` - Build iOS production app
- `npm run build:preview` - Build Android preview APK

### Super Admin Dashboard
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## 🔐 Security Notes

- **Never commit API keys or secrets** to version control
- All sensitive data is stored in environment variables
- `.env` files are excluded via `.gitignore`
- Use EAS secrets for production builds
- Restrict API keys in Google Cloud Console

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Authors

- **moranr123** - Initial work

## 🙏 Acknowledgments

- Firebase for backend services
- Expo for the development platform
- React Native community

---

**Note**: Make sure to set up your Firebase project and configure all environment variables before running the application.

