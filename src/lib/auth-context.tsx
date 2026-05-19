'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserProfile {
  uid: string;
  email: string;
  role: 'organization' | 'volunteer' | 'admin' | 'user' | null;
  name?: string;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const orgSnap = await getDoc(doc(db, 'organizations', firebaseUser.uid));
        if (orgSnap.exists()) {
          const data = orgSnap.data();
          setProfile({ uid: firebaseUser.uid, email: firebaseUser.email!, role: 'organization', name: data.name, status: data.status });
        } else {
          const volSnap = await getDoc(doc(db, 'volunteers', firebaseUser.uid));
          if (volSnap.exists()) {
            const data = volSnap.data();
            setProfile({ uid: firebaseUser.uid, email: firebaseUser.email!, role: 'volunteer', name: data.name, status: data.status });
          } else {
            const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
            if (adminSnap.exists()) {
              setProfile({ uid: firebaseUser.uid, email: firebaseUser.email!, role: 'admin' });
            } else {
              const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
              if (userSnap.exists()) {
                const data = userSnap.data();
                setProfile({ uid: firebaseUser.uid, email: firebaseUser.email!, role: 'user', name: data.name });
              } else {
                setProfile({ uid: firebaseUser.uid, email: firebaseUser.email!, role: null });
              }
            }
          }
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
