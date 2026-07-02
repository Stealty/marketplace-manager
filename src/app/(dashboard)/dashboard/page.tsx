import { Alert, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { IndicatorCard } from '@/components/IndicatorCard';
import { getQuestionThreads } from '@/services/questionsService';
import { getOrders } from '@/services/ordersService';
import { getProductListings } from '@/services/listingsService';
import { getMarketplaceConnections } from '@/services/connectionsService';

function isToday(dateString: string | null) {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export default async function DashboardPage() {
  const [threads, orders, listings, connections] = await Promise.all([
    getQuestionThreads(),
    getOrders(),
    getProductListings(),
    getMarketplaceConnections(),
  ]);

  const pendingQuestions = threads.filter((t) => t.status === 'pending').length;

  const ordersWithRatio = orders.filter((o) => o.freight_ratio !== null);
  const avgFreightRatio =
    ordersWithRatio.length > 0
      ? ordersWithRatio.reduce((sum, o) => sum + (o.freight_ratio ?? 0), 0) / ordersWithRatio.length
      : null;

  const listingsNeedingAttention = listings.filter(
    (l) => l.quality_score !== null && l.quality_score < 50
  ).length;

  const ordersToday = orders.filter((o) => isToday(o.ordered_at)).length;

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Painel"
        title="Visão geral"
        subtitle="Indicadores consolidados de todas as contas de marketplace conectadas."
      />

      {connections.length === 0 && (
        <Alert severity="info">
          Nenhuma conta de marketplace conectada ainda. Conecte uma conta em{' '}
          <strong>Conexões</strong> para começar a sincronizar dados reais.
        </Alert>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        <IndicatorCard
          label="Perguntas pendentes"
          value={String(pendingQuestions)}
          tone={pendingQuestions > 0 ? 'warning' : 'success'}
          helperText={pendingQuestions > 0 ? 'Aguardando resposta' : 'Sem perguntas em aberto'}
        />
        <IndicatorCard
          label="% Frete/Pedido médio"
          value={avgFreightRatio !== null ? `${avgFreightRatio.toFixed(1)}%` : '—'}
          tone={avgFreightRatio !== null && avgFreightRatio > 10 ? 'error' : 'accent'}
          helperText={avgFreightRatio !== null ? undefined : 'Aguardando primeira sincronização'}
        />
        <IndicatorCard
          label="Anúncios com atenção"
          value={String(listingsNeedingAttention)}
          tone={listingsNeedingAttention > 0 ? 'error' : 'success'}
          helperText="Qualidade abaixo de 50"
        />
        <IndicatorCard
          label="Pedidos hoje"
          value={String(ordersToday)}
          tone="accent"
          helperText="Conferência de marketplaces"
        />
      </Stack>
    </Stack>
  );
}
