'use client';

import * as React from 'react';
import type { ColorMode } from './tokens';

const STORAGE_KEY = 'color-mode';
const CHANGE_EVENT = 'color-mode-change';

type ColorModeContextValue = {
  mode: ColorMode;
  toggle: () => void;
};

const ColorModeContext = React.createContext<ColorModeContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): ColorMode {
  return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
}

function getServerSnapshot(): ColorMode {
  return 'dark';
}

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore reads localStorage directly: server/first-hydration
  // render uses getServerSnapshot ('dark', no mismatch), then React syncs to
  // the real client value before paint — no setState-in-effect, no flash.
  const mode = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    document.documentElement.dataset.themeMode = mode;
  }, [mode]);

  const toggle = React.useCallback(() => {
    const next: ColorMode = getSnapshot() === 'dark' ? 'light' : 'dark';
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const value = React.useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const ctx = React.useContext(ColorModeContext);
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider');
  return ctx;
}

export const COLOR_MODE_STORAGE_KEY = STORAGE_KEY;
