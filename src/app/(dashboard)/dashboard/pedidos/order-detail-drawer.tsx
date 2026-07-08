'use client';

import { Stack, Typography } from '@mui/material';
import { DetailDrawer } from '@/components/DetailDrawer';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { OrderWithRelations } from '@/services/ordersService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function OrderDetailDrawer({
  order,
  onClose,
}: {
  order: OrderWithRelations | null;
  onClose: () => void;
}) {
  if (!order) return null;

  return (
    <DetailDrawer
      open={Boolean(order)}
      onClose={onClose}
      title={`Pedido ${order.external_order_id}`}
      subtitle={
        order.marketplace_connections
          ? MARKETPLACE_LABELS[order.marketplace_connections.marketplace]
          : undefined
      }
    >
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          {order.status && <StatusTag label={order.status} tone="neutral" />}
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Valor do pedido
          </Typography>
          <Typography variant="body2">
            {order.order_value !== null ? currency.format(order.order_value) : '—'}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Frete
          </Typography>
          <Typography variant="body2">
            {order.freight_value !== null ? currency.format(order.freight_value) : '—'}
          </Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Itens
          </Typography>
          {order.order_items.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sem itens sincronizados para este pedido.
            </Typography>
          ) : (
            order.order_items.map((item) => (
              <Stack key={item.id} direction="row" justifyContent="space-between" spacing={2}>
                <Typography variant="body2">
                  {item.quantity}× {item.title ?? item.sku ?? 'Item sem título'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.unit_price !== null ? currency.format(item.unit_price) : '—'}
                </Typography>
              </Stack>
            ))
          )}
        </Stack>
      </Stack>
    </DetailDrawer>
  );
}
