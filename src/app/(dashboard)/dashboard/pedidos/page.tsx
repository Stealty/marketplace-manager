import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { getOrders } from '@/services/ordersService';
import { OrdersList } from './orders-list';
import { refreshOrders } from './actions';

export default async function PedidosPage() {
  const orders = await getOrders();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Pedidos"
        title="Pedidos"
        subtitle="Confira o que foi vendido: SKU, quantidade, comprador e foto de cada item."
        action={<RefreshButton action={refreshOrders} />}
      />
      <SectionPanel dense>
        <OrdersList orders={orders} />
      </SectionPanel>
    </Stack>
  );
}
