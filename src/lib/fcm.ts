'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { db } from './firebase';

const firebaseConfig = {
  apiKey: "AIzaSyB8im6abd9ZuD2YBH3C8zkNmluXWVxgwsU",
  authDomain: "pawtrol-eb66b.firebaseapp.com",
  projectId: "pawtrol-eb66b",
  storageBucket: "pawtrol-eb66b.firebasestorage.app",
  messagingSenderId: "282499962813",
  appId: "1:282499962813:web:0ca86d85b9c6dfbe29e4d4",
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function registerFcmToken(uid?: string): Promise<string | null> {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const app = getApps()[0] || initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    });

    if (token && uid) {
      await setDoc(doc(db, 'fcm_tokens', uid), {
        token, uid, updatedAt: serverTimestamp(),
      });
    }

    return token;
  } catch {
    return null;
  }
}
