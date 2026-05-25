'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';

function JoinForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { t } = useLang();
  const token = params.get('token');

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'used' | 'done'>('loading');
  const [invite, setInvite] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    getDoc(doc(db, 'invites', token)).then(snap => {
      if (!snap.exists()) { setStatus('invalid'); return; }
      const data = snap.data();
      if (data.used) { setStatus('used'); return; }
      if (new Date(data.expiresAt) < new Date()) { setStatus('expired'); return; }
      setInvite(data);
      setStatus('valid');
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) { setError('הסיסמא חייבת להכיל לפחות 8 תווים'); return; }
    if (password !== passwordConfirm) { setError('הסיסמאות לא תואמות'); return; }

    setSubmitting(true);
    try {
      // API handles create-or-update via Admin SDK (works even if email already exists)
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error === 'used') { setStatus('used'); return; }
        if (json.error === 'expired') { setStatus('expired'); return; }
        if (json.error === 'invalid_token') { setStatus('invalid'); return; }
        setError(json.error || t('common', 'error'));
        return;
      }

      // Sign in client-side now that the account is ready
      await signInWithEmailAndPassword(auth, invite.email, password);

      setStatus('done');
      setTimeout(() => router.push(json.isOrg ? '/organizations' : '/volunteer'), 2000);
    } catch (err: any) {
      setError(err.message || t('common', 'error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return <Screen icon="⏳" title={t('common','loading')} subtitle="" />;
  }

  if (status === 'invalid') {
    return <Screen icon="❌" title={t('join','invalidLink')} subtitle={t('join','invalidSub')} />;
  }

  if (status === 'expired') {
    return <Screen icon="⏰" title={t('join','expiredLink')} subtitle={t('join','expiredSub')} />;
  }

  if (status === 'used') {
    return (
      <Screen icon="✅" title={t('join','usedTitle')} subtitle={t('join','usedSub')}>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <button style={btnStyle('#EF4444')}>{t('join','loginBtn')}</button>
        </Link>
      </Screen>
    );
  }

  if (status === 'done') {
    return <Screen icon="🎉" title={`${t('join','doneTitle')} ${invite?.name || invite?.fullName}!`} subtitle={t('join','doneSub')} />;
  }

  // Valid — show password form
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>

        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 6px' }}>🐾 Pawtrol</h1>
          <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>{t('join','title')}</p>
        </div>

        {/* Welcome card */}
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
          <p style={{ color: '#6EE7B7', fontWeight: '700', margin: '0 0 6px', fontSize: '15px' }}>
            ✅ {t('join','welcome')} {invite?.name || invite?.fullName}!
          </p>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
            {invite?.email} · {invite?.city}
          </p>
        </div>

        {/* Password form */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '24px' }}>
          <p style={{ color: 'white', fontWeight: '700', fontSize: '16px', margin: '0 0 18px' }}>
            {t('join','setPassword')}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>{t('join','passwordLabel')}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('join','confirmLabel')}</label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={e => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
              />
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: password.length >= i * 3 ? (password.length >= 10 ? '#10B981' : password.length >= 6 ? '#F59E0B' : '#EF4444') : '#334155', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>
                  {password.length < 6 ? t('join','weak') : password.length < 10 ? t('join','medium') : t('join','strong')}
                </p>
              </div>
            )}

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#FCA5A5', fontSize: '13px' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={submitting} style={btnStyle(submitting ? '#334155' : '#EF4444', submitting)}>
              {submitting ? t('join','creating') : t('join','createBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<Screen icon="⏳" title="טוען..." subtitle="" />}>
      <JoinForm />
    </Suspense>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

function Screen({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>{icon}</div>
        <h1 style={{ color: 'white', fontSize: '22px', fontWeight: '800', margin: '0 0 10px' }}>{title}</h1>
        {subtitle && <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 24px' }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };
const btnStyle = (bg: string, disabled = false): React.CSSProperties => ({ width: '100%', padding: '13px', background: bg, color: 'white', border: 'none', borderRadius: '12px', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', opacity: disabled ? 0.7 : 1 });
