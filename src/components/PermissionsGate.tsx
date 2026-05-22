'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/lang-context';

export default function PermissionsGate({ children }: { children: React.ReactNode }) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  const [camGranted, setCamGranted] = useState(false);
  const [locGranted, setLocGranted] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem('pawtrol_permissions_done');
    if (!done) setShow(true);
  }, []);

  const requestCamera = async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamGranted(true);
    } catch {
      setCamGranted(false);
    }
    setRequesting(false);
  };

  const requestLocation = () => {
    setRequesting(true);
    navigator.geolocation?.getCurrentPosition(
      () => { setLocGranted(true); setRequesting(false); },
      () => { setLocGranted(false); setRequesting(false); }
    );
  };

  const requestBoth = async () => {
    await requestCamera();
    requestLocation();
  };

  const finish = () => {
    localStorage.setItem('pawtrol_permissions_done', '1');
    setShow(false);
  };

  if (!show) return <>{children}</>;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0F172A,#1E293B)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🐾</div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 8px' }}>Pawtrol</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 32px', lineHeight: '1.6' }}>
          כדי לאפשר דיווחים מדויקים ומהירים,<br />
          האפליקציה זקוקה להרשאות הבאות:
        </p>

        {/* Permissions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>

          {/* Camera */}
          <div style={{
            background: camGranted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${camGranted ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '14px', padding: '16px',
            display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right',
          }}>
            <div style={{ fontSize: '32px' }}>📷</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: '700', margin: '0 0 3px', fontSize: '15px' }}>מצלמה</p>
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>לצילום בעלי חיים במצוקה לדיווח מהיר</p>
            </div>
            <div style={{ fontSize: '20px' }}>{camGranted ? '✅' : '⭕'}</div>
          </div>

          {/* Location */}
          <div style={{
            background: locGranted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
            border: `2px solid ${locGranted ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '14px', padding: '16px',
            display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right',
          }}>
            <div style={{ fontSize: '32px' }}>📍</div>
            <div style={{ flex: 1 }}>
              <p style={{ color: 'white', fontWeight: '700', margin: '0 0 3px', fontSize: '15px' }}>מיקום</p>
              <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>להעברת הדיווח למתנדב הקרוב ביותר אליך</p>
            </div>
            <div style={{ fontSize: '20px' }}>{locGranted ? '✅' : '⭕'}</div>
          </div>
        </div>

        {/* CTA */}
        {!camGranted && !locGranted ? (
          <button
            onClick={requestBoth}
            disabled={requesting}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#EF4444,#F97316)',
              color: 'white', fontWeight: '800', fontSize: '16px',
              border: 'none', borderRadius: '14px', cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            {requesting ? '⏳ מבקש הרשאות...' : '🔓 אפשר גישה לשניהם'}
          </button>
        ) : (
          <button
            onClick={finish}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(135deg,#10B981,#059669)',
              color: 'white', fontWeight: '800', fontSize: '16px',
              border: 'none', borderRadius: '14px', cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            🐾 בוא נציל חיות!
          </button>
        )}

        <button
          onClick={finish}
          style={{
            background: 'none', border: 'none',
            color: '#475569', fontSize: '13px',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          דלג (לא מומלץ)
        </button>
      </div>
    </div>
  );
}
