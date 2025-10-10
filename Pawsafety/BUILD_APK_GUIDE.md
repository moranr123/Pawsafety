# PawSafety APK Build Guide

This guide will help you build an APK file for your PawSafety React Native app using Expo EAS Build.

## ✅ Configuration Complete

The following files have been configured for APK building:
- ✅ `app.json` - Added Android package name, version code, and permissions
- ✅ `eas.json` - Added APK build profiles

## 📋 Prerequisites

Before building, ensure you have:
1. **Node.js and npm** installed
2. **Expo account** (free) - Sign up at https://expo.dev
3. **Internet connection** for cloud build

## 🚀 Step-by-Step Build Instructions

### Step 1: Install EAS CLI

Open your terminal in the Pawsafety folder and run:

```bash
cd Pawsafety
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Enter your Expo account credentials. If you don't have an account, create one at https://expo.dev

### Step 3: Configure Your Project (First Time Only)

```bash
eas build:configure
```

This will link your project to your Expo account.

### Step 4: Set Up Environment Variables (Important!)

Before building, you need to create a `.env` file with your Firebase credentials:

1. Copy the `env.example` file to `.env`:
   ```bash
   copy env.example .env
   ```

2. Edit the `.env` file and replace the placeholder values with your actual Firebase configuration.

**Note:** For production builds, you should use EAS Secrets instead of .env files:
```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_actual_api_key
```

Repeat for all environment variables.

### Step 5: Build the APK

Choose one of the following build commands:

#### Option A: Preview Build (Recommended for Testing)
```bash
eas build --platform android --profile preview
```

#### Option B: Production Build
```bash
eas build --platform android --profile production
```

#### Option C: Build AAB (for Google Play Store)
```bash
eas build --platform android --profile preview-aab
```

### Step 6: Wait for Build to Complete

- The build process happens in the cloud and typically takes 10-20 minutes
- You'll see a progress URL in the terminal
- You can close the terminal and check progress at https://expo.dev/accounts/[your-account]/projects/pawsafety/builds

### Step 7: Download Your APK

Once the build completes:
1. The terminal will show a download link
2. Or visit https://expo.dev and navigate to your project's builds
3. Download the APK file
4. Transfer it to your Android device and install

## 📱 Installing the APK on Your Device

1. **Enable Unknown Sources:**
   - Go to Settings > Security
   - Enable "Install from Unknown Sources" or "Install Unknown Apps"

2. **Transfer the APK:**
   - Email it to yourself
   - Use USB cable
   - Use cloud storage (Google Drive, Dropbox)

3. **Install:**
   - Open the APK file on your Android device
   - Tap "Install"
   - Open the app

## 🔧 Build Profiles Explained

### `preview` Profile
- Builds an APK file
- Good for testing and sharing with testers
- Can be installed directly on devices
- File size: Larger (includes all architectures)

### `preview-aab` Profile
- Builds an AAB (Android App Bundle)
- Required for Google Play Store
- Smaller download size for users
- Cannot be installed directly (needs Google Play)

### `production` Profile
- Builds an APK for production release
- Auto-increments version code
- Use for final releases

## 🐛 Troubleshooting

### Build Fails with "Missing credentials"
Run: `eas credentials` and follow the prompts to generate/configure credentials.

### Build Fails with Environment Variable Errors
Make sure all Firebase environment variables are set using `eas secret:create`.

### "Package name already exists"
If you want to change the package name, edit `app.json`:
```json
"android": {
  "package": "com.yourname.pawsafety"
}
```

### App Crashes on Startup
- Check that all environment variables are properly set
- Verify Firebase configuration is correct
- Check the device logs using `adb logcat`

## 📚 Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Environment Variables](https://docs.expo.dev/build-reference/variables/)
- [Android App Signing](https://docs.expo.dev/app-signing/app-credentials/)

## 🎯 Quick Reference Commands

```bash
# Install dependencies
cd Pawsafety
npm install

# Login to Expo
eas login

# Build APK (preview)
eas build --platform android --profile preview

# Build APK (production)
eas build --platform android --profile production

# Check build status
eas build:list

# View build logs
eas build:view [build-id]
```

## ⚠️ Important Notes

1. **First build** may take longer as EAS sets up credentials
2. **Free Expo accounts** have build limits (check your plan)
3. **Keep your Firebase credentials secure** - never commit .env to git
4. **Test thoroughly** before distributing to users
5. **Version management** - Update version in app.json before each build

## 🎉 Success!

Once you have your APK, you can:
- Install it on Android devices for testing
- Share it with beta testers
- Prepare for Google Play Store submission (use AAB format)

For Google Play Store submission, you'll need:
- AAB file (not APK)
- App screenshots
- Privacy policy
- App description and details
