import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketplaceConnection } from '@/types/database';

export function isStale(lastSyncedAt: string | null, ttlMinutes: number): boolean {
  if (!lastSyncedAt) return true;
  const ageMs = Date.now() - new Date(lastSyncedAt).getTime();
  return ageMs > ttlMinutes * 60 * 1000;
}

export const SYNC_TTL_MINUTES = {
  orders: 5,
  questions: 5,
  listings: 20,
  reputation: 20,
  // Nickname do vendedor muda raríssimo — TTL bem mais folgado que os
  // recursos de dados transacionais acima.
  profile: 60,
} as const;

export type SyncResource = keyof typeof SYNC_TTL_MINUTES;

// Cache-aside: a tela sempre renderiza com o que já existe localmente e
// dispara o sync em background via `after()` — nunca bloqueia a resposta,
// nem na primeiríssima sincronização de uma conexão (sem isso, a primeira
// visita a uma tela nova travaria esperando o sync completo do ML antes de
// mostrar qualquer coisa, mesmo que o cache local já tivesse dados de uma
// sincronização anterior cujo registro em `sync_state` tenha se perdido).
export async function ensureFresh(
  supabase: SupabaseClient,
  connections: MarketplaceConnection[],
  resource: SyncResource,
  sync: (supabase: SupabaseClient, connection: MarketplaceConnection) => Promise<void>
): Promise<void> {
  const mlConnections = connections.filter(
    (c) => c.marketplace === 'mercado_livre' && c.status === 'connected'
  );
  if (mlConnections.length === 0) return;

  const { data: syncStates } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, last_synced_at')
    .eq('resource', resource)
    .in(
      'marketplace_connection_id',
      mlConnections.map((c) => c.id)
    );

  const lastSyncedByConnection = new Map<string, string | null>(
    (syncStates ?? []).map((s) => [s.marketplace_connection_id, s.last_synced_at])
  );

  for (const connection of mlConnections) {
    const lastSyncedAt = lastSyncedByConnection.get(connection.id) ?? null;
    if (lastSyncedAt === null || isStale(lastSyncedAt, SYNC_TTL_MINUTES[resource])) {
      after(() => sync(supabase, connection));
    }
  }
}
