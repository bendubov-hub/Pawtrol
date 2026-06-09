'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
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
  unreadAdopt: number;
  unreadSeen: number;
  dismissToast: (id: string) => void;
  markRead: () => void;
  markRoomRead: (roomId: string) => void;
}

const Ctx = createContext<ChatNotifyCtx>({
  toasts: [], hasUnread: false, unreadAdopt: 0, unreadSeen: 0,
  dismissToast: () => {}, markRead: () => {}, markRoomRead: () => {},
});

const PUBLIC_ROOMS = [
  { id: 'rescues',    name: 'מאורת ההצלות',   icon: '🚨' },
  { id: 'volunteers', name: 'מאורת המתנדבים', icon: '🦺' },
];

export function ChatNotifyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<ChatToast[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadAdopt, setUnreadAdopt] = useState(0);
  const [unreadSeen, setUnreadSeen] = useState(0);
  const initialized = useRef<Record<string, boolean>>({});

  // Mark public rooms as read when visiting /chat
  useEffect(() => {
    if (pathname === '/chat' || pathname.startsWith('/chat/')) {
      setHasUnread(false);
    }
    // Mark specific room as read in localStorage
    if (pathname.startsWith('/chat/')) {
      const roomId = pathname.replace('/chat/', '');
      if (roomId) localStorage.setItem(`pawtrol_seen_${roomId}`, Date.now().toString());
    }
  }, [pathname]);

  // Listen to public room messages for toasts
  useEffect(() => {
    if (!user) return;

    const rooms = (profile?.role === 'volunteer' || profile?.role === 'organization' || profile?.role === 'admin')
      ? PUBLIC_ROOMS
      : PUBLIC_ROOMS.filter(r => r.id === 'rescues');

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
        setToasts(prev => [...prev.filter(t => t.id !== toast.id).slice(-2), toast]);
        setHasUnread(true);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 5000);
      });
    });

    return () => unsubs.forEach(u => u());
  }, [user, profile, pathname]);

  // Listen to private rooms for badges + toasts
  const prevLastMsg = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, snap => {
      let adopt = 0, seen = 0;
      snap.docs.forEach(docSnap => {
        const roomId = docSnap.id;
        if (roomId === 'rescues' || roomId === 'volunteers') return;
        const data = docSnap.data();
        if (data.lastMessageUid === user.uid) return;

        const lastMsgAt = data.lastMessageAt?.toMillis?.() ?? 0;
        const lastSeen = parseInt(localStorage.getItem(`pawtrol_seen_${roomId}`) || '0');

        // Show toast if this is a new message (not on first load)
        const prev = prevLastMsg.current[roomId] ?? 0;
        if (prev > 0 && lastMsgAt > prev && pathname !== `/chat/${roomId}`) {
          const toast: ChatToast = {
            id: `${roomId}_${lastMsgAt}`,
            roomId,
            roomName: data.name || (roomId.startsWith('adopt_') ? 'שיחה על אימוץ' : 'שיחה על מי ראה?'),
            roomIcon: data.icon || (roomId.startsWith('adopt_') ? '🐾' : '🔍'),
            senderName: data.lastMessageSender || 'מישהו',
            text: data.lastMessage || '',
          };
          setToasts(prev2 => [...prev2.filter(t => t.id !== toast.id).slice(-2), toast]);
          setTimeout(() => setToasts(p => p.filter(t => t.id !== toast.id)), 5000);
        }
        prevLastMsg.current[roomId] = lastMsgAt;

        if (lastMsgAt > lastSeen) {
          if (roomId.startsWith('adopt_')) adopt++;
          else if (roomId.startsWith('seen_')) seen++;
        }
      });
      setUnreadAdopt(adopt);
      setUnreadSeen(seen);
    }, () => {});

    return unsub;
  }, [user, pathname]);

  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));
  const markRead = () => setHasUnread(false);
  const markRoomRead = (roomId: string) => {
    localStorage.setItem(`pawtrol_seen_${roomId}`, Date.now().toString());
    if (roomId.startsWith('adopt_')) setUnreadAdopt(0);
    if (roomId.startsWith('seen_')) setUnreadSeen(0);
  };

  return (
    <Ctx.Provider value={{ toasts, hasUnread, unreadAdopt, unreadSeen, dismissToast, markRead, markRoomRead }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatNotify() {
  return useContext(Ctx);
}
