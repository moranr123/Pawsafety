# 🐾 PAWSAFETY - Pet Safety Mobile App & Admin Dashboard

A comprehensive pet safety platform that helps users report stray animals, manage pet information, and provides an admin dashboard for animal control management.

## 📱 Features

### Mobile App (React Native)
- **Pet Management**: Register and manage your pets with photos and details
- **Stray Reporting**: Report stray animals with location, photos, and descriptions
- **QR Code Generation**: Generate QR codes for your pets for easy identification
- **Location Services**: GPS-based location tracking for accurate reporting
- **Real-time Updates**: Live notifications and data synchronization
- **Cross-platform**: Works on iOS, Android, and Web

### Admin Dashboard (React Web App)
- **Super Admin Panel**: Complete management system for administrators
- **Report Management**: Review and manage stray animal reports
- **User Management**: Admin user creation and management
- **Analytics Dashboard**: Insights and statistics
- **Agricultural & Impound Dashboards**: Specialized management views

## 🛠️ Tech Stack

### Frontend
- **Mobile App**: React Native with Expo
- **Web Dashboard**: React.js with Tailwind CSS
- **Navigation**: React Navigation, React Router

### Backend & Database
- **Backend**: Firebase Cloud Functions (Node.js)
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage
- **Hosting**: Firebase Hosting

### Key Libraries
- React Native Maps for location services
- QR Code generation
- Push notifications
- Real-time database synchronization

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- Firebase account
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/CAPSTONE_PAWSAFETY.git
   cd CAPSTONE_PAWSAFETY
   ```

2. **Mobile App Setup**
   ```bash
   cd Pawsafety
   npm install
   ```

3. **Admin Dashboard Setup**
   ```bash
   cd superadmin-dashboard
   npm install
   ```

4. **Firebase Setup**
   - Create a Firebase project
   - Enable Authentication, Firestore, and Storage
   - Copy your Firebase config to the respective config files
   - Set up environment variables

5. **Environment Variables**
   Create `.env` files in both `Pawsafety/` and `superadmin-dashboard/` directories with your Firebase configuration.

### Running the Applications

**Mobile App:**
```bash
cd Pawsafety
npm start
# or
expo start
```

**Admin Dashboard:**
```bash
cd superadmin-dashboard
npm start
```

## 📁 Project Structure

```
CAPSTONE_PAWSAFETY/
├── Pawsafety/                 # React Native mobile app
│   ├── screens/              # App screens
│   ├── navigation/           # Navigation configuration
│   ├── services/             # Firebase services
│   ├── contexts/             # React contexts
│   └── assets/               # Images and icons
├── superadmin-dashboard/      # React web admin panel
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # Auth context
│   │   └── firebase/         # Firebase config
│   └── functions/            # Firebase Cloud Functions
└── README.md
```

## 🔧 Configuration

### Firebase Setup
1. Create a new Firebase project
2. Enable the following services:
   - Authentication (Email/Password)
   - Cloud Firestore
   - Cloud Storage
   - Cloud Functions
3. Add your Firebase configuration to the respective config files

### Environment Variables
Create environment files with the following variables:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## 📱 Screenshots

*Add screenshots of your app here*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Your Name** - *Initial work* - [YourGitHub](https://github.com/yourusername)

## 🙏 Acknowledgments

- Expo team for the amazing development platform
- Firebase for the robust backend services
- React Native community for the excellent libraries
- All contributors and testers

## 📞 Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter) - email@example.com

Project Link: [https://github.com/yourusername/CAPSTONE_PAWSAFETY](https://github.com/yourusername/CAPSTONE_PAWSAFETY)

---

⭐ Don't forget to give this project a star if you found it helpful!
