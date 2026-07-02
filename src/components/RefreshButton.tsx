'use client';

import * as React from 'react';
import { Button, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export function RefreshButton({
  action,
  label = 'Atualizar',
}: {
  action: () => Promise<void>;
  label?: string;
}) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      size="small"
      variant="outlined"
      disabled={isPending}
      startIcon={isPending ? <CircularProgress size={14} /> : <RefreshIcon fontSize="small" />}
      onClick={() => startTransition(async () => action())}
    >
      {label}
    </Button>
  );
}
