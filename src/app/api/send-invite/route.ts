import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { email, fullName, token, city } = await req.json();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join?token=${token}`;

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:32px">
    <h1 style="color:#ef4444;font-size:32px;margin:0">🐾 Pawtrol</h1>
  </div>

  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px">
    <h2 style="color:white;font-size:20px;margin:0 0 12px">שלום ${fullName}! 👋</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 20px">
      בקשתך להצטרף כמתנדב ב-Pawtrol <strong style="color:#10b981">אושרה!</strong><br>
      אנחנו שמחים לקבל אותך לצוות.
    </p>

    <div style="background:#0f172a;border-radius:12px;padding:16px;margin-bottom:24px">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 4px">עיר: <strong style="color:white">${city}</strong></p>
    </div>

    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px">
      לחץ/י על הכפתור למטה להשלמת ההרשמה ויצירת סיסמא:
    </p>

    <div style="text-align:center;margin-bottom:24px">
      <a href="${joinUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
        🐾 השלם את ההרשמה
      </a>
    </div>

    <p style="color:#475569;font-size:12px;text-align:center;margin:0">
      הקישור תקף ל-72 שעות · אם לא ביקשת הצטרפות, אפשר להתעלם מהמייל הזה.
    </p>
  </div>
</div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Pawtrol 🐾" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `🐾 התקבלת כמתנדב ב-Pawtrol!`,
      html,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Invite email error:', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
