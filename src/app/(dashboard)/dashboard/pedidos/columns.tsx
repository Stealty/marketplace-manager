import { Avatar, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { DataListColumn } from '@/components/DataList';
import { StatusTag } from '@/components/StatusTag';
import { StoreTag, storeSortValue } from '@/components/StoreTag';
import { orderStatusTone, translateOrderStatus } from '@/lib/orderStatus';
import type { OrderItemWithListing, OrderWithRelations } from '@/services/ordersService';
import { ConferidoCheckbox } from './conferido-checkbox';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export interface ConferenceRow extends OrderItemWithListing {
  order: OrderWithRelations;
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const CONFERENCE_COLUMNS: DataListColumn<ConferenceRow>[] = [
  {
    id: 'foto',
    label: 'Foto',
    width: 56,
    hideable: false,
    spanRows: true,
    render: (row) =>
      row.product_listings?.image_url ? (
        <Avatar
          src={row.product_listings.image_url}
          variant="rounded"
          alt={row.title ?? 'Produto'}
          sx={{ width: 56, height: 56 }}
        />
      ) : (
        <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
          <Inventory2OutlinedIcon fontSize="small" />
        </Avatar>
      ),
  },
  {
    id: 'loja',
    label: 'Loja',
    sortable: true,
    sortValue: (row) => storeSortValue(row.order.marketplace_connections),
    render: (row) => <StoreTag connection={row.order.marketplace_connections} />,
  },
  {
    id: 'pedido',
    label: 'Pedido',
    sortable: true,
    hideable: false,
    sortValue: (row) => row.order.external_order_id,
    render: (row) => row.order.external_order_id,
  },
  {
    id: 'sku',
    label: 'SKU',
    sortable: true,
    sortValue: (row) => row.product_listings?.products?.sku ?? row.sku ?? null,
    render: (row) => row.product_listings?.products?.sku ?? row.sku ?? '—',
  },
  {
    id: 'comprador',
    label: 'Comprador',
    sortable: true,
    sortValue: (row) => row.order.buyer_nickname ?? null,
    render: (row) => row.order.buyer_nickname ?? '—',
  },
  {
    id: 'data_hora',
    label: 'Data e hora',
    sortable: true,
    sortValue: (row) => (row.order.ordered_at ? new Date(row.order.ordered_at).getTime() : null),
    render: (row) =>
      row.order.ordered_at ? dateTimeFormatter.format(new Date(row.order.ordered_at)) : '—',
  },
  {
    id: 'quantidade',
    label: 'Quantidade',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.quantity,
    render: (row) => (
      <Typography variant="h6" component="span" fontWeight={700}>
        {row.quantity}
      </Typography>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    sortValue: (row) => row.order.status,
    render: (row) =>
      row.order.status ? (
        <StatusTag label={translateOrderStatus(row.order.status)} tone={orderStatusTone(row.order.status)} />
      ) : (
        '—'
      ),
  },
  {
    id: 'valor',
    label: 'Valor',
    align: 'right',
    sortable: true,
    sortValue: (row) => row.order.order_value,
    render: (row) => (row.order.order_value !== null ? currency.format(row.order.order_value) : '—'),
  },
  {
    id: 'conferido',
    label: 'Conferido',
    align: 'center',
    hideable: false,
    render: (row) => <ConferidoCheckbox orderItemId={row.id} conferido={row.conferido} />,
  },
];
