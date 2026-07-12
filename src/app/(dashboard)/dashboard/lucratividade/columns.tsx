import { Avatar, Stack, Tooltip, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { DataListColumn } from '@/components/DataList';
import { StatusTag } from '@/components/StatusTag';
import type { Tone } from '@/theme/tokens';
import type { ItemProfitability } from '@/lib/profitability';
import type { OrderItemWithListing, OrderWithRelations } from '@/services/ordersService';
import { CostInput } from './cost-input';

export interface ProfitabilityRow extends OrderItemWithListing, ItemProfitability {
  order: OrderWithRelations;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

function marginTone(pct: number | null): Tone {
  if (pct === null) return 'neutral';
  if (pct < 0) return 'error';
  if (pct < 20) return 'warning';
  return 'success';
}

// Ordenação é controlada pelo select "Ordenação" da tela (calculada sobre
// lucro/margem, que podem ter linhas sem custo/null) — colunas não são
// `sortable` aqui para não ter duas fontes de ordenação disputando o estado.
export const PROFITABILITY_COLUMNS: DataListColumn<ProfitabilityRow>[] = [
  {
    id: 'foto',
    label: 'Foto',
    width: 56,
    hideable: false,
    render: (row) =>
      row.product_listings?.image_url ? (
        <Avatar src={row.product_listings.image_url} variant="rounded" alt={row.title ?? 'Produto'} />
      ) : (
        <Avatar variant="rounded">
          <Inventory2OutlinedIcon fontSize="small" />
        </Avatar>
      ),
  },
  {
    id: 'produto_pedido',
    label: 'Produto / pedido',
    hideable: false,
    render: (row) => (
      <Stack spacing={0.25}>
        <Typography variant="body2" fontWeight={600}>
          {row.product_listings?.products?.title ?? row.title ?? 'Item sem título'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Loja: {row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label ?? '—'}
          {' · '}
          Pedido: {row.order.external_order_id}
        </Typography>
      </Stack>
    ),
  },
  {
    id: 'sku',
    label: 'SKU',
    render: (row) => row.productSku ?? row.sku ?? '—',
  },
  {
    id: 'data_comprador',
    label: 'Data e comprador',
    render: (row) => (
      <Stack spacing={0.25}>
        <Typography variant="body2">
          {row.order.ordered_at ? dateTimeFormatter.format(new Date(row.order.ordered_at)) : '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.order.buyer_nickname ?? '—'}
        </Typography>
      </Stack>
    ),
  },
  {
    id: 'quantidade',
    label: 'Qtd.',
    align: 'right',
    render: (row) => (
      <Typography variant="body2" fontWeight={700}>
        {row.quantity}
      </Typography>
    ),
  },
  {
    id: 'venda_bruta',
    label: 'Venda bruta',
    align: 'right',
    render: (row) => currency.format(row.vendaBruta),
  },
  {
    id: 'frete',
    label: 'Frete (vendedor)',
    align: 'right',
    render: (row) =>
      row.freightCostKnown ? (
        currency.format(row.freightCost)
      ) : (
        <Tooltip title="Custo de frete absorvido pelo vendedor ainda não sincronizado para este pedido — não descontado do repasse.">
          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'underline dotted' }}>
            —
          </Typography>
        </Tooltip>
      ),
  },
  {
    id: 'repasse',
    label: 'Repasse',
    align: 'right',
    render: (row) => {
      const algumaTaxaDesconhecida = !row.repasseFeeKnown || !row.freightCostKnown;
      return (
        <Stack spacing={0.25} alignItems="flex-end">
          {!algumaTaxaDesconhecida ? (
            <Typography variant="body2">{currency.format(row.repasse)}</Typography>
          ) : (
            <Tooltip title="Comissão e/ou custo de frete ainda não sincronizados para este item — valor exibido pode não descontar todas as tarifas.">
              <Typography variant="body2" sx={{ textDecoration: 'underline dotted' }}>
                {currency.format(row.repasse)}
              </Typography>
            </Tooltip>
          )}
          {row.order.status && <StatusTag label={row.order.status} tone="neutral" />}
        </Stack>
      );
    },
  },
  {
    id: 'custo_unit',
    label: 'Custo unit.',
    align: 'right',
    render: (row) => <CostInput productSku={row.productSku} unitCost={row.custoUnit} />,
  },
  {
    id: 'custo_total',
    label: 'Custo total',
    align: 'right',
    render: (row) => (row.custoTotal !== null ? currency.format(row.custoTotal) : '—'),
  },
  {
    id: 'lucro_bruto',
    label: 'Lucro bruto',
    align: 'right',
    render: (row) => (row.lucroBruto !== null ? currency.format(row.lucroBruto) : '—'),
  },
  {
    id: 'lucro_pct',
    label: 'Lucro %',
    align: 'right',
    render: (row) => (
      <StatusTag
        label={row.lucroPct !== null ? `${row.lucroPct.toFixed(1)}%` : '—'}
        tone={marginTone(row.lucroPct)}
      />
    ),
  },
];
