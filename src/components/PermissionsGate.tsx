'use client';

import { useEffect, useState } from 'react';
import { registerFcmToken } from '@/lib/fcm';
import { auth } from '@/lib/firebase';

export default function PermissionsGate({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [camGranted, setCamGranted]   = useState(false);
  const [locGranted, setLocGranted]   = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [requesting, setRequesting]   = useState(false);

  useEffect(() => {
    const done = localStorage.getItem('pawtrol_permissions_done');
    if (!done) setShow(true);
  }, []);

  const requestAll = async () => {
    setRequesting(true);

    // Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      setCamGranted(true);
    } catch { setCamGranted(false); }

    // Location
    await new Promise<void>(resolve => {
      navigator.geolocation?.getCurrentPosition(
        () => { setLocGranted(true); resolve(); },
        () => { resolve(); }
      );
    });

    // Notifications
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifGranted(true);
        const uid = auth.currentUser?.uid;
        await registerFcmToken(uid);
      }
    } catch { /* not supported */ }

    setRequesting(false);
  };

  const finish = () => {
    localStorage.setItem('pawtrol_permissions_done', '1');
    setShow(false);
  };

  if (!show) return <>{children}</>;

  const allDone = camGranted || locGranted || notifGranted;

  const permItems = [
    { icon: '📷', title: 'מצלמה',    sub: 'לצילום בעלי חיים במצוקה לדיווח מהיר',          granted: camGranted },
    { icon: '📍', title: 'מיקום',    sub: 'להעברת הדיווח למתנדב הקרוב ביותר אליך',        granted: locGranted },
    { icon: '🔔', title: 'התראות',   sub: 'כדי לקבל עדכון מיידי כשדיווח חדש זקוק לעזרה', granted: notifGranted },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A,#1E293B)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '380px', width: '100%', textAlign: 'center' }}>

        <div style={{ fontSize: '64px', marginBottom: '8px' }}>🐾</div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 8px' }}>Pawtrol</h1>
        <p style={{ color: '#94A3B8', fontSize: '14px', margin: '0 0 28px', lineHeight: '1.6' }}>
          כדי לאפשר דיווחים מדויקים ומהירים,<br />האפליקציה זקוקה להרשאות הבאות:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {permItems.map(p => (
            <div key={p.title} style={{ background: p.granted ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', border: `2px solid ${p.granted ? '#10B981' : 'rgba(255,255,255,0.1)'}`, borderRadius: '14px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'right' }}>
              <div style={{ fontSize: '28px' }}>{p.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ color: 'white', fontWeight: '700', margin: '0 0 2px', fontSize: '14px' }}>{p.title}</p>
                <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>{p.sub}</p>
              </div>
              <div style={{ fontSize: '18px' }}>{p.granted ? '✅' : '⭕'}</div>
            </div>
          ))}
        </div>

        {!allDone ? (
          <button onClick={requestAll} disabled={requesting} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#EF4444,#F97316)', color: 'white', fontWeight: '800', fontSize: '16px', border: 'none', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px' }}>
            {requesting ? '⏳ מבקש הרשאות...' : '🔓 אפשר גישה לכולם'}
          </button>
        ) : (
          <button onClick={finish} style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', fontWeight: '800', fontSize: '16px', border: 'none', borderRadius: '14px', cursor: 'pointer', marginBottom: '12px' }}>
            🐾 בוא נציל חיות!
          </button>
        )}

        <button onClick={finish} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}>
          דלג (לא מומלץ)
        </button>
      </div>
    </div>
  );
}
