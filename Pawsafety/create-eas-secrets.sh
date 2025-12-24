#!/bin/bash

# EAS Secrets Creation Script for PawSafety
# This script creates all necessary EAS secrets for your API keys

echo "🔐 Creating EAS Secrets for PawSafety..."
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

# Google Maps API Key - Check if .env file exists
if [ -f ".env" ]; then
    source .env
    if [ ! -z "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" ] && [ "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY" != "your_google_maps_api_key_here" ]; then
        echo "📋 Creating Google Maps API Key environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "$EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"
        if [ $? -eq 0 ]; then
            echo "✅ Google Maps API Key secret created successfully!"
        else
            echo "⚠️  Google Maps API Key secret may already exist or there was an error."
        fi
        echo ""
    else
        echo "⚠️  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not found in .env or is placeholder"
        echo "   Please add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to your .env file"
        echo ""
    fi
else
    echo "⚠️  No .env file found. Cannot create Google Maps API Key secret."
    echo "   Please create a .env file with EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (see env.example)"
    echo ""
fi

# Firebase Secrets - Check if .env file exists
if [ -f ".env" ]; then
    echo "📋 Found .env file, reading Firebase configuration..."
    source .env
    
    # Firebase API Key
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_API_KEY" ]; then
        echo "📋 Creating Firebase API Key environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "$EXPO_PUBLIC_FIREBASE_API_KEY"
        echo ""
    fi
    
    # Firebase Auth Domain
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" ]; then
        echo "📋 Creating Firebase Auth Domain environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "$EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"
        echo ""
    fi
    
    # Firebase Database URL
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_DATABASE_URL" ]; then
        echo "📋 Creating Firebase Database URL environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_DATABASE_URL --value "$EXPO_PUBLIC_FIREBASE_DATABASE_URL"
        echo ""
    fi
    
    # Firebase Project ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_PROJECT_ID" ]; then
        echo "📋 Creating Firebase Project ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "$EXPO_PUBLIC_FIREBASE_PROJECT_ID"
        echo ""
    fi
    
    # Firebase Storage Bucket
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" ]; then
        echo "📋 Creating Firebase Storage Bucket environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "$EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"
        echo ""
    fi
    
    # Firebase Messaging Sender ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" ]; then
        echo "📋 Creating Firebase Messaging Sender ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "$EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"
        echo ""
    fi
    
    # Firebase App ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_APP_ID" ]; then
        echo "📋 Creating Firebase App ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "$EXPO_PUBLIC_FIREBASE_APP_ID"
        echo ""
    fi
    
    # Firebase Measurement ID
    if [ ! -z "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID" ]; then
        echo "📋 Creating Firebase Measurement ID environment variable..."
        echo "   (Select 'Project' for visibility when prompted)"
        eas env:create --scope project --name EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID --value "$EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID"
        echo ""
    fi
else
    echo "⚠️  No .env file found. Skipping Firebase environment variables."
    echo "   To create Firebase environment variables, either:"
    echo "   1. Create a .env file with your Firebase config (see env.example)"
    echo "   2. Or run the Firebase env commands manually (see EAS_SECRETS_SETUP.md)"
    echo "   Remember to select 'Project' for visibility when prompted!"
    echo ""
fi

echo "📋 Listing all project environment variables..."
eas env:list

echo ""
echo "✅ Done! Your environment variables are now stored securely in EAS."
echo ""
echo "💡 Important: If you were prompted for visibility, make sure you selected 'Project'"
echo ""
echo "📝 Next steps:"
echo "   1. Your app.json has been updated to use the secret"
echo "   2. Secrets will be available during EAS builds"
echo "   3. For local development, create a .env file (see env.example)"
echo ""
echo "🔒 Security reminder:"
echo "   - Never commit API keys to version control"
echo "   - Restrict your API keys in Google Cloud Console"
echo "   - Rotate keys periodically"

