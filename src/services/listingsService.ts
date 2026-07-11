import { createClient } from '@/lib/supabase/server';
import type { MarketplaceType, ProductListing } from '@/types/database';
import { syncListings } from '@/services/sync/listingsSync';
import { ensureFresh } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface ProductListingWithRelations extends ProductListing {
  products: { sku: string; title: string } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
}

export async function getProductListings(): Promise<ProductListingWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  await ensureFresh(supabase, connections ?? [], 'listings', syncListings);

  const { data, error } = await supabase
    .from('product_listings')
    .select('*, products(sku, title), marketplace_connections(label, marketplace)')
    .order('created_at', { ascending: false })
    .returns<ProductListingWithRelations[]>();

  if (error) throw error;

  return data;
}
