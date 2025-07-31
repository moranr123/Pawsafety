import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDCXLbLW49RTXhrkciR1kq_MygS4GN17us",
  authDomain: "capstone-16109.firebaseapp.com",
  databaseURL: "https://capstone-16109-default-rtdb.firebaseio.com",
  projectId: "capstone-16109",
  storageBucket: "capstone-16109.firebasestorage.app",
  messagingSenderId: "31197815117",
  appId: "1:31197815117:web:da4520aacae53159385704",
  measurementId: "G-TNSNM6K0BB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 