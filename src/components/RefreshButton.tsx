'use client';

import * as React from 'react';
import { Button, CircularProgress, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export function RefreshButton({
  action,
  label = 'Atualizar',
}: {
  action: () => Promise<{ error?: string } | void>;
  label?: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await action();
        setError(result?.error ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao atualizar.');
      }
    });
  }

  const button = (
    <Button
      size="small"
      variant="outlined"
      color={error ? 'error' : 'primary'}
      disabled={isPending}
      startIcon={isPending ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
      onClick={handleClick}
    >
      {label}
    </Button>
  );

  if (!error) return button;

  return (
    <Tooltip title={error} placement="top">
      {button}
    </Tooltip>
  );
}
