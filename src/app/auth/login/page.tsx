'use client';

import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
      if (adminSnap.exists()) router.push('/admin');
      else if (orgSnap.exists()) router.push('/organizations');
      else if (volSnap.exists()) router.push('/volunteer');
      else router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
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
      </div>
    </div>
  );
}