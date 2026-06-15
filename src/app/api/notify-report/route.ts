import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseCoords(location: string): [number, number] | null {
  const parts = location.split(',').map(s => parseFloat(s.trim()));
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return [parts[0], parts[1]];
  return null;
}

function orgMatchesAnimal(orgTypes: string[], animal: string): boolean {
  if (!orgTypes?.length) return true; // no filter = accepts all
  const base = animal.replace(/\p{Emoji}/gu, '').trim().toLowerCase();
  return orgTypes.some(t => {
    const tb = t.replace(/\p{Emoji}/gu, '').trim().toLowerCase();
    return tb.includes(base) || base.includes(tb);
  });
}


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pawtrolit.org';

function emailHtml(opts: {
  name: string; role: 'org' | 'vol'; urgent?: boolean;
  animalType: string; location: string; reportId: string;
  imageUrl?: string; stillThere: boolean | null; description?: string;
}) {
  const { name, role, urgent, animalType, location, reportId, imageUrl, stillThere, description } = opts;
  const dashUrl = `${APP_URL}/${role === 'org' ? 'organizations' : 'volunteer'}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  const stillThereText = stillThere === true ? '✅ המדווח עדיין במקום' : stillThere === false ? '❌ המדווח עזב' : '❓ לא ידוע';
  const headerColor = urgent ? '#DC2626' : '#EF4444';
  const urgentBanner = urgent ? `<div style="background:#DC2626;color:white;padding:10px;border-radius:8px;margin-bottom:16px;font-weight:700;font-size:14px">🚨 אין מתנדב זמין באזור — נדרשת עזרה דחופה!</div>` : '';

  return `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <h1 style="color:${headerColor};font-size:28px;text-align:center;margin:0 0 20px">🐾 Pawtrol</h1>
  <div style="background:#1e293b;border:1px solid ${headerColor}55;border-radius:16px;padding:24px">
    ${urgentBanner}
    <h2 style="color:white;font-size:18px;margin:0 0 6px">🚨 דיווח חדש — ${animalType}</h2>
    <p style="color:#94a3b8;font-size:13px;margin:0 0 16px">שלום ${name}</p>
    ${imageUrl ? `<img src="${imageUrl}" style="width:100%;border-radius:10px;margin-bottom:14px;max-height:220px;object-fit:cover" />` : ''}
    <div style="background:#0f172a;border-radius:10px;padding:14px;margin-bottom:16px">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 6px">🐾 <strong style="color:white">${animalType}</strong></p>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 6px">📍 <strong style="color:white">${location}</strong></p>
      <p style="color:#94a3b8;font-size:13px;margin:0 0 6px">👤 <strong style="color:white">${stillThereText}</strong></p>
      ${description ? `<p style="color:#94a3b8;font-size:13px;margin:0">📝 ${description}</p>` : ''}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-left:6px"><a href="${mapsUrl}" style="display:block;padding:12px;background:#1e40af;color:white;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;text-align:center">🗺️ נווט</a></td>
      <td style="padding-right:6px"><a href="${dashUrl}" style="display:block;padding:12px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border-radius:10px;text-decoration:none;font-weight:700;font-size:13px;text-align:center">📋 דשבורד</a></td>
    </tr></table>
  </div>
</div></body></html>`;
}

async function sendPush(uid: string, title: string, body: string, url: string) {
  try {
    const snap = await adminDb.collection('fcm_tokens').doc(uid).get();
    const token = snap.data()?.token;
    if (!token) return;
    await adminMessaging.send({
      token,
      data: { title, body, url, icon: '/icon-192.png' },
    });
  } catch { /* token expired / not registered */ }
}

export async function POST(req: NextRequest) {
  try {
    const { animalType, location, reportId, imageUrl, stillThere, description } = await req.json();
    const coords = parseCoords(location);
    const dashVol = `${APP_URL}/volunteer`;
    const dashOrg = `${APP_URL}/organizations`;

    // ── 1. Notify matching organizations ──
    const orgsSnap = await adminDb.collection('organizations').where('status', '==', 'approved').get();
    for (const d of orgsSnap.docs) {
      const org = d.data();
      if (org.archived) continue;
      if (!orgMatchesAnimal(org.animalTypes || [], animalType)) continue;
      if (org.email) {
        await sendEmail(org.email, `🚨 דיווח חדש: ${animalType}`, emailHtml({ name: org.name || 'עמותה', role: 'org', animalType, location, reportId, imageUrl, stillThere, description }));
      }
      if (org.uid) await sendPush(org.uid, `🚨 דיווח חדש: ${animalType}`, `${location} — לחץ לפרטים`, dashOrg);
    }

    // ── 2. Get all non-archived volunteers ──
    const volsSnap = await adminDb.collection('volunteers').get();
    const vols = volsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(v => !v.archived);

    // Score volunteers: available=true gets priority, then by distance
    type VolEntry = { vol: any; dist: number; available: boolean };
    const scored: VolEntry[] = vols.map(vol => {
      let dist = 9999;
      if (coords && vol.lat && vol.lng) dist = distanceKm(coords[0], coords[1], vol.lat, vol.lng);
      return { vol, dist, available: !!vol.available };
    });
    scored.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.dist - b.dist;
    });

    const nearbyAvailable = scored.filter(s => s.available && s.dist <= 15);
    const anyAvailable    = scored.filter(s => s.available);
    const all             = scored;

    let targets: VolEntry[];
    let urgent = false;

    if (nearbyAvailable.length > 0) {
      targets = nearbyAvailable;           // available + within 15km
    } else if (anyAvailable.length > 0) {
      targets = [anyAvailable[0]];         // nearest available regardless of distance
    } else if (all.length > 0) {
      targets = all;                       // no one available — notify all, mark urgent
      urgent = true;
    } else {
      targets = [];
    }

    for (const { vol } of targets) {
      const pushTitle = urgent ? `🚨 דחוף! אין מתנדב זמין — ${animalType}` : `🐾 דיווח חדש: ${animalType}`;
      const pushBody  = urgent ? 'נדרשת עזרה דחופה — אף מתנדב לא זמין כרגע' : `${location}`;

      if (vol.email) {
        await sendEmail(vol.email, urgent ? `🚨 דחוף! אין מתנדב — ${animalType}` : `🐾 דיווח חדש: ${animalType}`, emailHtml({ name: vol.name || 'מתנדב', role: 'vol', urgent, animalType, location, reportId, imageUrl, stillThere, description }));
      }
      await sendPush(vol.uid || vol.id, pushTitle, pushBody, dashVol);
    }

    return NextResponse.json({ ok: true, orgs: orgsSnap.size, volunteers: targets.length, urgent });
  } catch (err: any) {
    console.error('notify-report error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
