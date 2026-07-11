'use client';

import * as React from 'react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { DataList } from '@/components/DataList';
import type { OrderWithRelations } from '@/services/ordersService';
import { CONFERENCE_COLUMNS, type ConferenceRow } from './columns';
import { OrderDetailDrawer } from './order-detail-drawer';

type ConferidoFilter = 'all' | 'conferido' | 'pendente';

export function OrdersList({ orders }: { orders: OrderWithRelations[] }) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const [loja, setLoja] = React.useState('all');
  const [conferidoFilter, setConferidoFilter] = React.useState<ConferidoFilter>('all');
  const [sku, setSku] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const selected = orders.find((order) => order.id === selectedOrderId) ?? null;

  const rows: ConferenceRow[] = orders.flatMap((order) =>
    order.order_items.map((item) => ({ ...item, order }))
  );

  const lojasPresentes = Array.from(
    new Set(
      rows
        .map((row) => row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label)
        .filter((value): value is string => Boolean(value))
    )
  );

  const filteredRows = rows.filter((row) => {
    if (conferidoFilter === 'conferido' && !row.conferido) return false;
    if (conferidoFilter === 'pendente' && row.conferido) return false;

    if (loja !== 'all') {
      const rowLoja = row.order.marketplace_connections?.seller_nickname ?? row.order.marketplace_connections?.label;
      if (rowLoja !== loja) return false;
    }

    if (sku.trim()) {
      const skuValue = (row.product_listings?.products?.sku ?? row.sku ?? '').toLowerCase();
      if (!skuValue.includes(sku.trim().toLowerCase())) return false;
    }

    if (dateFrom || dateTo) {
      if (!row.order.ordered_at) return false;
      const orderedAt = new Date(row.order.ordered_at).getTime();
      if (dateFrom && orderedAt < new Date(`${dateFrom}T00:00:00`).getTime()) return false;
      if (dateTo && orderedAt > new Date(`${dateTo}T23:59:59`).getTime()) return false;
    }

    return true;
  });

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ p: 2, pt: 0 }} flexWrap="wrap" useFlexGap>
        <TextField
          select
          label="Conferido"
          size="small"
          value={conferidoFilter}
          onChange={(event) => setConferidoFilter(event.target.value as ConferidoFilter)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="conferido">Conferidos</MenuItem>
          <MenuItem value="pendente">Não conferidos</MenuItem>
        </TextField>

        <TextField
          select
          label="Loja"
          size="small"
          value={loja}
          onChange={(event) => setLoja(event.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Todas</MenuItem>
          {lojasPresentes.map((l) => (
            <MenuItem key={l} value={l}>
              {l}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="SKU"
          size="small"
          placeholder="Buscar SKU"
          value={sku}
          onChange={(event) => setSku(event.target.value)}
        />

        <TextField
          label="De"
          type="date"
          size="small"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label="Até"
          type="date"
          size="small"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>

      <DataList
        columns={CONFERENCE_COLUMNS}
        rows={filteredRows}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedOrderId(row.order.id)}
        emptyMessage={
          rows.length === 0
            ? 'Nenhum pedido sincronizado ainda.'
            : 'Nenhum pedido encontrado para os filtros selecionados.'
        }
      />
      <OrderDetailDrawer order={selected} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}
