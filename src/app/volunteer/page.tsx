'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useLang } from '@/lib/lang-context';
import { ref, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: 'ממתין', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  in_progress: { label: 'בטיפול', color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  rescued:     { label: 'הוצל', color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  closed:      { label: 'נסגר', color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

interface Report {
  id: string;
  animalType: string;
  location: string;
  description: string;
  status: string;
  imageUrl: string;
  timestamp: any;
  volunteers?: string[];
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
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [available, setAvailable] = useState(false);
  const [togglingAvail, setTogglingAvail] = useState(false);

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
    await updateDoc(doc(db, 'volunteers', user.uid), { available: next });
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
    });
    setJoiningId(null);
    if (selectedReport?.id === reportId) {
      setSelectedReport(prev => prev ? { ...prev, status: 'in_progress', volunteers: [...(prev.volunteers || []), user.uid] } : null);
    }
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

  const filteredReports = filter === 'mine'
    ? reports.filter(r => r.volunteers?.includes(user?.uid || ''))
    : reports;

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
          {[{ key: 'all', label: `📋 ${t('volunteerDash','allReports')}` }, { key: 'mine', label: `🙋 ${t('volunteerDash','myReports')}` }].map(tab => (
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

        {/* Reports */}
        {reportsLoading ? (
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
                  onClick={() => setSelectedReport(report)}
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
        )}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>📍 {selectedReport.location}</p>
              {selectedReport.description && <p style={{ color: '#CBD5E1', fontSize: '14px', margin: 0 }}>{selectedReport.description}</p>}
              <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
                🤝 {selectedReport.volunteers?.length || 0} {t('volunteerDash','volunteers')}
              </p>
            </div>

            {selectedReport.volunteers?.includes(user?.uid || '') ? (
              <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: '8px', textAlign: 'center', color: '#6EE7B7', fontWeight: '600' }}>
                {t('volunteerDash','alreadyJoined')}
              </div>
            ) : (
              <button
                onClick={() => joinReport(selectedReport.id)}
                disabled={joiningId === selectedReport.id}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: joiningId === selectedReport.id ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  opacity: joiningId === selectedReport.id ? 0.7 : 1,
                }}
              >
                {joiningId === selectedReport.id ? t('volunteerDash','joining') : t('volunteerDash','joinBtn')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
