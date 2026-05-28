'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';

export default function LoginPage() {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const [orgSnap, adminSnap, volSnap] = await Promise.all([
        getDoc(doc(db, 'organizations', user.uid)),
        getDoc(doc(db, 'admins', user.uid)),
        getDoc(doc(db, 'volunteers', user.uid)),
      ]);
      if (adminSnap.exists()) router.replace('/admin');
      else if (orgSnap.exists()) router.replace('/organizations');
      else if (volSnap.exists()) router.replace('/volunteer');
      else router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      const [orgSnap, adminSnap, volSnap] = await Promise.all([
        getDoc(doc(db, 'organizations', user.uid)),
        getDoc(doc(db, 'admins', user.uid)),
        getDoc(doc(db, 'volunteers', user.uid)),
      ]);
      if (adminSnap.exists()) router.replace('/admin');
      else if (orgSnap.exists()) router.replace('/organizations');
      else if (volSnap.exists()) router.replace('/volunteer');
      else router.replace('/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message || 'שגיאה');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            color: 'white',
            marginBottom: '8px',
          }}>
            🐾 Pawtrol
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '14px' }}>
            {t('login', 'title')}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{
              display: 'block',
              color: '#CBD5E1',
              fontSize: '14px',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              {t('login', 'email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="example@organization.org"
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block',
              color: '#CBD5E1',
              fontSize: '14px',
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              {t('login', 'password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="••••••••"
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid #DC2626',
              borderRadius: '8px',
              color: '#FCA5A5',
              fontSize: '14px',
              textAlign: 'center',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              color: 'white',
              fontWeight: 'bold',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginTop: '8px',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 15px 20px -3px rgba(239, 68, 68, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {loading ? t('login', 'loggingIn') : t('login', 'loginBtn')}
          </button>
        </form>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: '100%', marginTop: '12px', padding: '12px',
            background: 'white', color: '#1F2937', fontWeight: '700',
            border: 'none', borderRadius: '8px',
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '10px',
            opacity: googleLoading ? 0.7 : 1, transition: 'opacity 0.2s',
          }}
        >
          {googleLoading ? '⏳...' : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              המשך עם Google
            </>
          )}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '24px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
          <span style={{ color: '#64748B', fontSize: '12px' }}>{t('login', 'orRegisterAs')}</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Register Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { href: '/auth/register/user', icon: '👤', label: t('login','registerUser'), color: '#10B981', border: '#10B981', text: '#6EE7B7' },
            { href: '/auth/register/organization', icon: '🏢', label: t('login','registerOrg'), color: '#EF4444', border: '#EF4444', text: '#FCA5A5' },
            { href: '/apply', icon: '🤝', label: t('login','registerVol'), color: '#3B82F6', border: '#3B82F6', text: '#BFDBFE' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <button type="button" style={{
                width: '100%',
                background: `${item.color}22`,
                color: item.text,
                fontWeight: '700',
                padding: '11px',
                borderRadius: '10px',
                border: `1.5px solid ${item.border}55`,
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            </Link>
          ))}
        </div>

        {/* Back to Home */}
        <Link href="/">
          <p style={{
            textAlign: 'center',
            marginTop: '16px',
            color: '#CBD5E1',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLParagraphElement).style.color = 'white';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLParagraphElement).style.color = '#CBD5E1';
          }}>
            {t('login', 'backHome')}
          </p>
        </Link>

        <p style={{ color: '#334155', fontSize: '11px', textAlign: 'center', marginTop: '16px' }}>
          בהתחברות אתה מסכים ל
          <Link href="/privacy" style={{ color: '#475569', textDecoration: 'underline' }}>מדיניות הפרטיות</Link>
        </p>
      </div>
    </div>
  );
}