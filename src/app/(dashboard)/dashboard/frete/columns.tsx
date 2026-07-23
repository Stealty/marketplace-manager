import { StatusTag } from '@/components/StatusTag';
import type { DataListColumn } from '@/components/DataList';
import { StoreTag, storeSortValue } from '@/components/StoreTag';
import { currency } from '@/lib/format';
import type { OrderWithRelations } from '@/services/ordersService';

// A base do painel legado é o custo que o VENDEDOR absorve (senders[].cost em
// /shipments/{id}/costs), não o que o comprador pagou. O ratio segue essa base:
// custo do vendedor sobre o valor do pedido.
export function sellerFreightRatio(
  order: Pick<OrderWithRelations, 'freight_cost_seller' | 'order_value'>
): number | null {
  if (order.freight_cost_seller === null || !order.order_value) return null;
  return (order.freight_cost_seller / order.order_value) * 100;
}

export const FREIGHT_LIST_COLUMNS: DataListColumn<OrderWithRelations>[] = [
  {
    id: 'external_order_id',
    label: 'Pedido',
    sortable: true,
    hideable: false,
    sortValue: (row) => row.external_order_id,
    render: (row) => row.external_order_id,
  },
  {
    id: 'loja',
    label: 'Loja',
    sortable: true,
    sortValue: (row) => storeSortValue(row.marketplace_connections),
    render: (row) => <StoreTag connection={row.marketplace_connections} />,
  },
  {
    id: 'order_value',
    label: 'Valor',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.order_value,
    render: (row) => (row.order_value !== null ? currency.format(row.order_value) : '—'),
  },
  {
    id: 'freight_cost_seller',
    label: 'Frete (vendedor)',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.freight_cost_seller,
    render: (row) => (row.freight_cost_seller !== null ? currency.format(row.freight_cost_seller) : '—'),
  },
  {
    id: 'freight_value',
    label: 'Frete (comprador)',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.freight_value,
    render: (row) => (row.freight_value !== null ? currency.format(row.freight_value) : '—'),
  },
  {
    id: 'seller_freight_ratio',
    label: '% (vendedor)',
    align: 'right',
    sortable: true,
    sortValue: (row) => sellerFreightRatio(row),
    render: (row) => {
      const ratio = sellerFreightRatio(row);
      return ratio !== null ? `${ratio.toFixed(1)}%` : '—';
    },
  },
  {
    id: 'is_free_shipping',
    label: 'Frete grátis',
    sortable: true,
    sortValue: (row) => (row.is_free_shipping ? 1 : 0),
    render: (row) => (row.is_free_shipping ? <StatusTag label="Frete grátis" tone="accent" /> : '—'),
  },
];
