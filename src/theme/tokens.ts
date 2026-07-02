export type ColorMode = 'light' | 'dark';

export type Tone = 'accent' | 'success' | 'warning' | 'error' | 'neutral';

const shared = {
  accent: '#C4713D',
  accentContrast: '#FFF8EF',
  success: '#6B8F5C',
  warning: '#D6A24C',
  error: '#B14B3B',
  radius: 8,
};

export const tokens: Record<ColorMode, {
  background: string;
  panel: string;
  panelAlt: string;
  border: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentContrast: string;
  success: string;
  warning: string;
  error: string;
  radius: number;
}> = {
  light: {
    ...shared,
    background: '#F7F1E8',
    panel: '#FBF6EE',
    panelAlt: '#EFE7D8',
    border: '#E4DCCB',
    text: '#2B2420',
    textSecondary: '#6B6255',
  },
  dark: {
    ...shared,
    accent: '#D98A56',
    background: '#1E1A16',
    panel: '#262019',
    panelAlt: '#2E2721',
    border: '#3A322A',
    text: '#F3ECE1',
    textSecondary: '#B5AA9A',
  },
};

export const TONE_COLOR: Record<ColorMode, Record<Tone, string>> = {
  light: {
    accent: tokens.light.accent,
    success: tokens.light.success,
    warning: tokens.light.warning,
    error: tokens.light.error,
    neutral: tokens.light.textSecondary,
  },
  dark: {
    accent: tokens.dark.accent,
    success: tokens.dark.success,
    warning: tokens.dark.warning,
    error: tokens.dark.error,
    neutral: tokens.dark.textSecondary,
  },
};
