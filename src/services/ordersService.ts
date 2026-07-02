import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { MarketplaceConnection, MarketplaceType, Order, OrderItem } from '@/types/database';
import { syncOrders } from '@/services/sync/ordersSync';
import { isStale, SYNC_TTL_MINUTES } from '@/lib/sync/freshness';

export interface OrderWithRelations extends Order {
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
  order_items: OrderItem[];
}

// Cache-aside: nunca sincronizado -> busca agora (não tem cache pra mostrar);
// cache velho (> TTL) -> serve o que já existe e atualiza em background via
// `after()`, sem travar a resposta atual.
async function ensureOrdersFresh(supabase: SupabaseClient, connections: MarketplaceConnection[]) {
  const mlConnections = connections.filter(
    (c) => c.marketplace === 'mercado_livre' && c.status === 'connected'
  );
  if (mlConnections.length === 0) return;

  const { data: syncStates } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, last_synced_at')
    .eq('resource', 'orders')
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
      await syncOrders(supabase, connection);
    } else if (isStale(lastSyncedAt, SYNC_TTL_MINUTES.orders)) {
      after(() => syncOrders(supabase, connection));
    }
  }
}

export async function getOrders(): Promise<OrderWithRelations[]> {
  const supabase = await createClient();

  const { data: connections } = await supabase.from('marketplace_connections').select('*');
  await ensureOrdersFresh(supabase, connections ?? []);

  const { data, error } = await supabase
    .from('orders')
    .select('*, marketplace_connections(label, marketplace), order_items(*)')
    .order('ordered_at', { ascending: false, nullsFirst: false })
    .returns<OrderWithRelations[]>();

  if (error) throw error;

  return data;
}
