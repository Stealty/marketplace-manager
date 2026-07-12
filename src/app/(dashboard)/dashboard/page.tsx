import { Alert, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { IndicatorCard } from '@/components/IndicatorCard';
import { SectionPanel } from '@/components/SectionPanel';
import { computeItemProfitability } from '@/lib/profitability';
import { getQuestionThreads } from '@/services/questionsService';
import { getOrders } from '@/services/ordersService';
import { getProductListings } from '@/services/listingsService';
import { getMarketplaceConnections } from '@/services/connectionsService';
import { getReputationMetrics } from '@/services/reputationService';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DASHBOARD_PERIOD_DAYS = 30;

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

// Date.now() isolado em helpers de módulo (mesma válvula de escape de
// `isToday` acima) — chamar Date.now() direto no corpo do componente viola a
// regra de pureza de render do React.
function isWithinLastDays(dateString: string | null, days: number): boolean {
  if (!dateString) return false;
  const ageMs = Date.now() - new Date(dateString).getTime();
  return ageMs <= days * 24 * 60 * 60 * 1000;
}

function isOlderThanHours(dateString: string, hours: number): boolean {
  const ageMs = Date.now() - new Date(dateString).getTime();
  return ageMs > hours * 60 * 60 * 1000;
}

export default async function DashboardPage() {
  const [threads, orders, listings, connections, reputationMetrics] = await Promise.all([
    getQuestionThreads(),
    getOrders(),
    getProductListings(),
    getMarketplaceConnections(),
    getReputationMetrics(),
  ]);

  // --- Visão geral (indicadores já existentes) ---
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

  // --- Vendas (30 dias) ---
  const ordersLast30Days = orders.filter((o) => isWithinLastDays(o.ordered_at, DASHBOARD_PERIOD_DAYS));
  const pedidos30 = ordersLast30Days.length;
  const faturamento30 = ordersLast30Days.reduce((sum, o) => sum + (o.order_value ?? 0), 0);
  const ticketMedio30 = pedidos30 > 0 ? faturamento30 / pedidos30 : null;
  const freteGratisPct =
    pedidos30 > 0
      ? (ordersLast30Days.filter((o) => o.is_free_shipping).length / pedidos30) * 100
      : null;

  // --- Anúncios ---
  const anunciosAtivosPct =
    listings.length > 0
      ? (listings.filter((l) => l.status === 'active').length / listings.length) * 100
      : null;
  const anunciosSemImagem = listings.filter((l) => !l.image_url).length;

  // --- Atendimento ---
  const taxaResposta =
    threads.length > 0
      ? (threads.filter((t) => t.status === 'answered').length / threads.length) * 100
      : null;
  const perguntasPendentesAntigas = threads.filter(
    (t) => t.status === 'pending' && t.last_message_at !== null && isOlderThanHours(t.last_message_at, 24)
  ).length;

  // --- Financeiro (mesmo cálculo da tela Lucratividade, período de 30 dias) ---
  const itemsLast30Days = ordersLast30Days.flatMap((order) =>
    order.order_items.map((item) => computeItemProfitability(item, order))
  );
  const itemsComVinculo = itemsLast30Days.filter((item) => item.productSku !== null);
  const itemsComCusto = itemsComVinculo.filter((item) => item.custoUnit !== null);
  const custoTotal30 = itemsComCusto.reduce((sum, item) => sum + (item.custoTotal ?? 0), 0);
  const lucroBruto30 = itemsComCusto.reduce((sum, item) => sum + (item.lucroBruto ?? 0), 0);
  const margemSobreCusto30 = custoTotal30 > 0 ? (lucroBruto30 / custoTotal30) * 100 : null;
  const itensSemCustoPct =
    itemsComVinculo.length > 0
      ? ((itemsComVinculo.length - itemsComCusto.length) / itemsComVinculo.length) * 100
      : null;

  // --- Reputação ---
  const powerSellerCount = reputationMetrics.filter((m) => m.metrics.power_seller_status).length;
  const claimsRates = reputationMetrics
    .map((m) => m.metrics.claims_rate)
    .filter((rate): rate is number => rate !== null);
  const avgClaimsRate =
    claimsRates.length > 0 ? (claimsRates.reduce((sum, rate) => sum + rate, 0) / claimsRates.length) * 100 : null;

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

      <SectionPanel kicker="Últimos 30 dias" title="Vendas">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <IndicatorCard label="Pedidos" value={String(pedidos30)} tone="accent" />
          <IndicatorCard label="Faturamento" value={currency.format(faturamento30)} tone="accent" />
          <IndicatorCard
            label="Ticket médio"
            value={ticketMedio30 !== null ? currency.format(ticketMedio30) : '—'}
            tone="neutral"
          />
          <IndicatorCard
            label="% Frete grátis"
            value={freteGratisPct !== null ? `${freteGratisPct.toFixed(1)}%` : '—'}
            tone="neutral"
          />
        </Stack>
      </SectionPanel>

      <SectionPanel title="Anúncios">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <IndicatorCard
            label="% Anúncios ativos"
            value={anunciosAtivosPct !== null ? `${anunciosAtivosPct.toFixed(1)}%` : '—'}
            tone={anunciosAtivosPct !== null && anunciosAtivosPct < 70 ? 'warning' : 'success'}
          />
          <IndicatorCard
            label="Sem imagem"
            value={String(anunciosSemImagem)}
            tone={anunciosSemImagem > 0 ? 'warning' : 'success'}
          />
        </Stack>
      </SectionPanel>

      <SectionPanel title="Atendimento">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <IndicatorCard
            label="Taxa de resposta"
            value={taxaResposta !== null ? `${taxaResposta.toFixed(1)}%` : '—'}
            tone={taxaResposta !== null && taxaResposta < 80 ? 'warning' : 'success'}
          />
          <IndicatorCard
            label="Pendentes há mais de 24h"
            value={String(perguntasPendentesAntigas)}
            tone={perguntasPendentesAntigas > 0 ? 'error' : 'success'}
          />
        </Stack>
      </SectionPanel>

      <SectionPanel kicker="Últimos 30 dias" title="Financeiro">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <IndicatorCard
            label="Margem sobre custo"
            value={margemSobreCusto30 !== null ? `${margemSobreCusto30.toFixed(1)}%` : '—'}
            tone={margemSobreCusto30 === null ? 'neutral' : margemSobreCusto30 < 0 ? 'error' : 'success'}
          />
          <IndicatorCard
            label="Itens sem custo cadastrado"
            value={itensSemCustoPct !== null ? `${itensSemCustoPct.toFixed(1)}%` : '—'}
            tone={itensSemCustoPct !== null && itensSemCustoPct > 0 ? 'warning' : 'success'}
          />
        </Stack>
      </SectionPanel>

      <SectionPanel title="Reputação">
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <IndicatorCard
            label="Contas Power Seller"
            value={`${powerSellerCount} de ${reputationMetrics.length}`}
            tone={reputationMetrics.length > 0 && powerSellerCount === reputationMetrics.length ? 'success' : 'neutral'}
          />
          <IndicatorCard
            label="Taxa de reclamações (méd.)"
            value={avgClaimsRate !== null ? `${avgClaimsRate.toFixed(1)}%` : '—'}
            tone={avgClaimsRate !== null && avgClaimsRate > 5 ? 'error' : 'success'}
          />
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
