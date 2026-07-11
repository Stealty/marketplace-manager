'use client';

import { Tooltip, Typography } from '@mui/material';
import { InlineEditableValue } from '@/components/InlineEditableValue';
import { saveCost } from './actions';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function parseCost(raw: string): number | null {
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function CostInput({ productSku, unitCost }: { productSku: string | null; unitCost: number | null }) {
  if (!productSku) {
    return (
      <Tooltip title="Este item não está vinculado a um anúncio sincronizado — cadastre o SKU no formulário acima para registrar o custo.">
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      </Tooltip>
    );
  }

  return (
    <InlineEditableValue
      value={unitCost !== null ? currency.format(unitCost) : '—'}
      parse={parseCost}
      inputType="number"
      onSave={(raw) => saveCost(productSku, parseCost(raw) ?? 0)}
    />
  );
}
