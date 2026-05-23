'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection, addDoc, updateDoc, doc, onSnapshot,
  serverTimestamp, deleteDoc, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';

// ── types ──────────────────────────────────────────────────────────────────
type StepStatus = 'idle' | 'running' | 'ok' | 'fail';

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

interface TestRun {
  id: string;
  steps: Step[];
  reportId?: string;
  startedAt: number;
  done: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────────
const TEST_ANIMAL  = '🐕 כלב';
const TEST_LOCATION = 'תל אביב — בדיקה אוטומטית';
const TEST_COORDS  = '32.0853,34.7818'; // Tel Aviv

function makeSteps(): Step[] {
  return [
    { id: 'create',   label: '1. יצירת דיווח ב-Firestore',       status: 'idle' },
    { id: 'notify',   label: '2. שליחת התראות למתנדבים/עמותות',  status: 'idle' },
    { id: 'handle',   label: '3. מתנדב מטפל (status → in_progress)', status: 'idle' },
    { id: 'rescued',  label: '4. הוצל! (status → rescued)',        status: 'idle' },
    { id: 'notifyR',  label: '5. התראה למדווח על הצלה',           status: 'idle' },
    { id: 'cleanup',  label: '6. מחיקת דיווח הבדיקה',             status: 'idle' },
  ];
}

function statusIcon(s: StepStatus) {
  if (s === 'idle')    return <span style={{ color: '#475569' }}>○</span>;
  if (s === 'running') return <span style={{ color: '#F59E0B', display: 'inline-block', animation: 'spin 1s linear infinite' }}>◌</span>;
  if (s === 'ok')      return <span style={{ color: '#10B981' }}>✓</span>;
  return                      <span style={{ color: '#EF4444' }}>✗</span>;
}

// ── component ──────────────────────────────────────────────────────────────
export default function TestPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [run, setRun] = useState<TestRun | null>(null);
  const [history, setHistory] = useState<{ label: string; time: string; ok: boolean }[]>([]);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) router.push('/');
  }, [user, profile, loading, router]);

  // ── update a single step ──
  function setStep(steps: Step[], id: string, status: StepStatus, detail?: string): Step[] {
    return steps.map(s => s.id === id ? { ...s, status, detail } : s);
  }

  // ── run full end-to-end test ──
  async function runTest() {
    if (run && !run.done) return; // already running

    const steps = makeSteps();
    const testRun: TestRun = { id: Date.now().toString(), steps, startedAt: Date.now(), done: false };
    setRun({ ...testRun });

    let reportId = '';

    // ── STEP 1: create report in Firestore ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'create', 'running') } : r);
    try {
      const docRef = await addDoc(collection(db, 'reports'), {
        animalType:     TEST_ANIMAL,
        location:       `${TEST_COORDS} — ${TEST_LOCATION}`,
        description:    'דיווח בדיקה אוטומטי — נמחק בסוף',
        status:         'pending',
        reportedBy:     user!.uid,
        reporterEmail:  user!.email,
        stillThere:     null,
        timestamp:      serverTimestamp(),
        _isTest:        true,
      });
      reportId = docRef.id;
      setRun(r => r ? { ...r, reportId, steps: setStep(r.steps, 'create', 'ok', `ID: ${reportId.slice(0, 8)}…`) } : r);
    } catch (e: any) {
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'create', 'fail', e.message), done: true } : r);
      return;
    }

    // ── STEP 2: call /api/notify-report ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'notify', 'running') } : r);
    try {
      const res = await fetch('/api/notify-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animalType:  TEST_ANIMAL,
          location:    `${TEST_COORDS} — ${TEST_LOCATION}`,
          reportId,
          stillThere:  null,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'API returned ok:false');
      const detail = `${json.volunteers ?? 0} מתנדבים, ${json.orgs ?? 0} עמותות${json.urgent ? ' 🚨 דחוף' : ''}`;
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'notify', 'ok', detail) } : r);
    } catch (e: any) {
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'notify', 'fail', e.message), done: true } : r);
      await cleanup(reportId);
      return;
    }

    // ── STEP 3: volunteer handles (update Firestore directly) ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'handle', 'running') } : r);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status:    'in_progress',
        handledBy: user!.uid,
        handledAt: serverTimestamp(),
      });
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'handle', 'ok', 'status = in_progress') } : r);
    } catch (e: any) {
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'handle', 'fail', e.message), done: true } : r);
      await cleanup(reportId);
      return;
    }

    // ── STEP 4: mark rescued ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'rescued', 'running') } : r);
    try {
      await updateDoc(doc(db, 'reports', reportId), {
        status:     'rescued',
        rescuedAt:  serverTimestamp(),
      });
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'rescued', 'ok', 'status = rescued') } : r);
    } catch (e: any) {
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'rescued', 'fail', e.message), done: true } : r);
      await cleanup(reportId);
      return;
    }

    // ── STEP 5: call /api/notify-rescued ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'notifyR', 'running') } : r);
    try {
      const res = await fetch('/api/notify-rescued', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, animalType: TEST_ANIMAL, location: TEST_LOCATION }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'API returned ok:false');
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'notifyR', 'ok', json.sent ? 'נשלחה התראה' : 'לא היה טוקן/אימייל') } : r);
    } catch (e: any) {
      setRun(r => r ? { ...r, steps: setStep(r.steps, 'notifyR', 'fail', e.message) } : r);
      // not fatal — continue to cleanup
    }

    // ── STEP 6: delete test report ──
    setRun(r => r ? { ...r, steps: setStep(r.steps, 'cleanup', 'running') } : r);
    await cleanup(reportId);
    setRun(r => {
      if (!r) return r;
      const steps = setStep(r.steps, 'cleanup', 'ok', 'נמחק מ-Firestore');
      const ok = steps.every(s => s.status === 'ok');
      const entry = { label: ok ? '✅ כל הבדיקות עברו' : '⚠️ חלק מהבדיקות נכשלו', time: new Date().toLocaleTimeString('he-IL'), ok };
      setHistory(h => [entry, ...h.slice(0, 9)]);
      return { ...r, steps, done: true };
    });
  }

  async function cleanup(id: string) {
    try { await deleteDoc(doc(db, 'reports', id)); } catch {}
  }

  if (loading) return null;
  if (!user || profile?.role !== 'admin') return null;

  const allOk   = run?.steps.every(s => s.status === 'ok');
  const anyFail = run?.steps.some(s => s.status === 'fail');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <div style={{ paddingTop: '16px', marginBottom: '24px' }}>
          <h1 style={{ color: 'white', fontWeight: '900', fontSize: '22px', margin: '0 0 4px' }}>🧪 בדיקות מערכת</h1>
          <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>מריץ את אותן פונקציות בדיוק כמו האפליקציה</p>
        </div>

        {/* Run button */}
        <button
          onClick={runTest}
          disabled={!!(run && !run.done)}
          style={{
            width: '100%',
            padding: '16px',
            background: run && !run.done ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#10B981,#059669)',
            color: run && !run.done ? '#64748B' : 'white',
            border: 'none',
            borderRadius: '14px',
            fontWeight: '800',
            fontSize: '16px',
            cursor: run && !run.done ? 'not-allowed' : 'pointer',
            marginBottom: '20px',
            transition: 'all 0.2s',
          }}
        >
          {run && !run.done ? '⏳ בדיקה רצה...' : '▶ הפעל בדיקה מלאה'}
        </button>

        {/* Steps */}
        {run && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${allOk ? 'rgba(16,185,129,0.4)' : anyFail ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                ריצה #{run.id.slice(-4)}
              </span>
              {run.done && (
                <span style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                  color: allOk ? '#10B981' : '#F59E0B',
                  background: allOk ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                }}>
                  {allOk ? '✅ הכל עבר!' : '⚠️ יש כשלונות'}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {run.steps.map(step => (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 14px',
                  background: step.status === 'ok' ? 'rgba(16,185,129,0.06)'
                            : step.status === 'fail' ? 'rgba(239,68,68,0.06)'
                            : step.status === 'running' ? 'rgba(245,158,11,0.06)'
                            : 'rgba(255,255,255,0.02)',
                  borderRadius: '10px',
                  border: `1px solid ${
                    step.status === 'ok' ? 'rgba(16,185,129,0.2)'
                    : step.status === 'fail' ? 'rgba(239,68,68,0.25)'
                    : step.status === 'running' ? 'rgba(245,158,11,0.25)'
                    : 'rgba(255,255,255,0.05)'
                  }`,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: '16px', lineHeight: '1.4', flexShrink: 0 }}>{statusIcon(step.status)}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: step.status === 'ok' ? '#6EE7B7'
                           : step.status === 'fail' ? '#FCA5A5'
                           : step.status === 'running' ? '#FDE68A'
                           : '#94A3B8',
                      fontSize: '13px', fontWeight: '600', margin: '0 0 2px',
                    }}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p style={{ color: '#64748B', fontSize: '11px', margin: 0, fontFamily: 'monospace' }}>{step.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px' }}>
            <p style={{ color: '#64748B', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 10px' }}>היסטוריה</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: h.ok ? '#6EE7B7' : '#FCA5A5', fontSize: '13px' }}>{h.label}</span>
                  <span style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace' }}>{h.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What this tests */}
        <div style={{ marginTop: '20px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '14px', padding: '16px' }}>
          <p style={{ color: '#93C5FD', fontSize: '12px', fontWeight: '700', margin: '0 0 8px', textTransform: 'uppercase' }}>מה הבדיקה בודקת</p>
          <ul style={{ color: '#64748B', fontSize: '12px', margin: 0, paddingRight: '16px', lineHeight: '1.8' }}>
            <li>חיבור ל-Firestore (קריאה/כתיבה)</li>
            <li>API route: /api/notify-report — אותו קוד שרץ בדיווח אמיתי</li>
            <li>שליחת אימייל/פוש למתנדבים ועמותות</li>
            <li>API route: /api/notify-rescued — אותו קוד שרץ כשמתנדב לוחץ "הוצל"</li>
            <li>הרשאות Firestore (מחיקה)</li>
          </ul>
        </div>

      </div>

      <BottomNav />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
