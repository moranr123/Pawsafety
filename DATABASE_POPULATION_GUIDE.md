# Database Population Guide for Registered Pets

This guide explains how to populate the database with registered pets data so the line graph displays properly.

## 📊 Understanding the Chart Requirements

The line graph displays **registered pets** with the following criteria:
- `registrationStatus === 'registered'`
- `archived === false` (or not set)
- Has a valid date in `registeredAt` or `createdAt` field
- Date should be within the last 6 months

## 🚀 Methods to Populate Data

### Method 1: Through the Mobile App (Normal Flow)

1. **Register a Pet**:
   - Open the PawSafety mobile app
   - Navigate to "Register a Pet" screen
   - Fill in all required fields:
     - Pet name, type (dog/cat), breed, gender
     - Owner information
     - Pet images (optional)
   - Submit the registration
   - **Status**: Pet will be created with `registrationStatus: 'pending'`

2. **Approve the Registration** (Admin Required):
   - Log in to the **Agricultural Dashboard** (superadmin-dashboard)
   - Go to the "Pending" tab
   - Find the pet registration request
   - Click "Approve" button
   - **Status**: Pet will be updated to `registrationStatus: 'registered'` with `registeredAt` timestamp

### Method 2: Using the Agricultural Dashboard

1. **Approve Pending Registrations**:
   - Log in to: `superadmin-dashboard`
   - Navigate to Agricultural Dashboard
   - Click on "Pending" tab
   - Review pending pet registrations
   - Click "Approve" for each pet you want to register
   - The chart will automatically update with the new registered pets

### Method 3: Manual Firebase Console Entry

1. **Access Firebase Console**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Navigate to Firestore Database

2. **Add a Pet Document**:
   - Click "Add document" in the `pets` collection
   - Use this structure:

```json
{
  "petName": "Max",
  "petType": "dog",
  "breed": "Golden Retriever",
  "petGender": "male",
  "ownerFullName": "John Doe",
  "contactNumber": "09123456789",
  "description": "A friendly dog",
  "status": "safe",
  "registrationStatus": "registered",  // ⚠️ REQUIRED
  "archived": false,                    // ⚠️ REQUIRED
  "registeredAt": "2024-01-15T00:00:00Z",  // ⚠️ Use Timestamp type
  "createdAt": "2024-01-15T00:00:00Z",     // ⚠️ Use Timestamp type
  "registeredDate": "2024-01-15T00:00:00.000Z",
  "registeredBy": "admin",
  "userId": "user_id_here",  // Use a real user ID from your users collection
  "vaccinated": true,
  "dewormed": true,
  "antiRabies": true,
  "healthStatus": "healthy"
}
```

**Important Notes**:
- Use **Timestamp** type for `registeredAt` and `createdAt` (not string)
- Set `registrationStatus` to `"registered"` (not "pending")
- Set `archived` to `false` or omit it
- Use dates within the last 6 months for the chart to display them

### Method 4: Using the Test Data Script (Quick Method)

**Option A: Browser Console (Easiest)**

1. Open your Agricultural Dashboard in the browser
2. Open Developer Console (F12)
3. Paste and run this code:

```javascript
// Quick test data generator - paste in browser console
(async function populateTestData() {
  const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js');
  // Or use your existing Firebase instance
  
  const now = new Date();
  const petNames = ['Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Daisy', 'Milo', 'Lucy', 'Rocky', 'Sadie'];
  const dogBreeds = ['Aspin (Mixed Breed)', 'Golden Retriever', 'Labrador', 'German Shepherd'];
  const catBreeds = ['Puspin (Mixed Breed)', 'Persian', 'Siamese', 'Maine Coon'];
  
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
    const petsThisMonth = 5;
    
    for (let i = 0; i < petsThisMonth; i++) {
      const pet = {
        petName: `${petNames[Math.floor(Math.random() * petNames.length)]} ${monthOffset}-${i}`,
        petType: Math.random() > 0.5 ? 'dog' : 'cat',
        breed: Math.random() > 0.5 
          ? dogBreeds[Math.floor(Math.random() * dogBreeds.length)]
          : catBreeds[Math.floor(Math.random() * catBreeds.length)],
        petGender: Math.random() > 0.5 ? 'male' : 'female',
        ownerFullName: `Test Owner ${monthOffset}-${i}`,
        contactNumber: `0912345678${i}`,
        description: 'Test pet for chart data',
        status: 'safe',
        registrationStatus: 'registered',
        archived: false,
        registeredAt: monthDate,
        createdAt: monthDate,
        registeredDate: monthDate.toISOString(),
        registeredBy: 'test_script',
        userId: 'test_user_id', // Replace with a real user ID
        vaccinated: true,
        dewormed: true,
        antiRabies: true,
        healthStatus: 'healthy'
      };
      
      // Use your Firebase instance here
      // await addDoc(collection(db, 'pets'), pet);
      console.log('Would add:', pet.petName);
    }
  }
  console.log('Done! Check your Firebase console to add these manually, or uncomment the addDoc line.');
})();
```

**Option B: Add Function to Dashboard Component**

1. **Location**: `superadmin-dashboard/scripts/populateTestPets.js`

2. **Add to Dashboard** (temporary button for testing):

```javascript
// Add this function to AgriculturalDashboard.js
const populateTestPets = async () => {
  const now = new Date();
  const petNames = ['Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Daisy'];
  const dogBreeds = ['Aspin (Mixed Breed)', 'Golden Retriever', 'Labrador'];
  const catBreeds = ['Puspin (Mixed Breed)', 'Persian', 'Siamese'];
  
  try {
    for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 15);
      
      for (let i = 0; i < 5; i++) {
        const pet = {
          petName: `${petNames[Math.floor(Math.random() * petNames.length)]} ${monthOffset}-${i}`,
          petType: Math.random() > 0.5 ? 'dog' : 'cat',
          breed: Math.random() > 0.5 
            ? dogBreeds[Math.floor(Math.random() * dogBreeds.length)]
            : catBreeds[Math.floor(Math.random() * catBreeds.length)],
          petGender: Math.random() > 0.5 ? 'male' : 'female',
          ownerFullName: `Test Owner ${monthOffset}-${i}`,
          contactNumber: `0912345678${i}`,
          description: 'Test pet',
          status: 'safe',
          registrationStatus: 'registered',
          archived: false,
          registeredAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          registeredDate: monthDate.toISOString(),
          registeredBy: 'test_script',
          userId: 'test_user_id', // ⚠️ Replace with real user ID
          vaccinated: true,
          dewormed: true,
          antiRabies: true,
          healthStatus: 'healthy'
        };
        
        await addDoc(collection(db, 'pets'), pet);
      }
    }
    toast.success('Test pets added successfully!');
  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to add test pets');
  }
};

// Add button in your dashboard JSX (temporary, remove after testing):
<button onClick={populateTestPets} className="bg-purple-600 text-white px-4 py-2 rounded">
  Populate Test Data (Dev Only)
</button>
```

**⚠️ Important**: 
- Replace `'test_user_id'` with a real user ID from your `users` collection
- Remove the test button after populating data
- This is for development/testing only

4. **What the Script Does**:
   - Generates 5 pets per month for the last 6 months (30 pets total)
   - Randomizes pet names, breeds, genders
   - Sets `registrationStatus: 'registered'`
   - Sets proper dates spread across 6 months
   - Creates realistic test data

### Method 5: Bulk Import via Firebase Admin SDK

If you have access to Firebase Admin SDK, you can create a Node.js script:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path-to-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function bulkImportPets() {
  const batch = db.batch();
  const pets = [/* your pet data array */];
  
  pets.forEach(pet => {
    const ref = db.collection('pets').doc();
    batch.set(ref, {
      ...pet,
      registeredAt: admin.firestore.Timestamp.fromDate(new Date(pet.registeredAt)),
      createdAt: admin.firestore.Timestamp.fromDate(new Date(pet.createdAt))
    });
  });
  
  await batch.commit();
  console.log('Bulk import completed!');
}
```

## 📅 Date Format Requirements

For the chart to work correctly, dates should be:

1. **Firestore Timestamp** (recommended):
   ```javascript
   registeredAt: serverTimestamp()  // or Timestamp.fromDate()
   createdAt: serverTimestamp()
   ```

2. **JavaScript Date** (converted automatically):
   ```javascript
   registeredAt: new Date('2024-01-15')
   createdAt: new Date('2024-01-15')
   ```

3. **ISO String** (for registeredDate field):
   ```javascript
   registeredDate: new Date().toISOString()
   ```

## ✅ Verification Checklist

After adding pets, verify:

- [ ] `registrationStatus` is set to `"registered"` (not "pending")
- [ ] `archived` is `false` or not set
- [ ] `registeredAt` or `createdAt` has a valid date
- [ ] Date is within the last 6 months (for chart visibility)
- [ ] Pet has required fields: `petName`, `petType`, `ownerFullName`
- [ ] `userId` matches a real user in your `users` collection

## 🔍 Troubleshooting

### Chart shows no data:
1. Check if pets have `registrationStatus: 'registered'`
2. Verify dates are within last 6 months
3. Check browser console for errors
4. Verify Firebase connection

### Chart shows incorrect counts:
1. Check if `archived` field is set to `false`
2. Verify date fields are proper Timestamps
3. Clear browser cache and refresh

### Dates not displaying correctly:
1. Ensure using Firestore Timestamp type (not strings)
2. Check timezone settings
3. Verify date is not in the future

## 📝 Quick Reference: Required Fields

```javascript
{
  registrationStatus: 'registered',  // Required
  archived: false,                    // Required
  registeredAt: Timestamp,            // Required (or createdAt)
  createdAt: Timestamp,               // Required (fallback)
  petName: string,                    // Required
  petType: 'dog' | 'cat',             // Required
  ownerFullName: string,              // Required
  userId: string                      // Required (valid user ID)
}
```

## 🎯 Recommended Approach

For **production**: Use Method 1 (Mobile App → Admin Approval)
For **testing/development**: Use Method 4 (Test Data Script)

## 💡 Quick Start: Get a Real User ID

Before populating test data, you need a valid `userId`. Here's how:

1. **From Firebase Console**:
   - Go to Firestore → `users` collection
   - Copy any user document ID

2. **From Dashboard Code**:
   - In AgriculturalDashboard.js, the `users` state contains all users
   - Use: `users[0]?.uid` or any user's UID

3. **From Browser Console** (while on dashboard):
   ```javascript
   // If you have access to the users array
   console.log(users[0]?.uid);
   ```

## 🚨 Important Notes

- **Never use test data in production**
- **Remove test buttons/functions before deploying**
- **Use real user IDs** - test data with invalid user IDs may cause errors
- **Dates should be realistic** - spread across last 6 months for best chart visualization

---

**Need Help?** Check the Agricultural Dashboard code at:
`superadmin-dashboard/src/components/AgriculturalDashboard.js`

