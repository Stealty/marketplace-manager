'use client';

import * as React from 'react';
import { DataList } from '@/components/DataList';
import type { OrderWithRelations } from '@/services/ordersService';
import { ORDER_LIST_COLUMNS } from './columns';
import { OrderDetailDrawer } from './order-detail-drawer';

export function OrdersList({ orders }: { orders: OrderWithRelations[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  return (
    <>
      <DataList
        columns={ORDER_LIST_COLUMNS}
        rows={orders}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyMessage="Nenhum pedido sincronizado ainda."
      />
      <OrderDetailDrawer order={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
