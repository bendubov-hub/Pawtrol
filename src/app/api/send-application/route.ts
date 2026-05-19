import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const docId = data.docId || `${Date.now()}`;

  // Send email in background (don't fail the request if email fails)
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;color:#94a3b8;font-size:13px;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:8px 12px;color:#f1f5f9;font-size:13px;font-weight:600">${value || '—'}</td></tr>`;

  const section = (title: string, rows: string) =>
    `<div style="margin-bottom:24px"><p style="color:#ef4444;font-size:14px;font-weight:800;margin:0 0 8px;border-bottom:1px solid #334155;padding-bottom:6px">${title}</p><table style="width:100%">${rows}</table></div>`;

  const html = `
<!DOCTYPE html><html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px">
  <div style="text-align:center;margin-bottom:28px">
    <h1 style="color:#ef4444;font-size:28px;margin:0">🐾 Pawtrol</h1>
    <p style="color:#94a3b8;font-size:14px;margin:6px 0 0">בקשת הצטרפות חדשה למתנדב</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:24px">
    ${section('👤 פרטים אישיים', `
      ${row('שם מלא', data.fullName)}${row('ת.ז.', data.idNumber)}${row('שנת לידה', data.birthYear)}
      ${row('טלפון', data.phone)}${row('אימייל', data.email)}${row('עיר', data.city)}${row('כתובת', data.address)}`)}
    ${section('🐾 ניסיון', `
      ${row('ניסיון', data.experience)}${row('מוטיבציה', data.motivation)}
      ${row('שעות זמינות', data.availableHours)}${row('בעלי חיים בבית', data.hasAnimals || 'לא צוין')}
      ${row('יש רכב', data.hasCar ? '✅ כן' : '❌ לא')}`)}
    ${section('📋 ממליצים', `
      ${row('ממליץ 1', `${data.ref1Name || '—'} · ${data.ref1Phone || '—'}`)}
      ${row('ממליץ 2', data.ref2Name ? `${data.ref2Name} · ${data.ref2Phone}` : 'לא סופק')}`)}
    ${(data.facebook || data.instagram) ? section('🔗 רשתות', `${row('Facebook', data.facebook || '—')}${row('Instagram', data.instagram || '—')}`) : ''}
    <div style="background:#0f172a;border-radius:10px;padding:14px;margin-top:8px">
      <p style="color:#64748b;font-size:12px;margin:0">מזהה: ${docId} · נשלח: ${new Date().toLocaleString('he-IL')}</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:20px">
    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin" style="display:inline-block;padding:12px 28px;background:#ef4444;color:white;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
      🛡️ פתח פאנל אדמין לאישור
    </a>
  </div>
</div>
</body></html>`;

  try {
    await transporter.sendMail({
      from: `"Pawtrol 🐾" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
      subject: `🐾 בקשת מתנדב חדשה — ${data.fullName} מ${data.city}`,
      html,
    });
  } catch (emailErr) {
    console.error('Email failed (application still saved):', emailErr);
  }

  return NextResponse.json({ ok: true, docId });
}
