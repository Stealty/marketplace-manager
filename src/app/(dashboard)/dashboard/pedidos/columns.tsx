import { StatusTag } from '@/components/StatusTag';
import type { DataListColumn } from '@/components/DataList';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { OrderWithRelations } from '@/services/ordersService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

export const ORDER_LIST_COLUMNS: DataListColumn<OrderWithRelations>[] = [
  {
    id: 'external_order_id',
    label: 'Pedido',
    sortable: true,
    sortValue: (row) => row.external_order_id,
    render: (row) => row.external_order_id,
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    sortable: true,
    sortValue: (row) => row.marketplace_connections?.marketplace ?? null,
    render: (row) =>
      row.marketplace_connections ? MARKETPLACE_LABELS[row.marketplace_connections.marketplace] : '—',
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    sortValue: (row) => row.status,
    render: (row) => (row.status ? <StatusTag label={row.status} tone="neutral" /> : '—'),
  },
  {
    id: 'ordered_at',
    label: 'Data',
    sortable: true,
    sortValue: (row) => (row.ordered_at ? new Date(row.ordered_at).getTime() : null),
    render: (row) => (row.ordered_at ? dateFormatter.format(new Date(row.ordered_at)) : '—'),
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
    id: 'items',
    label: 'Itens',
    sortable: true,
    sortValue: (row) => row.order_items.length,
    render: (row) => row.order_items.length,
  },
];
