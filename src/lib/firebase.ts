import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: "frete7-connector",
  appId: "1:584415424441:web:402732bc5885d8d2d89068",
  storageBucket: "frete7-connector.firebasestorage.app",
  apiKey: "AIzaSyB1ut3SQNdGtE1SIT9HTOddMbRnck7ATqY",
  authDomain: "frete7-connector.firebaseapp.com",
  messagingSenderId: "584415424441",
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}


const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
