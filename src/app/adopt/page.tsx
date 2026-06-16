'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/lib/auth-context';

const CATEGORIES = [
  { id: 'all',     label: 'הכל',     icon: '🐾' },
  { id: 'dog',     label: 'כלבים',   icon: '🐕' },
  { id: 'cat',     label: 'חתולים',  icon: '🐈' },
  { id: 'rabbit',  label: 'ארנבים',  icon: '🐇' },
  { id: 'hamster', label: 'אוגרים',  icon: '🐹' },
  { id: 'parrot',  label: 'תוכים',   icon: '🦜' },
  { id: 'other',   label: 'אחר',     icon: '✨' },
];

export default function AdoptPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [category, setCategory] = useState('all');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadPostIds, setUnreadPostIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const q = category === 'all'
      ? query(collection(db, 'adoptions'), where('status', '==', 'available'))
      : query(collection(db, 'adoptions'), where('status', '==', 'available'), where('type', '==', category));

    const unsub = onSnapshot(q, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setListings(data);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [category]);

  // Track which adopt chat rooms have unread messages.
  // On first snapshot, seed localStorage for rooms with no entry — so old messages don't appear as new.
  const seededRooms = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'chat_rooms'),
      where('participants', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(q, snap => {
      const unread = new Set<string>();
      snap.docs.forEach(docSnap => {
        const roomId = docSnap.id;
        if (!roomId.startsWith('adopt_')) return;
        const data = docSnap.data();
        if (data.lastMessageUid === user.uid) return;
        const lastMsgAt = data.lastMessageAt?.toMillis?.() ?? 0;
        // Seed: first time we see this room, treat current state as "already read"
        if (!seededRooms.current.has(roomId)) {
          seededRooms.current.add(roomId);
          if (!localStorage.getItem(`pawtrol_seen_${roomId}`)) {
            localStorage.setItem(`pawtrol_seen_${roomId}`, String(lastMsgAt));
          }
        }
        const lastSeen = parseInt(localStorage.getItem(`pawtrol_seen_${roomId}`) || '0');
        if (lastMsgAt > lastSeen) {
          unread.add(roomId.replace('adopt_', ''));
        }
      });
      setUnreadPostIds(unread);
    }, () => {});
    return unsub;
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginBottom: '20px' }}>
          <h1 style={{ color: 'white', fontWeight: '900', fontSize: '24px', margin: 0 }}>🐾 לוח אימוץ</h1>
          <Link href="/adopt/new" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: 'white', fontWeight: '700', padding: '10px 18px',
              borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px',
            }}>+ פרסם</button>
          </Link>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
          {CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
              flexShrink: 0, padding: '8px 14px',
              background: category === cat.id ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${category === cat.id ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '20px', color: category === cat.id ? '#FCA5A5' : '#94A3B8',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>⏳ טוען...</p>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🐾</div>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>אין פרסומים בקטגוריה זו</p>
            <Link href="/adopt/new" style={{ textDecoration: 'none' }}>
              <button style={{ marginTop: '16px', padding: '12px 24px', background: '#10B981', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                פרסם ראשון
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                hasUnread={unreadPostIds.has(listing.id)}
                onChat={() => router.push(`/chat/adopt_${listing.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function ListingCard({ listing, hasUnread, onChat }: { listing: any; hasUnread: boolean; onChat: () => void }) {
  const [showPhone, setShowPhone] = useState(false);
  const catIcon = CATEGORIES.find(c => c.id === listing.type)?.icon || '🐾';
  const catLabel = CATEGORIES.find(c => c.id === listing.type)?.label || '';

  return (
    <div style={{
      background: hasUnread ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${hasUnread ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '16px', overflow: 'hidden',
    }}>
      <div style={{ height: '150px', background: '#1E293B', position: 'relative' }}>
        {listing.images?.[0] ? (
          <img src={listing.images[0]} alt={listing.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '52px' }}>{catIcon}</div>
        )}
        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.65)', borderRadius: '8px', padding: '2px 8px', fontSize: '11px', color: 'white', fontWeight: '600' }}>
          {catIcon} {catLabel}
        </div>
      </div>
      <div style={{ padding: '10px' }}>
        <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>{listing.name || 'ללא שם'}</p>
        <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 2px' }}>📍 {listing.city}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
          {listing.age && <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '2px 6px', color: '#CBD5E1', fontSize: '11px' }}>{listing.age}</span>}
          {listing.gender && <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '2px 6px', color: '#CBD5E1', fontSize: '11px' }}>{listing.gender}</span>}
          {listing.size && <span style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '6px', padding: '2px 6px', color: '#CBD5E1', fontSize: '11px' }}>{listing.size}</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {showPhone ? (
            <a href={`tel:${listing.contactPhone}`} style={{
              flex: 1, textAlign: 'center', padding: '8px',
              background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981',
              borderRadius: '8px', color: '#6EE7B7', fontSize: '12px', fontWeight: '700', textDecoration: 'none',
            }}>
              📞 {listing.contactPhone}
            </a>
          ) : (
            <button onClick={() => setShowPhone(true)} style={{
              flex: 1, padding: '8px',
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: '8px', color: '#6EE7B7', fontSize: '12px', fontWeight: '700', cursor: 'pointer',
            }}>
              📞 קשר
            </button>
          )}
          <button onClick={onChat} style={{
            padding: '8px 12px', position: 'relative',
            background: hasUnread ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
            border: `1px solid ${hasUnread ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.25)'}`,
            borderRadius: '8px', color: '#93C5FD', fontSize: '13px', cursor: 'pointer',
          }}>
            💬
            {hasUnread && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                width: '10px', height: '10px', background: '#EF4444',
                borderRadius: '50%', border: '2px solid #0F172A',
              }} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
