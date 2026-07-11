import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { getProductListings, getListingsLastSyncedAt } from '@/services/listingsService';
import { ListingsList } from './listings-list';
import { refreshListings } from './actions';

export default async function AnunciosPage() {
  const [listings, lastSuccessAt] = await Promise.all([getProductListings(), getListingsLastSyncedAt()]);

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Catálogo"
        title="Anúncios"
        subtitle="Preço, status e qualidade dos anúncios em todas as contas conectadas."
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LastSyncedInfo lastSuccessAt={lastSuccessAt} />
            <RefreshButton action={refreshListings} />
          </Stack>
        }
      />
      <SectionPanel>
        <ListingsList listings={listings} />
      </SectionPanel>
    </Stack>
  );
}
