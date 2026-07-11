'use client';

import * as React from 'react';
import { Alert, AlertTitle, Link as MuiLink, Stack } from '@mui/material';
import NextLink from 'next/link';

export interface ExpiredConnectionInfo {
  id: string;
  label: string;
  expiresAt: string | null;
}

const DISMISS_EVENT = 'ml-expired-connections-dismiss-change';

function dismissKey(connection: ExpiredConnectionInfo) {
  // Inclui expiresAt na chave: se a conexão for refeita e expirar de novo no
  // futuro, expiresAt muda e o aviso reaparece em vez de continuar oculto por
  // causa de uma dispensa antiga.
  return `ml-expired-dismissed:${connection.id}:${connection.expiresAt ?? 'unknown'}`;
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
function getSnapshot(connections: ExpiredConnectionInfo[]): string {
  return connections
    .filter((c) => window.localStorage.getItem(dismissKey(c)) === '1')
    .map((c) => c.id)
    .sort()
    .join(',');
}

function getServerSnapshot(): string {
  return '';
}

export function ExpiredConnectionsBanner({
  connections,
}: {
  connections: ExpiredConnectionInfo[];
}) {
  const dismissedCsv = React.useSyncExternalStore(
    subscribe,
    () => getSnapshot(connections),
    getServerSnapshot
  );
  const dismissedIds = new Set(dismissedCsv ? dismissedCsv.split(',') : []);
  const visible = connections.filter((c) => !dismissedIds.has(c.id));

  if (visible.length === 0) return null;

  function handleDismiss(connection: ExpiredConnectionInfo) {
    window.localStorage.setItem(dismissKey(connection), '1');
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      {visible.map((connection) => (
        <Alert key={connection.id} severity="warning" onClose={() => handleDismiss(connection)}>
          <AlertTitle>Conexão expirada</AlertTitle>
          A conta <strong>{connection.label}</strong> perdeu a conexão com o Mercado Livre e não está mais
          sincronizando dados automaticamente. Os dados exibidos nas telas podem estar desatualizados.{' '}
          <MuiLink component={NextLink} href="/dashboard/conexoes">
            Reconectar agora
          </MuiLink>
          .
        </Alert>
      ))}
    </Stack>
  );
}
