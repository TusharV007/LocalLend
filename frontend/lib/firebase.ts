import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAVukCWJJXAqPyOIOAkdd7jE_Se9GPgKjY",
    authDomain: "locallend-df38c.firebaseapp.com",
    projectId: "locallend-df38c",
    storageBucket: "locallend-df38c.firebasestorage.app",
    messagingSenderId: "620970500114",
    appId: "1:620970500114:web:fcfc3f16362d69ca61b8cb",
    measurementId: "G-0XRSJP7S9X"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
