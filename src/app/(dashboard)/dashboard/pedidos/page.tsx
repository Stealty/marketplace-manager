import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { OrdersList } from './orders-list';
import { getOrdersData, refreshOrders } from './actions';

export default async function PedidosPage() {
  const { orders, lastSuccessAt } = await getOrdersData();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Pedidos"
        title="Pedidos"
        subtitle="Confira o que foi vendido: SKU, quantidade, comprador e foto de cada item."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshOrders} />
          </Stack>
        }
      />
      <SectionPanel dense>
        <OrdersList orders={orders} />
      </SectionPanel>
    </Stack>
  );
}
