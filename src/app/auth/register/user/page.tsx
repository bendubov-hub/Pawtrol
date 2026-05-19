'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterUserPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('בדוק שהכל מלא'); return; }
    if (password !== passwordConfirm) { setError('הסיסמאות לא תואמות'); return; }
    if (password.length < 6) { setError('הסיסמא חייבת להכיל לפחות 6 תווים'); return; }

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        phone,
        role: 'user',
        createdAt: new Date(),
      });
      router.push('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('המייל כבר רשום. נסה להתחבר.');
      else setError(err.message || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', border: '1px solid rgba(255,255,255,0.1)' }}>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 6px' }}>🐾 Pawtrol</h1>
          <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>הרשמה כמשתמש</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Field label="שם מלא" value={name} onChange={setName} placeholder="ישראל ישראלי" />
          <Field label='דוא"ל' type="email" value={email} onChange={setEmail} placeholder="israel@example.com" />
          <Field label="טלפון (אופציונלי)" value={phone} onChange={setPhone} placeholder="050-1234567" type="tel" />
          <Field label="סיסמא" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
          <Field label="אימות סיסמא" type="password" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="••••••••" />

          {error && (
            <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#FCA5A5', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ padding: '13px', background: loading ? '#334155' : 'linear-gradient(135deg, #10B981, #059669)', color: 'white', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? '⏳ נרשם...' : '✅ צור חשבון'}
          </button>
        </form>

        <Link href="/auth/login">
          <p style={{ textAlign: 'center', marginTop: '16px', color: '#CBD5E1', fontSize: '14px', cursor: 'pointer' }}>
            כבר יש לך חשבון? <span style={{ color: '#10B981', fontWeight: 'bold' }}>התחבר כאן</span>
          </p>
        </Link>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, placeholder }: any) {
  return (
    <div>
      <label style={{ display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }} />
    </div>
  );
}
