'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, orderBy, where, onSnapshot, doc, updateDoc, getDoc, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useLang } from '@/lib/lang-context';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'ממתין', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  in_progress:{ label: 'בטיפול', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  rescued:    { label: 'הוצל', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  closed:     { label: 'נסגר', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

interface Report {
  id: string;
  animalType: string;
  location: string;
  description: string;
  status: string;
  imageUrl: string;
  timestamp: any;
  imageDownloadUrl?: string;
  readyToReceive?: string[]; // org uids that confirmed ready
  handledBy?: string;
  pickedUp?: boolean;
}

interface VolunteerMatch {
  id: string;
  name: string;
  phone: string;
  city: string;
  available: boolean;
  hasCar: boolean;
  priority: boolean; // same city + available
}

export default function OrganizationsDashboard() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<'reports' | 'team'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [matchedVolunteers, setMatchedVolunteers] = useState<VolunteerMatch[]>([]);
  const [volsLoading, setVolsLoading] = useState(false);
  const [allVolunteers, setAllVolunteers] = useState<VolunteerMatch[]>([]);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [volSearch, setVolSearch] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, async (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));

      // Fetch download URLs in parallel
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

  // Load org's team + all approved volunteers
  useEffect(() => {
    if (!user) return;
    setTeamLoading(true);

    // Watch org doc for teamVolunteers changes
    const unsub = onSnapshot(doc(db, 'organizations', user.uid), snap => {
      if (snap.exists()) setTeamIds(snap.data().teamVolunteers || []);
    });

    // Load all approved volunteers once
    getDocs(query(collection(db, 'volunteers'), where('status', '==', 'approved'))).then(snap => {
      setAllVolunteers(snap.docs.map(d => {
        const data = d.data();
        return { id: d.id, name: data.name, phone: data.phone, city: data.city, available: data.available ?? false, hasCar: data.hasCar ?? false, priority: false };
      }));
      setTeamLoading(false);
    });

    return unsub;
  }, [user]);

  const toggleTeamMember = async (volId: string) => {
    if (!user) return;
    const isIn = teamIds.includes(volId);
    await updateDoc(doc(db, 'organizations', user.uid), {
      teamVolunteers: isIn ? arrayRemove(volId) : arrayUnion(volId),
    });
  };


  const openReport = async (report: Report) => {
    setSelectedReport(report);
    setMatchedVolunteers([]);
    setVolsLoading(true);

    // Extract city from location (first word / part before comma)
    const cityGuess = report.location.split(',')[0].split(' ').slice(-1)[0] || '';

    const snap = await getDocs(query(
      collection(db, 'volunteers'),
      where('status', '==', 'approved')
    ));

    const vols: VolunteerMatch[] = snap.docs.map(d => {
      const data = d.data();
      const sameCity = cityGuess && data.city && data.city.includes(cityGuess);
      return {
        id: d.id,
        name: data.name,
        phone: data.phone,
        city: data.city,
        available: data.available ?? false,
        hasCar: data.hasCar ?? false,
        priority: sameCity && data.available,
      };
    });

    // Sort: priority (same city + available) first, then available, then rest
    vols.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return a.city.localeCompare(b.city, 'he');
    });

    setMatchedVolunteers(vols);
    setVolsLoading(false);
  };

  const updateStatus = async (reportId: string, status: string) => {
    setUpdatingId(reportId);
    await updateDoc(doc(db, 'reports', reportId), { status });
    setUpdatingId(null);
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, status } : null);
    }
  };

  const confirmReadyToReceive = async (reportId: string) => {
    if (!user) return;
    setUpdatingId(reportId);
    await updateDoc(doc(db, 'reports', reportId), {
      readyToReceive: arrayUnion(user.uid),
    });
    setSelectedReport(prev => prev ? {
      ...prev,
      readyToReceive: [...(prev.readyToReceive || []), user.uid],
    } : null);
    setUpdatingId(null);
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

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    in_progress: reports.filter(r => r.status === 'in_progress').length,
    rescued: reports.filter(r => r.status === 'rescued').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>
              🐾 Pawtrol
            </h1>
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

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: t('orgDash','totalReports'), value: stats.total, color: '#F97316' },
            { label: t('orgDash','pending'), value: stats.pending, color: '#F59E0B' },
            { label: t('orgDash','inProgress'), value: stats.in_progress, color: '#3B82F6' },
            { label: t('orgDash','rescued'), value: stats.rescued, color: '#10B981' },
          ].map(s => (
            <div key={s.label} style={{
              background: `rgba(255,255,255,0.05)`,
              border: `1px solid ${s.color}44`,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {[
            { key: 'reports', label: `📋 ${t('orgDash','reports')}` },
            { key: 'team', label: `👥 ${t('orgDash','myTeam')}${teamIds.length ? ` (${teamIds.length})` : ''}` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '14px', background: activeTab === tab.key ? '#EF4444' : 'rgba(255,255,255,0.07)', color: activeTab === tab.key ? 'white' : '#94A3B8', transition: 'all 0.2s' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {activeTab === 'reports' && <>
        <h2 style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          📋 {t('orgDash','reports')}
        </h2>

        {reportsLoading ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '40px' }}>{t('common','loading')}</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <p>{t('orgDash','noReports')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reports.map(report => (
              <div
                key={report.id}
                onClick={() => openReport(report)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
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
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
                      {report.animalType}
                    </span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: STATUS_LABELS[report.status]?.color || '#fff',
                      background: STATUS_LABELS[report.status]?.bg || 'rgba(255,255,255,0.1)',
                      flexShrink: 0,
                    }}>
                      {STATUS_LABELS[report.status]?.label || report.status}
                    </span>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    📍 {report.location}
                  </p>
                  {report.description && (
                    <p style={{ color: '#CBD5E1', fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {report.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        </>}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div>
            {/* Search + add */}
            <div style={{ marginBottom: '16px' }}>
              <input
                value={volSearch}
                onChange={e => setVolSearch(e.target.value)}
                placeholder="🔍 חפש מתנדב לפי שם או עיר..."
                style={{ width: '100%', padding: '11px 14px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </div>

            {teamLoading ? (
              <p style={{ color: '#64748B', textAlign: 'center', padding: '32px' }}>טוען מתנדבים...</p>
            ) : (
              <>
                {/* Team members first */}
                {teamIds.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>הצוות שלי</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {allVolunteers.filter(v => teamIds.includes(v.id)).map(v => (
                        <VolCard key={v.id} vol={v} inTeam={true} onToggle={() => toggleTeamMember(v.id)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All approved volunteers */}
                <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  כל המתנדבים המאושרים ({allVolunteers.filter(v => !teamIds.includes(v.id)).length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {allVolunteers
                    .filter(v => !teamIds.includes(v.id))
                    .filter(v => !volSearch || v.name.includes(volSearch) || v.city.includes(volSearch))
                    .map(v => (
                      <VolCard key={v.id} vol={v} inTeam={false} onToggle={() => toggleTeamMember(v.id)} />
                    ))
                  }
                  {allVolunteers.filter(v => !teamIds.includes(v.id)).length === 0 && (
                    <p style={{ color: '#475569', textAlign: 'center', padding: '24px' }}>{t('orgDash','allInTeam')}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Report Modal */}
      {selectedReport && (
        <div
          onClick={() => setSelectedReport(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px', zIndex: 50,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1E293B',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                {selectedReport.animalType}
              </h3>
              <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>

            {selectedReport.imageDownloadUrl && (
              <img
                src={selectedReport.imageDownloadUrl}
                alt="report"
                style={{ width: '100%', borderRadius: '12px', marginBottom: '16px', maxHeight: '280px', objectFit: 'cover' }}
              />
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>📍 {selectedReport.location}</p>
              {selectedReport.description && (
                <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>{selectedReport.description}</p>
              )}
            </div>

            {/* Ready to receive button */}
            {selectedReport.status !== 'rescued' && (
              <div style={{ marginBottom: '16px' }}>
                {selectedReport.readyToReceive?.includes(user?.uid || '') ? (
                  <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: '10px', color: '#6EE7B7', fontWeight: '700', textAlign: 'center', fontSize: '14px' }}>
                    ✅ סימנת שאתם מוכנים לקבל את החיה
                  </div>
                ) : (
                  <button
                    onClick={() => confirmReadyToReceive(selectedReport.id)}
                    disabled={updatingId === selectedReport.id}
                    style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#10B981,#059669)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}
                  >
                    🏠 אנחנו מוכנים לקבל את החיה
                  </button>
                )}
                {(selectedReport.readyToReceive?.length || 0) > 0 && (
                  <p style={{ color: '#6EE7B7', fontSize: '12px', textAlign: 'center', margin: '6px 0 0' }}>
                    {selectedReport.readyToReceive!.length} עמותות מוכנות לקבל
                  </p>
                )}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>{t('orgDash','updateStatus')}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(STATUS_LABELS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(selectedReport.id, key)}
                    disabled={updatingId === selectedReport.id}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: `2px solid ${selectedReport.status === key ? val.color : 'rgba(255,255,255,0.1)'}`,
                      background: selectedReport.status === key ? val.bg : 'transparent',
                      color: val.color,
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Matched Volunteers */}
            <div>
              <p style={{ color: '#94A3B8', fontSize: '13px', marginBottom: '10px', fontWeight: '600' }}>
                🤝 {t('orgDash','recommended')}
              </p>
              {volsLoading ? (
                <p style={{ color: '#94A3B8', fontSize: '13px', textAlign: 'center', padding: '12px' }}>טוען...</p>
              ) : matchedVolunteers.length === 0 ? (
                <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '12px' }}>אין מתנדבים מאושרים עדיין</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {matchedVolunteers.map(v => (
                    <div key={v.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: v.priority ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${v.priority ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      gap: '8px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>{v.name}</span>
                          {v.priority && <span style={{ fontSize: '10px', color: '#6EE7B7', background: 'rgba(16,185,129,0.2)', padding: '1px 6px', borderRadius: '10px', fontWeight: '700' }}>{t('orgDash','priority')}</span>}
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '12px' }}>
                          {v.city}{v.hasCar ? ' · 🚗' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px',
                          color: v.available ? '#6EE7B7' : '#64748B',
                          background: v.available ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                        }}>
                          {v.available ? t('status','available') : t('status','unavailable')}
                        </span>
                        <a href={`tel:${v.phone}`} style={{
                          padding: '5px 10px', borderRadius: '7px',
                          background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
                          color: '#93C5FD', fontSize: '12px', fontWeight: '600', textDecoration: 'none',
                        }}>
                          📞
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VolCard({ vol, inTeam, onToggle }: { vol: VolunteerMatch; inTeam: boolean; onToggle: () => void }) {
  const { t } = useLang();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: inTeam ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${inTeam ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{vol.name}</span>
          {vol.hasCar && <span style={{ fontSize: '12px' }}>🚗</span>}
        </div>
        <span style={{ color: '#64748B', fontSize: '12px' }}>📍 {vol.city}</span>
      </div>
      <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', color: vol.available ? '#6EE7B7' : '#64748B', background: vol.available ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
        {vol.available ? t('status','available') : '⏸'}
      </span>
      <a href={`tel:${vol.phone}`} onClick={e => e.stopPropagation()} style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#93C5FD', fontSize: '13px', textDecoration: 'none', flexShrink: 0 }}>📞</a>
      <button onClick={onToggle} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${inTeam ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`, background: inTeam ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: inTeam ? '#FCA5A5' : '#6EE7B7', fontSize: '12px', fontWeight: '700', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {inTeam ? t('orgDash','removeFromTeam') : t('orgDash','addToTeam')}
      </button>
    </div>
  );
}
