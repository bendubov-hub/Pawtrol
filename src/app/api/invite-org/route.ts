import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const data = await req.json();
  const { token, name, email, city } = data;

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://pawtrolit.org'}/join?token=${token}&type=org`;

  const html = `
<!DOCTYPE html><html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 16px">
  <div style="text-align:center;margin-bottom:28px">
    <h1 style="color:#ef4444;font-size:32px;margin:0">🐾 Pawtrol</h1>
    <p style="color:#94a3b8;font-size:14px;margin:6px 0 0">מערכת ניהול בעלי חיים</p>
  </div>
  <div style="background:#1e293b;border:1px solid #334155;border-radius:16px;padding:28px">
    <h2 style="color:white;font-size:20px;margin:0 0 12px">שלום ${name}! 👋</h2>
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;margin:0 0 16px">
      העמותה שלכם <strong style="color:white">${name}</strong> הוגדרה ב-Pawtrol.<br>
      לחצו על הכפתור למטה להשלמת ההרשמה ויצירת סיסמא.
    </p>
    <div style="background:#0f172a;border-radius:10px;padding:14px;margin-bottom:20px">
      <p style="color:#94a3b8;font-size:13px;margin:0">עיר: <strong style="color:white">${city}</strong></p>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${joinUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#ef4444,#dc2626);color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
        🏢 הגדר סיסמא והתחבר
      </a>
    </div>
    <p style="color:#475569;font-size:12px;text-align:center;margin:0">
      הקישור תקף ל-72 שעות
    </p>
  </div>
</div>
</body></html>`;

  try {
    await sendEmail(email, `🏢 הגדרת חשבון Pawtrol — ${name}`, html);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Org invite email error:', err);
    return NextResponse.json({ ok: true, emailError: err.message });
  }
}
