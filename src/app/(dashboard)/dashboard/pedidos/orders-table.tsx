'use client';

import * as React from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { StatusTag } from '@/components/StatusTag';
import { EmptyState } from '@/components/EmptyState';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { OrderWithRelations } from '@/services/ordersService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function OrdersTable({ orders }: { orders: OrderWithRelations[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  if (orders.length === 0) {
    return <EmptyState message="Nenhum pedido sincronizado ainda." />;
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }} />
            <TableCell>Pedido</TableCell>
            <TableCell>Marketplace</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Valor</TableCell>
            <TableCell>Itens</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => {
            const isOpen = openId === order.id;
            return (
              <React.Fragment key={order.id}>
                <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(isOpen ? null : order.id)}>
                  <TableCell>
                    <IconButton size="small">
                      {isOpen ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{order.external_order_id}</TableCell>
                  <TableCell>
                    {order.marketplace_connections
                      ? MARKETPLACE_LABELS[order.marketplace_connections.marketplace]
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {order.status && <StatusTag label={order.status} tone="neutral" />}
                  </TableCell>
                  <TableCell align="right">
                    {order.order_value !== null ? currency.format(order.order_value) : '—'}
                  </TableCell>
                  <TableCell>{order.order_items.length}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 0, borderBottom: isOpen ? undefined : 'none' }}>
                    <Collapse in={isOpen} unmountOnExit>
                      <Stack spacing={1} sx={{ py: 1.5, pl: 5 }}>
                        {order.order_items.length === 0 ? (
                          <Typography variant="caption" color="text.secondary">
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
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}
