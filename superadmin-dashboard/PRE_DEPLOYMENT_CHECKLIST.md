# Pre-Deployment Checklist

## 1. Environment Variables Setup
Create a `.env.production` file in the root directory with your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id (optional)
```

**Note:** Get these values from Firebase Console → Project Settings → Your apps → Web app config

## 2. Build the Production Version
```bash
npm run build
```
This creates an optimized production build in the `build/` folder.

## 3. Test the Production Build Locally
```bash
# Install serve globally (one time)
npm install -g serve

# Serve the build folder
serve -s build
```
Test all features to ensure everything works correctly.

## 4. Firebase Security Rules Check
Ensure your Firestore and Storage security rules are properly configured in Firebase Console:
- Firestore Rules
- Storage Rules
- Authentication settings

## 5. Firebase Hosting Configuration
Verify `firebase.json` is correct (already configured ✅).

## 6. Deploy to Firebase Hosting
```bash
# Make sure you're logged in
firebase login

# Initialize hosting (if not done)
firebase init hosting

# Deploy
firebase deploy --only hosting
```

## 7. Custom Domain (Optional)
If you want a custom domain:
- Configure in Firebase Console → Hosting → Add custom domain
- Update DNS records as instructed

## 8. Post-Deployment
- [ ] Verify the site is accessible
- [ ] Test all authentication flows
- [ ] Test all CRUD operations
- [ ] Check mobile responsiveness
- [ ] Verify images and assets load correctly
- [ ] Check browser console for errors
- [ ] Test in multiple browsers (Chrome, Firefox, Safari, Edge)

## 9. Performance Optimization (Already Done)
- ✅ Production build optimized
- ✅ Assets minified
- ✅ Code splitting handled by React

## 10. Security Checklist
- [ ] Environment variables are NOT committed to git
- [ ] API keys are secure and not exposed
- [ ] Firebase security rules are restrictive
- [ ] HTTPS is enabled (Firebase Hosting uses HTTPS by default)



