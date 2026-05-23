export interface Rank {
  min: number;
  icon: string;
  he: string;
  en: string;
  color: string;
  bg: string;
  border: string;
}

export const RANKS: Rank[] = [
  { min: 0,   icon: '🐾', he: 'אוהב חיות',    en: 'Animal Lover',  color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)' },
  { min: 3,   icon: '🦺', he: 'שומר חיות',    en: 'Animal Guard',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)' },
  { min: 8,   icon: '🦸', he: 'גיבור היום',   en: 'Hero of the Day',color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
  { min: 20,  icon: '💚', he: 'אלטרואיסט',    en: 'Altruist',      color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)' },
  { min: 50,  icon: '🌟', he: 'מלאך',         en: 'Angel',         color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
  { min: 100, icon: '👑', he: 'אגדה',         en: 'Legend',        color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.4)' },
];

export function getRank(score: number): Rank & { next: Rank | null; progress: number } {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.min) current = r;
  }
  const idx = RANKS.indexOf(current);
  const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
  const progress = next
    ? Math.round(((score - current.min) / (next.min - current.min)) * 100)
    : 100;
  return { ...current, next, progress };
}
