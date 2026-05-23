'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useLang } from '@/lib/lang-context';
import { getRank } from '@/lib/ranks';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:     { label: 'ממתין לטיפול', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  in_progress: { label: 'בטיפול', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: '🔄' },
  rescued:     { label: 'הוצל!', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  closed:      { label: 'נסגר', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: '🔒' },
};

interface Report {
  id: string;
  animalType: string;
  location: string;
  description: string;
  status: string;
  imageUrl: string;
  timestamp: any;
  imageDownloadUrl?: string;
  volunteers?: string[];
}

export default function UserDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { t } = useLang();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'reports'),
      where('reportedBy', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, async snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
      const withUrls = await Promise.all(data.map(async r => {
        if (!r.imageUrl) return r;
        try {
          const url = await getDownloadURL(ref(storage, r.imageUrl));
          return { ...r, imageDownloadUrl: url };
        } catch { return r; }
      }));
      setReports(withUrls);
      setReportsLoading(false);
    });

    return unsub;
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white' }}>{t('common','loading')}</p>
      </div>
    );
  }

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    inProgress: reports.filter(r => r.status === 'in_progress').length,
    rescued: reports.filter(r => r.status === 'rescued').length,
  };

  const rank = getRank(reports.length);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: '0 0 2px' }}>
              {t('userDash','greeting')} {profile?.name?.split(' ')[0] || ''} 👋
            </h1>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>{t('userDash','myReports')}</p>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            {t('common','logout')}
          </button>
        </div>

        {/* Rank badge */}
        <div style={{ background: rank.bg, border: `1px solid ${rank.border}`, borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '40px', lineHeight: 1 }}>{rank.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: rank.color, fontWeight: '800', fontSize: '16px' }}>{rank.he}</span>
              {rank.next && (
                <span style={{ color: '#64748B', fontSize: '12px' }}>
                  {reports.length}/{rank.next.min} לדרגה הבאה
                </span>
              )}
            </div>
            {rank.next ? (
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${rank.progress}%`, background: rank.color, borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            ) : (
              <span style={{ color: '#FBBF24', fontSize: '12px', fontWeight: '600' }}>⭐ דרגה מקסימלית!</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        {reports.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
            {[
              { label: t('home','statReports'), value: stats.total, color: '#F97316' },
              { label: t('status','pending'), value: stats.pending, color: '#F59E0B' },
              { label: t('status','in_progress'), value: stats.inProgress, color: '#3B82F6' },
              { label: t('status','rescued'), value: stats.rescued, color: '#10B981' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.color}33`, borderRadius: '12px', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* New report CTA */}
        <Link href="/report" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
          <div style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', borderRadius: '14px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 24px rgba(239,68,68,0.25)' }}>
            <div>
              <p style={{ color: 'white', fontWeight: '800', fontSize: '16px', margin: '0 0 2px' }}>{t('userDash','ctaTitle')}</p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '13px', margin: 0 }}>{t('userDash','ctaSub')}</p>
            </div>
            <span style={{ color: 'white', fontSize: '24px' }}>←</span>
          </div>
        </Link>

        {/* Reports list */}
        <h2 style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '700', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('userDash','reportsSection')}
        </h2>

        {reportsLoading ? (
          <p style={{ color: '#64748B', textAlign: 'center', padding: '40px' }}>{t('common','loading')}</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐾</div>
            <p style={{ color: '#CBD5E1', fontWeight: '600', margin: '0 0 6px' }}>{t('userDash','noReports')}</p>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>{t('userDash','noReportsSub')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reports.map(r => {
              const meta = STATUS_META[r.status] || STATUS_META.pending;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelected(r)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '14px', cursor: 'pointer', display: 'flex', gap: '14px', alignItems: 'flex-start', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  {r.imageDownloadUrl ? (
                    <img src={r.imageDownloadUrl} alt="" style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '64px', height: '64px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', flexShrink: 0 }}>🐾</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: 'white', fontWeight: '700', fontSize: '15px' }}>{r.animalType}</span>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: meta.color, background: meta.bg, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {meta.icon} {meta.label}
                      </span>
                    </div>
                    <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📍 {r.location}</p>
                    {r.volunteers && r.volunteers.length > 0 && (
                      <p style={{ color: '#6EE7B7', fontSize: '12px', margin: 0 }}>🤝 {r.volunteers.length} מתנדבים בדרך</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: '0' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Handle bar */}
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontWeight: '800', fontSize: '18px', margin: 0 }}>{selected.animalType}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}>✕</button>
            </div>

            {selected.imageDownloadUrl && (
              <img src={selected.imageDownloadUrl} alt="" style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', maxHeight: '240px', objectFit: 'cover' }} />
            )}

            {/* Status timeline */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', margin: '0 0 12px', textTransform: 'uppercase' }}>{t('userDash','statusTitle')}</p>
              {(['pending', 'in_progress', 'rescued'] as const).map((s, i) => {
                const m = STATUS_META[s];
                const statuses = ['pending', 'in_progress', 'rescued', 'closed'];
                const currentIdx = statuses.indexOf(selected.status);
                const thisIdx = statuses.indexOf(s);
                const done = currentIdx >= thisIdx;
                const current = selected.status === s;
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < 2 ? '12px' : 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: done ? m.bg : 'rgba(255,255,255,0.05)', border: `2px solid ${done ? m.color : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0, transition: 'all 0.2s' }}>
                      {done ? m.icon : ''}
                    </div>
                    <div>
                      <p style={{ color: done ? m.color : '#475569', fontSize: '13px', fontWeight: current ? '700' : '500', margin: 0 }}>{m.label}</p>
                    </div>
                    {current && <span style={{ marginRight: 'auto', fontSize: '11px', color: m.color, background: m.bg, padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>{t('userDash','statusNow')}</span>}
                  </div>
                );
              })}
            </div>

            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px' }}>📍 {selected.location}</p>
            {selected.description && <p style={{ color: '#CBD5E1', fontSize: '13px', margin: 0 }}>{selected.description}</p>}

            {selected.volunteers && selected.volunteers.length > 0 && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '10px' }}>
                <p style={{ color: '#6EE7B7', fontSize: '13px', fontWeight: '600', margin: 0 }}>
                  🤝 {selected.volunteers.length} {t('userDash','volunteersOnWay')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
