'use client';

import * as React from 'react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme';
import { ColorModeProvider, useColorMode } from './ColorModeContext';
import { ThemePresetProvider, useThemePreset } from './ThemePresetContext';

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useColorMode();
  const { presetId } = useThemePreset();
  const theme = React.useMemo(() => getTheme(mode, presetId), [mode, presetId]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = React.useState(() => {
    const emotionCache = createCache({ key: 'mui' });
    emotionCache.compat = true;
    const prevInsert = emotionCache.insert;
    let inserted: string[] = [];
    emotionCache.insert = (...args) => {
      const serialized = args[1];
      if (emotionCache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flushFn = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache: emotionCache, flush: flushFn };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  return (
    <CacheProvider value={cache}>
      <ColorModeProvider>
        <ThemePresetProvider>
          <AppThemeProvider>{children}</AppThemeProvider>
        </ThemePresetProvider>
      </ColorModeProvider>
    </CacheProvider>
  );
}
