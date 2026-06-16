'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/lib/auth-context';

const ANIMAL_TYPES = [
  { id: 'all',     label: 'הכל',    icon: '🐾' },
  { id: 'dog',     label: 'כלבים',  icon: '🐕' },
  { id: 'cat',     label: 'חתולים', icon: '🐈' },
  { id: 'rabbit',  label: 'ארנבים', icon: '🐇' },
  { id: 'hamster', label: 'אוגרים', icon: '🐹' },
  { id: 'parrot',  label: 'תוכים',  icon: '🦜' },
  { id: 'other',   label: 'אחר',    icon: '✨' },
];

export default function SeenPage() {
  const [filter, setFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [animalType, setAnimalType] = useState('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadPostIds, setUnreadPostIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    let q;
    if (filter === 'all' && animalType === 'all') {
      q = query(collection(db, 'seen_posts'), where('status', '==', 'active'));
    } else if (filter !== 'all' && animalType === 'all') {
      q = query(collection(db, 'seen_posts'), where('status', '==', 'active'), where('type', '==', filter));
    } else if (filter === 'all' && animalType !== 'all') {
      q = query(collection(db, 'seen_posts'), where('status', '==', 'active'), where('animalType', '==', animalType));
    } else {
      q = query(collection(db, 'seen_posts'), where('status', '==', 'active'), where('type', '==', filter), where('animalType', '==', animalType));
    }

    const unsub = onSnapshot(q, snap => {
      setPosts(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      );
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [filter, animalType]);

  // Track which seen chat rooms have unread messages
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
        if (!roomId.startsWith('seen_')) return;
        const data = docSnap.data();
        if (data.lastMessageUid === user.uid) return;
        const lastMsgAt = data.lastMessageAt?.toMillis?.() ?? 0;
        const lastSeen = parseInt(localStorage.getItem(`pawtrol_seen_${roomId}`) || '0');
        if (lastMsgAt > lastSeen) {
          unread.add(roomId.replace('seen_', ''));
        }
      });
      setUnreadPostIds(unread);
    }, () => {});
    return unsub;
  }, [user]);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ color: 'white', fontWeight: '900', fontSize: '24px', margin: 0 }}>🔍 מי ראה?</h1>
            <p style={{ color: '#64748B', fontSize: '13px', margin: '2px 0 0' }}>חיות נעלמות ונמצאות</p>
          </div>
          <Link href="/seen/new" style={{ textDecoration: 'none' }}>
            <button style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: 'white', fontWeight: '700', padding: '10px 18px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>
              + פרסם
            </button>
          </Link>
        </div>

        {/* Lost / Found tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {[
            { id: 'all',   label: 'הכל',   color: '#94A3B8' },
            { id: 'lost',  label: '😢 נעלם', color: '#EF4444' },
            { id: 'found', label: '🙌 נמצא', color: '#10B981' },
          ].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id as any)} style={{
              padding: '8px 18px',
              background: filter === t.id ? `${t.color}22` : 'rgba(255,255,255,0.05)',
              border: `1.5px solid ${filter === t.id ? t.color : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '20px', color: filter === t.id ? t.color : '#64748B',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Animal type filter */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
          {ANIMAL_TYPES.map(cat => (
            <button key={cat.id} onClick={() => setAnimalType(cat.id)} style={{
              flexShrink: 0, padding: '6px 12px',
              background: animalType === cat.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)',
              border: `1.5px solid ${animalType === cat.id ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
              borderRadius: '16px', color: animalType === cat.id ? '#FCD34D' : '#64748B',
              fontWeight: '600', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>⏳ טוען...</p>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔍</div>
            <p style={{ color: '#94A3B8', fontSize: '16px' }}>אין פרסומים כרגע</p>
            <Link href="/seen/new" style={{ textDecoration: 'none' }}>
              <button style={{ marginTop: '16px', padding: '12px 24px', background: '#F59E0B', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>
                פרסם ראשון
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                hasUnread={unreadPostIds.has(post.id)}
                onChat={() => router.push(`/chat/seen_${post.id}`)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function PostCard({ post, hasUnread, onChat }: { post: any; hasUnread: boolean; onChat: () => void }) {
  const [showPhone, setShowPhone] = useState(false);
  const isLost = post.type === 'lost';
  const animalIcon = { dog: '🐕', cat: '🐈', rabbit: '🐇', hamster: '🐹', parrot: '🦜', other: '✨' }[post.animalType as string] || '🐾';

  return (
    <div style={{
      background: hasUnread ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.05)',
      border: `1px solid ${hasUnread ? 'rgba(59,130,246,0.4)' : (isLost ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)')}`,
      borderRadius: '16px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '0' }}>
        {/* Image */}
        <div style={{ width: '110px', flexShrink: 0, background: '#1E293B', position: 'relative' }}>
          {post.images?.[0] ? (
            <img src={post.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '120px' }} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '120px', fontSize: '44px' }}>{animalIcon}</div>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
              background: isLost ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              color: isLost ? '#FCA5A5' : '#6EE7B7',
              border: `1px solid ${isLost ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
            }}>
              {isLost ? '😢 נעלם' : '🙌 נמצא'}
            </span>
            {post.nearAnimal && (
              <span style={{
                padding: '3px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: '800',
                background: 'rgba(239,68,68,0.25)', color: '#FCA5A5',
                border: '1px solid #EF4444', animation: 'pulse 1.5s infinite',
              }}>
                📍 ליד החיה עכשיו!
              </span>
            )}
            <span style={{ color: '#94A3B8', fontSize: '12px' }}>{animalIcon}</span>
          </div>

          {post.name && <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 4px' }}>{post.name}</p>}
          <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 2px' }}>📍 {post.city}</p>
          {post.lastSeen && <p style={{ color: '#64748B', fontSize: '11px', margin: '0 0 6px' }}>🗓️ {post.lastSeen}</p>}
          {post.description && <p style={{ color: '#CBD5E1', fontSize: '12px', margin: '0 0 10px', lineHeight: 1.4 }}>{post.description.slice(0, 80)}{post.description.length > 80 ? '...' : ''}</p>}

          <div style={{ display: 'flex', gap: '6px' }}>
            {showPhone ? (
              <a href={`tel:${post.contactPhone}`} style={{ flex: 1, textAlign: 'center', padding: '7px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', borderRadius: '8px', color: '#6EE7B7', fontSize: '12px', fontWeight: '700', textDecoration: 'none' }}>
                📞 {post.contactPhone}
              </a>
            ) : (
              <button onClick={() => setShowPhone(true)} style={{ flex: 1, padding: '7px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#94A3B8', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                📞 צור קשר
              </button>
            )}
            <button onClick={onChat} style={{
              padding: '7px 12px', position: 'relative',
              background: hasUnread ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
              border: `1px solid ${hasUnread ? 'rgba(59,130,246,0.6)' : 'rgba(59,130,246,0.25)'}`,
              borderRadius: '8px', color: '#93C5FD', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
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
    </div>
  );
}
