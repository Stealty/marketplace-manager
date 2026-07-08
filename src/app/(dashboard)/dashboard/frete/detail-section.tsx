'use client';

import * as React from 'react';
import { DataList } from '@/components/DataList';
import { OrderDetailDrawer } from '../pedidos/order-detail-drawer';
import type { OrderWithRelations } from '@/services/ordersService';
import { FREIGHT_LIST_COLUMNS } from './columns';

export function DetailSection({ orders }: { orders: OrderWithRelations[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = orders.find((order) => order.id === selectedId) ?? null;

  return (
    <>
      <DataList
        columns={FREIGHT_LIST_COLUMNS}
        rows={orders}
        getRowId={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        emptyMessage="Nenhum pedido sincronizado ainda."
      />
      <OrderDetailDrawer order={selected} onClose={() => setSelectedId(null)} />
    </>
  );
}
