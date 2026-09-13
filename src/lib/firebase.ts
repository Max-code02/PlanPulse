import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Initialize Primary App (planpluse) from JSON
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// 2. Initialize Secondary App (intense-environs-8f6jr) as "oldApp"
const oldFirebaseConfig = {
  projectId: "intense-environs-8f6jr",
  appId: "1:1095465910331:web:5fb582cc848cad0b5d9c1e",
  apiKey: "AIzaSyB4Nt2NoYao9rlPTVZDPy_zC9T0EEyGxBY",
  authDomain: "intense-environs-8f6jr.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-planpulsestunden-8eb0b310-a277-4dc3-8b88-27ae7759216e",
  storageBucket: "intense-environs-8f6jr.firebasestorage.app",
  messagingSenderId: "1095465910331"
};

const oldApp = getApps().find(a => a.name === "oldApp") 
  || initializeApp(oldFirebaseConfig, "oldApp");

export const oldDb = getFirestore(oldApp, oldFirebaseConfig.firestoreDatabaseId);
export const oldAuth = getAuth(oldApp);



