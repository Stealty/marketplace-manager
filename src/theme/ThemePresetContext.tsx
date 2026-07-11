'use client';

import * as React from 'react';
import { THEME_PRESET_IDS, type ThemePresetId } from './tokens';

const STORAGE_KEY = 'theme-preset';
const CHANGE_EVENT = 'theme-preset-change';
const DEFAULT_PRESET: ThemePresetId = 'terracota';

type ThemePresetContextValue = {
  presetId: ThemePresetId;
  cycle: () => void;
};

const ThemePresetContext = React.createContext<ThemePresetContextValue | null>(null);

function isPresetId(value: string | null): value is ThemePresetId {
  return !!value && (THEME_PRESET_IDS as string[]).includes(value);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): ThemePresetId {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isPresetId(stored) ? stored : DEFAULT_PRESET;
}

function getServerSnapshot(): ThemePresetId {
  return DEFAULT_PRESET;
}

export function ThemePresetProvider({ children }: { children: React.ReactNode }) {
  const presetId = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const cycle = React.useCallback(() => {
    const current = getSnapshot();
    const nextIndex = (THEME_PRESET_IDS.indexOf(current) + 1) % THEME_PRESET_IDS.length;
    window.localStorage.setItem(STORAGE_KEY, THEME_PRESET_IDS[nextIndex]);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = React.useMemo(() => ({ presetId, cycle }), [presetId, cycle]);

  return <ThemePresetContext.Provider value={value}>{children}</ThemePresetContext.Provider>;
}

export function useThemePreset() {
  const ctx = React.useContext(ThemePresetContext);
  if (!ctx) throw new Error('useThemePreset must be used within ThemePresetProvider');
  return ctx;
}
