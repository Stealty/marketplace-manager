'use client';

import * as React from 'react';
import { Alert, AlertTitle, Stack } from '@mui/material';

export interface SyncWarning {
  // Chave de dismiss — deve mudar sempre que o aviso precisar reaparecer
  // (ex.: nova expiração, novo erro de sync), e só então.
  key: string;
  title: string;
  message: React.ReactNode;
}

const DISMISS_EVENT = 'ml-warning-dismiss-change';

function dismissStorageKey(key: string) {
  return `ml-warning-dismissed:${key}`;
}

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(DISMISS_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

// String primitiva (não Set/array) — Object.is entre duas chamadas com o
// mesmo conteúdo dá `true`, então useSyncExternalStore não re-renderiza em
// loop mesmo sem memoização manual do snapshot.
function getSnapshot(warnings: SyncWarning[]): string {
  return warnings
    .filter((w) => window.localStorage.getItem(dismissStorageKey(w.key)) === '1')
    .map((w) => w.key)
    .sort()
    .join(',');
}

function getServerSnapshot(): string {
  return '';
}

export function SyncWarningsBanner({ warnings }: { warnings: SyncWarning[] }) {
  const dismissedCsv = React.useSyncExternalStore(
    subscribe,
    () => getSnapshot(warnings),
    getServerSnapshot
  );
  const dismissedKeys = new Set(dismissedCsv ? dismissedCsv.split(',') : []);
  const visible = warnings.filter((w) => !dismissedKeys.has(w.key));

  if (visible.length === 0) return null;

  function handleDismiss(warning: SyncWarning) {
    window.localStorage.setItem(dismissStorageKey(warning.key), '1');
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      {visible.map((warning) => (
        <Alert key={warning.key} severity="warning" onClose={() => handleDismiss(warning)}>
          <AlertTitle>{warning.title}</AlertTitle>
          {warning.message}
        </Alert>
      ))}
    </Stack>
  );
}
