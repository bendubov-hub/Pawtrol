'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useParams, useRouter } from 'next/navigation';

const ROOM_META: Record<string, { name: string; icon: string; color: string }> = {
  rescues:    { name: 'מאורת ההצלות',   icon: '🚨', color: '#EF4444' },
  volunteers: { name: 'מאורת המתנדבים', icon: '🦺', color: '#10B981' },
};

export default function ChatRoomPage() {
  const { user, profile } = useAuth();
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const room = ROOM_META[roomId] || { name: roomId, icon: '💬', color: '#3B82F6' };

  // Block volunteers-only room for non-volunteers
  useEffect(() => {
    if (roomId === 'volunteers' && profile &&
      profile.role !== 'volunteer' && profile.role !== 'organization' && profile.role !== 'admin') {
      router.replace('/chat');
    }
  }, [profile, roomId, router]);

  useEffect(() => {
    const q = query(
      collection(db, 'chat_rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [roomId]);

  const send = async () => {
    if (!text.trim() || !user || sending) return;
    const msg = text.trim();
    setText('');
    setSending(true);
    try {
      await addDoc(collection(db, 'chat_rooms', roomId, 'messages'), {
        text: msg,
        userId: user.uid,
        userName: profile?.name || user.email,
        createdAt: serverTimestamp(),
      });
    } catch {}
    setSending(false);
  };

  if (!user) return null;

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        paddingTop: 'max(14px, env(safe-area-inset-top))',
      }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '22px', padding: '4px' }}>←</button>
        <span style={{ fontSize: '24px' }}>{room.icon}</span>
        <p style={{ color: 'white', fontWeight: '700', fontSize: '16px', margin: 0 }}>{room.name}</p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }} dir="ltr">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', direction: 'rtl' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>{room.icon}</div>
            <p style={{ color: '#475569', fontSize: '14px' }}>אין הודעות עדיין. היה ראשון!</p>
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.userId === user.uid;
          const time = msg.createdAt?.toDate?.()?.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) || '';
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%',
                background: isMe ? `${room.color}22` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${isMe ? room.color + '44' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                padding: '10px 14px',
              }}>
                {!isMe && (
                  <p style={{ color: room.color, fontSize: '11px', fontWeight: '700', margin: '0 0 4px', direction: 'rtl' }}>
                    {msg.userName}
                  </p>
                )}
                <p style={{ color: 'white', fontSize: '14px', margin: 0, lineHeight: 1.5, direction: 'rtl', textAlign: 'right' }}>
                  {msg.text}
                </p>
                <p style={{ color: '#475569', fontSize: '10px', margin: '4px 0 0', textAlign: isMe ? 'left' : 'right' }}>
                  {time}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', gap: '8px', flexShrink: 0,
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)',
      }}>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="כתוב הודעה..."
          style={{
            flex: 1, padding: '12px 16px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '24px', color: 'white', fontSize: '14px', outline: 'none',
            direction: 'rtl',
          }}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          style={{
            width: '44px', height: '44px', flexShrink: 0,
            background: text.trim() ? room.color : '#1E293B',
            border: 'none', borderRadius: '50%', color: 'white',
            cursor: text.trim() ? 'pointer' : 'default',
            fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.2s',
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
