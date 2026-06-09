'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const PUBLIC_ROOMS = [
  { id: 'rescues',    name: 'מאורת ההצלות',   icon: '🚨', description: 'עדכונים על הצלות — לכולם',       color: '#EF4444', access: 'all' },
  { id: 'volunteers', name: 'מאורת המתנדבים', icon: '🦺', description: 'לצוות המתנדבים ועמותות בלבד',  color: '#10B981', access: 'volunteers' },
];

export default function ChatPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [privateRooms, setPrivateRooms] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const rooms = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => r.type === 'adopt' || r.type === 'seen')
        .sort((a: any, b: any) => (b.lastMessageAt?.seconds ?? 0) - (a.lastMessageAt?.seconds ?? 0));
      setPrivateRooms(rooms);
    });
    return unsub;
  }, [user]);

  if (!user) return null;

  const availablePublic = PUBLIC_ROOMS.filter(r =>
    r.access === 'all' ||
    (r.access === 'volunteers' && (profile?.role === 'volunteer' || profile?.role === 'organization' || profile?.role === 'admin'))
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ paddingTop: '16px', marginBottom: '28px' }}>
          <h1 style={{ color: 'white', fontWeight: '900', fontSize: '24px', margin: 0 }}>💬 מאורות</h1>
          <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0' }}>חדרי שיחה של Pawtrol</p>
        </div>

        {/* Public rooms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: privateRooms.length > 0 ? '28px' : 0 }}>
          {availablePublic.map(room => (
            <button key={room.id} onClick={() => router.push(`/chat/${room.id}`)} style={{
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${room.color}33`,
              borderRadius: '16px', padding: '20px', cursor: 'pointer', textAlign: 'right',
              display: 'flex', alignItems: 'center', gap: '16px', width: '100%',
            }}>
              <div style={{ fontSize: '36px' }}>{room.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'white', fontWeight: '700', fontSize: '16px', margin: '0 0 4px' }}>{room.name}</p>
                <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>{room.description}</p>
              </div>
              <span style={{ color: '#475569', fontSize: '20px' }}>←</span>
            </button>
          ))}
        </div>

        {/* Private conversations */}
        {privateRooms.length > 0 && (
          <div>
            <p style={{ color: '#475569', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 12px' }}>
              שיחות פרטיות שלי
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateRooms.map((room: any) => (
                <button key={room.id} onClick={() => router.push(`/chat/${room.id}`)} style={{
                  background: 'rgba(255,255,255,0.04)', border: `1px solid ${room.color || '#3B82F6'}33`,
                  borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', textAlign: 'right',
                  display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                }}>
                  <div style={{ fontSize: '28px' }}>{room.icon || '💬'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'white', fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>{room.name || 'שיחה'}</p>
                    {room.lastMessage && (
                      <p style={{ color: '#475569', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.lastMessage}
                      </p>
                    )}
                  </div>
                  <span style={{ color: '#475569', fontSize: '18px' }}>←</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {availablePublic.length === 0 && privateRooms.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
            <p style={{ color: '#94A3B8' }}>אין מאורות זמינות עבורך</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
