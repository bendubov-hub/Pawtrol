'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';

export default function SuccessPage() {
  const { t } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
      <div style={{ fontSize: '72px', marginBottom: '24px' }}>🎉</div>
      <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '12px' }}>
        {t('authSuccess','title')}
      </h1>
      <p style={{ color: '#CBD5E1', fontSize: '16px', maxWidth: '380px', lineHeight: '1.6', marginBottom: '8px' }}>
        {t('authSuccess','msg')} <strong style={{ color: 'white' }}>{t('authSuccess','hours')}</strong>.
      </p>
      <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '40px' }}>
        {t('authSuccess','emailHint')}
      </p>
      <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3B82F6', borderRadius: '12px', padding: '16px 24px', maxWidth: '380px', width: '100%', marginBottom: '32px' }}>
        <p style={{ color: '#93C5FD', fontSize: '14px', margin: 0 }}>
          📧 {t('authSuccess','emailHint')}
        </p>
      </div>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <button style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', color: 'white', fontWeight: 'bold', padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
          {t('authSuccess','backHome')}
        </button>
      </Link>
    </div>
  );
}
