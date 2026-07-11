'use client';

import { Skeleton, Stack } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { OrdersList } from './orders-list';
import { getOrdersData, refreshOrders } from './actions';

const ORDERS_QUERY_KEY = ['orders'];

export function OrdersScreen() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrdersData,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  async function handleRefresh() {
    const result = await refreshOrders();
    await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    return result;
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Pedidos"
        title="Pedidos"
        subtitle="Confira o que foi vendido: SKU, quantidade, comprador e foto de cada item."
        action={<RefreshButton action={handleRefresh} />}
      />
      <SectionPanel dense>
        {isPending ? (
          <Stack spacing={1} sx={{ p: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={40} />
            ))}
          </Stack>
        ) : (
          <OrdersList orders={data ?? []} />
        )}
      </SectionPanel>
    </Stack>
  );
}
