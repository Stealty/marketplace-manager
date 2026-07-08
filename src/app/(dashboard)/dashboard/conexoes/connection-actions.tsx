'use client';

import * as React from 'react';
import { Alert, Button, CircularProgress, Stack } from '@mui/material';
import { disconnectConnection } from './actions';

export function ConnectionActions({ connectionId }: { connectionId: string }) {
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectConnection(connectionId);
      setError(result.error ?? null);
    });
  }

  return (
    <Stack spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button
          component="a"
          href={`/api/integrations/mercado-livre/authorize?connectionId=${connectionId}`}
          size="small"
          variant="outlined"
        >
          Reconectar
        </Button>
        <Button
          size="small"
          color="error"
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={14} /> : undefined}
          onClick={handleDisconnect}
        >
          Desconectar
        </Button>
      </Stack>
    </Stack>
  );
}
