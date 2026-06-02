'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './auth-context';
import { usePathname } from 'next/navigation';

export interface ChatToast {
  id: string;
  roomId: string;
  roomName: string;
  roomIcon: string;
  senderName: string;
  text: string;
}

interface ChatNotifyCtx {
  toasts: ChatToast[];
  hasUnread: boolean;
  dismissToast: (id: string) => void;
  markRead: () => void;
}

const Ctx = createContext<ChatNotifyCtx>({ toasts: [], hasUnread: false, dismissToast: () => {}, markRead: () => {} });

const ROOMS = [
  { id: 'rescues',    name: 'מאורת ההצלות',   icon: '🚨' },
  { id: 'volunteers', name: 'מאורת המתנדבים', icon: '🦺' },
];

export function ChatNotifyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const initialized = useRef<Record<string, boolean>>({});

  // Mark as read when visiting /chat
  useEffect(() => {
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      setHasUnread(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!user) return;

    const rooms = (profile?.role === 'volunteer' || profile?.role === 'organization' || profile?.role === 'admin')
      ? ROOMS
      : ROOMS.filter(r => r.id === 'rescues');

    const unsubs = rooms.map(room => {
      const q = query(
        collection(db, 'chat_rooms', room.id, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      return onSnapshot(q, snap => {
        if (!initialized.current[room.id]) {
          initialized.current[room.id] = true;
          return;
        }
        if (snap.empty) return;

        const msg = snap.docs[0].data();
        if (msg.userId === user.uid) return;
        if (pathname === `/chat/${room.id}`) return;

        const toast: ChatToast = {
          id: `${room.id}_${snap.docs[0].id}`,
          roomId: room.id,
          roomName: room.name,
          roomIcon: room.icon,
          senderName: msg.userName || 'מישהו',
          text: msg.text || '',
        };

        setToasts(prev => {
          const filtered = prev.filter(t => t.id !== toast.id);
          return [...filtered.slice(-2), toast];
        });
        setHasUnread(true);

        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 5000);
      });
    });

    return () => unsubs.forEach(u => u());
  }, [user, profile, pathname]);

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  const markRead = () => setHasUnread(false);

  return (
    <Ctx.Provider value={{ toasts, hasUnread, dismissToast, markRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatNotify() {
  return useContext(Ctx);
}
