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
        subtitle="Pedidos recebidos em todas as contas, com detalhamento de itens."
        action={<RefreshButton action={refreshOrders} />}
      />
      <SectionPanel dense>
        <OrdersList orders={orders} />
      </SectionPanel>
    </Stack>
  );
}
