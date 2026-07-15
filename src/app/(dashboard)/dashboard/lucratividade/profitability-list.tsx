'use client';

import * as React from 'react';
import { Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import { DataList } from '@/components/DataList';
import { IndicatorCard } from '@/components/IndicatorCard';
import { computeItemProfitability } from '@/lib/profitability';
import { isAwaitingShipment } from '@/lib/mercadolivre/shippingReadiness';
import { currency } from '@/lib/format';
import type { OrderWithRelations } from '@/services/ordersService';
import { PROFITABILITY_COLUMNS, type ProfitabilityRow } from './columns';
import { getPreciseProfitability } from './actions';

type Periodo = '7' | '15' | '30' | '90' | 'all';
type Ordenacao = 'recentes' | 'lucro_desc' | 'lucro_asc' | 'margem_desc' | 'margem_asc';

const PERIODO_OPTIONS: { value: Periodo; label: string }[] = [
  { value: '7', label: '7 dias' },
  { value: '15', label: '15 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: 'all', label: 'Todo o período' },
];

const ORDENACAO_OPTIONS: { value: Ordenacao; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'lucro_desc', label: 'Maior lucro' },
  { value: 'lucro_asc', label: 'Menor lucro' },
  { value: 'margem_desc', label: 'Maior margem' },
  { value: 'margem_asc', label: 'Menor margem' },
];

function toProfitabilityRow(item: OrderWithRelations['order_items'][number], order: OrderWithRelations): ProfitabilityRow {
  return { ...item, order, ...computeItemProfitability(item, order) };
}

export function ProfitabilityList({ orders }: { orders: OrderWithRelations[] }) {
  const [isCalculatingPrecise, startCalculatingPrecise] = React.useTransition();
  const [preciseError, setPreciseError] = React.useState<string | null>(null);

  const [loja, setLoja] = React.useState('all');
  const [periodo, setPeriodo] = React.useState<Periodo>('30');
  const [busca, setBusca] = React.useState('');
  const [situacao, setSituacao] = React.useState('all');
  const [ordenacao, setOrdenacao] = React.useState<Ordenacao>('recentes');
  // Réplica do "Painel de Conferência" do app legado — pedidos com envio
  // pronto para coleta, etiqueta impressa, ainda não postados e fora do Full.
  // Filtro aditivo: não substitui os outros, só restringe mais.
  const [apenasAguardandoEnvio, setApenasAguardandoEnvio] = React.useState(false);

  // Lazy initializer é a válvula de escape sancionada pelo React para valores
  // impuros (Date.now()) — evita recalcular (e violar a regra de pureza do
  // render) a cada re-render só para o filtro de período.
  const [now] = React.useState(() => Date.now());

  const rows: ProfitabilityRow[] = React.useMemo(
    () => orders.flatMap((order) => order.order_items.map((item) => toProfitabilityRow(item, order))),
    [orders]
  );

  const lojasPresentes = React.useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((row) => row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label)
            .filter((value): value is string => Boolean(value))
        )
      ),
    [rows]
  );

  const situacoesPresentes = React.useMemo(
    () => Array.from(new Set(rows.map((row) => row.order.status).filter((value): value is string => Boolean(value)))),
    [rows]
  );

  const filteredRows = React.useMemo(
    () =>
      rows.filter((row) => {
        if (loja !== 'all') {
          const rowLoja = row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label;
          if (rowLoja !== loja) return false;
        }

        if (situacao !== 'all' && row.order.status !== situacao) return false;

        if (apenasAguardandoEnvio && !isAwaitingShipment(row.order)) return false;

        if (busca.trim()) {
          const query = busca.trim().toLowerCase();
          const skuValue = (row.productSku ?? row.sku ?? '').toLowerCase();
          const titleValue = (row.product_listings?.products?.title ?? row.title ?? '').toLowerCase();
          if (!skuValue.includes(query) && !titleValue.includes(query)) return false;
        }

        if (periodo !== 'all') {
          if (!row.order.ordered_at) return false;
          const cutoff = now - Number(periodo) * 24 * 60 * 60 * 1000;
          if (new Date(row.order.ordered_at).getTime() < cutoff) return false;
        }

        return true;
      }),
    [rows, loja, situacao, apenasAguardandoEnvio, busca, periodo, now]
  );

  // Repasse líquido preciso (via Mercado Pago) só é calculável sob demanda
  // para um período limitado — "Todo o período" pode significar milhares de
  // pedidos, uma chamada de API por pagamento cada. Só considera pedidos que
  // ainda não têm o valor preciso calculado (evita rechamar a API para o que
  // já foi persistido em visitas anteriores).
  const pendingPreciseOrderIds = React.useMemo(
    () => Array.from(new Set(filteredRows.filter((row) => !row.repasseIsPrecise).map((row) => row.order.id))),
    [filteredRows]
  );
  const podeCalcularPreciso = periodo !== 'all' && pendingPreciseOrderIds.length > 0;

  function handleCalculatePrecise() {
    setPreciseError(null);
    startCalculatingPrecise(async () => {
      const result = await getPreciseProfitability(pendingPreciseOrderIds);
      if (result.error) {
        setPreciseError(result.error);
      }
      // getPreciseProfitability já chama revalidatePath('/dashboard/lucratividade')
      // no servidor — o Next.js re-renderiza a rota automaticamente após a
      // Server Action resolver, sem precisar invalidar cache no cliente.
    });
  }

  const sortedRows = React.useMemo(() => {
    const sorted = [...filteredRows];
    switch (ordenacao) {
      case 'lucro_desc':
        return sorted.sort((a, b) => (b.lucroBruto ?? -Infinity) - (a.lucroBruto ?? -Infinity));
      case 'lucro_asc':
        return sorted.sort((a, b) => (a.lucroBruto ?? Infinity) - (b.lucroBruto ?? Infinity));
      case 'margem_desc':
        return sorted.sort((a, b) => (b.lucroPct ?? -Infinity) - (a.lucroPct ?? -Infinity));
      case 'margem_asc':
        return sorted.sort((a, b) => (a.lucroPct ?? Infinity) - (b.lucroPct ?? Infinity));
      default:
        return sorted.sort((a, b) => {
          const at = a.order.ordered_at ? new Date(a.order.ordered_at).getTime() : 0;
          const bt = b.order.ordered_at ? new Date(b.order.ordered_at).getTime() : 0;
          return bt - at;
        });
    }
  }, [filteredRows, ordenacao]);

  const summary = React.useMemo(() => {
    const comCusto = filteredRows.filter((row) => row.productSku !== null && row.custoUnit !== null);
    const semCusto = filteredRows.filter((row) => row.productSku !== null && row.custoUnit === null);
    const semVinculo = filteredRows.filter((row) => row.productSku === null);
    const repasseLiquido = filteredRows.reduce((sum, row) => sum + row.repasse, 0);
    const custoTotal = comCusto.reduce((sum, row) => sum + (row.custoTotal ?? 0), 0);
    const lucroBruto = comCusto.reduce((sum, row) => sum + (row.lucroBruto ?? 0), 0);
    const margemSobreCusto = custoTotal > 0 ? (lucroBruto / custoTotal) * 100 : null;

    return {
      itensVendidos: filteredRows.length,
      comCusto: comCusto.length,
      semCusto: semCusto.length,
      semVinculo: semVinculo.length,
      repasseLiquido,
      custoTotal,
      lucroBruto,
      margemSobreCusto,
    };
  }, [filteredRows]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ p: 2, pb: 0 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Loja"
          size="small"
          value={loja}
          onChange={(event) => setLoja(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Todas as lojas</MenuItem>
          {lojasPresentes.map((l) => (
            <MenuItem key={l} value={l}>
              {l}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Período"
          size="small"
          value={periodo}
          onChange={(event) => setPeriodo(event.target.value as Periodo)}
          sx={{ minWidth: 160 }}
        >
          {PERIODO_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Pesquisar SKU ou título"
          size="small"
          placeholder="Digite para filtrar"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          sx={{ minWidth: 220 }}
        />

        <TextField
          select
          label="Situação"
          size="small"
          value={situacao}
          onChange={(event) => setSituacao(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Todos</MenuItem>
          {situacoesPresentes.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Ordenação"
          size="small"
          value={ordenacao}
          onChange={(event) => setOrdenacao(event.target.value as Ordenacao)}
          sx={{ minWidth: 160 }}
        >
          {ORDENACAO_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Tooltip title="Mesmo critério do Painel de Conferência: envio pronto para coleta, etiqueta impressa, ainda não postado e fora do Mercado Envios Full.">
          <FormControlLabel
            control={
              <Switch
                checked={apenasAguardandoEnvio}
                onChange={(event) => setApenasAguardandoEnvio(event.target.checked)}
              />
            }
            label="Aguardando envio"
          />
        </Tooltip>
      </Stack>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2 }} flexWrap="wrap" useFlexGap>
        <Tooltip
          title={
            periodo === 'all'
              ? 'Selecione um período (não "Todo o período") para calcular o repasse preciso.'
              : 'Busca o valor líquido real recebido (via Mercado Pago) para os pedidos do período que ainda não foram calculados.'
          }
        >
          <span>
            <Button
              variant="outlined"
              size="small"
              disabled={!podeCalcularPreciso || isCalculatingPrecise}
              onClick={handleCalculatePrecise}
            >
              {isCalculatingPrecise
                ? 'Calculando repasse preciso…'
                : `Calcular repasse preciso${pendingPreciseOrderIds.length > 0 ? ` (${pendingPreciseOrderIds.length} pedido(s))` : ''}`}
            </Button>
          </span>
        </Tooltip>
        {preciseError && (
          <Typography variant="caption" color="error.main">
            {preciseError}
          </Typography>
        )}
      </Stack>

      <Stack direction="row" spacing={2} sx={{ px: 2 }} flexWrap="wrap" useFlexGap>
        <IndicatorCard
          label="Itens vendidos"
          value={String(summary.itensVendidos)}
          tone="neutral"
          helperText={summary.semVinculo > 0 ? `${summary.semVinculo} sem vínculo de anúncio` : undefined}
        />
        <IndicatorCard label="Com custo" value={String(summary.comCusto)} tone="accent" />
        <IndicatorCard label="Sem custo" value={String(summary.semCusto)} tone="warning" />
        <IndicatorCard label="Repasse líquido" value={currency.format(summary.repasseLiquido)} tone="neutral" />
        <IndicatorCard label="Custo total" value={currency.format(summary.custoTotal)} tone="neutral" />
        <IndicatorCard
          label="Lucro bruto"
          value={currency.format(summary.lucroBruto)}
          tone={summary.lucroBruto < 0 ? 'error' : 'success'}
        />
        <IndicatorCard
          label="Margem sobre custo"
          value={summary.margemSobreCusto !== null ? `${summary.margemSobreCusto.toFixed(1)}%` : '—'}
          tone={summary.margemSobreCusto === null ? 'neutral' : summary.margemSobreCusto < 0 ? 'error' : 'success'}
        />
      </Stack>

      <DataList
        columns={PROFITABILITY_COLUMNS}
        rows={sortedRows}
        getRowId={(row) => row.id}
        storageKey="lucratividade"
        emptyMessage={
          rows.length === 0
            ? 'Nenhuma venda sincronizada ainda.'
            : 'Nenhuma venda encontrada para os filtros selecionados.'
        }
      />
    </Stack>
  );
}
