import { Box, Typography } from '@mui/material';
import type { DataListColumn } from '@/components/DataList';
import { ProductThumbnail } from '@/components/ProductThumbnail';
import { StatusTag } from '@/components/StatusTag';
import { StoreTag, storeSortValue } from '@/components/StoreTag';
import { orderStatusTone, translateOrderStatus } from '@/lib/orderStatus';
import { currency, dateTimeFormatter } from '@/lib/format';
import type { OrderItemWithListing, OrderWithRelations } from '@/services/ordersService';
import { ConferidoCheckbox } from './conferido-checkbox';

// Conferência por PACOTE, como o app legado: pedidos que compartilham pack_id
// (ou o próprio pedido, quando não há pacote) viram uma única linha, com todos
// os itens somados. Compras com mais de um item recebem o aviso "N itens".
export interface ConferenceGroup {
  groupId: string;
  primaryOrder: OrderWithRelations;
  orders: OrderWithRelations[];
  items: OrderItemWithListing[];
  totalQuantity: number;
  isPack: boolean;
  allConferido: boolean;
}

export function groupOrdersIntoConference(orders: OrderWithRelations[]): ConferenceGroup[] {
  const groups = new Map<string, OrderWithRelations[]>();
  for (const order of orders) {
    const key = order.pack_id ?? order.external_order_id;
    const bucket = groups.get(key);
    if (bucket) bucket.push(order);
    else groups.set(key, [order]);
  }

  return Array.from(groups.entries()).map(([groupId, groupOrders]) => {
    const items = groupOrders.flatMap((order) => order.order_items);
    return {
      groupId,
      primaryOrder: groupOrders[0],
      orders: groupOrders,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      isPack: items.length > 1,
      allConferido: items.length > 0 && items.every((item) => item.conferido),
    };
  });
}

// SKU real do item único, seguindo o app legado (mostra "—" quando não há
// SELLER_SKU cadastrado). Ignora os fallbacks sintéticos usados como chave no
// sync: listingsSync grava `item.id` como sku quando falta SELLER_SKU, e
// ordersSync grava `id` ou `id-variação` — nenhum é um SKU de verdade.
function displayItemSku(item: OrderItemWithListing): string | null {
  const externalId = item.product_listings?.external_id ?? null;
  const listingSku = item.product_listings?.products?.sku ?? null;
  if (listingSku && listingSku !== externalId) return listingSku;
  const orderSku = item.sku ?? null;
  if (!orderSku) return null;
  if (externalId && (orderSku === externalId || orderSku.startsWith(`${externalId}-`))) return null;
  if (/^MLB\d+(-\d+)?$/.test(orderSku)) return null;
  return orderSku;
}

function groupSku(group: ConferenceGroup): string | null {
  if (group.isPack) return null;
  return group.items[0] ? displayItemSku(group.items[0]) : null;
}

export const CONFERENCE_COLUMNS: DataListColumn<ConferenceGroup>[] = [
  {
    id: 'foto',
    label: 'Foto',
    width: 56,
    hideable: false,
    spanRows: true,
    render: (group) =>
      group.isPack ? (
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 1,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: 9 }}>
            ATENÇÃO
          </Typography>
          <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>
            {group.items.length} ITENS
          </Typography>
        </Box>
      ) : (
        <ProductThumbnail
          imageUrl={group.items[0]?.product_listings?.image_url}
          alt={group.items[0]?.title ?? 'Produto'}
          size={56}
          iconFontSize="small"
        />
      ),
  },
  {
    id: 'loja',
    label: 'Loja',
    sortable: true,
    sortValue: (group) => storeSortValue(group.primaryOrder.marketplace_connections),
    render: (group) => <StoreTag connection={group.primaryOrder.marketplace_connections} />,
  },
  {
    id: 'pedido',
    label: 'Pedido',
    sortable: true,
    hideable: false,
    sortValue: (group) => group.groupId,
    render: (group) => group.groupId,
  },
  {
    id: 'sku',
    label: 'SKU',
    sortable: true,
    sortValue: (group) => groupSku(group),
    render: (group) => (group.isPack ? `${group.items.length} itens` : groupSku(group) ?? '—'),
  },
  {
    id: 'comprador',
    label: 'Comprador',
    sortable: true,
    sortValue: (group) => group.primaryOrder.buyer_nickname ?? null,
    render: (group) => group.primaryOrder.buyer_nickname ?? '—',
  },
  {
    id: 'data_hora',
    label: 'Data e hora',
    sortable: true,
    sortValue: (group) =>
      group.primaryOrder.ordered_at ? new Date(group.primaryOrder.ordered_at).getTime() : null,
    render: (group) =>
      group.primaryOrder.ordered_at
        ? dateTimeFormatter.format(new Date(group.primaryOrder.ordered_at))
        : '—',
  },
  {
    id: 'quantidade',
    label: 'Quantidade',
    align: 'right',
    sortable: true,
    sortValue: (group) => group.totalQuantity,
    render: (group) => (
      <Typography variant="h6" component="span" fontWeight={700}>
        {group.totalQuantity}
      </Typography>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    sortable: true,
    sortValue: (group) => group.primaryOrder.status,
    render: (group) =>
      group.primaryOrder.status ? (
        <StatusTag
          label={translateOrderStatus(group.primaryOrder.status)}
          tone={orderStatusTone(group.primaryOrder.status)}
        />
      ) : (
        '—'
      ),
  },
  {
    id: 'valor',
    label: 'Valor',
    align: 'right',
    sortable: true,
    sortValue: (group) => group.orders.reduce((sum, order) => sum + (order.order_value ?? 0), 0),
    render: (group) => {
      const total = group.orders.reduce((sum, order) => sum + (order.order_value ?? 0), 0);
      return currency.format(total);
    },
  },
  {
    id: 'conferido',
    label: 'Conferido',
    align: 'center',
    hideable: false,
    render: (group) => (
      <ConferidoCheckbox
        orderItemIds={group.items.map((item) => item.id)}
        conferido={group.allConferido}
      />
    ),
  },
];
