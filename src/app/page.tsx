'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';
import { useChatNotify } from '@/lib/chat-notify-context';

export default function Home() {
  const { t } = useLang();
  const { user, profile } = useAuth();
  const { hasUnread, markRead } = useChatNotify();
  const [mounted, setMounted] = useState(false);
  const [counts, setCounts] = useState({ total: 0, rescued: 0, inProgress: 0, volunteers: 0 });

  useEffect(() => {
    setMounted(true);

    async function fetchStats() {
      try {
        const [total, rescued, inProgress, volunteers] = await Promise.all([
          getCountFromServer(collection(db, 'reports')),
          getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'rescued'))),
          getCountFromServer(query(collection(db, 'reports'), where('status', '==', 'in_progress'))),
          getCountFromServer(collection(db, 'volunteers')),
        ]);
        setCounts({
          total: total.data().count,
          rescued: rescued.data().count,
          inProgress: inProgress.data().count,
          volunteers: volunteers.data().count,
        });
      } catch {}
    }

    fetchStats();
  }, []);

  if (!mounted) return null;

  const stats = [
    { icon: '📸', label: t('home', 'statReports'),  value: counts.total.toString(),     color: '#F97316' },
    { icon: '✅', label: t('home', 'statRescued'),   value: counts.rescued.toString(),   color: '#10B981' },
    { icon: '⏳', label: t('home', 'statProgress'),  value: counts.inProgress.toString(),color: '#F59E0B' },
    { icon: '🤝', label: t('home', 'statVols'),      value: counts.volunteers.toString(),color: '#3B82F6' },
  ];

  return (
    <div 
      style={{ 
        background: `linear-gradient(135deg, #0F172A 0%, #1E293B 100%)`,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
      }}
    >
      {/* Top Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingTop: '16px' }}>
        {user ? (
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>שלום, {profile?.name || user.email}</span>
        ) : <span />}
        {user ? (
          <button onClick={() => signOut(auth)} style={{
            background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', fontWeight: 'bold',
            padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)',
            cursor: 'pointer', fontSize: '14px',
          }}>
            התנתק
          </button>
        ) : (
          <Link href="/auth/login" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', fontWeight: 'bold',
              padding: '10px 20px', borderRadius: '8px', border: '2px solid #EF4444',
              cursor: 'pointer', fontSize: '14px',
            }}>
              {t('home', 'loginBtn')}
            </button>
          </Link>
        )}
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px', animation: 'bounce 2s infinite' }}>
          🐾
        </div>
        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#FFFFFF', marginBottom: '8px' }}>
          Pawtrol
        </h1>
        <p style={{ color: '#CBD5E1', fontSize: '16px', marginBottom: '8px' }}>
          {t('home', 'tagline')}
        </p>
        <p style={{ color: '#94A3B8', fontSize: '14px' }}>
          {t('home', 'subTagline')}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '32px',
        maxWidth: '500px',
        margin: '0 auto 32px auto',
        width: '100%',
      }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: `linear-gradient(135deg, ${stat.color}99 0%, ${stat.color} 100%)`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>{stat.icon}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%', marginBottom: '24px' }}>
        <Link href="/report" style={{ textDecoration: 'none' }}>
          <button
            style={{
              width: '100%',
              background: `linear-gradient(135deg, #EF4444 0%, #DC2626 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 20px 25px -5px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 25px 30px -5px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 20px 25px -5px rgba(239, 68, 68, 0.3)';
            }}
          >
            {t('home', 'ctaReport')}
          </button>
        </Link>
      </div>

      {/* Secondary CTA */}
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%', paddingBottom: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Volunteer/Org dashboard shortcut */}
        {profile?.role === 'volunteer' && (
          <Link href="/volunteer" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', background: 'rgba(16,185,129,0.1)', color: '#6EE7B7', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              🦺 דשבורד מתנדב
            </button>
          </Link>
        )}
        {profile?.role === 'organization' && (
          <Link href="/organizations" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              🏢 דשבורד עמותה
            </button>
          </Link>
        )}
        {profile?.role === 'admin' && (
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <button style={{ width: '100%', background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '14px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
              ⚙️ פאנל ניהול
            </button>
          </Link>
        )}
        <Link href="/chat" style={{ textDecoration: 'none' }} onClick={markRead}>
          <button style={{ width: '100%', background: 'rgba(139,92,246,0.1)', color: '#C4B5FD', border: `1px solid ${hasUnread ? '#A78BFA' : 'rgba(139,92,246,0.3)'}`, borderRadius: '14px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', position: 'relative' }}>
            🪺 מאורות — צ'אט קהילתי
            {hasUnread && (
              <span style={{ position: 'absolute', top: '10px', left: '14px', width: '10px', height: '10px', background: '#EF4444', borderRadius: '50%', border: '2px solid #0F172A' }} />
            )}
          </button>
        </Link>
        <Link href="/apply" style={{ textDecoration: 'none' }}>
          <button style={{ width: '100%', background: 'rgba(59,130,246,0.1)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '14px', padding: '13px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}>
            {t('home', 'ctaVolunteer')}
          </button>
        </Link>
      </div>

      <div style={{ height: '90px' }} />
      <BottomNav />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}