'use client';

import * as React from 'react';
import { Button, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { ProfitabilityList } from './profitability-list';
import { getProfitabilityData, refreshProfitability, saveCost } from './actions';

export const ORDERS_QUERY_KEY = ['orders'];

function parseCost(raw: string): number | null {
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function ProfitabilityScreen() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getProfitabilityData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [isSaving, startSaving] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  async function handleRefresh() {
    const result = await refreshProfitability();
    await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    return result;
  }

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
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    });
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Financeiro"
        title="Lucratividade por venda"
        subtitle="Compare o repasse líquido de cada venda com o custo cadastrado por SKU para achar produtos com prejuízo ou margem baixa."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={data?.lastSuccessAt ?? null} />
            <RefreshButton action={handleRefresh} />
          </Stack>
        }
      />

      <SectionPanel kicker="Custos" title="Cadastro rápido de custo por SKU">
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
      </SectionPanel>

      <SectionPanel dense>
        {isPending ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} />
            ))}
          </Stack>
        ) : (
          <ProfitabilityList orders={data?.orders ?? []} />
        )}
      </SectionPanel>
    </Stack>
  );
}
