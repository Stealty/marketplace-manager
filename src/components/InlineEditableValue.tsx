'use client';

import * as React from 'react';
import { CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

export interface InlineEditableValueProps {
  value: string;
  onSave: (raw: string) => Promise<{ error?: string }>;
  parse?: (raw: string) => number | null;
  inputType?: 'text' | 'number';
}

export function InlineEditableValue({ value, onSave, parse, inputType = 'text' }: InlineEditableValueProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleEdit() {
    setDraft(value);
    setError(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setError(null);
  }

  function handleSave() {
    if (parse && parse(draft) === null) {
      setError('Valor inválido.');
      return;
    }
    startTransition(async () => {
      const result = await onSave(draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="body2">{value}</Typography>
        <IconButton size="small" onClick={handleEdit} aria-label="Editar">
          <EditIcon fontSize="inherit" />
        </IconButton>
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <TextField
          size="small"
          type={inputType}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={isPending}
          autoFocus
        />
        {isPending ? (
          <CircularProgress size={20} />
        ) : (
          <>
            <IconButton size="small" color="primary" onClick={handleSave} aria-label="Salvar">
              <CheckIcon fontSize="inherit" />
            </IconButton>
            <IconButton size="small" onClick={handleCancel} aria-label="Cancelar">
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </>
        )}
      </Stack>
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
    </Stack>
  );
}
