import { Box, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { EmptyState } from '@/components/EmptyState';
import { IndicatorCard } from '@/components/IndicatorCard';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { currency } from '@/lib/format';
import { getOrders, getOrdersLastSyncedAt } from '@/services/ordersService';
import { FreightChart } from './freight-chart';
import { DetailSection } from './detail-section';
import { sellerFreightRatio } from './columns';
import { refreshOrders } from './actions';

// Faixas baseadas no custo do vendedor (base do painel legado), ecoando a
// severidade que o app antigo usava: até 20% ok, 20–50% atenção, acima crítico.
const BUCKETS = [
  { label: '0–10%', min: 0, max: 10 },
  { label: '10–20%', min: 10, max: 20 },
  { label: '20–50%', min: 20, max: 50 },
  { label: '50%+', min: 50, max: Infinity },
];

export default async function FretePage() {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);

  // Ratio de referência = custo do vendedor / valor do pedido (base do legado).
  const ratioByOrderId = new Map(orders.map((order) => [order.id, sellerFreightRatio(order)]));
  const withRatio = orders.filter((order) => ratioByOrderId.get(order.id) !== null);

  const avgRatio =
    withRatio.length > 0
      ? withRatio.reduce((sum, order) => sum + (ratioByOrderId.get(order.id) ?? 0), 0) / withRatio.length
      : null;

  const freeShippingPct =
    orders.length > 0
      ? (orders.filter((order) => order.is_free_shipping).length / orders.length) * 100
      : null;

  const totalFreight = orders.reduce((sum, order) => sum + (order.freight_value ?? 0), 0);

  // freight_cost_seller: custo que o vendedor absorve (senders[].cost). É a base
  // das métricas; freight_value (o que o comprador pagou) fica só na exibição.
  const ordersWithSellerFreightCost = orders.filter((order) => order.freight_cost_seller !== null);
  const totalSellerFreightCost = orders.reduce((sum, order) => sum + (order.freight_cost_seller ?? 0), 0);

  const chartData = BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: withRatio.filter((order) => {
      const ratio = ratioByOrderId.get(order.id) ?? 0;
      return ratio >= bucket.min && ratio < bucket.max;
    }).length,
  }));

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Logística"
        title="Frete"
        subtitle="Relação entre frete e valor do pedido, por conta de marketplace."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshOrders} />
          </Stack>
        }
      />

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <IndicatorCard
          label="% Frete (vendedor)/Pedido médio"
          value={avgRatio !== null ? `${avgRatio.toFixed(1)}%` : '—'}
          tone={avgRatio !== null && avgRatio > 20 ? 'error' : 'success'}
        />
        <IndicatorCard
          label="Pedidos com frete grátis"
          value={freeShippingPct !== null ? `${freeShippingPct.toFixed(0)}%` : '—'}
          tone="accent"
        />
        <IndicatorCard
          label="Frete pago pelo comprador no período"
          value={currency.format(totalFreight)}
          tone="neutral"
        />
        <IndicatorCard
          label="Frete absorvido pelo vendedor no período"
          value={currency.format(totalSellerFreightCost)}
          tone={totalSellerFreightCost > 0 ? 'warning' : 'neutral'}
          helperText={
            ordersWithSellerFreightCost.length < orders.length
              ? `${orders.length - ordersWithSellerFreightCost.length} pedido(s) sem custo de frete sincronizado`
              : undefined
          }
        />
      </Stack>

      <SectionPanel kicker="Distribuição" title="% Frete por faixa">
        {withRatio.length === 0 ? (
          <EmptyState message="Sem pedidos com frete calculado ainda." />
        ) : (
          <Box sx={{ p: 2 }}>
            <FreightChart data={chartData} />
          </Box>
        )}
      </SectionPanel>

      <SectionPanel kicker="Pedidos" title="Detalhamento">
        <DetailSection orders={orders} />
      </SectionPanel>
    </Stack>
  );
}
