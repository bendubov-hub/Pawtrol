import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB8im6abd9ZuD2YBH3C8zkNmluXWVxgwsU",
  authDomain: "pawtrol-eb66b.firebaseapp.com",
  projectId: "pawtrol-eb66b",
  storageBucket: "pawtrol-eb66b.firebasestorage.app",
  messagingSenderId: "282499962813",
  appId: "1:282499962813:web:0ca86d85b9c6dfbe29e4d4",
  measurementId: "G-51TH6V2R6W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});