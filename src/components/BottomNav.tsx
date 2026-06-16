'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang-context';
import { useAuth } from '@/lib/auth-context';
import { useChatNotify } from '@/lib/chat-notify-context';

export default function BottomNav() {
  const pathname = usePathname();
  const { t, lang, setLang } = useLang();
  const { profile } = useAuth();
  const { unreadAdopt, unreadSeen } = useChatNotify();

  const NAV_ITEMS = [
    { href: '/',         icon: '🏠', label: t('nav', 'home'),    badge: 0 },
    { href: '/report',   icon: '📸', label: t('nav', 'report'),  badge: 0 },
    { href: '/adopt', icon: '🐾', label: 'אימוץ',    badge: unreadAdopt },
    { href: '/seen',  icon: '🔍', label: 'מי ראה?', badge: unreadSeen },
    { href: '/settings', icon: '⚙️', label: t('nav', 'settings'),badge: 0 },
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)',
      maxWidth: '540px',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(16px)',
      borderRadius: '20px',
      padding: '10px 8px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '6px 4px', borderRadius: '12px',
              background: isActive ? 'rgba(239,68,68,0.15)' : 'transparent',
              transition: 'all 0.2s', cursor: 'pointer', position: 'relative',
            }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</span>
                {item.badge > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-8px',
                    background: '#EF4444', color: 'white',
                    fontSize: '10px', fontWeight: '800',
                    minWidth: '16px', height: '16px',
                    borderRadius: '8px', padding: '0 4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid rgba(15,23,42,0.9)',
                  }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', fontWeight: isActive ? '700' : '500', color: isActive ? '#EF4444' : '#94A3B8', transition: 'color 0.2s' }}>
                {item.label}
              </span>
              {isActive && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#EF4444' }} />}
            </div>
          </Link>
        );
      })}

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
        style={{
          padding: '6px 10px', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.07)',
          color: '#94A3B8', fontSize: '11px', fontWeight: '700',
          cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
        onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
      >
        {lang === 'he' ? 'EN' : 'עב'}
      </button>
    </div>
  );
}
