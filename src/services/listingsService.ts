import { createClient } from '@/lib/supabase/server';
import type { MarketplaceType, ProductListing } from '@/types/database';

export interface ProductListingWithRelations extends ProductListing {
  products: { sku: string; title: string } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
}

export async function getProductListings(): Promise<ProductListingWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('product_listings')
    .select('*, products(sku, title), marketplace_connections(label, marketplace)')
    .order('created_at', { ascending: false })
    .returns<ProductListingWithRelations[]>();

  if (error) throw error;

  return data;
}
