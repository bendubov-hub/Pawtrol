// src/app/theme.ts
export const colors = {
  primary: '#EF4444', // אדום חזק (כפתור CTA)
  secondary: '#F97316', // כתום (stats)
  success: '#10B981', // ירוק (confirmed)
  warning: '#F59E0B', // צהוב (pending)
  danger: '#DC2626', // אדום כהה (urgent)
  
  // Backgrounds
  bg: {
    dark: '#0F172A', // כחול כהה מאוד
    darker: '#020617', // שחור כמעט
    light: '#F8FAFC', // לבן כמעט
  },
  
  // Text
  text: {
    primary: '#FFFFFF', // לבן
    secondary: '#CBD5E1', // אפור בהיר
    muted: '#94A3B8', // אפור כהה
  },
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};

export const typography = {
  h1: 'text-5xl font-black',
  h2: 'text-3xl font-bold',
  h3: 'text-2xl font-semibold',
  body: 'text-base font-medium',
  small: 'text-sm font-regular',
};

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};