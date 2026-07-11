export type ColorMode = 'light' | 'dark';

export type Tone = 'accent' | 'success' | 'warning' | 'error' | 'neutral';

export type ThemePresetId = 'terracota' | 'oceano' | 'floresta';

type ModeTokens = {
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
};

type ThemePreset = {
  label: string;
  headingFontVar: string;
  light: ModeTokens;
  dark: ModeTokens;
};

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  terracota: {
    label: 'Terracota',
    headingFontVar: '--font-heading-oceano',
    light: {
      background: '#F5E9DA',
      panel: '#FFFDF9',
      panelAlt: '#EAD9C2',
      border: '#DEBB94',
      text: '#2B2420',
      textSecondary: '#7A5B45',
      accent: '#C4713D',
      accentContrast: '#FFF8EF',
      success: '#6B8F5C',
      warning: '#D6A24C',
      error: '#B14B3B',
      radius: 8,
    },
    dark: {
      background: '#1E1A16',
      panel: '#262019',
      panelAlt: '#2E2721',
      border: '#3A322A',
      text: '#F3ECE1',
      textSecondary: '#B5AA9A',
      accent: '#D98A56',
      accentContrast: '#FFF8EF',
      success: '#6B8F5C',
      warning: '#D6A24C',
      error: '#B14B3B',
      radius: 8,
    },
  },
  oceano: {
    label: 'Oceano',
    headingFontVar: '--font-heading-oceano',
    light: {
      background: '#DCEAF1',
      panel: '#F7FBFD',
      panelAlt: '#C9E0EA',
      border: '#A9C9D6',
      text: '#122029',
      textSecondary: '#3F6472',
      accent: '#2B6E8F',
      accentContrast: '#F2FAFD',
      success: '#3F8F6C',
      warning: '#C98A2E',
      error: '#C1483F',
      radius: 12,
    },
    dark: {
      background: '#131C21',
      panel: '#1B262C',
      panelAlt: '#212E35',
      border: '#2C3A41',
      text: '#E7F0F4',
      textSecondary: '#9DB0B9',
      accent: '#5FA8C7',
      accentContrast: '#0D1418',
      success: '#3F8F6C',
      warning: '#C98A2E',
      error: '#C1483F',
      radius: 12,
    },
  },
  floresta: {
    label: 'Floresta',
    headingFontVar: '--font-heading-floresta',
    light: {
      background: '#E7E8D2',
      panel: '#FAFAF1',
      panelAlt: '#D8DAB9',
      border: '#B9C08C',
      text: '#20241A',
      textSecondary: '#586246',
      accent: '#3F7D5C',
      accentContrast: '#F3FBF6',
      success: '#7A9B4E',
      warning: '#C99A3B',
      error: '#B24B3F',
      radius: 4,
    },
    dark: {
      background: '#181C16',
      panel: '#20251C',
      panelAlt: '#262C20',
      border: '#333A2A',
      text: '#ECEEE2',
      textSecondary: '#A9AF9B',
      accent: '#71B98D',
      accentContrast: '#0F130E',
      success: '#7A9B4E',
      warning: '#C99A3B',
      error: '#B24B3F',
      radius: 4,
    },
  },
};

export const THEME_PRESET_IDS = Object.keys(THEME_PRESETS) as ThemePresetId[];
