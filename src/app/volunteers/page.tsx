'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import BottomNav from '@/components/BottomNav';
import { useLang } from '@/lib/lang-context';

interface Volunteer {
  id: string;
  name: string;
  phone: string;
  city: string;
  address?: string;
  hasCar: boolean;
  available: boolean;
  lat?: number;
  lng?: number;
  distance?: number; // km
}

type SortKey = 'name' | 'city' | 'available' | 'distance';
type SortDir = 'asc' | 'desc';

const cityCoordCache: Record<string, { lat: number; lng: number } | null> = {};

async function geocodeCity(city: string): Promise<{ lat: number; lng: number } | null> {
  if (city in cityCoordCache) return cityCoordCache[city];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ', Israel')}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'he' } }
    );
    const data = await res.json();
    if (data[0]) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      cityCoordCache[city] = result;
      return result;
    }
  } catch {}
  cityCoordCache[city] = null;
  return null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function VolunteersPage() {
  const { t } = useLang();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('available');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [filterCity, setFilterCity] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceLoading, setDistanceLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const snap = await getDocs(query(
          collection(db, 'volunteers'),
          where('status', '==', 'approved')
        ));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Volunteer));
        setVolunteers(data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, []);

  const requestDistance = useCallback(async () => {
    setDistanceLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);

        const updated = await Promise.all(volunteers.map(async (v) => {
          const cityCoords = await geocodeCity(v.city);
          if (!cityCoords) return v;
          const dist = haversine(coords.lat, coords.lng, cityCoords.lat, cityCoords.lng);
          return { ...v, distance: Math.round(dist) };
        }));

        setVolunteers(updated);
        setSortKey('distance');
        setSortDir('asc');
        setDistanceLoading(false);
      },
      () => {
        alert('לא הצלחנו לקבל מיקום');
        setDistanceLoading(false);
      }
    );
  }, [volunteers]);

  const handleSort = (key: SortKey) => {
    if (key === 'distance' && !userCoords) {
      requestDistance();
      return;
    }
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'available' ? 'desc' : 'asc');
    }
  };

  const cities = Array.from(new Set(volunteers.map(v => v.city))).sort((a, b) => a.localeCompare(b, 'he'));

  const sorted = [...volunteers]
    .filter(v => !filterAvailable || v.available)
    .filter(v => !filterCity || v.city === filterCity)
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'he');
      else if (sortKey === 'city') cmp = a.city.localeCompare(b.city, 'he');
      else if (sortKey === 'available') cmp = (a.available === b.available ? 0 : a.available ? -1 : 1);
      else if (sortKey === 'distance') cmp = (a.distance ?? 9999) - (b.distance ?? 9999);
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ color: '#475569', marginRight: '4px' }}>↕</span>;
    return <span style={{ color: '#EF4444', marginRight: '4px' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const ColHeader = ({ label, col, width }: { label: string; col: SortKey; width?: string }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        textAlign: 'right',
        padding: '12px 14px',
        color: sortKey === col ? '#EF4444' : '#94A3B8',
        fontSize: '13px',
        fontWeight: '700',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        width,
        transition: 'color 0.2s',
      }}
    >
      <SortIcon col={col} />
      {label}
      {col === 'distance' && distanceLoading && <span style={{ marginRight: '4px', fontSize: '11px' }}>⏳</span>}
    </th>
  );

  const availCount = volunteers.filter(v => v.available).length;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ paddingTop: '16px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'white', margin: '0 0 4px' }}>{t('volunteersPage','title')}</h1>
          <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>
            {availCount} {t('volunteersPage','available')} · {volunteers.length} {t('volunteersPage','total')}
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filterCity}
            onChange={e => setFilterCity(e.target.value)}
            style={{
              padding: '9px 14px',
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${filterCity ? '#EF4444' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px',
              color: filterCity ? 'white' : '#94A3B8',
              fontSize: '13px',
              cursor: 'pointer',
              minWidth: '130px',
            }}
          >
            <option value="" style={{ background: '#1E293B' }}>🏙 {t('volunteersPage','allCities')}</option>
            {cities.map(c => <option key={c} value={c} style={{ background: '#1E293B' }}>{c}</option>)}
          </select>

          <FilterChip active={filterAvailable} onClick={() => setFilterAvailable(v => !v)} label={t('volunteersPage','availOnly')} activeColor="#10B981" />
          <FilterChip active={sortKey === 'distance'} onClick={requestDistance} label={distanceLoading ? t('volunteersPage','calculating') : t('volunteersPage','byDistance')} activeColor="#3B82F6" disabled={distanceLoading} />
          {(filterCity || filterAvailable || sortKey !== 'available') && (
            <button onClick={() => { setFilterCity(''); setFilterAvailable(false); setSortKey('available'); setSortDir('desc'); }} style={{ padding: '9px 14px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>
              {t('volunteersPage','clearFilters')}
            </button>
          )}
          <span style={{ marginRight: 'auto', color: '#64748B', fontSize: '13px' }}>
            {sorted.length} {t('volunteersPage','results')}
          </span>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#94A3B8' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⏳</div>
            <p>{t('common','loading')}</p>
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <p>{t('volunteersPage','noResults')}</p>
          </div>
        ) : (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                <thead>
                  <tr>
                    <ColHeader label={t('volunteersPage','colName')} col="name" />
                    <th style={thStatic}>{t('volunteersPage','colPhone')}</th>
                    <ColHeader label={t('volunteersPage','colCity')} col="city" />
                    <th style={thStatic}>{t('volunteersPage','colAddress')}</th>
                    <ColHeader label={t('volunteersPage','colAvail')} col="available" width="110px" />
                    {userCoords && <ColHeader label={t('volunteersPage','colDistance')} col="distance" width="90px" />}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((v, i) => (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: i < sorted.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)')}
                    >
                      <td style={tdStyle}>
                        <span style={{ color: 'white', fontWeight: '600' }}>{v.name}</span>
                        {v.hasCar && <span style={{ marginRight: '6px', fontSize: '12px' }}>🚗</span>}
                      </td>
                      <td style={tdStyle}>
                        <a href={`tel:${v.phone}`} style={{
                          color: '#60A5FA', textDecoration: 'none', fontWeight: '500',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          📞 {v.phone}
                        </a>
                      </td>
                      <td style={{ ...tdStyle, color: '#CBD5E1' }}>{v.city}</td>
                      <td style={{ ...tdStyle, color: '#64748B', fontSize: '13px' }}>{v.address || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                          color: v.available ? '#6EE7B7' : '#64748B',
                          background: v.available ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${v.available ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.1)'}`,
                          whiteSpace: 'nowrap',
                        }}>
                          {v.available ? t('status','available') : t('status','unavailable')}
                        </span>
                      </td>
                      {userCoords && (
                        <td style={{ ...tdStyle, color: '#94A3B8', fontSize: '13px' }}>
                          {v.distance !== undefined ? `${v.distance} ${t('volunteersPage','km')}` : '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

const thStatic: React.CSSProperties = {
  textAlign: 'right',
  padding: '12px 14px',
  color: '#94A3B8',
  fontSize: '13px',
  fontWeight: '700',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '13px 14px',
  fontSize: '14px',
  verticalAlign: 'middle',
};

function FilterChip({ active, onClick, label, activeColor, disabled }: {
  active: boolean; onClick: () => void; label: string; activeColor: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 14px',
        borderRadius: '10px',
        border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.12)'}`,
        background: active ? `${activeColor}22` : 'rgba(255,255,255,0.07)',
        color: active ? activeColor : '#94A3B8',
        fontWeight: '600',
        fontSize: '13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}
