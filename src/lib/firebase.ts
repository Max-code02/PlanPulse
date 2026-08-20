import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDPPvJvBrDbt-DALu9eW_a34EsX5hcsV_U",
  authDomain: "planpluse.firebaseapp.com",
  projectId: "planpluse",
  storageBucket: "planpluse.firebasestorage.app",
  messagingSenderId: "803662906703",
  appId: "1:803662906703:web:e664cc29877e115ae0b13a",
  measurementId: "G-BZCP6L1VJF"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth();
