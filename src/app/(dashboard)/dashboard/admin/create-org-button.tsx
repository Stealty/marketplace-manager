'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DetailDrawer } from '@/components/DetailDrawer';
import { createOrganization } from './actions';

export function CreateOrgButton() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleClose() {
    setOpen(false);
    setName('');
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createOrganization(name);
      if (result.error) {
        setError(result.error);
        return;
      }
      handleClose();
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
        Nova organização
      </Button>

      <DetailDrawer open={open} onClose={handleClose} title="Nova organização">
        <Stack component="form" onSubmit={handleSubmit} spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <Button type="submit" variant="contained" disabled={isPending || !name.trim()}>
            {isPending ? 'Criando…' : 'Criar organização'}
          </Button>
        </Stack>
      </DetailDrawer>
    </>
  );
}
