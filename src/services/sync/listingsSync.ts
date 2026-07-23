import type { SupabaseClient } from '@supabase/supabase-js';
import {
  extractSellerSku,
  fetchItemIds,
  fetchItemsDetails,
  type MercadoLivreItem,
} from '@/lib/mercadolivre/client';
import { upsertSyncState } from '@/lib/sync/freshness';
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

// Normaliza a saúde/qualidade do anúncio para um score 0-100 (coluna
// quality_score). O ML devolve `health` numérico 0..1 na maioria das contas; o
// app legado também lidava com a forma categórica (healthy/warning/unhealthy),
// então cobrimos as duas. Mantém o painel de qualidade (que antes ficava
// sempre vazio) alimentado como no app legado.
function healthToScore(health: number | string | null | undefined): number | null {
  if (health === null || health === undefined || health === '') return null;
  if (typeof health === 'number') {
    if (!Number.isFinite(health)) return null;
    return Math.round(Math.max(0, Math.min(1, health)) * 100);
  }
  const numeric = Number(health);
  if (Number.isFinite(numeric)) return Math.round(Math.max(0, Math.min(1, numeric)) * 100);
  const categorical: Record<string, number> = { healthy: 100, warning: 50, unhealthy: 10 };
  return categorical[health.toLowerCase()] ?? null;
}

async function upsertListing(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  item: MercadoLivreItem
) {
  // Anúncios sem SELLER_SKU cadastrado no ML usam o próprio id do item como
  // chave — evita descartar o anúncio, mas não há vínculo de SKU "real"
  // entre marketplaces nesse caso.
  const sku = extractSellerSku(item) ?? item.id;

  const { data: product, error: upsertProductError } = await supabase
    .from('products')
    .upsert(
      { org_id: connection.org_id, sku, title: item.title },
      { onConflict: 'org_id,sku', ignoreDuplicates: false }
    )
    .select('id')
    .single();

  if (upsertProductError) throw upsertProductError;

  const { error } = await supabase.from('product_listings').upsert(
    {
      org_id: connection.org_id,
      product_id: product.id,
      marketplace_connection_id: connection.id,
      external_id: item.id,
      title: item.title,
      price: item.price,
      status: item.status,
      stock: item.available_quantity ?? null,
      sold_quantity: item.sold_quantity ?? null,
      quality_score: healthToScore(item.reputation_health_gauge ?? item.health),
      image_url: item.thumbnail ?? null,
      permalink: item.permalink ?? null,
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
    await upsertSyncState(supabase, connection, 'listings', 'sync_listings', 'ok');
  } catch (error) {
    await upsertSyncState(
      supabase,
      connection,
      'listings',
      'sync_listings',
      'error',
      (error as Error).message
    );
    throw error;
  }
}
