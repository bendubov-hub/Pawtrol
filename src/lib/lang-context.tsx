'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { translations, Lang } from './translations';

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (section: keyof typeof translations, key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LangContext = createContext<LangContextType>({
  lang: 'he',
  setLang: () => {},
  t: (section, key) => key,
  dir: 'rtl',
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('he');

  useEffect(() => {
    const stored = localStorage.getItem('pawtrol_lang') as Lang | null;
    if (stored === 'en' || stored === 'he') setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('pawtrol_lang', l);
    document.documentElement.dir = l === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  };

  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (section: keyof typeof translations, key: string): string => {
    const sec = translations[section] as any;
    if (!sec || !sec[key]) return key;
    return sec[key][lang] ?? sec[key]['he'] ?? key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, dir: lang === 'he' ? 'rtl' : 'ltr' }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
