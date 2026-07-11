import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceConnection } from '@/types/database';
import type { SyncResource } from '@/lib/sync/freshness';
import { syncOrders } from '@/services/sync/ordersSync';
import { syncListings } from '@/services/sync/listingsSync';
import { syncQuestions } from '@/services/sync/questionsSync';
import { syncClaims } from '@/services/sync/claimsSync';
import { syncReputation } from '@/services/sync/reputationSync';
import { syncConnectionProfile } from '@/services/sync/connectionProfileSync';

const RESOURCES: { resource: SyncResource; sync: (supabase: SupabaseClient, connection: MarketplaceConnection) => Promise<void> }[] = [
  // listings primeiro: orders e questions resolvem product_listing_id via
  // lookup pontual em product_listings no momento do próprio sync (não é um
  // join feito na leitura) — se listings ainda não existir, o vínculo grava
  // null e só se corrige na próxima rodada de sync de orders/questions.
  { resource: 'listings', sync: syncListings },
  { resource: 'orders', sync: syncOrders },
  // claims depois de orders: o vínculo claim -> pedido local é melhor-esforço
  // (busca por external_order_id) e só acha o pedido se ele já tiver sido
  // sincronizado nesta mesma leva.
  { resource: 'claims', sync: syncClaims },
  { resource: 'questions', sync: syncQuestions },
  { resource: 'reputation', sync: syncReputation },
  { resource: 'profile', sync: syncConnectionProfile },
];

// `last_synced_at: null` no marcador 'running' é proposital: se essa função
// travar no meio (timeout de função serverless, processo reiniciado), o
// recurso continua parecendo desatualizado para `isStale()` — o `ensureFresh`
// de qualquer página ainda tenta sincronizá-lo por conta própria depois.
async function markRunning(supabase: SupabaseClient, connection: MarketplaceConnection, resource: SyncResource) {
  await supabase.from('sync_state').upsert(
    {
      org_id: connection.org_id,
      marketplace_connection_id: connection.id,
      resource,
      last_synced_at: null,
      last_status: 'running',
      last_error: null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );
}

// Roda os recursos em sequência (não em paralelo) pela mesma cautela já
// documentada em ordersSync.ts: evita competir com o rate limit do ML e com
// refresh de token concorrente. Cada syncX já grava seu próprio status de
// erro em sync_state/sync_jobs e relança — engolimos o relançamento aqui para
// que a falha de um recurso não impeça os demais de sincronizar.
export async function syncAllResourcesForConnection(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  for (const { resource, sync } of RESOURCES) {
    await markRunning(supabase, connection, resource);
    try {
      await sync(supabase, connection);
    } catch {
      // já persistido pelo próprio syncX — segue para o próximo recurso.
    }
  }
}
