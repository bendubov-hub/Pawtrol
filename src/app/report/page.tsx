'use client';

import { useState } from 'react';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import { useLang } from '@/lib/lang-context';

const animalTypes = ['🐕 כלב','🐱 חתול','🐦 ציפור','🐰 ארנב','🐭 עכבר','🐢 צב','🐠 דג','❓ אחר'];

export default function ReportPage() {
  const { t } = useLang();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [animalType, setAnimalType] = useState('');
  const [customAnimal, setCustomAnimal] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
      // auto-request location as soon as photo is chosen
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
    }
  };

  const handleGetLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
          setLocationLoading(false);
        },
        () => {
          alert(t('report', 'locationError'));
          setLocationLoading(false);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || !location || (!animalType && !customAnimal)) return;
    setLoading(true);
    try {
      const storageRef = ref(storage, `reports/${Date.now()}_${image.name}`);
      await uploadBytes(storageRef, image);
      const imageUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, 'reports'), {
        animalType: customAnimal || animalType,
        location, description,
        timestamp: serverTimestamp(),
        imageUrl,
        status: 'pending',
        reportedBy: auth.currentUser?.uid || null,
      });
      setSuccess(true);
      setTimeout(() => {
        setImage(null); setPreview(''); setAnimalType('');
        setCustomAnimal(''); setLocation(''); setDescription('');
        setStep(1); setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '16px', animation: 'bounce 2s infinite' }}>✅</div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'white', marginBottom: '8px' }}>
            {t('report', 'successTitle')}
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '8px' }}>
            {t('report', 'successMsg')}
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
            {t('report', 'successSub')}
          </p>
        </div>
        <style>{`@keyframes bounce { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }`}</style>
      </div>
    );
  }

  const backBtn = (onClick: () => void) => (
    <button type="button" onClick={onClick} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>
      {t('common', 'back')}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 120px 16px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Header */}
        <Link href="/">
          <div style={{ textAlign: 'center', marginBottom: '32px', cursor: 'pointer', paddingTop: '16px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#FFFFFF', marginBottom: '4px' }}>🐾 Pawtrol</h1>
            <p style={{ fontSize: '12px', color: '#CBD5E1' }}>{t('report', 'title')}</p>
          </div>
        </Link>

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= step ? '#EF4444' : '#334155', transition: 'all 0.3s' }} />
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* STEP 1: IMAGE */}
          {step === 1 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '16px' }}>
                {t('report', 'step1')}
              </h2>
              {preview ? (
                <div>
                  <img src={preview} alt="preview" style={{ width: '100%', borderRadius: '16px', marginBottom: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                  <button type="button" onClick={() => setStep(2)} style={{ width: '100%', background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', fontWeight: 'bold', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px', marginBottom: '12px' }}>
                    {t('common', 'continue')}
                  </button>
                  <label style={{ display: 'block', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '12px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
                    {t('report', 'changePhoto')}
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </div>
              ) : (
                <label style={{ display: 'block', background: 'linear-gradient(135deg,#EF4444,#F97316)', color: 'white', padding: '48px 16px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📸</div>
                  <div>{t('report', 'choosePhoto')}</div>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
                <p style={{ color: '#64748B', fontSize: '12px', textAlign: 'center', marginTop: '10px', lineHeight: '1.5' }}>
                  📍 {t('report', 'locationConsent')}
                </p>
              )}
            </div>
          )}

          {/* STEP 2: ANIMAL TYPE */}
          {step === 2 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '16px' }}>
                {t('report', 'step2')}
              </h2>
              <select value={animalType} onChange={e => { setAnimalType(e.target.value); setShowCustomInput(e.target.value === '❓ אחר'); }} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', fontSize: '16px', marginBottom: '16px', cursor: 'pointer' }}>
                <option value="" style={{ background: '#1E293B' }}>{t('report', 'selectAnimal')}</option>
                {animalTypes.map(type => <option key={type} value={type} style={{ background: '#1E293B' }}>{type}</option>)}
              </select>
              {showCustomInput && (
                <input type="text" placeholder={t('report', 'otherAnimal')} value={customAnimal} onChange={e => setCustomAnimal(e.target.value)} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', fontSize: '16px', marginBottom: '16px', boxSizing: 'border-box' }} />
              )}
              <div style={{ display: 'flex', gap: '12px' }}>
                {backBtn(() => setStep(1))}
                <button type="button" onClick={() => { if (animalType || customAnimal) setStep(3); }} style={{ flex: 1, background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
                  {t('common', 'continue')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LOCATION & SUBMIT */}
          {step === 3 && (
            <div style={{ animation: 'fadeIn 0.3s' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFFFF', marginBottom: '16px' }}>
                {t('report', 'step3')}
              </h2>
              {location ? (
                <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', border: '2px solid #10B981', marginBottom: '16px' }}>
                  <p style={{ color: '#10B981', fontWeight: '600', marginBottom: '4px' }}>{t('report', 'locationFound')}</p>
                  <p style={{ fontSize: '12px', color: '#6EE7B7', margin: 0 }}>{location}</p>
                </div>
              ) : (
                <button type="button" onClick={handleGetLocation} disabled={locationLoading} style={{ width: '100%', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', fontWeight: 'bold', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginBottom: '16px' }}>
                  {locationLoading ? t('report', 'gettingLoc') : t('report', 'getLocation')}
                </button>
              )}
              <textarea placeholder={t('report', 'description')} value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px', border: '2px solid rgba(255,255,255,0.2)', fontSize: '14px', marginBottom: '16px', resize: 'none', height: '100px', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                {backBtn(() => setStep(2))}
                <button type="submit" disabled={loading || !location} style={{ flex: 1, background: loading || !location ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', fontWeight: 'bold', padding: '12px', borderRadius: '12px', border: 'none', cursor: loading || !location ? 'not-allowed' : 'pointer' }}>
                  {loading ? t('report', 'submitting') : t('report', 'submitBtn')}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <BottomNav />
    </div>
  );
}
