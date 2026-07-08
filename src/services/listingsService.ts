import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { MarketplaceConnection, MarketplaceType, ProductListing } from '@/types/database';
import { syncListings } from '@/services/sync/listingsSync';
import { isStale, SYNC_TTL_MINUTES } from '@/lib/sync/freshness';

export interface ProductListingWithRelations extends ProductListing {
  products: { sku: string; title: string } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
}

async function ensureListingsFresh(supabase: SupabaseClient, connections: MarketplaceConnection[]) {
  const mlConnections = connections.filter(
    (c) => c.marketplace === 'mercado_livre' && c.status === 'connected'
  );
  if (mlConnections.length === 0) return;

  const { data: syncStates } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, last_synced_at')
    .eq('resource', 'listings')
    .in(
      'marketplace_connection_id',
      mlConnections.map((c) => c.id)
    );

  const lastSyncedByConnection = new Map<string, string | null>(
    (syncStates ?? []).map((s) => [s.marketplace_connection_id, s.last_synced_at])
  );

  for (const connection of mlConnections) {
    const lastSyncedAt = lastSyncedByConnection.get(connection.id) ?? null;

    if (lastSyncedAt === null) {
      await syncListings(supabase, connection);
    } else if (isStale(lastSyncedAt, SYNC_TTL_MINUTES.listings)) {
      after(() => syncListings(supabase, connection));
    }
  }
}

export async function getProductListings(): Promise<ProductListingWithRelations[]> {
  const supabase = await createClient();

  const { data: connections } = await supabase.from('marketplace_connections').select('*');
  await ensureListingsFresh(supabase, connections ?? []);

  const { data, error } = await supabase
    .from('product_listings')
    .select('*, products(sku, title), marketplace_connections(label, marketplace)')
    .order('created_at', { ascending: false })
    .returns<ProductListingWithRelations[]>();

  if (error) throw error;

  return data;
}
