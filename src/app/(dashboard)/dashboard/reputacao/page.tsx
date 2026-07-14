import { Box, Paper, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { EmptyState } from '@/components/EmptyState';
import { RefreshButton } from '@/components/RefreshButton';
import { IndicatorCard } from '@/components/IndicatorCard';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { StoreTag } from '@/components/StoreTag';
import { getReputationMetrics, getReputationLastSyncedAt } from '@/services/reputationService';
import { refreshReputation } from './actions';

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

export default async function ReputacaoPage() {
  const [metrics, lastSuccessAt] = await Promise.all([getReputationMetrics(), getReputationLastSyncedAt()]);

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Qualidade"
        title="Reputação"
        subtitle="Nível e indicadores de reputação em todas as contas de marketplace conectadas."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshReputation} />
          </Stack>
        }
      />

      <SectionPanel>
        {metrics.length === 0 ? (
          <EmptyState message="Nenhuma métrica de reputação sincronizada ainda. Conecte um marketplace em Conexões para começar." />
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            }}
          >
            {metrics.map((metric) => (
              <Paper key={metric.id} sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  <StoreTag connection={metric.marketplace_connections} />
                  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                    <IndicatorCard
                      label="Nível"
                      value={metric.metrics.level_id ?? '—'}
                      tone="accent"
                    />
                    <IndicatorCard
                      label="Power Seller"
                      value={metric.metrics.power_seller_status ?? '—'}
                      tone={metric.metrics.power_seller_status ? 'success' : 'neutral'}
                    />
                    <IndicatorCard
                      label="Taxa de reclamações"
                      value={
                        metric.metrics.claims_rate !== null
                          ? percent.format(metric.metrics.claims_rate)
                          : '—'
                      }
                      tone={
                        metric.metrics.claims_rate !== null && metric.metrics.claims_rate > 0.05
                          ? 'error'
                          : 'success'
                      }
                    />
                    <IndicatorCard
                      label="Taxa de atraso"
                      value={
                        metric.metrics.delayed_handling_rate !== null
                          ? percent.format(metric.metrics.delayed_handling_rate)
                          : '—'
                      }
                      tone={
                        metric.metrics.delayed_handling_rate !== null &&
                        metric.metrics.delayed_handling_rate > 0.05
                          ? 'error'
                          : 'success'
                      }
                    />
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </SectionPanel>
    </Stack>
  );
}
