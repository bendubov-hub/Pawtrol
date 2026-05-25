'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, getDoc, getDocs } from 'firebase/firestore';
import { useLang } from '@/lib/lang-context';
import { getRank } from '@/lib/ranks';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'ממתין', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  in_progress: { label: 'בטיפול', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  rescued:     { label: 'הוצל', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  closed:      { label: 'נסגר', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

interface Org {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  animalTypes?: string[];
}

interface Report {
  id: string;
  animalType: string;
  location: string;
  description: string;
  stillThere?: boolean | null;
  status: string;
  imageUrl: string;
  timestamp: any;
  volunteers?: string[];
  handledBy?: string;
  pickedUp?: boolean;
  archived?: boolean;
  reporterPhone?: string;
  reporterEmail?: string;
  imageDownloadUrl?: string;
}

export default function VolunteerDashboard() {
  const { user, profile, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'history'>('all');
  const [available, setAvailable] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [relevantOrgs, setRelevantOrgs] = useState<Org[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  // Load initial availability
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'volunteers', user.uid)).then(snap => {
      if (snap.exists()) setAvailable(snap.data().available ?? false);
    });
  }, [user]);

  const toggleAvailability = async () => {
    if (!user) return;
    setTogglingAvail(true);
    const next = !available;
    const update: any = { available: next };

    // Save current location when going available so proximity routing works
    if (next && navigator.geolocation) {
      await new Promise<void>(resolve => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            update.lat = coords.latitude;
            update.lng = coords.longitude;
            resolve();
          },
          () => resolve()
        );
      });
    }

    await updateDoc(doc(db, 'volunteers', user.uid), update);
    setAvailable(next);
    setTogglingAvail(false);
  };

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'reports'),
      where('status', 'in', ['pending', 'in_progress']),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));

      const withUrls = await Promise.all(data.map(async (r) => {
        if (!r.imageUrl) return r;
        try {
          const url = await getDownloadURL(ref(storage, r.imageUrl));
          return { ...r, imageDownloadUrl: url };
        } catch {
          return r;
        }
      }));

      setReports(withUrls);
      setReportsLoading(false);
    });

    return unsub;
  }, [user]);

  const joinReport = async (reportId: string) => {
    if (!user) return;
    setJoiningId(reportId);
    await updateDoc(doc(db, 'reports', reportId), {
      volunteers: arrayUnion(user.uid),
      status: 'in_progress',
      handledBy: user.uid,
    });
    setJoiningId(null);
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, status: 'in_progress', handledBy: user.uid, volunteers: [...(prev.volunteers || []), user.uid] } : null);
    }
  };

  const confirmPickup = async (reportId: string) => {
    setActionLoading('pickup');
    await updateDoc(doc(db, 'reports', reportId), { pickedUp: true, pickedUpAt: new Date() });
    setSelectedReport(prev => prev ? { ...prev, pickedUp: true } : null);
    setActionLoading(null);
  };

  const confirmRescued = async (reportId: string) => {
    setActionLoading('rescued');
    await updateDoc(doc(db, 'reports', reportId), { status: 'rescued', rescuedAt: new Date() });
    setSelectedReport(prev => prev ? { ...prev, status: 'rescued' } : null);

    // Notify reporter
    if (selectedReport) {
      fetch('/api/notify-rescued', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, animalType: selectedReport.animalType, location: selectedReport.location }),
      }).catch(() => {});
    }
    setActionLoading(null);
  };

  // Load relevant orgs when opening a report
  const openReport = async (report: Report) => {
    setSelectedReport(report);
    const snap = await getDocs(collection(db, 'organizations'));
    const readyUids: string[] = (report as any).readyToReceive || [];
    const orgs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Org))
      .filter(o => {
        if (!o.animalTypes?.length) return true;
        const base = report.animalType.replace(/\p{Emoji}/gu, '').trim().toLowerCase();
        return o.animalTypes.some(t => t.replace(/\p{Emoji}/gu, '').trim().toLowerCase().includes(base) || base.includes(t.replace(/\p{Emoji}/gu, '').trim().toLowerCase()));
      })
      // Sort: ready-to-receive orgs first
      .sort((a, b) => {
        const aReady = readyUids.includes(a.id) ? -1 : 1;
        const bReady = readyUids.includes(b.id) ? -1 : 1;
        return aReady - bReady;
      });
    setRelevantOrgs(orgs);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white', fontSize: '18px' }}>{t('common','loading')}</p>
      </div>
    );
  }

  const myRescued = reports.filter(r => r.status === 'rescued' && r.handledBy === user?.uid && !r.archived);
  const filteredReports = filter === 'mine'
    ? reports.filter(r => !r.archived && r.volunteers?.includes(user?.uid || '') && r.status !== 'rescued')
    : reports.filter(r => !r.archived && r.status !== 'rescued');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>🐾 Pawtrol</h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0' }}>
              {profile?.name || profile?.email}
            </p>
          </div>
          <button onClick={handleLogout} style={{
            background: 'rgba(239,68,68,0.15)',
            color: '#FCA5A5',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
          }}>
            {t('common','logout')}
          </button>
        </div>

        {/* Availability Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: available ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${available ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '20px',
          transition: 'all 0.3s',
        }}>
          <div>
            <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 2px' }}>
              {available ? t('volunteerDash','availToggleOn') : t('volunteerDash','availToggleOff')}
            </p>
            <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>
              {available ? t('volunteerDash','availHint') : t('volunteerDash','unavailHint')}
            </p>
          </div>
          <button
            onClick={toggleAvailability}
            disabled={togglingAvail}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              background: available ? '#10B981' : '#334155',
              cursor: togglingAvail ? 'not-allowed' : 'pointer',
              position: 'relative',
              transition: 'background 0.3s',
              flexShrink: 0,
            }}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: available ? '26px' : '3px',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'white',
              transition: 'left 0.3s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'all', label: `📋 ${t('volunteerDash','allReports')}` },
            { key: 'mine', label: `🙋 ${t('volunteerDash','myReports')}` },
            { key: 'history', label: `🏆 הצלתי (${myRescued.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                background: filter === tab.key ? '#EF4444' : 'rgba(255,255,255,0.08)',
                color: filter === tab.key ? 'white' : '#CBD5E1',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* History tab */}
        {filter === 'history' && (() => {
          const rank = getRank(myRescued.length);
          return (
          <div>
            {/* Rank badge */}
            <div style={{ background: rank.bg, border: `1px solid ${rank.border}`, borderRadius: '16px', padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '40px', lineHeight: 1 }}>{rank.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: rank.color, fontWeight: '800', fontSize: '16px' }}>{rank.he}</span>
                  {rank.next && (
                    <span style={{ color: '#64748B', fontSize: '12px' }}>
                      {myRescued.length}/{rank.next.min} לדרגה הבאה
                    </span>
                  )}
                </div>
                {rank.next ? (
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${rank.progress}%`, background: rank.color, borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>
                ) : (
                  <span style={{ color: '#FBBF24', fontSize: '12px', fontWeight: '600' }}>⭐ דרגה מקסימלית!</span>
                )}
              </div>
            </div>

            {/* Personal stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '20px' }}>
              {[
                { icon: '🎉', value: myRescued.length, label: 'חיות הוצלו' },
                { icon: '🙋', value: reports.filter(r => r.volunteers?.includes(user?.uid || '')).length, label: 'דיווחים שניהלתי' },
                { icon: '⚡', value: reports.filter(r => r.handledBy === user?.uid && r.status === 'in_progress').length, label: 'בטיפול עכשיו' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ color: 'white', fontWeight: '800', fontSize: '22px' }}>{s.value}</div>
                  <div style={{ color: '#64748B', fontSize: '11px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {myRescued.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌱</div>
                <p>עדיין לא הצלת חיות — בוא נתחיל!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {myRescued.map(report => (
                  <div key={report.id} style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px', display: 'flex', gap: '14px', alignItems: 'center' }}>
                    {report.imageDownloadUrl && (
                      <img src={report.imageDownloadUrl} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'white', fontWeight: '700', margin: '0 0 3px' }}>{report.animalType}</p>
                      <p style={{ color: '#94A3B8', fontSize: '12px', margin: 0 }}>📍 {report.location}</p>
                    </div>
                    <span style={{ fontSize: '20px' }}>🎉</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {filter !== 'history' && (reportsLoading ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>{t('common','loading')}</p>
        ) : filteredReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌿</div>
            <p>{filter === 'mine' ? t('volunteerDash','notJoinedAny') : t('volunteerDash','noOpenReports')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredReports.map(report => {
              const isJoined = report.volunteers?.includes(user?.uid || '');
              return (
                <div
                  key={report.id}
                  onClick={() => openReport(report)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isJoined ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                >
                  {report.imageDownloadUrl && (
                    <img
                      src={report.imageDownloadUrl}
                      alt="report"
                      style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>{report.animalType}</span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        {isJoined && (
                          <span style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#93C5FD', background: 'rgba(59,130,246,0.2)' }}>
                            {t('volunteerDash','myBadge')}
                          </span>
                        )}
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          color: STATUS_LABELS[report.status]?.color || '#fff',
                          background: STATUS_LABELS[report.status]?.bg || 'rgba(255,255,255,0.1)',
                        }}>
                          {STATUS_LABELS[report.status]?.label || report.status}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {report.location}
                    </p>
                    {(report.volunteers?.length || 0) > 0 && (
                      <p style={{ color: '#6EE7B7', fontSize: '12px', margin: '4px 0 0' }}>
                        🤝 {report.volunteers!.length} {t('volunteerDash','volunteers')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div
          onClick={() => setSelectedReport(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 50 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>{selectedReport.animalType}</h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            {selectedReport.imageDownloadUrl && (
              <img src={selectedReport.imageDownloadUrl} alt="report" style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', maxHeight: '260px', objectFit: 'cover' }} />
            )}

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', marginBottom: '16px' }}>
              <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>🐾 {selectedReport.animalType}</p>
              <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>📍 {selectedReport.location}</p>
              {selectedReport.reporterPhone && (
                <div style={{ padding: '10px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', marginBottom: '10px' }}>
                  <p style={{ color: '#93C5FD', fontSize: '13px', fontWeight: '700', margin: '0 0 2px' }}>📞 טלפון המדווח</p>
                  <a href={`tel:${selectedReport.reporterPhone}`} style={{ color: 'white', fontSize: '16px', fontWeight: '800', textDecoration: 'none' }}>
                    {selectedReport.reporterPhone}
                  </a>
                </div>
              )}
              {selectedReport.stillThere !== undefined && (
                <p style={{ color: selectedReport.stillThere ? '#6EE7B7' : '#FCA5A5', fontSize: '13px', margin: 0 }}>
                  {selectedReport.stillThere === true ? '✅ המדווח עדיין במקום' : selectedReport.stillThere === false ? '❌ המדווח עזב' : ''}
                </p>
              )}
              {selectedReport.description && <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>📝 {selectedReport.description}</p>}
            </div>

            {/* Navigation */}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedReport.location)}`}
              target="_blank" rel="noreferrer"
              style={{ display: 'block', padding: '12px', background: '#1E40AF', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '700', fontSize: '14px', textAlign: 'center', marginBottom: '12px' }}
            >
              🗺️ נווט למיקום
            </a>

            {/* Action buttons */}
            {selectedReport.status === 'rescued' ? (
              <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: '10px', textAlign: 'center', color: '#6EE7B7', fontWeight: '700' }}>
                🎉 הוצל בהצלחה!
              </div>
            ) : selectedReport.handledBy === user?.uid ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid #3B82F6', borderRadius: '10px', color: '#93C5FD', fontWeight: '600', fontSize: '13px', textAlign: 'center' }}>
                  ✅ אתה מטפל בדיווח זה
                </div>
                {!selectedReport.pickedUp ? (
                  <button onClick={() => confirmPickup(selectedReport.id)} disabled={actionLoading === 'pickup'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                    {actionLoading === 'pickup' ? '⏳...' : '🐾 אספתי את החיה'}
                  </button>
                ) : (
                  <button onClick={() => confirmRescued(selectedReport.id)} disabled={actionLoading === 'rescued'} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' }}>
                    {actionLoading === 'rescued' ? '⏳...' : '🏠 הורדתי בעמותה — הוצל!'}
                  </button>
                )}
              </div>
            ) : !selectedReport.handledBy ? (
              <button onClick={() => joinReport(selectedReport.id)} disabled={joiningId === selectedReport.id} style={{ width: '100%', background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', fontWeight: '700', padding: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>
                {joiningId === selectedReport.id ? '⏳...' : '🙋 אני מטפל בזה'}
              </button>
            ) : (
              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: '#64748B', fontSize: '13px', textAlign: 'center' }}>
                מתנדב אחר כבר טיפל בדיווח זה
              </div>
            )}

            {/* Relevant orgs */}
            {relevantOrgs.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '700', margin: '0 0 10px' }}>
                  🏢 עמותות רלוונטיות לאיסוף:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {relevantOrgs.map(org => {
                    const isReady = ((selectedReport as any)?.readyToReceive || []).includes(org.id);
                    return (
                      <div key={org.id} style={{ background: isReady ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isReady ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', margin: 0 }}>{org.name}</p>
                          {isReady && <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.2)', color: '#6EE7B7', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>✅ מוכנה לקבל</span>}
                        </div>
                        {(org.address || org.city) && (
                          <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 6px' }}>📍 {[org.address, org.city].filter(Boolean).join(', ')}</p>
                        )}
                        {org.phone && <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 6px' }}>📞 {org.phone}</p>}
                        {(org.address || org.city) && (
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([org.address, org.city].filter(Boolean).join(' '))}`} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', padding: '6px 12px', background: isReady ? '#065F46' : '#1E3A5F', color: isReady ? '#6EE7B7' : '#93C5FD', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: '600' }}>
                            🗺️ נווט לעמותה
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
