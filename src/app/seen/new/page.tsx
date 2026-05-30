'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';

const ANIMAL_TYPES = [
  { id: 'dog',     label: 'כלב',  icon: '🐕' },
  { id: 'cat',     label: 'חתול', icon: '🐈' },
  { id: 'rabbit',  label: 'ארנב', icon: '🐇' },
  { id: 'hamster', label: 'אוגר', icon: '🐹' },
  { id: 'parrot',  label: 'תוכי', icon: '🦜' },
  { id: 'other',   label: 'אחר',  icon: '✨' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '10px', color: 'white', fontSize: '14px', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: '600', marginBottom: '6px',
};

export default function NewSeenPage() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const [type, setType] = useState<'lost' | 'found'>('lost');
  const [animalType, setAnimalType] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'white' }}>יש להתחבר כדי לפרסם</p>
        <button onClick={() => router.push('/auth/login')} style={{ padding: '12px 24px', background: '#EF4444', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '700' }}>התחבר</button>
      </div>
    );
  }

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    setImages(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalType) { setError('בחר סוג חיה'); return; }

    setSubmitting(true);
    setError('');
    try {
      const docRef = await addDoc(collection(db, 'seen_posts'), {
        type, animalType, name, description, city, lastSeen,
        contactPhone: contactPhone || profile?.phone || '',
        userId: user.uid, userEmail: user.email,
        status: 'active', images: [], createdAt: serverTimestamp(),
      });

      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const storageRef = ref(storage, `seen/${docRef.id}/${i}`);
        await uploadBytes(storageRef, images[i]);
        urls.push(await getDownloadURL(storageRef));
      }
      if (urls.length) await updateDoc(doc(db, 'seen_posts', docRef.id), { images: urls });

      router.replace('/seen');
    } catch (err: any) {
      setError(err.message || 'שגיאה בפרסום');
    } finally {
      setSubmitting(false);
    }
  };

  const isLost = type === 'lost';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ paddingTop: '16px', marginBottom: '24px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px', padding: 0, marginBottom: '8px' }}>← חזור</button>
          <h1 style={{ color: 'white', fontWeight: '900', fontSize: '22px', margin: 0 }}>🔍 פרסם ב"מי ראה?"</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Lost / Found */}
          <div>
            <label style={labelStyle}>סוג פרסום *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button type="button" onClick={() => setType('lost')} style={{
                padding: '14px', borderRadius: '12px', border: `2px solid ${isLost ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                background: isLost ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                color: isLost ? '#FCA5A5' : '#94A3B8', fontWeight: '700', cursor: 'pointer', fontSize: '15px',
              }}>
                😢 חיה נעלמה
              </button>
              <button type="button" onClick={() => setType('found')} style={{
                padding: '14px', borderRadius: '12px', border: `2px solid ${!isLost ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                background: !isLost ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                color: !isLost ? '#6EE7B7' : '#94A3B8', fontWeight: '700', cursor: 'pointer', fontSize: '15px',
              }}>
                🙌 מצאתי חיה
              </button>
            </div>
          </div>

          {/* Animal type */}
          <div>
            <label style={labelStyle}>סוג חיה *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ANIMAL_TYPES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setAnimalType(cat.id)} style={{
                  padding: '8px 14px',
                  background: animalType === cat.id ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1.5px solid ${animalType === cat.id ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '20px', color: animalType === cat.id ? '#FCD34D' : '#94A3B8',
                  fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Images */}
          <div>
            <label style={labelStyle}>תמונות (עד 5)</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {previews.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: '80px', height: '80px' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} />
                  <button type="button" onClick={() => removeImage(i)} style={{
                    position: 'absolute', top: '-6px', right: '-6px',
                    background: '#EF4444', color: 'white', border: 'none',
                    borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '11px',
                  }}>✕</button>
                </div>
              ))}
              {images.length < 5 && (
                <label style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '28px', color: '#64748B' }}>
                  +
                  <input type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          {/* Name (optional for found) */}
          <div>
            <label style={labelStyle}>{isLost ? 'שם החיה' : 'שם (אם ידוע)'}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder={isLost ? 'למשל: רוקי' : 'אם יש שם על הקולר'} />
          </div>

          {/* City + Last seen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>עיר *</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} required style={inputStyle} placeholder="תל אביב" />
            </div>
            <div>
              <label style={labelStyle}>{isLost ? 'נעלם בתאריך' : 'נמצא בתאריך'}</label>
              <input type="text" value={lastSeen} onChange={e => setLastSeen(e.target.value)} style={inputStyle} placeholder="למשל: 28/05" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>תיאור</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder={isLost ? 'צבע, גודל, סימנים מיוחדים...' : 'איפה נמצא, מצב החיה...'} />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>טלפון ליצירת קשר *</label>
            <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required style={inputStyle} placeholder={profile?.phone || '05X-XXXXXXX'} />
          </div>

          {error && (
            <div style={{ padding: '10px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '8px', color: '#FCA5A5', fontSize: '13px' }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={submitting} style={{
            padding: '14px',
            background: submitting ? '#334155' : isLost ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'linear-gradient(135deg,#10B981,#059669)',
            color: 'white', fontWeight: '700', fontSize: '16px',
            border: 'none', borderRadius: '12px', cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}>
            {submitting ? '⏳ מפרסם...' : isLost ? '😢 פרסם חיה נעלמה' : '🙌 פרסם חיה שנמצאה'}
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
