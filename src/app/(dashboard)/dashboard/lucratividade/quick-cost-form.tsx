'use client';

import * as React from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { parseCost } from '@/lib/format';
import { saveCost } from './actions';

export function QuickCostForm() {
  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [isSaving, startSaving] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  function handleSaveCost() {
    if (!sku.trim()) {
      setFormError('Informe o SKU.');
      return;
    }
    const parsedCost = parseCost(cost);
    if (parsedCost === null) {
      setFormError('Informe um custo unitário válido.');
      return;
    }
    setFormError(null);
    startSaving(async () => {
      const result = await saveCost(sku.trim(), parsedCost, name.trim() || undefined);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSku('');
      setName('');
      setCost('');
    });
  }

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="flex-start" flexWrap="wrap" useFlexGap sx={{ p: 2, pt: 0 }}>
        <TextField
          label="SKU"
          size="small"
          placeholder="Ex: P3000"
          value={sku}
          onChange={(event) => setSku(event.target.value)}
        />
        <TextField
          label="Nome do produto (opcional)"
          size="small"
          placeholder="Descrição para identificação"
          value={name}
          onChange={(event) => setName(event.target.value)}
          sx={{ minWidth: 260 }}
        />
        <TextField
          label="Custo unitário"
          size="small"
          type="number"
          value={cost}
          onChange={(event) => setCost(event.target.value)}
        />
        <Button variant="contained" onClick={handleSaveCost} disabled={isSaving} sx={{ height: 40 }}>
          Salvar custo
        </Button>
      </Stack>
      {formError && (
        <Typography variant="caption" color="error.main" sx={{ px: 2, pb: 2, display: 'block' }}>
          {formError}
        </Typography>
      )}
    </>
  );
}
