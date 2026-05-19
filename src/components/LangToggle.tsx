'use client';

import { useLang } from '@/lib/lang-context';

export default function LangToggle({ style }: { style?: React.CSSProperties }) {
  const { lang, setLang } = useLang();

  return (
    <button
      onClick={() => setLang(lang === 'he' ? 'en' : 'he')}
      style={{
        padding: '6px 12px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'rgba(255,255,255,0.08)',
        color: '#CBD5E1',
        fontSize: '13px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.03em',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
    >
      {lang === 'he' ? 'EN' : 'עב'}
    </button>
  );
}
