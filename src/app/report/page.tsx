'use client';

import { useState } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';

const ANIMALS = [
  { he: 'כלב', en: 'Dog', emoji: '🐕' },
  { he: 'חתול', en: 'Cat', emoji: '🐱' },
  { he: 'חתול בר', en: 'Wild cat', emoji: '🐈' },
  { he: 'ציפור', en: 'Bird', emoji: '🐦' },
  { he: 'עיט / נשר', en: 'Eagle / Vulture', emoji: '🦅' },
  { he: 'קיפוד', en: 'Hedgehog', emoji: '🦔' },
  { he: 'שועל', en: 'Fox', emoji: '🦊' },
  { he: 'זאב', en: 'Wolf', emoji: '🐺' },
  { he: 'חזיר בר', en: 'Wild boar', emoji: '🐗' },
  { he: 'נחש', en: 'Snake', emoji: '🐍' },
  { he: 'פרה / שור', en: 'Cow / Bull', emoji: '🐄' },
  { he: 'סוס', en: 'Horse', emoji: '🐴' },
  { he: 'חמור', en: 'Donkey', emoji: '🫏' },
  { he: 'עז', en: 'Goat', emoji: '🐐' },
  { he: 'כבשה', en: 'Sheep', emoji: '🐑' },
  { he: 'ארנב', en: 'Rabbit', emoji: '🐰' },
  { he: 'עכבר', en: 'Mouse', emoji: '🐭' },
  { he: 'צב', en: 'Tortoise', emoji: '🐢' },
  { he: 'צב ים', en: 'Sea turtle', emoji: '🌊' },
  { he: 'דולפין', en: 'Dolphin', emoji: '🐬' },
  { he: 'כלב ים', en: 'Seal', emoji: '🦭' },
  { he: 'תוכי', en: 'Parrot', emoji: '🦜' },
  { he: 'אחר', en: 'Other', emoji: '❓' },
];

export default function ReportPage() {
  const { t, lang } = useLang();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);

  // Media
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [extraMedia, setExtraMedia] = useState<File[]>([]);
  const [extraPreviews, setExtraPreviews] = useState<string[]>([]);

  // Animal search
  const [animalSearch, setAnimalSearch] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Location
  const [location, setLocation] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 3
  const [stillThere, setStillThere] = useState<boolean | null>(null);
  const [description, setDescription] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [reporterPhone, setReporterPhone] = useState(profile?.phone || '');

  // Report created at step 1→2
  const [reportId, setReportId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const [stepLoading, setStepLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const filtered = ANIMALS.filter(a =>
    a.he.includes(animalSearch) || a.en.toLowerCase().includes(animalSearch.toLowerCase())
  );

  const requestLocation = () => {
    if (!location && navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          setLocationLoading(false);
        },
        () => setLocationLoading(false)
      );
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    requestLocation();
  };

  const handleExtraMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setExtraPreviews(p => [...p, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    setExtraMedia(prev => [...prev, ...files]);
  };

  const handleGetLocation = () => {
    setLocationLoading(true);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        setLocationLoading(false);
      },
      () => {
        alert(t('report', 'locationError'));
        setLocationLoading(false);
      }
    );
  };

  // ── STEP 1 → 2: upload image + create report immediately ──
  const handleStep1Continue = async () => {
    if (!image || !location) return;
    setStepLoading(true);
    try {
      let reporterFcmToken: string | null = null;
      try {
        const { registerFcmToken } = await import('@/lib/fcm');
        reporterFcmToken = await registerFcmToken(auth.currentUser?.uid);
      } catch { /* notifications not granted */ }

      const ts = Date.now();
      const mainRef = ref(storage, `reports/${ts}_${image.name}`);
      await uploadBytes(mainRef, image);
      const url = await getDownloadURL(mainRef);
      setImageUrl(url);

      const extraUrls: string[] = [];
      for (const file of extraMedia) {
        const eRef = ref(storage, `reports/${ts}_extra_${file.name}`);
        await uploadBytes(eRef, file);
        extraUrls.push(await getDownloadURL(eRef));
      }

      const docRef = await addDoc(collection(db, 'reports'), {
        location,
        imageUrl: url,
        extraMedia: extraUrls,
        status: 'pending',
        timestamp: serverTimestamp(),
        reportedBy: auth.currentUser?.uid || null,
        reporterFcmToken: reporterFcmToken || null,
        reporterEmail: auth.currentUser?.email || null,
        // animalType, phone, description, stillThere filled in next steps
      });

      setReportId(docRef.id);
      setStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setStepLoading(false);
    }
  };

  // ── STEP 2 → 3: update animal type + send notifications ──
  const handleStep2Continue = async () => {
    if (!animalType || !reportId) return;
    setStepLoading(true);
    try {
      await updateDoc(doc(db, 'reports', reportId), { animalType });

      // Send notifications now — we have location + animal type
      fetch('/api/notify-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animalType, location, reportId, imageUrl }),
      }).catch(() => {});

      setStep(3);
    } catch (err) {
      console.error(err);
    } finally {
      setStepLoading(false);
    }
  };

  // ── STEP 3: update remaining details ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportId) return;
    setStepLoading(true);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        stillThere,
        description,
        reporterPhone: reporterPhone || null,
        reporterEmail: auth.currentUser?.email || reporterEmail || null,
      });

      setSuccess(true);
      setTimeout(() => {
        setImage(null); setPreview(''); setAnimalType(''); setAnimalSearch('');
        setExtraMedia([]); setExtraPreviews([]);
        setLocation(''); setDescription(''); setStillThere(null);
        setReporterPhone(''); setReporterEmail('');
        setReportId(null); setImageUrl('');
        setStep(1); setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setStepLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#059669,#10B981)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '72px', marginBottom: '16px' }}>✅</div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>{t('report', 'successTitle')}</h1>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>{t('report', 'successMsg')}</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{t('report', 'successSub')}</p>
      </div>
    );
  }

  const backBtn = (onClick: () => void) => (
    <button type="button" onClick={onClick} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 'bold', padding: '13px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
      {t('common', 'back')}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0F172A,#1E293B)', padding: '16px 16px 120px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>

        <Link href="/">
          <div style={{ textAlign: 'center', marginBottom: '28px', cursor: 'pointer', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#fff', marginBottom: '4px' }}>🐾 Pawtrol</h1>
            <p style={{ fontSize: '12px', color: '#CBD5E1' }}>{t('report', 'title')}</p>
          </div>
        </Link>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? '#EF4444' : '#334155', transition: 'all 0.3s' }} />
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* ── STEP 1: PHOTO ── */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>{t('report', 'step1')}</h2>

              {preview ? (
                <>
                  <img src={preview} alt="preview" style={{ width: '100%', borderRadius: '14px', marginBottom: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.4)' }} />

                  {extraPreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {extraPreviews.map((src, i) => (
                        <img key={i} src={src} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #334155' }} />
                      ))}
                    </div>
                  )}

                  <label style={{ display: 'block', background: 'rgba(255,255,255,0.06)', color: '#94A3B8', padding: '11px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginBottom: '10px', border: '1.5px dashed rgba(255,255,255,0.15)' }}>
                    📎 {t('report', 'addMoreMedia')} ({extraMedia.length})
                    <input type="file" accept="image/*,video/*" multiple onChange={handleExtraMedia} style={{ display: 'none' }} />
                  </label>

                  {/* Location status */}
                  {location ? (
                    <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.4)', marginBottom: '10px' }}>
                      <p style={{ color: '#10B981', fontSize: '13px', fontWeight: '600', margin: 0 }}>📍 {t('report', 'locationFound')}</p>
                    </div>
                  ) : (
                    <button type="button" onClick={handleGetLocation} disabled={locationLoading} style={{ width: '100%', background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', fontWeight: '600', padding: '11px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer', fontSize: '13px', marginBottom: '10px' }}>
                      {locationLoading ? t('report', 'gettingLoc') : `📍 ${t('report', 'getLocation')}`}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    disabled={!location || stepLoading}
                    style={{ width: '100%', background: location && !stepLoading ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 'bold', padding: '14px', borderRadius: '12px', border: 'none', cursor: location && !stepLoading ? 'pointer' : 'not-allowed', fontSize: '16px', marginBottom: '10px', opacity: location ? 1 : 0.5 }}
                  >
                    {stepLoading ? '⏳ שולח דיווח...' : t('common', 'continue')}
                  </button>

                  <label style={{ display: 'block', background: 'rgba(255,255,255,0.08)', color: 'white', padding: '11px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {t('report', 'changePhoto')}
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </>
              ) : (
                <>
                  <label style={{ display: 'block', background: 'linear-gradient(135deg,#EF4444,#F97316)', color: 'white', padding: '40px 16px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '52px', marginBottom: '10px' }}>📸</div>
                    <div>{t('report', 'openCamera')}</div>
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>

                  <label style={{ display: 'block', background: 'rgba(255,255,255,0.08)', color: 'white', padding: '16px', borderRadius: '14px', textAlign: 'center', cursor: 'pointer', fontWeight: '700', fontSize: '15px', border: '2px solid rgba(255,255,255,0.15)', marginBottom: '10px' }}>
                    <span style={{ marginLeft: '8px' }}>🖼️</span> {t('report', 'chooseFromGallery')}
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>

                  <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', marginTop: '6px', lineHeight: '1.6' }}>
                    📍 {t('report', 'locationConsent')}
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── STEP 2: ANIMAL ── */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              {/* Dispatch confirmation */}
              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '12px', marginBottom: '20px' }}>
                <p style={{ color: '#6EE7B7', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>✅ הדיווח נשלח — מחפשים מתנדב</p>
                <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>המשך למלא פרטים בזמן שמתנדב בדרך</p>
              </div>

              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>{t('report', 'step2')}</h2>

              {animalType && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.4)', borderRadius: '10px', color: '#FCA5A5', fontWeight: '700', marginBottom: '12px', fontSize: '15px' }}>
                  {animalType} ✓
                </div>
              )}

              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <input
                  type="text"
                  value={animalSearch}
                  onChange={e => { setAnimalSearch(e.target.value); setShowDropdown(true); setAnimalType(''); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={t('report', 'searchAnimal')}
                  style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', fontSize: '15px', boxSizing: 'border-box' }}
                />
                {showDropdown && filtered.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1E293B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', marginTop: '4px', maxHeight: '240px', overflowY: 'auto', zIndex: 50, boxShadow: '0 10px 25px rgba(0,0,0,0.4)' }}>
                    {filtered.map(a => {
                      const label = `${a.emoji} ${lang === 'en' ? a.en : a.he}`;
                      return (
                        <div
                          key={a.he}
                          onClick={() => { setAnimalType(label); setAnimalSearch(label); setShowDropdown(false); }}
                          style={{ padding: '12px 16px', cursor: 'pointer', color: 'white', fontSize: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={handleStep2Continue}
                  disabled={!animalType || stepLoading}
                  style={{ flex: 1, background: animalType && !stepLoading ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 'bold', padding: '13px', borderRadius: '12px', border: 'none', cursor: animalType && !stepLoading ? 'pointer' : 'not-allowed', opacity: animalType ? 1 : 0.5 }}>
                  {stepLoading ? '⏳...' : t('common', 'continue')}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: DETAILS ── */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>פרטים נוספים</h2>

              {/* Still there? */}
              <p style={{ color: '#CBD5E1', fontSize: '14px', fontWeight: '600', marginBottom: '10px' }}>
                {t('report', 'stillThereQ')}
              </p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setStillThere(val)}
                    style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `2px solid ${stillThere === val ? (val ? '#10B981' : '#EF4444') : 'rgba(255,255,255,0.15)'}`, background: stillThere === val ? (val ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'transparent', color: stillThere === val ? (val ? '#6EE7B7' : '#FCA5A5') : '#94A3B8', fontWeight: '700', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' }}
                  >
                    {val ? `✅ ${t('report', 'yes')}` : `❌ ${t('report', 'no')}`}
                  </button>
                ))}
              </div>

              {/* Phone number — required */}
              <p style={{ color: '#CBD5E1', fontSize: '13px', marginBottom: '6px', fontWeight: '700' }}>
                📞 טלפון ליצירת קשר <span style={{ color: '#EF4444' }}>*</span>
              </p>
              <input
                type="tel"
                value={reporterPhone}
                onChange={e => setReporterPhone(e.target.value)}
                placeholder="050-0000000"
                required
                style={{ width: '100%', padding: '12px 14px', background: reporterPhone ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.08)', border: `1px solid ${reporterPhone ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`, borderRadius: '10px', color: 'white', fontSize: '15px', marginBottom: '4px', boxSizing: 'border-box' }}
              />
              <p style={{ color: '#475569', fontSize: '11px', marginBottom: '14px' }}>
                המתנדב יוכל להתקשר אליך ישירות
              </p>

              {/* Email — only if not logged in */}
              {!auth.currentUser && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                    🔔 {t('report', 'notifyMeHint')}
                  </p>
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={e => setReporterEmail(e.target.value)}
                    placeholder={t('report', 'notifyMePlaceholder')}
                    style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {/* Description */}
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '6px', fontWeight: '600' }}>
                📡 {t('report', 'descriptionHint')}
              </p>
              <textarea
                placeholder={t('report', 'descriptionPlaceholder')}
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '13px 16px', background: 'rgba(255,255,255,0.08)', color: 'white', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.15)', fontSize: '14px', marginBottom: '16px', resize: 'none', height: '100px', boxSizing: 'border-box' }}
              />

              <button
                type="submit"
                disabled={stepLoading || !reporterPhone}
                style={{ width: '100%', background: stepLoading || !reporterPhone ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', fontWeight: 'bold', padding: '14px', borderRadius: '12px', border: 'none', cursor: stepLoading || !reporterPhone ? 'not-allowed' : 'pointer', fontSize: '15px', opacity: reporterPhone ? 1 : 0.5 }}
              >
                {stepLoading ? t('report', 'submitting') : '✅ סיימתי — שמור פרטים'}
              </button>

              <p style={{ color: '#475569', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>
                הדיווח כבר נשלח — זה רק מוסיף מידע למתנדב
              </p>
            </div>
          )}
        </form>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <BottomNav />
    </div>
  );
}
