import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractSellerSku,
  fetchItemIds,
  fetchItemsDetails,
  type MercadoLivreItem,
} from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllListings(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncListings(supabase, connection);
  }
}

async function upsertSyncState(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  status: 'ok' | 'error',
  error?: string
) {
  await supabase.from('sync_state').upsert(
    {
      org_id: connection.org_id,
      marketplace_connection_id: connection.id,
      resource: 'listings',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_listings',
    status: status === 'ok' ? 'done' : 'failed',
    payload: error ? { error } : {},
  });
}

async function upsertListing(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  item: MercadoLivreItem
) {
  const sku = extractSellerSku(item);
  if (!sku) return; // sem SKU reconhecível — anúncio é pulado (decisão de produto)

  const { data: product } = await supabase
    .from('products')
    .select('id')
    .eq('org_id', connection.org_id)
    .eq('sku', sku)
    .maybeSingle();

  if (!product) return; // produto precisa já existir em `products` — não cria placeholder

  const { error } = await supabase.from('product_listings').upsert(
    {
      org_id: connection.org_id,
      product_id: product.id,
      marketplace_connection_id: connection.id,
      external_id: item.id,
      title: item.title,
      price: item.price,
      status: item.status,
    },
    { onConflict: 'marketplace_connection_id,external_id' }
  );

  if (error) throw error;
}

export async function syncListings(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const itemIds = await fetchItemIds(supabase, connection);
    const items = await fetchItemsDetails(supabase, connection, itemIds);
    for (const item of items) {
      await upsertListing(supabase, connection, item);
    }
    await upsertSyncState(supabase, connection, 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
