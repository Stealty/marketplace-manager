import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { getClaims, getClaimsLastSyncedAt } from '@/services/claimsService';
import { ClaimsList } from './claims-list';
import { refreshClaims } from './actions';

export default async function ReclamacoesPage() {
  const [claims, lastSuccessAt] = await Promise.all([getClaims(), getClaimsLastSyncedAt()]);

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Pós-venda"
        title="Reclamações"
        subtitle="Reclamações, disputas e devoluções em todas as contas conectadas."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshClaims} />
          </Stack>
        }
      />
      <SectionPanel dense>
        <ClaimsList claims={claims} />
      </SectionPanel>
    </Stack>
  );
}
