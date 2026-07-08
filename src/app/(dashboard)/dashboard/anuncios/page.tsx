import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { RefreshButton } from '@/components/RefreshButton';
import { getProductListings } from '@/services/listingsService';
import { ListingsList } from './listings-list';
import { refreshListings } from './actions';

export default async function AnunciosPage() {
  const listings = await getProductListings();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Catálogo"
        title="Anúncios"
        subtitle="Preço, status e qualidade dos anúncios em todas as contas conectadas."
        action={<RefreshButton action={refreshListings} />}
      />
      <SectionPanel>
        <ListingsList listings={listings} />
      </SectionPanel>
    </Stack>
  );
}
