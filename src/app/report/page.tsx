'use client';

import { useState } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import Link from 'next/link';

const animalTypes = [
  '🐕 כלב',
  '🐱 חתול',
  '🐦 ציפור',
  '🐰 ארנב',
  '🐭 עכבר',
  '🐢 צב',
  '🐠 דג',
  '❓ אחר'
];

export default function ReportPage() {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }, (error) => {
        alert('לא הצלחנו לקבל מיקום. נסה שוב או הזן ידנית');
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!image || !location || (!animalType && !customAnimal)) {
      alert('בדוק שהכל מלא: תמונה, סוג חיה, מיקום');
      return;
    }

    setLoading(true);

    try {
      const storageRef = ref(storage, `reports/${Date.now()}`);
      await uploadBytes(storageRef, image);

      await addDoc(collection(db, 'reports'), {
        animalType: customAnimal || animalType,
        location,
        description,
        timestamp: serverTimestamp(),
        imageUrl: `reports/${Date.now()}`,
        status: 'pending'
      });

      setSuccess(true);
      setTimeout(() => {
        setImage(null);
        setPreview('');
        setAnimalType('');
        setCustomAnimal('');
        setLocation('');
        setDescription('');
        setStep(1);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('שגיאה:', error);
      alert('שגיאה בשליחת הדיווח');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-7xl mb-4 animate-bounce">✅</div>
          <h1 className="text-4xl font-black text-white mb-2">תודה!</h1>
          <p className="text-xl text-white/90">הדיווח נשלח בהצלחה</p>
          <p className="text-white/80 mt-2">עמותה תציגון במהרה</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <Link href="/">
          <div className="text-center mb-6 cursor-pointer hover:opacity-80">
            <h1 className="text-3xl font-black text-white mb-1">🐾 Pawtrol</h1>
            <p className="text-sm text-gray-400">דווח על בעל חיים במצוקה</p>
          </div>
        </Link>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all ${
                i <= step ? 'bg-red-500' : 'bg-gray-700'
              }`}
            ></div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Image */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">📸 תמונה</h2>
              
              {preview ? (
                <div>
                  <img src={preview} alt="preview" className="w-full rounded-2xl mb-4 shadow-xl" />
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    ✓ המשך
                  </button>
                  <label className="block mt-3 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl text-center cursor-pointer">
                    שנה תמונה
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="block w-full bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white py-12 rounded-2xl text-center cursor-pointer font-bold shadow-xl">
                  <span className="text-4xl block mb-2">📸</span>
                  בחר תמונה
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          )}

          {/* Step 2: Animal Type */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">🦮 איזה בעל חיים?</h2>
              
              <select
                value={animalType}
                onChange={(e) => {
                  setAnimalType(e.target.value);
                  setShowCustomInput(e.target.value === '❓ אחר');
                }}
                className="w-full p-4 bg-gray-700 text-white rounded-xl border-2 border-gray-600 focus:border-red-500 outline-none"
              >
                <option value="">בחר סוג חיה</option>
                {animalTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {showCustomInput && (
                <input
                  type="text"
                  placeholder="רשום סוג חיה אחר"
                  value={customAnimal}
                  onChange={(e) => setCustomAnimal(e.target.value)}
                  className="w-full p-4 bg-gray-700 text-white rounded-xl border-2 border-gray-600 focus:border-red-500 outline-none placeholder-gray-400"
                />
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  ← חזור
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (animalType || customAnimal) setStep(3);
                    else alert('בחר סוג חיה');
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  המשך →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Location & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">📍 מיקום</h2>
              
              {location ? (
                <div className="p-4 bg-green-900/50 border-2 border-green-500 rounded-xl">
                  <p className="text-green-300 font-semibold">✓ מיקום זוהה</p>
                  <p className="text-sm text-green-200 mt-1">{location}</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl transition-all"
                >
                  🗺️ קבל מיקום
                </button>
              )}

              <textarea
                placeholder="תיאור (אופציונלי)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-700 text-white rounded-xl border-2 border-gray-600 focus:border-red-500 outline-none placeholder-gray-400 resize-none h-24"
              ></textarea>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  ← חזור
                </button>
                <button
                  type="submit"
                  disabled={loading || !location}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {loading ? '⏳ שולח...' : '🚨 שלח דיווח'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}