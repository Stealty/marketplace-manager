import { Box, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { EmptyState } from '@/components/EmptyState';
import { IndicatorCard } from '@/components/IndicatorCard';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { getOrders, getOrdersLastSyncedAt } from '@/services/ordersService';
import { FreightChart } from './freight-chart';
import { DetailSection } from './detail-section';
import { refreshOrders } from './actions';

const BUCKETS = [
  { label: '0–5%', min: 0, max: 5 },
  { label: '5–10%', min: 5, max: 10 },
  { label: '10–15%', min: 10, max: 15 },
  { label: '15%+', min: 15, max: Infinity },
];

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function FretePage() {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);
  const withRatio = orders.filter((order) => order.freight_ratio !== null);

  const avgRatio =
    withRatio.length > 0
      ? withRatio.reduce((sum, order) => sum + (order.freight_ratio ?? 0), 0) / withRatio.length
      : null;

  const freeShippingPct =
    orders.length > 0
      ? (orders.filter((order) => order.is_free_shipping).length / orders.length) * 100
      : null;

  const totalFreight = orders.reduce((sum, order) => sum + (order.freight_value ?? 0), 0);

  const chartData = BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: withRatio.filter(
      (order) => (order.freight_ratio ?? 0) >= bucket.min && (order.freight_ratio ?? 0) < bucket.max
    ).length,
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
          label="% Frete/Pedido médio"
          value={avgRatio !== null ? `${avgRatio.toFixed(1)}%` : '—'}
          tone={avgRatio !== null && avgRatio > 10 ? 'error' : 'success'}
        />
        <IndicatorCard
          label="Pedidos com frete grátis"
          value={freeShippingPct !== null ? `${freeShippingPct.toFixed(0)}%` : '—'}
          tone="accent"
        />
        <IndicatorCard label="Frete total no período" value={currency.format(totalFreight)} tone="neutral" />
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
