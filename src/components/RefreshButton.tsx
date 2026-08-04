'use client';

import * as React from 'react';
import { Button, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const POLL_INTERVAL_MS = 2500;
const SAFETY_TIMEOUT_MS = 5 * 60 * 1000;

type RefreshState = 'idle' | 'syncing' | 'ready';

export function RefreshButton({
  action,
  checkDone,
  label = 'Atualizar',
}: {
  // A sincronização real roda em background (via `after()` na server
  // action) — `startedAt` é o timestamp que `checkDone` usa para saber
  // quando essa rodada específica terminou.
  action: () => Promise<{ error?: string; startedAt?: string }>;
  checkDone: (startedAt: string) => Promise<boolean>;
  label?: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [state, setState] = React.useState<RefreshState>('idle');
  const [startedAt, setStartedAt] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await action();
        if (result?.error) {
          setError(result.error);
          return;
        }
        setError(null);
        setStartedAt(result?.startedAt ?? new Date().toISOString());
        setState('syncing');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao atualizar.');
      }
    });
  }

  React.useEffect(() => {
    if (state !== 'syncing' || !startedAt) return;

    let finished = false;

    const pollTimer = setInterval(async () => {
      const done = await checkDone(startedAt).catch(() => false);
      if (done && !finished) {
        finished = true;
        clearInterval(pollTimer);
        clearTimeout(safetyTimer);
        setState('ready');
      }
    }, POLL_INTERVAL_MS);

    const safetyTimer = setTimeout(() => {
      if (finished) return;
      finished = true;
      clearInterval(pollTimer);
      setState('idle');
      setError('A sincronização está demorando mais que o esperado. Tente novamente em alguns minutos.');
    }, SAFETY_TIMEOUT_MS);

    return () => {
      finished = true;
      clearInterval(pollTimer);
      clearTimeout(safetyTimer);
    };
  }, [state, startedAt, checkDone]);

  const isBusy = isPending || state === 'syncing';

  const button = (
    <Button
      size="small"
      variant="outlined"
      color={error ? 'error' : 'primary'}
      disabled={isBusy || state === 'ready'}
      startIcon={isBusy ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
      onClick={handleClick}
    >
      {state === 'syncing' ? 'Sincronizando…' : label}
    </Button>
  );

  if (state === 'ready') {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        {button}
        <Typography variant="caption" color="text.secondary">
          Recarregue a página para ver os dados atualizados
        </Typography>
      </Stack>
    );
  }

  if (!error) return button;

  return (
    <Tooltip title={error} placement="top">
      {button}
    </Tooltip>
  );
}
