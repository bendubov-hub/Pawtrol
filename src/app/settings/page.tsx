'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useLang } from '@/lib/lang-context';
import BottomNav from '@/components/BottomNav';

export default function SettingsPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [profileData, setProfileData] = useState<any>(null);
  const [available, setAvailable] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!user) return;
    const col = profile?.role === 'organization' ? 'organizations' : profile?.role === 'volunteer' ? 'volunteers' : null;
    if (!col) return;
    getDoc(doc(db, col, user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileData(data);
        setAvailable(data.available ?? false);
      }
    });
  }, [user, profile]);

  const toggleAvailability = async () => {
    if (!user) return;
    setToggling(true);
    const next = !available;
    await updateDoc(doc(db, 'volunteers', user.uid), { available: next });
    setAvailable(next);
    setToggling(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white' }}>⏳ טוען...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        <div style={{ paddingTop: '16px', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>{t('settings','title')}</h1>
        </div>

        {!user ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔐</div>
            <p style={{ color: '#CBD5E1', marginBottom: '20px' }}>{t('settings','notLoggedIn')}</p>
            <button onClick={() => router.push('/auth/login')} style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: 'white', fontWeight: 'bold', padding: '12px 32px',
              borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px',
            }}>
              {t('settings','loginBtn')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Profile card */}
            <Section title={t('settings','profileSection')}>
              <Row label={t('settings','fieldName')} value={profileData?.name || '—'} />
              <Row label={t('settings','fieldEmail')} value={user.email || '—'} />
              <Row label={t('settings','fieldPhone')} value={profileData?.phone || '—'} />
              <Row label={t('settings','fieldCity')} value={profileData?.city || '—'} />
              {profile?.role === 'volunteer' && profileData?.hasCar !== undefined && (
                <Row label={t('settings','fieldCar')} value={profileData.hasCar ? t('settings','hasCar') : t('settings','noCar')} />
              )}
              <Row label={t('settings','fieldRole')} value={
                profile?.role === 'organization' ? t('settings','roleOrg') :
                profile?.role === 'volunteer' ? t('settings','roleVol') :
                profile?.role === 'admin' ? t('settings','roleAdmin') : t('settings','roleUser')
              } />
              <Row label={t('settings','fieldStatus')} value={
                profileData?.status === 'approved' ? `✅ ${t('status','approved')}` :
                profileData?.status === 'pending' ? `⏳ ${t('status','pending')}` :
                profileData?.status === 'rejected' ? `❌ ${t('status','rejected')}` : '—'
              } />
            </Section>

            {/* Availability toggle — volunteers only */}
            {profile?.role === 'volunteer' && (
              <Section title={t('settings','availSection')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <div>
                    <p style={{ color: 'white', fontWeight: '600', margin: '0 0 2px', fontSize: '14px' }}>
                      {available ? t('settings','availOn') : t('settings','availOff')}
                    </p>
                    <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>
                      {t('settings','availHint')}
                    </p>
                  </div>
                  <button
                    onClick={toggleAvailability}
                    disabled={toggling}
                    style={{
                      width: '52px', height: '28px', borderRadius: '14px', border: 'none',
                      background: available ? '#10B981' : '#334155',
                      cursor: toggling ? 'not-allowed' : 'pointer',
                      position: 'relative', transition: 'background 0.3s', flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: '3px',
                      left: available ? '26px' : '3px',
                      width: '22px', height: '22px', borderRadius: '50%', background: 'white',
                      transition: 'left 0.3s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }} />
                  </button>
                </div>
              </Section>
            )}

            {/* Dashboard link */}
            <Section title={t('settings','linksSection')}>
              {profile?.role === 'user' && <LinkRow label={t('settings','dashboardUser')} href="/dashboard" router={router} />}
              {profile?.role === 'organization' && <LinkRow label={t('settings','dashboardOrg')} href="/organizations" router={router} />}
              {profile?.role === 'volunteer' && <LinkRow label={t('settings','dashboardVol')} href="/volunteer" router={router} />}
              {profile?.role === 'admin' && <LinkRow label={t('settings','dashboardAdmin')} href="/admin" router={router} />}
            </Section>

            {/* Logout */}
            <button onClick={handleLogout} style={{
              width: '100%', padding: '14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '12px', color: '#FCA5A5', fontWeight: '700', fontSize: '15px',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {t('settings','logoutBtn')}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '16px' }}>
      <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#94A3B8', fontSize: '14px' }}>{label}</span>
      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{value}</span>
    </div>
  );
}

function LinkRow({ label, href, router }: { label: string; href: string; router: any }) {
  return (
    <button onClick={() => router.push(href)} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
    }}>
      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{label}</span>
      <span style={{ color: '#64748B', fontSize: '16px' }}>←</span>
    </button>
  );
}
