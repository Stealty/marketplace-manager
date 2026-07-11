'use client';

import * as React from 'react';
import { DataList } from '@/components/DataList';
import type { OrderWithRelations } from '@/services/ordersService';
import { CONFERENCE_COLUMNS, type ConferenceRow } from './columns';
import { OrderDetailDrawer } from './order-detail-drawer';

export function OrdersList({ orders }: { orders: OrderWithRelations[] }) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);
  const selected = orders.find((order) => order.id === selectedOrderId) ?? null;

  const rows: ConferenceRow[] = orders.flatMap((order) =>
    order.order_items.map((item) => ({ ...item, order }))
  );

  console.log({rows: rows.map((row) => row.order)})

  return (
    <>
      <DataList
        columns={CONFERENCE_COLUMNS}
        rows={rows}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedOrderId(row.order.id)}
        emptyMessage="Nenhum pedido sincronizado ainda."
      />
      <OrderDetailDrawer order={selected} onClose={() => setSelectedOrderId(null)} />
    </>
  );
}
