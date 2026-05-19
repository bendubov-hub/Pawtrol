'use client';

import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const animalTypes = [
  '🐕 כלבים',
  '🐱 חתולים',
  '🐦 ציפורים',
  '🐰 ארנבות',
  '🐭 עכברים',
  '🐢 צבים',
  '🐠 דגים',
  '🦴 עצמות/פחות',
];

export default function RegisterOrganizationPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 2: Details
  const [animalTypes_, setAnimalTypes] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [socialMedia, setSocialMedia] = useState('');

  // Step 3: Verification
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step !== 3) {
      if (step === 1) {
        if (!name || !email || !phone || !city || !password || !passwordConfirm) {
          setError('בדוק שהכל מלא');
          return;
        }
        if (password !== passwordConfirm) {
          setError('הסיסמאות לא תואמות');
          return;
        }
        setStep(2);
      } else if (step === 2) {
        if (animalTypes_.length === 0) {
          setError('בחר לפחות סוג חיה אחד');
          return;
        }
        setStep(3);
      }
      setError('');
      return;
    }

    if (!registrationNumber || !certificateFile) {
      setError('בדוק שהכל מלא');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Save Organization to Firestore (uid as document ID)
      await setDoc(doc(db, 'organizations', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name,
        email,
        phone,
        city,
        description,
        animalTypes: animalTypes_,
        website,
        socialMedia,
        registrationNumber,
        status: 'pending', // ממתין לאישור אדמין
        createdAt: new Date(),
        verified: false,
      });

      router.push('/auth/success');
    } catch (err: any) {
      setError(err.message || 'שגיאה בהרשמה');
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
        maxWidth: '500px',
        width: '100%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '900',
            color: 'white',
            marginBottom: '8px',
          }}>
            🐾 Pawtrol
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '14px' }}>
            הרשמה כעמותה חדשה
          </p>
        </div>

        {/* Progress */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
        }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: i <= step ? '#EF4444' : '#334155',
                transition: 'all 0.3s',
              }}
            ></div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* STEP 1 */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                פרטי העמותה
              </h2>

              <Input label="שם העמותה" value={name} onChange={setName} placeholder="למשל: עזרה לחיות מחניקות" />
              <Input label='דוא"ל' type="email" value={email} onChange={setEmail} placeholder="example@organization.org" />
              <Input label="טלפון" value={phone} onChange={setPhone} placeholder="050-1234567" />
              <Input label="עיר" value={city} onChange={setCity} placeholder="תל אביב" />
              <Input label="סיסמה" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
              <Input label="אימות סיסמה" type="password" value={passwordConfirm} onChange={setPasswordConfirm} placeholder="••••••••" />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                סוגי חיות ופרטים
              </h2>

              <label style={{ color: '#CBD5E1', fontSize: '14px', display: 'block', marginBottom: '12px', fontWeight: '600' }}>
                אילו חיות אתם מטפלים בהן?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {animalTypes.map((type) => (
                  <label key={type} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: animalTypes_.includes(type) ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    border: animalTypes_.includes(type) ? '2px solid #EF4444' : '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}>
                    <input
                      type="checkbox"
                      checked={animalTypes_.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAnimalTypes([...animalTypes_, type]);
                        } else {
                          setAnimalTypes(animalTypes_.filter(t => t !== type));
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ color: 'white', fontSize: '14px' }}>{type}</span>
                  </label>
                ))}
              </div>

              <Textarea label="תיאור העמותה" value={description} onChange={setDescription} placeholder="תיאור קצר על העמותה..." />
              <Input label="אתר (אופציונלי)" value={website} onChange={setWebsite} placeholder="https://example.org" />
              <Input label="רשתות חברתיות (אופציונלי)" value={socialMedia} onChange={setSocialMedia} placeholder="@facebook_page" />
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
                אישור רישום
              </h2>

              <Input label="מספר רישום במאגר המדיני" value={registrationNumber} onChange={setRegistrationNumber} placeholder="למשל: 123456789" />
              
              <label style={{ color: '#CBD5E1', fontSize: '14px', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                העלאת תעודת רישום (PDF/תמונה)
              </label>
              <label style={{
                display: 'block',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                textAlign: 'center',
                cursor: 'pointer',
                color: certificateFile ? '#10B981' : '#CBD5E1',
                transition: 'all 0.2s',
              }}>
                {certificateFile ? `✓ ${certificateFile.name}` : '📁 בחר קובץ'}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid #3B82F6',
                borderRadius: '8px',
                color: '#93C5FD',
                fontSize: '13px',
                marginTop: '12px',
              }}>
                📋 תעודת הרישום תוודא על ידי הצוות שלנו תוך 24-48 שעות
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(220, 38, 38, 0.1)',
              border: '1px solid #DC2626',
              borderRadius: '8px',
              color: '#FCA5A5',
              fontSize: '14px',
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                }}
              >
                ← חזור
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: 'white',
                fontWeight: 'bold',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {step === 3 ? (loading ? '⏳ משדר...' : '✓ שלח להאשור') : 'המשך →'}
            </button>
          </div>
        </form>

        {/* Login Link */}
        <Link href="/auth/login">
          <p style={{
            textAlign: 'center',
            marginTop: '16px',
            color: '#CBD5E1',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            כבר יש לך חשבון? <span style={{ color: '#EF4444', fontWeight: 'bold' }}>התחבר כאן</span>
          </p>
        </Link>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Helper Components
function Input({ label, type = 'text', value, onChange, placeholder }: any) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{
        display: 'block',
        color: '#CBD5E1',
        fontSize: '14px',
        marginBottom: '6px',
        fontWeight: '600',
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder }: any) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{
        display: 'block',
        color: '#CBD5E1',
        fontSize: '14px',
        marginBottom: '6px',
        fontWeight: '600',
      }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          resize: 'vertical',
          minHeight: '80px',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}