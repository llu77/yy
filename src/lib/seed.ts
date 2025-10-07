
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { initialUsers } from '../app/(app)/layout';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './.env' });

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function seedUsers() {
  console.log('Starting to seed users...');
  const usersCollection = collection(db, 'users');
  const batch = writeBatch(db);
  let count = 0;

  for (const userData of initialUsers) {
    try {
      // Step 1: Create user in Firebase Authentication
      // Use a default password for seeding purposes. Users can change it later.
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, '123456');
      const user = userCredential.user;
      console.log(`User created in Auth: ${user.email} with UID: ${user.uid}`);

      // Step 2: Prepare user data for Firestore, linking it with the Auth UID
      const userDocRef = doc(usersCollection, user.uid);
      const firestoreUserData = {
        ...userData,
        uid: user.uid, // Ensure UID from Auth is stored in Firestore
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date(),
      };
      
      // Remove the temporary 'id' field if it exists
      delete (firestoreUserData as any).id;

      batch.set(userDocRef, firestoreUserData);
      count++;
      console.log(`Prepared to set Firestore doc for ${userData.email}`);

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.warn(`User with email ${userData.email} already exists in Auth. Skipping Auth creation.`);
        // Even if user exists in Auth, we can still try to create their Firestore doc if it's missing.
        // For a simple seed script, we'll just log this. A more robust script might find the user's UID and update their doc.
      } else {
        console.error(`Error processing user ${userData.email}:`, error.message);
      }
    }
  }

  if (count > 0) {
    try {
      await batch.commit();
      console.log(`Successfully seeded ${count} users to Firestore.`);
    } catch (error) {
      console.error('Error committing batch:', error);
    }
  } else {
    console.log('No new users to seed.');
  }
}

seedUsers().then(() => {
  console.log('Seeding process finished.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error in seed script:', error);
  process.exit(1);
});
