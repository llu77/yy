
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD_demoKey123456789_testingOnly",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

// Log the project ID to verify it's being loaded correctly
// Security: Removed console.log to prevent exposing project ID
// console.log("Firebase Project ID:", firebaseConfig.projectId);

// Initialize Firebase - Disabled for now
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: any = null;

// Check if Firebase config is properly set
const isFirebaseConfigured = firebaseConfig.apiKey && 
                           firebaseConfig.apiKey !== "AIzaSyD_demoKey123456789_testingOnly";

if (isFirebaseConfigured) {
    try {
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        auth = getAuth(app);
        db = getFirestore(app);
    } catch (error) {
        console.warn("Firebase initialization failed:", error);
        console.log("Running in demo mode without Firebase");
    }
} else {
    console.log("Firebase not configured - running in demo mode");
}

// Note: enableIndexedDbPersistence is deprecated and persistence is enabled by default
// on most browsers. Explicit configuration can be done via initializeFirestore if needed,
// but the default behavior is often sufficient.

export { app, auth, db };
