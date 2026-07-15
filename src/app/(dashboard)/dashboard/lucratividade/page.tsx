import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { ProfitabilityList } from './profitability-list';
import { QuickCostForm } from './quick-cost-form';
import { getProfitabilityData, refreshProfitability } from './actions';

export default async function LucratividadePage() {
  const { orders, lastSuccessAt } = await getProfitabilityData();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Financeiro"
        title="Lucratividade por venda"
        subtitle="Compare o repasse líquido de cada venda com o custo cadastrado por SKU para achar produtos com prejuízo ou margem baixa."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshProfitability} />
          </Stack>
        }
      />

      <SectionPanel kicker="Custos" title="Cadastro rápido de custo por SKU">
        <QuickCostForm />
      </SectionPanel>

      <SectionPanel dense>
        <ProfitabilityList orders={orders} />
      </SectionPanel>
    </Stack>
  );
}
