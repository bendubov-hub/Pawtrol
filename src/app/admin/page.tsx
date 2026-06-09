'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';
import { useLang } from '@/lib/lang-context';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';

type Tab = 'organizations' | 'volunteers' | 'reports' | 'applications' | 'add_org' | 'stats' | 'test' | 'archive' | 'users' | 'adoptions' | 'seen_posts';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  approved:    { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  rejected:    { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  in_progress: { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  rescued:     { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  closed:      { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין', approved: 'מאושר', rejected: 'נדחה',
  in_progress: 'בטיפול', rescued: 'הוצל', closed: 'נסגר',
};

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('applications');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [adoptions, setAdoptions] = useState<any[]>([]);
  const [seenPosts, setSeenPosts] = useState<any[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({});

  // Add org form
  const [orgForm, setOrgForm] = useState({
    name: '', email: '', phone: '', city: '', address: '',
    description: '', website: '', animalTypes: [] as string[],
    registrationNumber: '',
  });
  const [orgFormLoading, setOrgFormLoading] = useState(false);
  const [orgFormDone, setOrgFormDone] = useState('');
  const [orgFormError, setOrgFormError] = useState('');

  const ANIMAL_TYPES = ['🐕 כלבים','🐱 חתולים','🐦 ציפורים','🐰 ארנבות','🐢 צבים','🐠 דגים','🦴 כלליים'];
  const CITIES = ['תל אביב','ירושלים','חיפה','ראשון לציון','פתח תקווה','אשדוד','נתניה','באר שבע','בני ברק','רמת גן','חולון','בת ים','רחובות','אשקלון','הרצליה','כפר סבא','מודיעין','רעננה','לוד','רמלה','אחר'];

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (!user) return;

    const unsub1 = onSnapshot(query(collection(db, 'organizations'), orderBy('createdAt', 'desc')), snap => {
      setOrganizations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub2 = onSnapshot(query(collection(db, 'volunteers'), orderBy('createdAt', 'desc')), snap => {
      setVolunteers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub3 = onSnapshot(query(collection(db, 'reports'), orderBy('timestamp', 'desc')), snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsub4 = onSnapshot(query(collection(db, 'volunteer_applications'), orderBy('submittedAt', 'desc')), snap => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsub5 = onSnapshot(query(collection(db, 'adoptions')), snap => {
      setAdoptions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
    });
    const unsub6 = onSnapshot(query(collection(db, 'seen_posts')), snap => {
      setSeenPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [user]);

  const update = async (collection_: string, id: string, data: object) => {
    setUpdatingId(id);
    await updateDoc(doc(db, collection_, id), data);
    setUpdatingId(null);
  };

  const archive = async (collection_: string, id: string) => {
    setUpdatingId(id);
    await updateDoc(doc(db, collection_, id), { archived: true, archivedAt: new Date() });
    setUpdatingId(null);
  };

  const restore = async (collection_: string, id: string) => {
    setUpdatingId(id);
    await updateDoc(doc(db, collection_, id), { archived: false, archivedAt: null });
    setUpdatingId(null);
  };

  const permanentDelete = async (collection_: string, id: string) => {
    if (!confirm('מחיקה לצמיתות — לא ניתן לשחזר. להמשיך?')) return;
    setUpdatingId(id);
    await deleteDoc(doc(db, collection_, id));
    setUpdatingId(null);
  };

  const approveAndInvite = async (app: any) => {
    setUpdatingId(app.id);
    // Generate token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    // Save invite to Firestore
    await setDoc(doc(db, 'invites', token), {
      token,
      applicationId: app.id,
      email: app.email,
      fullName: app.fullName,
      phone: app.phone,
      city: app.city,
      address: app.address,
      hasCar: app.hasCar,
      availableHours: app.availableHours,
      expiresAt,
      used: false,
    });

    // Update application status
    await updateDoc(doc(db, 'volunteer_applications', app.id), { status: 'approved', token });

    // Fire-and-forget invite email
    fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: app.email, fullName: app.fullName, city: app.city, token }),
    }).catch(() => {});

    setInviteSent(prev => ({ ...prev, [app.id]: true }));
    setUpdatingId(null);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const addOrg = async () => {
    const { name, email, phone, city } = orgForm;
    if (!name || !email || !phone || !city) { setOrgFormError('שם, מייל, טלפון ועיר חובה'); return; }
    setOrgFormLoading(true);
    setOrgFormError('');
    setOrgFormDone('');

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const orgId = `org_${Date.now()}`;

    await setDoc(doc(db, 'invites', token), {
      token, type: 'organization', orgId,
      name: orgForm.name, email: orgForm.email, phone: orgForm.phone,
      city: orgForm.city, address: orgForm.address,
      description: orgForm.description, website: orgForm.website,
      animalTypes: orgForm.animalTypes, registrationNumber: orgForm.registrationNumber,
      expiresAt, used: false,
    });

    await setDoc(doc(db, 'organizations', orgId), {
      uid: null, name: orgForm.name, email: orgForm.email, phone: orgForm.phone,
      city: orgForm.city, address: orgForm.address,
      description: orgForm.description, website: orgForm.website,
      animalTypes: orgForm.animalTypes, registrationNumber: orgForm.registrationNumber,
      status: 'approved', verified: true,
      createdAt: new Date(), addedByAdmin: true, inviteToken: token,
    });

    fetch('/api/invite-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, name: orgForm.name, email: orgForm.email, city: orgForm.city }),
    }).catch(() => {});

    setOrgFormDone(`✅ הזמנה נשלחה ל-${orgForm.email}`);
    setOrgForm({ name:'', email:'', phone:'', city:'', address:'', description:'', website:'', animalTypes:[], registrationNumber:'' });
    setOrgFormLoading(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'white' }}>{t('common','loading')}</p>
      </div>
    );
  }

  const activeOrgs  = organizations.filter(o => !o.archived);
  const activeVols  = volunteers.filter(v => !v.archived);
  const activeReps  = reports.filter(r => !r.archived);

  const pendingOrgs = activeOrgs.filter(o => o.status === 'pending').length;
  const pendingVols = activeVols.filter(v => v.status === 'pending').length;
  const pendingApps = applications.filter(a => a.status === 'pending_review').length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingTop: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: 0 }}>{t('admin','title')}</h1>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '4px 0 0' }}>{t('admin','subtitle')}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <button style={{ background: 'rgba(255,255,255,0.07)', color: '#CBD5E1', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                🏠 דף הבית
              </button>
            </Link>
            <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid #EF4444', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              {t('common','logout')}
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
          {[
            { label: t('admin','tabOrgs').replace('🏢 ',''), total: activeOrgs.length, pending: pendingOrgs, color: '#EF4444' },
            { label: t('admin','tabVols').replace('🤝 ',''), total: activeVols.length, pending: pendingVols, color: '#3B82F6' },
            { label: t('admin','tabReports').replace('📋 ',''), total: activeReps.length, pending: activeReps.filter(r => r.status === 'pending').length, color: '#F97316' },
            { label: t('admin','tabApplications').replace('📩 ',''), total: applications.length, pending: pendingApps, color: '#A855F7' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${s.color}44`, borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '26px', fontWeight: 'bold', color: s.color }}>{s.total}</div>
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>{s.label}</div>
              {s.pending > 0 && (
                <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px', fontWeight: '600' }}>
                  {s.pending} {t('admin','pendingApproval')}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {([['applications', `${t('admin','tabApplications')}${pendingApps ? ` (${pendingApps})` : ''}`],
             ['organizations', `${t('admin','tabOrgs')}${pendingOrgs ? ` (${pendingOrgs})` : ''}`],
             ['volunteers', `${t('admin','tabVols')}${pendingVols ? ` (${pendingVols})` : ''}`],
             ['reports', t('admin','tabReports')],
             ['adoptions', `🐾 אימוץ (${adoptions.length})`],
             ['seen_posts', `🔍 מי ראה? (${seenPosts.length})`],
             ['add_org', '➕ הוסף עמותה'],
             ['stats', '📊 סטטיסטיקות'],
             ['users', '👤 משתמשים'],
             ['archive', `🗂 ארכיון${[...organizations, ...volunteers, ...reports].filter(x => x.archived).length > 0 ? ` (${[...organizations, ...volunteers, ...reports].filter(x => x.archived).length})` : ''}`],
             ['test', '🧪 בדיקות']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                background: tab === key ? '#EF4444' : 'rgba(255,255,255,0.08)',
                color: tab === key ? 'white' : '#CBD5E1',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Applications */}
        {tab === 'applications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {applications.length === 0 && <EmptyState label={t('admin','noApplications')} />}
            {applications.map(app => {
              const isExpanded = expandedApp === app.id;
              const isPending = app.status === 'pending_review';
              return (
                <Card key={app.id}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <p style={{ color: 'white', fontWeight: 'bold', margin: 0, fontSize: '15px' }}>{app.fullName}</p>
                        {isPending && <span style={{ fontSize: '11px', background: 'rgba(168,85,247,0.2)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '10px', padding: '2px 8px', fontWeight: '700' }}>{t('admin','newBadge')}</span>}
                      </div>
                      <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 2px' }}>
                        📍 {app.city} · 📞 {app.phone} · ✉️ {app.email}
                      </p>
                      <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>
                        ת.ז. {app.idNumber} · נולד/ה {app.birthYear} · {app.hasCar ? '🚗 יש רכב' : '🚶 אין רכב'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <StatusBadge status={app.status === 'pending_review' ? 'pending' : app.status} />
                      <button
                        onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#CBD5E1', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                      >
                        {isExpanded ? t('admin','hideDetails') : t('admin','details')}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                        <InfoBlock title="ניסיון עם בעלי חיים" value={app.experience} />
                        <InfoBlock title="מוטיבציה" value={app.motivation} />
                        <InfoBlock title="שעות זמינות" value={app.availableHours} />
                        <InfoBlock title="בעלי חיים בבית" value={app.hasAnimals || '—'} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                          <p style={{ color: '#60A5FA', fontSize: '12px', fontWeight: '700', margin: '0 0 6px' }}>ממליץ 1</p>
                          <p style={{ color: 'white', fontSize: '13px', margin: '0 0 2px' }}>{app.ref1Name || '—'}</p>
                          {app.ref1Phone && <a href={`tel:${app.ref1Phone}`} style={{ color: '#94A3B8', fontSize: '12px' }}>{app.ref1Phone}</a>}
                        </div>
                        {app.ref2Name && (
                          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
                            <p style={{ color: '#60A5FA', fontSize: '12px', fontWeight: '700', margin: '0 0 6px' }}>ממליץ 2</p>
                            <p style={{ color: 'white', fontSize: '13px', margin: '0 0 2px' }}>{app.ref2Name}</p>
                            {app.ref2Phone && <a href={`tel:${app.ref2Phone}`} style={{ color: '#94A3B8', fontSize: '12px' }}>{app.ref2Phone}</a>}
                          </div>
                        )}
                      </div>

                      {(app.facebook || app.instagram) && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                          {app.facebook && <a href={app.facebook.startsWith('http') ? app.facebook : `https://${app.facebook}`} target="_blank" rel="noopener" style={{ color: '#60A5FA', fontSize: '13px' }}>🔵 Facebook</a>}
                          {app.instagram && <span style={{ color: '#C084FC', fontSize: '13px' }}>📷 {app.instagram}</span>}
                        </div>
                      )}

                      <p style={{ color: '#475569', fontSize: '11px', marginBottom: '14px' }}>
                        נשלח: {app.submittedAt ? new Date(app.submittedAt).toLocaleString('he-IL') : '—'} · כתובת: {app.address}
                      </p>

                      {(app.status === 'pending_review' || app.status === 'under_review') && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {inviteSent[app.id] ? (
                            <div style={{ padding: '8px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '8px', color: '#6EE7B7', fontSize: '13px', fontWeight: '600' }}>
                              {t('admin','inviteSent')}
                            </div>
                          ) : (
                            <ActionButton
                              label={t('admin','approveInvite')}
                              color="#10B981"
                              loading={updatingId === app.id}
                              onClick={() => approveAndInvite(app)}
                            />
                          )}
                          {app.status === 'pending_review' && (
                            <ActionButton label={t('admin','underReview')} color="#F59E0B" loading={updatingId === app.id}
                              onClick={() => update('volunteer_applications', app.id, { status: 'under_review' })} />
                          )}
                          <ActionButton label={t('common','reject')} color="#EF4444" loading={updatingId === app.id}
                            onClick={() => update('volunteer_applications', app.id, { status: 'rejected' })} />
                        </div>
                      )}
                      {app.status === 'approved' && !app.accountCreated && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ color: '#6EE7B7', fontSize: '13px' }}>{t('admin','waitingReg')}</span>
                          <ActionButton label={t('admin','sendAgain')} color="#3B82F6" loading={updatingId === app.id}
                            onClick={() => approveAndInvite(app)} />
                        </div>
                      )}
                      {app.status === 'approved' && app.accountCreated && (
                        <span style={{ color: '#6EE7B7', fontSize: '13px' }}>{t('admin','activeAccount')}</span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Organizations */}
        {tab === 'organizations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {organizations.filter(o => !o.archived).length === 0 && <EmptyState label={t('admin','noOrgs')} />}
            {organizations.filter(o => !o.archived).map(org => (
              <Card key={org.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'white', fontWeight: 'bold', margin: '0 0 4px' }}>{org.name}</p>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px' }}>{org.email} | {org.city}</p>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>מ"ר: {org.registrationNumber || '—'}</p>
                    {org.description && <p style={{ color: '#CBD5E1', fontSize: '13px', marginTop: '6px' }}>{org.description}</p>}
                    {org.animalTypes?.length > 0 && (
                      <p style={{ color: '#6EE7B7', fontSize: '12px', marginTop: '4px' }}>{org.animalTypes.join(', ')}</p>
                    )}
                  </div>
                  <StatusBadge status={org.status} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {org.status === 'pending' && <>
                    <ActionButton label={t('common','approve')} color="#10B981" loading={updatingId === org.id}
                      onClick={() => update('organizations', org.id, { status: 'approved', verified: true })} />
                    <ActionButton label={t('common','reject')} color="#EF4444" loading={updatingId === org.id}
                      onClick={() => update('organizations', org.id, { status: 'rejected' })} />
                  </>}
                  <ActionButton label="🗂 ארכיון" color="#64748B" loading={updatingId === org.id}
                    onClick={() => archive('organizations', org.id)} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Volunteers */}
        {tab === 'volunteers' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {volunteers.filter(v => !v.archived).length === 0 && <EmptyState label={t('admin','noVols')} />}
            {volunteers.filter(v => !v.archived).map(vol => (
              <Card key={vol.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'white', fontWeight: 'bold', margin: '0 0 4px' }}>{vol.name}</p>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 4px' }}>{vol.email} | {vol.city}</p>
                    <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
                      {vol.hasCar ? '🚗 יש רכב' : '🚶 אין רכב'} | {vol.availableHours}
                    </p>
                    {vol.bio && <p style={{ color: '#CBD5E1', fontSize: '13px', marginTop: '6px' }}>{vol.bio}</p>}
                  </div>
                  <StatusBadge status={vol.status} />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {vol.status === 'pending' && <>
                    <ActionButton label={t('common','approve')} color="#10B981" loading={updatingId === vol.id}
                      onClick={() => update('volunteers', vol.id, { status: 'approved', verified: true })} />
                    <ActionButton label={t('common','reject')} color="#EF4444" loading={updatingId === vol.id}
                      onClick={() => update('volunteers', vol.id, { status: 'rejected' })} />
                  </>}
                  <ActionButton label="🗂 ארכיון" color="#64748B" loading={updatingId === vol.id}
                    onClick={() => archive('volunteers', vol.id)} />
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Reports */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {reports.length === 0 && <EmptyState label={t('admin','noReports')} />}

            {/* Summary stats */}
            {activeReps.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '8px' }}>
                {[
                  { label: 'ממתינים', count: activeReps.filter(r => r.status === 'pending').length, color: '#F59E0B' },
                  { label: 'בטיפול', count: activeReps.filter(r => r.status === 'in_progress').length, color: '#3B82F6' },
                  { label: 'הוצלו', count: activeReps.filter(r => r.status === 'rescued').length, color: '#10B981' },
                  { label: 'סה״כ', count: activeReps.length, color: '#94A3B8' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <p style={{ color: s.color, fontWeight: '800', fontSize: '22px', margin: '0 0 2px' }}>{s.count}</p>
                    <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {reports.filter(r => !r.archived).map(report => {
              const handler = report.handledBy ? volunteers.find(v => v.id === report.handledBy || v.uid === report.handledBy) : null;
              const readyOrgs = (report.readyToReceive || []).map((uid: string) => organizations.find(o => o.id === uid || o.uid === uid)?.name).filter(Boolean);

              return (
                <Card key={report.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: 'white', fontWeight: 'bold', margin: '0 0 4px', fontSize: '15px' }}>{report.animalType}</p>
                      <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 6px' }}>📍 {report.location}</p>

                      {/* Pipeline steps */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        {handler ? (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', color: '#93C5FD', fontWeight: '600' }}>
                            🙋 {handler.name || 'מתנדב'}
                          </span>
                        ) : report.status !== 'pending' ? null : (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', color: '#FCD34D', fontWeight: '600' }}>
                            ⏳ ממתין למתנדב
                          </span>
                        )}
                        {report.pickedUp && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', color: '#6EE7B7', fontWeight: '600' }}>
                            🐾 נאסף
                          </span>
                        )}
                        {readyOrgs.length > 0 && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', color: '#C4B5FD', fontWeight: '600' }}>
                            🏠 {readyOrgs[0]} מוכנה
                          </span>
                        )}
                      </div>

                      {report.description && <p style={{ color: '#64748B', fontSize: '12px', margin: 0 }}>{report.description}</p>}
                    </div>
                    <StatusBadge status={report.status} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {(['pending', 'in_progress', 'rescued', 'closed'] as const).map(s => (
                      <button key={s} disabled={report.status === s || updatingId === report.id}
                        onClick={() => update('reports', report.id, { status: s })}
                        style={{ padding: '5px 12px', borderRadius: '6px', border: `1px solid ${STATUS_COLORS[s].color}`, background: report.status === s ? STATUS_COLORS[s].bg : 'transparent', color: STATUS_COLORS[s].color, fontSize: '12px', fontWeight: '600', cursor: report.status === s ? 'default' : 'pointer', opacity: report.status === s ? 1 : 0.7 }}>
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                    <ActionButton label="🗂 ארכיון" color="#64748B" loading={updatingId === report.id}
                      onClick={() => archive('reports', report.id)} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Organization */}
        {tab === 'add_org' && (
          <div style={{ maxWidth: '560px' }}>
            <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '800', margin: '0 0 20px' }}>➕ הוסף עמותה</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Basic info */}
              <Card>
                <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', margin: '0 0 14px', textTransform: 'uppercase' }}>פרטים בסיסיים</p>
                <AField label="שם העמותה *" value={orgForm.name} onChange={v => setOrgForm(f => ({...f, name: v}))} placeholder="למשל: אגודת חסד לחיות" />
                <AField label='דוא"ל *' type="email" value={orgForm.email} onChange={v => setOrgForm(f => ({...f, email: v}))} placeholder="org@example.org" />
                <AField label="טלפון *" value={orgForm.phone} onChange={v => setOrgForm(f => ({...f, phone: v}))} placeholder="03-1234567" />
                <div style={{ marginBottom: '12px' }}>
                  <label style={aLabel}>עיר *</label>
                  <select value={orgForm.city} onChange={e => setOrgForm(f => ({...f, city: e.target.value}))} style={aInput}>
                    <option value="" style={{ background: '#1E293B' }}>בחר עיר</option>
                    {CITIES.map(c => <option key={c} value={c} style={{ background: '#1E293B' }}>{c}</option>)}
                  </select>
                </div>
                <AField label="כתובת מלאה" value={orgForm.address} onChange={v => setOrgForm(f => ({...f, address: v}))} placeholder="רחוב הרצל 1, תל אביב" />
              </Card>

              {/* Details */}
              <Card>
                <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', margin: '0 0 14px', textTransform: 'uppercase' }}>פרטים נוספים</p>
                <div style={{ marginBottom: '12px' }}>
                  <label style={aLabel}>תיאור</label>
                  <textarea value={orgForm.description} onChange={e => setOrgForm(f => ({...f, description: e.target.value}))} placeholder="תיאור קצר על העמותה..." rows={3} style={{ ...aInput, resize: 'vertical' }} />
                </div>
                <AField label="אתר" value={orgForm.website} onChange={v => setOrgForm(f => ({...f, website: v}))} placeholder="https://example.org" />
                <AField label='מספר רישום (אופציונלי)' value={orgForm.registrationNumber} onChange={v => setOrgForm(f => ({...f, registrationNumber: v}))} placeholder="580123456" />
              </Card>

              {/* Animal types */}
              <Card>
                <p style={{ color: '#94A3B8', fontSize: '12px', fontWeight: '700', margin: '0 0 12px', textTransform: 'uppercase' }}>סוגי חיות</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {ANIMAL_TYPES.map(type => {
                    const checked = orgForm.animalTypes.includes(type);
                    return (
                      <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: checked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${checked ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={checked} onChange={e => setOrgForm(f => ({ ...f, animalTypes: e.target.checked ? [...f.animalTypes, type] : f.animalTypes.filter(t => t !== type) }))} style={{ accentColor: '#EF4444', cursor: 'pointer' }} />
                        <span style={{ color: 'white', fontSize: '13px' }}>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </Card>

              {/* Error / Success */}
              {orgFormError && (
                <div style={{ padding: '12px', background: 'rgba(220,38,38,0.1)', border: '1px solid #DC2626', borderRadius: '10px', color: '#FCA5A5', fontSize: '13px' }}>
                  ⚠️ {orgFormError}
                </div>
              )}
              {orgFormDone && (
                <div style={{ padding: '12px', background: 'rgba(16,185,129,0.1)', border: '1px solid #10B981', borderRadius: '10px', color: '#6EE7B7', fontSize: '13px', fontWeight: '600' }}>
                  {orgFormDone}
                </div>
              )}

              <button
                onClick={addOrg}
                disabled={orgFormLoading}
                style={{ padding: '14px', background: orgFormLoading ? '#334155' : 'linear-gradient(135deg,#EF4444,#DC2626)', color: 'white', border: 'none', borderRadius: '12px', cursor: orgFormLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px', opacity: orgFormLoading ? 0.7 : 1 }}
              >
                {orgFormLoading ? '⏳ שולח...' : '🏢 הוסף עמותה ושלח הזמנה'}
              </button>

              <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', borderRadius: '10px', padding: '12px' }}>
                <p style={{ color: '#93C5FD', fontSize: '13px', margin: 0, lineHeight: '1.6' }}>
                  📧 העמותה תקבל מייל עם קישור להגדרת סיסמא.<br/>
                  לאחר הכניסה הם ירואו ישירות את הדשבורד שלהם עם כל הפרטים מלאים.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {tab === 'stats' && (() => {
          const totalReports   = activeReps.length;
          const rescued        = activeReps.filter(r => r.status === 'rescued').length;
          const inProgress     = activeReps.filter(r => r.status === 'in_progress').length;
          const pending        = activeReps.filter(r => r.status === 'pending').length;
          const activeVolsNow  = activeVols.filter(v => v.available).length;
          const approvedOrgs   = activeOrgs.filter(o => o.status === 'approved').length;
          const rescueRate     = totalReports ? Math.round((rescued / totalReports) * 100) : 0;

          // Top animal types
          const animalCount: Record<string, number> = {};
          activeReps.forEach(r => {
            const key = r.animalType || 'אחר';
            animalCount[key] = (animalCount[key] || 0) + 1;
          });
          const topAnimals = Object.entries(animalCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

          // Last 7 days
          const now = Date.now();
          const day = 86400000;
          const last7 = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now - (6 - i) * day);
            const label = `${d.getDate()}/${d.getMonth() + 1}`;
            const count = activeReps.filter(r => {
              const ts = r.timestamp?.toDate?.()?.getTime?.() || 0;
              return ts >= now - (6 - i) * day && ts < now - (5 - i) * day;
            }).length;
            return { label, count };
          });
          const maxDay = Math.max(...last7.map(d => d.count), 1);

          const StatBox = ({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) => (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}33`, borderRadius: '14px', padding: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{icon}</div>
              <div style={{ color, fontWeight: '900', fontSize: '32px', marginBottom: '4px' }}>{value}</div>
              <div style={{ color: '#64748B', fontSize: '13px' }}>{label}</div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Main stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '12px' }}>
                <StatBox icon="📋" value={totalReports} label="סה״כ דיווחים" color="#94A3B8" />
                <StatBox icon="🎉" value={rescued} label="חיות שהוצלו" color="#10B981" />
                <StatBox icon="⚡" value={inProgress} label="בטיפול כעת" color="#3B82F6" />
                <StatBox icon="🏆" value={`${rescueRate}%`} label="אחוז הצלה" color="#F59E0B" />
              </div>

              {/* People stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ color: '#6EE7B7', fontWeight: '800', fontSize: '24px' }}>{activeVolsNow}</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>מתנדבים זמינים</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ color: '#C4B5FD', fontWeight: '800', fontSize: '24px' }}>{activeVols.length}</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>סה״כ מתנדבים</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                  <div style={{ color: '#FCA5A5', fontWeight: '800', fontSize: '24px' }}>{approvedOrgs}</div>
                  <div style={{ color: '#64748B', fontSize: '12px' }}>עמותות פעילות</div>
                </div>
              </div>

              {/* Last 7 days chart */}
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px' }}>
                <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '700', margin: '0 0 16px' }}>📈 דיווחים — 7 הימים האחרונים</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
                  {last7.map(d => (
                    <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '100%', background: '#EF4444', borderRadius: '4px 4px 0 0', height: `${(d.count / maxDay) * 64}px`, minHeight: d.count ? '6px' : '0', transition: 'height 0.3s' }} />
                      <span style={{ color: '#475569', fontSize: '10px' }}>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top animals */}
              {topAnimals.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '20px' }}>
                  <p style={{ color: '#94A3B8', fontSize: '13px', fontWeight: '700', margin: '0 0 14px' }}>🐾 חיות מדווחות בשכיחות גבוהה</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {topAnimals.map(([animal, count]) => (
                      <div key={animal} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'white', fontSize: '14px', width: '120px', flexShrink: 0 }}>{animal}</span>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                          <div style={{ width: `${(count / topAnimals[0][1]) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#EF4444,#F97316)', borderRadius: '4px' }} />
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: '13px', width: '24px', textAlign: 'left' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Users tab */}
        {tab === 'users' && (() => {
          const allUsers = [
            ...activeVols.map(v => ({ ...v, _type: 'מתנדב', _col: 'volunteers' })),
            ...activeOrgs.map(o => ({ ...o, _type: 'עמותה', _col: 'organizations' })),
          ];

          const deleteUser = async (uid: string, col: string, name: string) => {
            if (!confirm(`מחיקת ${name} — תמחק את החשבון מ-Firebase לחלוטין. להמשיך?`)) return;
            try {
              const token = await auth.currentUser!.getIdToken();
              const res = await fetch('/api/admin/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUid: uid, callerToken: token }),
              });
              const json = await res.json();
              if (!json.ok) alert('שגיאה: ' + json.error);
            } catch (e: any) { alert('שגיאה: ' + e.message); }
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ color: '#64748B', fontSize: '12px', margin: '0 0 8px' }}>
                {allUsers.length} משתמשים פעילים — מחיקה תסיר גם מ-Firebase Authentication
              </p>
              {allUsers.length === 0 && <EmptyState label="אין משתמשים" />}
              {allUsers.map(u => (
                <Card key={u.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ color: 'white', fontWeight: '700', fontSize: '14px' }}>{u.name}</span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: u._type === 'מתנדב' ? 'rgba(59,130,246,0.15)' : 'rgba(239,68,68,0.15)', color: u._type === 'מתנדב' ? '#93C5FD' : '#FCA5A5', fontWeight: '600' }}>
                          {u._type}
                        </span>
                        <StatusBadge status={u.status} />
                      </div>
                      <p style={{ color: '#64748B', fontSize: '12px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.email} {u.city ? `· ${u.city}` : ''} {u.phone ? `· ${u.phone}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <ActionButton
                        label="🗂 ארכיון"
                        color="#64748B"
                        loading={updatingId === u.id}
                        onClick={() => archive(u._col, u.id)}
                      />
                      <ActionButton
                        label="🗑 מחק"
                        color="#EF4444"
                        loading={updatingId === u.id}
                        onClick={() => deleteUser(u.uid || u.id, u._col, u.name)}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          );
        })()}

        {/* Archive tab */}
        {tab === 'archive' && (() => {
          const archivedOrgs  = organizations.filter(o => o.archived);
          const archivedVols  = volunteers.filter(v => v.archived);
          const archivedReps  = reports.filter(r => r.archived);
          const total = archivedOrgs.length + archivedVols.length + archivedReps.length;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {total === 0 && <EmptyState label="הארכיון ריק" />}

              {archivedOrgs.length > 0 && (
                <div>
                  <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 10px' }}>🏢 עמותות ({archivedOrgs.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {archivedOrgs.map(org => (
                      <Card key={org.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <p style={{ color: '#94A3B8', fontWeight: '600', margin: '0 0 2px' }}>{org.name}</p>
                            <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>{org.email} | {org.city}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <ActionButton label="↩ שחזר" color="#3B82F6" loading={updatingId === org.id}
                              onClick={() => restore('organizations', org.id)} />
                            <ActionButton label="🗑 מחק" color="#EF4444" loading={updatingId === org.id}
                              onClick={() => permanentDelete('organizations', org.id)} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {archivedVols.length > 0 && (
                <div>
                  <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 10px' }}>🤝 מתנדבים ({archivedVols.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {archivedVols.map(vol => (
                      <Card key={vol.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <p style={{ color: '#94A3B8', fontWeight: '600', margin: '0 0 2px' }}>{vol.name}</p>
                            <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>{vol.email} | {vol.city}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <ActionButton label="↩ שחזר" color="#3B82F6" loading={updatingId === vol.id}
                              onClick={() => restore('volunteers', vol.id)} />
                            <ActionButton label="🗑 מחק" color="#EF4444" loading={updatingId === vol.id}
                              onClick={() => permanentDelete('volunteers', vol.id)} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {archivedReps.length > 0 && (
                <div>
                  <p style={{ color: '#64748B', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 10px' }}>📋 דיווחים ({archivedReps.length})</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {archivedReps.map(rep => (
                      <Card key={rep.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div>
                            <p style={{ color: '#94A3B8', fontWeight: '600', margin: '0 0 2px' }}>{rep.animalType}</p>
                            <p style={{ color: '#475569', fontSize: '12px', margin: 0 }}>📍 {rep.location}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <ActionButton label="↩ שחזר" color="#3B82F6" loading={updatingId === rep.id}
                              onClick={() => restore('reports', rep.id)} />
                            <ActionButton label="🗑 מחק" color="#EF4444" loading={updatingId === rep.id}
                              onClick={() => permanentDelete('reports', rep.id)} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Adoptions tab */}
        {tab === 'adoptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {adoptions.length === 0 && <EmptyState label="אין פוסטי אימוץ" />}
            {adoptions.map(post => {
              const CATS: Record<string, string> = { dog:'🐕', cat:'🐈', rabbit:'🐇', hamster:'🐹', parrot:'🦜', other:'✨' };
              const icon = CATS[post.type] || '🐾';
              return (
                <Card key={post.id}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {post.images?.[0] ? (
                      <img src={post.images[0]} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>{icon}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <p style={{ color: 'white', fontWeight: '700', fontSize: '15px', margin: '0 0 2px' }}>{post.name || 'ללא שם'} {icon}</p>
                          <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 2px' }}>📍 {post.city} · {post.contactPhone}</p>
                          <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>{post.userEmail}</p>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: post.status === 'available' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: post.status === 'available' ? '#6EE7B7' : '#94A3B8', flexShrink: 0 }}>
                          {post.status === 'available' ? '✅ פעיל' : '🔒 לא פעיל'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <ActionButton
                      label={post.status === 'available' ? '🔒 השהה' : '✅ הפעל'}
                      color={post.status === 'available' ? '#F59E0B' : '#10B981'}
                      loading={updatingId === post.id}
                      onClick={() => update('adoptions', post.id, { status: post.status === 'available' ? 'paused' : 'available' })}
                    />
                    <ActionButton
                      label="🗑 מחק"
                      color="#EF4444"
                      loading={updatingId === post.id}
                      onClick={() => permanentDelete('adoptions', post.id)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Seen posts tab */}
        {tab === 'seen_posts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {seenPosts.length === 0 && <EmptyState label="אין פוסטים של מי ראה?" />}
            {seenPosts.map(post => {
              const ICONS: Record<string, string> = { dog:'🐕', cat:'🐈', rabbit:'🐇', hamster:'🐹', parrot:'🦜', other:'✨' };
              const icon = ICONS[post.animalType] || '🐾';
              const isLost = post.type === 'lost';
              return (
                <Card key={post.id}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    {post.images?.[0] ? (
                      <img src={post.images[0]} alt="" style={{ width: '72px', height: '72px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', flexShrink: 0 }}>{icon}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', background: isLost ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: isLost ? '#FCA5A5' : '#6EE7B7' }}>
                              {isLost ? '😢 נעלם' : '🙌 נמצא'}
                            </span>
                            {post.nearAnimal && <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', background: 'rgba(239,68,68,0.25)', color: '#FCA5A5' }}>📍 ליד החיה</span>}
                          </div>
                          <p style={{ color: 'white', fontWeight: '700', fontSize: '14px', margin: '0 0 2px' }}>{post.name || icon} · {post.city}</p>
                          <p style={{ color: '#64748B', fontSize: '11px', margin: 0 }}>{post.userEmail} · {post.contactPhone}</p>
                        </div>
                        <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: '700', background: post.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)', color: post.status === 'active' ? '#6EE7B7' : '#94A3B8', flexShrink: 0 }}>
                          {post.status === 'active' ? '✅ פעיל' : '🔒 לא פעיל'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <ActionButton
                      label={post.status === 'active' ? '🔒 השהה' : '✅ הפעל'}
                      color={post.status === 'active' ? '#F59E0B' : '#10B981'}
                      loading={updatingId === post.id}
                      onClick={() => update('seen_posts', post.id, { status: post.status === 'active' ? 'paused' : 'active' })}
                    />
                    <ActionButton
                      label="🗑 מחק"
                      color="#EF4444"
                      loading={updatingId === post.id}
                      onClick={() => permanentDelete('seen_posts', post.id)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Test tab — embed /test page inline */}
        {tab === 'test' && (
          <iframe
            src="/test"
            style={{
              width: '100%',
              height: '700px',
              border: 'none',
              borderRadius: '16px',
              background: 'transparent',
            }}
          />
        )}

      </div>
    </div>
  );
}

const aLabel: React.CSSProperties = { display: 'block', color: '#CBD5E1', fontSize: '13px', fontWeight: '600', marginBottom: '6px' };
const aInput: React.CSSProperties = { width: '100%', padding: '10px 13px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'white', fontSize: '14px', boxSizing: 'border-box' };

function AField({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={aLabel}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={aInput} />
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px' }}>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const s = STATUS_COLORS[status] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
  const label = status in ({} as any) ? status :
    (status === 'pending_review' ? t('status','pending') :
     t('status', status as any) || status);
  return (
    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', color: s.color, background: s.bg, flexShrink: 0 }}>
      {label}
    </span>
  );
}

function ActionButton({ label, color, loading, onClick }: { label: string; color: string; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        flex: 1,
        padding: '8px',
        borderRadius: '8px',
        border: `1px solid ${color}`,
        background: `${color}22`,
        color,
        fontWeight: '600',
        fontSize: '13px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px' }}>
      <p style={{ color: '#64748B', fontSize: '11px', fontWeight: '700', margin: '0 0 4px', textTransform: 'uppercase' }}>{title}</p>
      <p style={{ color: '#CBD5E1', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{value || '—'}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#94A3B8' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
      <p>{label}</p>
    </div>
  );
}
