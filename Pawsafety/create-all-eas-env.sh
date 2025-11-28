#!/bin/bash

# EAS Environment Variables Creation Script for PawSafety
# This script creates all necessary EAS environment variables for API keys

echo "🔐 Creating EAS Environment Variables for PawSafety..."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI is not installed. Please install it first:"
    echo "   npm install -g eas-cli"
    exit 1
fi

# Check if user is logged in
if ! eas whoami &> /dev/null; then
    echo "❌ You are not logged in to EAS. Please login first:"
    echo "   eas login"
    exit 1
fi

echo "📋 Step 1: Creating Google Maps API Key environment variable..."
echo "   (Select 'Project' for visibility when prompted)"
eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value AIzaSyByXb-FgYHiNhVIsK00kM1jdXYr_OerV7Q
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "📋 Found .env file, reading Firebase configuration..."
    source .env
    
    # Firebase API Key
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_API_KEY" ] && [ "$EXPO_PUBLIC_FIREBASE_API_KEY" != "your_firebase_api_key_here" ]; then
        echo "📋 Creating Firebase API Key environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_API_KEY not found in .env or is placeholder"
    fi
    
    # Firebase Auth Domain
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" ] && [ "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" != "your_project_id.firebaseapp.com" ]; then
        echo "📋 Creating Firebase Auth Domain environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN not found in .env or is placeholder"
    fi
    
    # Firebase Database URL
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_DATABASE_URL" ] && [ "$EXPO_PUBLIC_FIREBASE_DATABASE_URL" != "https://your_project_id-default-rtdb.firebaseio.com" ]; then
        echo "📋 Creating Firebase Database URL environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "$EXPO_PUBLIC_FIREBASE_DATABASE_URL"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_DATABASE_URL not found in .env or is placeholder"
    fi
    
    # Firebase Project ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" ] && [ "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" != "your_project_id" ]; then
        echo "📋 Creating Firebase Project ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$EXPO_PUBLIC_FIREBASE_PROJECT_ID"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_PROJECT_ID not found in .env or is placeholder"
    fi
    
    # Firebase Storage Bucket
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" ] && [ "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" != "your_project_id.firebasestorage.app" ]; then
        echo "📋 Creating Firebase Storage Bucket environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET not found in .env or is placeholder"
    fi
    
    # Firebase Messaging Sender ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" ] && [ "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" != "your_messaging_sender_id" ]; then
        echo "📋 Creating Firebase Messaging Sender ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID not found in .env or is placeholder"
    fi
    
    # Firebase App ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_APP_ID" ] && [ "$EXPO_PUBLIC_FIREBASE_APP_ID" != "your_app_id" ]; then
        echo "📋 Creating Firebase App ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$EXPO_PUBLIC_FIREBASE_APP_ID"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_APP_ID not found in .env or is placeholder"
    fi
    
    # Firebase Measurement ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" ] && [ "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" != "your_measurement_id" ]; then
        echo "📋 Creating Firebase Measurement ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID not found in .env or is placeholder (optional)"
    fi
else
    echo "⚠️  No .env file found."
    echo ""
    echo "To create Firebase environment variables, you need to:"
    echo "1. Get your Firebase config from Firebase Console:"
    echo "   https://console.firebase.google.com/project/capstone-16109/settings/general"
    echo "2. Create a .env file with your Firebase config (see env.example)"
    echo "3. Run this script again"
    echo ""
    echo "Or run the commands manually (see EAS_SECRETS_SETUP.md)"
fi

echo "📋 Listing all project environment variables..."
eas env:list

echo ""
echo "✅ Done! Your environment variables are now stored securely in EAS."
echo ""
echo "💡 Important: If you were prompted for visibility, make sure you selected 'Project'"
echo ""
echo "📝 Next steps:"
echo "   1. Environment variables will be available during EAS builds"
echo "   2. For local development, create a .env file (see env.example)"
echo ""
echo "🔒 Security reminder:"
echo "   - Never commit API keys to version control"
echo "   - Restrict your API keys in Google Cloud Console"
echo "   - Rotate keys periodically"

