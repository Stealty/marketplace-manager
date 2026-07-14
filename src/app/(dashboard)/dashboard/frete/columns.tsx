import { StatusTag } from '@/components/StatusTag';
import type { DataListColumn } from '@/components/DataList';
import { StoreTag, storeSortValue } from '@/components/StoreTag';
import type { OrderWithRelations } from '@/services/ordersService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
    id: 'freight_value',
    label: 'Frete',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.freight_value,
    render: (row) => (row.freight_value !== null ? currency.format(row.freight_value) : '—'),
  },
  {
    id: 'freight_ratio',
    label: '%',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.freight_ratio,
    render: (row) => (row.freight_ratio !== null ? `${row.freight_ratio.toFixed(1)}%` : '—'),
  },
  {
    id: 'is_free_shipping',
    label: 'Frete grátis',
    sortable: true,
    sortValue: (row) => (row.is_free_shipping ? 1 : 0),
    render: (row) => (row.is_free_shipping ? <StatusTag label="Frete grátis" tone="accent" /> : '—'),
  },
];
