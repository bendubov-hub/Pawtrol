'use client';

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', padding: '16px 16px 100px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        <div style={{ paddingTop: '16px', marginBottom: '32px' }}>
          <Link href="/" style={{ color: '#64748B', fontSize: '13px', textDecoration: 'none' }}>← חזרה לדף הבית</Link>
          <h1 style={{ color: 'white', fontWeight: '900', fontSize: '24px', margin: '12px 0 4px' }}>🐾 מדיניות פרטיות</h1>
          <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>עדכון אחרון: מאי 2026</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '14px', lineHeight: '1.8', color: '#CBD5E1' }}>

          <Section title="מי אנחנו">
            Pawtrol היא פלטפורמה לדיווח וטיפול בבעלי חיים במצוקה. האפליקציה מחברת בין אנשים שמדווחים
            על חיות פגועות/נטושות לבין מתנדבים ועמותות שיכולים לעזור.
            <br /><br />
            כתובת: ישראל | דוא"ל: bendubov@gmail.com
          </Section>

          <Section title="אילו מידע אנו אוספים">
            <b style={{ color: 'white' }}>מדווחים (כולל אנונימיים):</b>
            <ul style={{ margin: '8px 0 0', paddingRight: '20px' }}>
              <li>מיקום בעת הדיווח</li>
              <li>תמונות שהועלו</li>
              <li>מספר טלפון (אופציונלי — לצורך יצירת קשר עם המתנדב)</li>
              <li>כתובת אימייל (אופציונלית — לקבלת עדכון על הצלת החיה)</li>
              <li>טוקן FCM למכשיר (להתראות, אנונימי)</li>
            </ul>
            <br />
            <b style={{ color: 'white' }}>מתנדבים ועמותות:</b>
            <ul style={{ margin: '8px 0 0', paddingRight: '20px' }}>
              <li>שם, אימייל, טלפון, עיר</li>
              <li>מיקום בעת פעילות (כאשר מסומנים כ"זמינים")</li>
              <li>פרטי קשר לממליצים (במסגרת הגשת בקשה)</li>
            </ul>
          </Section>

          <Section title="למה אנו משתמשים במידע">
            <ul style={{ margin: 0, paddingRight: '20px' }}>
              <li>ניתוב דיווחים למתנדבים הקרובים ביותר</li>
              <li>שליחת עדכון למדווח כאשר החיה הוצלה</li>
              <li>שיפור השירות וניתוח סטטיסטיקות (ברמת אגרגט, לא אישי)</li>
            </ul>
          </Section>

          <Section title="שיתוף מידע עם צדדים שלישיים">
            אנו <b style={{ color: 'white' }}>לא מוכרים</b> מידע לצדדים שלישיים.
            <br /><br />
            אנו משתמשים בשירותי Google (Firebase, FCM) לאחסון ושליחת התראות.
            מספר הטלפון של המדווח מועבר למתנדב שלוקח טיפול בדיווח — אך ורק לצורך יצירת קשר.
          </Section>

          <Section title="שמירת מידע">
            דיווחים נשמרים לצורך מעקב וסטטיסטיקות. מידע אישי (טלפון, אימייל) של משתמשים
            נשמר כל עוד החשבון פעיל. ניתן לבקש מחיקה בכל עת.
          </Section>

          <Section title="הזכויות שלך">
            <ul style={{ margin: 0, paddingRight: '20px' }}>
              <li><b style={{ color: 'white' }}>גישה:</b> תוכל לראות את המידע שלך בדף ההגדרות</li>
              <li><b style={{ color: 'white' }}>תיקון:</b> פנה אלינו לעדכון פרטים</li>
              <li><b style={{ color: 'white' }}>מחיקה:</b> דף ההגדרות → "מחק את החשבון שלי" — מוחק את כל המידע לצמיתות</li>
            </ul>
          </Section>

          <Section title="עוגיות והתראות">
            האפליקציה משתמשת ב-localStorage לשמירת העדפות שפה ומצב הרשאות.
            התראות Push מבוססות על Firebase Cloud Messaging — ניתן לבטל בכל עת
            דרך הגדרות המכשיר.
          </Section>

          <Section title="יצירת קשר">
            לכל שאלה בנושא פרטיות: <a href="mailto:bendubov@gmail.com" style={{ color: '#60A5FA' }}>bendubov@gmail.com</a>
          </Section>

        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '20px' }}>
      <h2 style={{ color: 'white', fontSize: '16px', fontWeight: '800', margin: '0 0 10px' }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
