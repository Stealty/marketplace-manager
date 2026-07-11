'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, LinearProgress, Paper, Stack, Typography, useTheme } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getConnectionSyncProgress, type ResourceProgress } from './actions';
import type { SyncResource } from '@/lib/sync/freshness';

const RESOURCE_LABELS: Record<SyncResource, string> = {
  orders: 'Pedidos',
  listings: 'Anúncios',
  questions: 'Perguntas',
  reputation: 'Reputação',
  profile: 'Perfil da loja',
};

const PENDING_PROGRESS: ResourceProgress[] = (Object.keys(RESOURCE_LABELS) as SyncResource[]).map((resource) => ({
  resource,
  status: 'pending',
}));

const POLL_INTERVAL_MS = 2000;
const SAFETY_TIMEOUT_MS = 60_000;

export function SyncProgressScreen({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const theme = useTheme();
  const [timedOut, setTimedOut] = React.useState(false);

  const { data } = useQuery({
    queryKey: ['sync-progress', connectionId],
    queryFn: () => getConnectionSyncProgress(connectionId),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const progress = data ?? PENDING_PROGRESS;
  const doneCount = progress.filter((p) => p.status !== 'pending').length;
  const allDone = doneCount === progress.length;
  const failedResources = progress.filter((p) => p.status === 'error');

  React.useEffect(() => {
    if (allDone) router.replace('/dashboard');
  }, [allDone, router]);

  React.useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: theme.zIndex.modal,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 420, maxWidth: '100%' }}>
        <Stack spacing={3}>
          <Typography variant="h6">Preparando sua loja…</Typography>
          <LinearProgress variant="determinate" value={(doneCount / progress.length) * 100} />

          <Stack spacing={1.5}>
            {progress.map((p) => (
              <Stack key={p.resource} direction="row" spacing={1.5} alignItems="center">
                {p.status === 'pending' && <CircularProgress size={16} />}
                {p.status === 'ok' && <CheckCircleOutlineIcon fontSize="small" color="success" />}
                {p.status === 'error' && <ErrorOutlineIcon fontSize="small" color="warning" />}
                <Typography variant="body2">{RESOURCE_LABELS[p.resource]}</Typography>
              </Stack>
            ))}
          </Stack>

          {failedResources.map((p) => (
            <Alert key={p.resource} severity="warning">
              Não foi possível sincronizar {RESOURCE_LABELS[p.resource]} agora. Você pode tentar novamente
              depois na página correspondente.
            </Alert>
          ))}

          {timedOut && !allDone && (
            <Stack spacing={1.5}>
              <Alert severity="info">
                Isso está demorando mais que o esperado, mas você já pode continuar — a sincronização
                termina em segundo plano.
              </Alert>
              <Button variant="contained" onClick={() => router.replace('/dashboard')}>
                Ir para o painel
              </Button>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}
