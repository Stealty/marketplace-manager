import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { getProductListings } from '@/services/listingsService';
import { ListingsGrid } from './listings-grid';

export default async function AnunciosPage() {
  const listings = await getProductListings();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Catálogo"
        title="Anúncios"
        subtitle="Preço, status e qualidade dos anúncios em todas as contas conectadas."
      />
      <SectionPanel>
        <ListingsGrid listings={listings} />
      </SectionPanel>
    </Stack>
  );
}
