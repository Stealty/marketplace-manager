import { Avatar, Typography } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { DataListColumn } from '@/components/DataList';
import type { OrderItemWithListing, OrderWithRelations } from '@/services/ordersService';
import { ConferidoCheckbox } from './conferido-checkbox';

export interface ConferenceRow extends OrderItemWithListing {
  order: OrderWithRelations;
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const CONFERENCE_COLUMNS: DataListColumn<ConferenceRow>[] = [
  {
    id: 'foto',
    label: 'Foto',
    width: 56,
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
    id: 'loja',
    label: 'Loja',
    sortable: true,
    sortValue: (row) =>
      row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label ?? null,
    render: (row) =>
      row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label ?? '—',
  },
  {
    id: 'pedido',
    label: 'Pedido',
    sortable: true,
    sortValue: (row) => row.order.external_order_id,
    render: (row) => row.order.external_order_id,
  },
  {
    id: 'sku',
    label: 'SKU',
    sortable: true,
    sortValue: (row) => row.product_listings?.products?.sku ?? row.sku ?? null,
    render: (row) => row.product_listings?.products?.sku ?? row.sku ?? row.title ?? '—',
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
    id: 'conferido',
    label: 'Conferido',
    align: 'center',
    render: (row) => <ConferidoCheckbox orderItemId={row.id} conferido={row.conferido} />,
  },
];
