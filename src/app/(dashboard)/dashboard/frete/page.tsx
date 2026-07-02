import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { StatusTag } from '@/components/StatusTag';
import { EmptyState } from '@/components/EmptyState';
import { IndicatorCard } from '@/components/IndicatorCard';
import { RefreshButton } from '@/components/RefreshButton';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import { getOrders } from '@/services/ordersService';
import { FreightChart } from './freight-chart';
import { refreshOrders } from './actions';

const BUCKETS = [
  { label: '0–5%', min: 0, max: 5 },
  { label: '5–10%', min: 5, max: 10 },
  { label: '10–15%', min: 10, max: 15 },
  { label: '15%+', min: 15, max: Infinity },
];

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function FretePage() {
  const orders = await getOrders();
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
        action={<RefreshButton action={refreshOrders} />}
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
        {orders.length === 0 ? (
          <EmptyState message="Nenhum pedido sincronizado ainda." />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pedido</TableCell>
                  <TableCell>Marketplace</TableCell>
                  <TableCell align="right">Valor</TableCell>
                  <TableCell align="right">Frete</TableCell>
                  <TableCell align="right">%</TableCell>
                  <TableCell>Frete grátis</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2">{order.external_order_id}</Typography>
                    </TableCell>
                    <TableCell>
                      {order.marketplace_connections
                        ? MARKETPLACE_LABELS[order.marketplace_connections.marketplace]
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {order.order_value !== null ? currency.format(order.order_value) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {order.freight_value !== null ? currency.format(order.freight_value) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {order.freight_ratio !== null ? `${order.freight_ratio.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell>
                      {order.is_free_shipping && <StatusTag label="Frete grátis" tone="accent" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionPanel>
    </Stack>
  );
}
