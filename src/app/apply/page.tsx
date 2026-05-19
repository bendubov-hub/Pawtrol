'use client';

import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';

type Step = 1 | 2 | 3 | 4;

const CITIES = ['תל אביב','ירושלים','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה','באר שבע','בני ברק','רמת גן','חולון','בת ים','רחובות','אשקלון','הרצליה','כפר סבא','מודיעין','רעננה','לוד','רמלה','אחר'];

export default function ApplyPage() {
  const { t } = useLang();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Personal
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  // Step 2 — Background
  const [experience, setExperience] = useState('');
  const [motivation, setMotivation] = useState('');
  const [hasCar, setHasCar] = useState(false);
  const [availableHours, setAvailableHours] = useState('');
  const [hasAnimals, setHasAnimals] = useState('');

  // Step 3 — References + Social
  const [ref1Name, setRef1Name] = useState('');
  const [ref1Phone, setRef1Phone] = useState('');
  const [ref2Name, setRef2Name] = useState('');
  const [ref2Phone, setRef2Phone] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');

  // Step 4 — Consent
  const [consentBackground, setConsentBackground] = useState(false);
  const [consentRules, setConsentRules] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);

  const validateStep = () => {
    if (step === 1) {
      if (!fullName || !idNumber || !birthYear || !phone || !email || !city || !address) {
        setError('יש למלא את כל השדות');
        return false;
      }
      if (idNumber.length < 7 || isNaN(Number(idNumber))) {
        setError('מספר ת.ז. לא תקין');
        return false;
      }
      const year = parseInt(birthYear);
      if (isNaN(year) || year < 1950 || year > 2007) {
        setError('שנת לידה לא תקינה');
        return false;
      }
    }
    if (step === 2) {
      if (!experience || !motivation || !availableHours) {
        setError('יש למלא את כל השדות החובה');
        return false;
      }
    }
    if (step === 3) {
      if (!ref1Name || !ref1Phone) {
        setError('חובה למלא ממליץ ראשון לפחות');
        return false;
      }
    }
    if (step === 4) {
      if (!consentBackground || !consentRules || !consentPrivacy) {
        setError('יש לאשר את כל ההסכמות');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => (s + 1) as Step);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError('');

    const applicationData = {
      fullName, idNumber, birthYear, phone, email, city, address,
      experience, motivation, hasCar, availableHours, hasAnimals,
      ref1Name, ref1Phone, ref2Name, ref2Phone,
      facebook, instagram,
      consentBackground, consentRules, consentPrivacy,
      status: 'pending_review',
      submittedAt: new Date().toISOString(),
    };

    try {
      const docId = `${Date.now()}_${idNumber}`;
      await setDoc(doc(db, 'volunteer_applications', docId), {
        ...applicationData,
        submittedAt: new Date().toISOString(),
      });
      setDone(true);
      // Email in background
      fetch('/api/send-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...applicationData, docId }),
      }).catch(() => {});
    } catch (e: any) {
      setError(t('apply','sendError'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '72px', marginBottom: '20px' }}>🐾</div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginBottom: '12px' }}>{t('apply','doneTitle')}</h1>
          <p style={{ color: '#CBD5E1', fontSize: '15px', lineHeight: '1.6', marginBottom: '8px' }}>
            {t('apply','doneMsg')}
          </p>
          <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '32px' }}>
            {t('apply','doneSub')} <strong style={{ color: 'white' }}>{email}</strong> {t('apply','doneWithin')}
          </p>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <button style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626)', color: 'white', fontWeight: 'bold', padding: '12px 32px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
              {t('apply','backHome')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 40px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', paddingTop: '24px', marginBottom: '28px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: '0 0 6px', cursor: 'pointer' }}>🐾 Pawtrol</h1>
          </Link>
          <p style={{ color: '#CBD5E1', fontSize: '14px', margin: '0 0 4px' }}>{t('apply','title')}</p>
          <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{t('apply','subtitle')}</p>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            {[t('apply','step1'), t('apply','step2'), t('apply','step3'), t('apply','step4')].map((label, i) => (
              <span key={label} style={{ fontSize: '11px', color: i + 1 <= step ? '#EF4444' : '#475569', fontWeight: i + 1 === step ? '700' : '400', flex: 1, textAlign: 'center' }}>
                {label}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? '#EF4444' : '#1E293B', transition: 'background 0.3s', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '24px' }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h2 style={stepTitle}>👤 פרטים אישיים</h2>
              <F label="שם מלא *" value={fullName} onChange={setFullName} placeholder="ישראל ישראלי" />
              <F label="מספר תעודת זהות *" value={idNumber} onChange={setIdNumber} placeholder="123456789" type="number" />
              <F label="שנת לידה *" value={birthYear} onChange={setBirthYear} placeholder="1995" type="number" hint="מינימום גיל 18" />
              <F label="טלפון נייד *" value={phone} onChange={setPhone} placeholder="050-1234567" type="tel" />
              <F label='דוא"ל *' value={email} onChange={setEmail} placeholder="israel@example.com" type="email" />
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>עיר מגורים *</label>
                <select value={city} onChange={e => setCity(e.target.value)} style={inputStyle}>
                  <option value="" style={{ background: '#1E293B' }}>בחר עיר</option>
                  {CITIES.map(c => <option key={c} value={c} style={{ background: '#1E293B' }}>{c}</option>)}
                </select>
              </div>
              <F label="כתובת מלאה *" value={address} onChange={setAddress} placeholder="רחוב הרצל 1, דירה 5" />
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h2 style={stepTitle}>🐾 ניסיון ומוטיבציה</h2>
              <TA label="ניסיון עם בעלי חיים *" value={experience} onChange={setExperience} placeholder="תאר/י את הניסיון שלך עם בעלי חיים — גידול, טיפול, הצלה, עבודה עם ארגונים..." />
              <TA label="למה אתה רוצה להתנדב? *" value={motivation} onChange={setMotivation} placeholder="מה מניע אותך? מה תוכל/י לתרום?" />
              <F label="שעות זמינות *" value={availableHours} onChange={setAvailableHours} placeholder="למשל: ימים א'-ה' 18:00-21:00, שישי כל היום" />
              <TA label="האם יש לך בעלי חיים בבית?" value={hasAnimals} onChange={setHasAnimals} placeholder="כן / לא, אם כן — איזה סוג?" />
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '12px', background: hasCar ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${hasCar ? '#3B82F6' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={hasCar} onChange={e => setHasCar(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>🚗 יש לי רכב ואני מוכן/ת לנייד בעלי חיים</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h2 style={stepTitle}>📋 ממליצים וקישורים</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '18px', lineHeight: '1.5' }}>
                הממליצים עוזרים לנו לוודא שאתה/את אדם אמין שאכפת לו מרווחת בעלי החיים. הם יצרו קשר ישיר.
              </p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ color: '#60A5FA', fontSize: '13px', fontWeight: '700', margin: '0 0 12px' }}>ממליץ/ה ראשון/ה *</p>
                <F label="שם מלא" value={ref1Name} onChange={setRef1Name} placeholder="שם הממליץ" />
                <F label="טלפון" value={ref1Phone} onChange={setRef1Phone} placeholder="050-0000000" />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '700', margin: '0 0 12px' }}>ממליץ/ה שני/ה (מומלץ)</p>
                <F label="שם מלא" value={ref2Name} onChange={setRef2Name} placeholder="שם הממליץ" />
                <F label="טלפון" value={ref2Phone} onChange={setRef2Phone} placeholder="050-0000000" />
              </div>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '12px', fontWeight: '600' }}>רשתות חברתיות (אופציונלי)</p>
              <F label="Facebook" value={facebook} onChange={setFacebook} placeholder="facebook.com/username" />
              <F label="Instagram" value={instagram} onChange={setInstagram} placeholder="@username" />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h2 style={stepTitle}>✅ הסכמות ואישורים</h2>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '20px', lineHeight: '1.6' }}>
                לפני שנמשיך, נצטרך את הסכמתך לכמה דברים חשובים:
              </p>
              <Consent
                checked={consentBackground}
                onChange={setConsentBackground}
                text="אני מסכים/ה שPawtrol תבצע בדיקת רקע בסיסית לצורך אימות זהותי ומניעת פגיעה בבעלי חיים."
              />
              <Consent
                checked={consentRules}
                onChange={setConsentRules}
                text="אני מתחייב/ת לפעול לפי כללי ההתנהגות של Pawtrol — כולל איסור מוחלט על כל פגיעה בבעלי חיים, פיזית, נפשית, או הזנחה."
              />
              <Consent
                checked={consentPrivacy}
                onChange={setConsentPrivacy}
                text="אני מסכים/ה שהפרטים שמסרתי ישמשו לצורך תהליך הצטרפות בלבד ויישמרו בצורה מאובטחת."
              />
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px', marginTop: '8px' }}>
                <p style={{ color: '#FCD34D', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                  ⚠️ כל בקשה עוברת בדיקה ידנית. אישור ממוצע לוקח 3-7 ימי עסקים.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ padding: '12px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '10px', color: '#FCA5A5', fontSize: '13px', marginTop: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            {step > 1 && (
              <button onClick={() => { setStep(s => (s - 1) as Step); setError(''); }} style={{ flex: '0 0 80px', padding: '13px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#CBD5E1', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
                {t('common','back')}
              </button>
            )}
            {step < 4 ? (
              <button onClick={handleNext} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '15px' }}>
                {t('common','continue')}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: loading ? '#334155' : 'linear-gradient(135deg, #10B981, #059669)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', opacity: loading ? 0.7 : 1 }}>
                {loading ? t('apply','submitting') : t('apply','submitBtn')}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#475569', fontSize: '12px', marginTop: '20px' }}>
          {t('apply','alreadyMember')}{' '}
          <Link href="/auth/login" style={{ color: '#EF4444', fontWeight: '600', textDecoration: 'none' }}>{t('apply','loginHere')}</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────

const stepTitle: React.CSSProperties = { color: 'white', fontSize: '18px', fontWeight: '800', margin: '0 0 18px' };
const labelStyle: React.CSSProperties = { display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };

function F({ label, value, onChange, placeholder, type = 'text', hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{label}</label>
      {hint && <p style={{ color: '#64748B', fontSize: '11px', margin: '-2px 0 6px' }}>{hint}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function TA({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={labelStyle}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
    </div>
  );
}

function Consent({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return (
    <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '14px', background: checked ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '12px', cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '1px', cursor: 'pointer', flexShrink: 0, accentColor: '#10B981' }} />
      <span style={{ color: '#CBD5E1', fontSize: '13px', lineHeight: '1.6' }}>{text}</span>
    </label>
  );
}
