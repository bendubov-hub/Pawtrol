'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

const ROOMS = [
  { id: 'rescues',    name: 'מאורת ההצלות',   icon: '🚨', description: 'עדכונים על הצלות — לכולם',       color: '#EF4444', access: 'all' },
  { id: 'volunteers', name: 'מאורת המתנדבים', icon: '🦺', description: 'לצוות המתנדבים ועמותות בלבד',  color: '#10B981', access: 'volunteers' },
];

export default function ChatPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
  }, [user, loading, router]);

  if (!user) return null;

  const availableRooms = ROOMS.filter(r =>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {availableRooms.map(room => (
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

          {availableRooms.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
              <p style={{ color: '#94A3B8' }}>אין מאורות זמינות עבורך</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
