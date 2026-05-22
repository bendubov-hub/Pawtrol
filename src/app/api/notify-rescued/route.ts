import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
});

export async function POST(req: NextRequest) {
  try {
    const { reportId, animalType, location } = await req.json();

    const snap = await adminDb.collection('reports').doc(reportId).get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'Report not found' }, { status: 404 });

    const report = snap.data()!;
    const { reporterFcmToken, reporterEmail } = report;
    let sent = false;

    // 1. Push notification (works for anonymous users too)
    if (reporterFcmToken) {
      try {
        await adminMessaging.send({
          token: reporterFcmToken,
          notification: {
            title: `🎉 ${animalType} הוצל!`,
            body: 'החיה שדיווחת עליה טופלה בהצלחה על ידי מתנדב 🐾',
          },
          webpush: {
            fcmOptions: { link: '/' },
            notification: { icon: '/icon-192.png', dir: 'rtl' },
          },
        });
        sent = true;
      } catch { /* token expired */ }
    }

    // 2. Email fallback if no push or as supplement
    if (reporterEmail && !sent) {
      await transporter.sendMail({
        from: `"Pawtrol 🐾" <${process.env.GMAIL_USER}>`,
        to: reporterEmail,
        subject: `🎉 ${animalType} הוצל! — Pawtrol`,
        html: `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:32px 16px;text-align:center">
  <h1 style="color:#10b981;font-size:32px;margin:0 0 8px">🎉</h1>
  <h2 style="color:white;font-size:22px;margin:0 0 16px">${animalType} הוצל בהצלחה!</h2>
  <div style="background:#1e293b;border:1px solid rgba(16,185,129,0.3);border-radius:16px;padding:24px;margin-bottom:24px">
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0">
      תודה על הדיווח שלך!<br>
      החיה שדיווחת עליה ב <strong style="color:white">${location}</strong><br>
      טופלה בהצלחה על ידי מתנדב Pawtrol 🐾
    </p>
  </div>
  <p style="color:#475569;font-size:12px">Pawtrol · pawtrolit.org</p>
</div></body></html>`,
      });
      sent = true;
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err: any) {
    console.error('notify-rescued error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
