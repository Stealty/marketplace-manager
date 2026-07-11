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

// Grava o resultado de uma tentativa de sync. last_synced_at marca toda
// tentativa (usado por isStale/ensureFresh para decidir quando tentar de
// novo); last_success_at só avança quando status !== 'error', preservando o
// momento do último sync que realmente trouxe dados novos mesmo que
// tentativas posteriores falhem.
export async function upsertSyncState(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  resource: SyncResource,
  jobType: string,
  status: 'ok' | 'error' | 'partial',
  error?: string
): Promise<void> {
  const now = new Date().toISOString();
  await supabase.from('sync_state').upsert(
    {
      org_id: connection.org_id,
      marketplace_connection_id: connection.id,
      resource,
      last_synced_at: now,
      last_status: status,
      last_error: error ?? null,
      ...(status !== 'error' ? { last_success_at: now } : {}),
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: jobType,
    status: status === 'error' ? 'failed' : 'done',
    payload: error ? { error } : {},
  });
}

// Menor last_success_at entre as conexões ML conectadas de um recurso — se
// alguma conta nunca sincronizou ou está com a conexão fora de 'connected',
// trata como "nunca sincronizado" em vez de ignorá-la silenciosamente (não dá
// pra garantir que os dados exibidos incluem aquela conta).
export async function getLastSuccessAt(
  supabase: SupabaseClient,
  connections: MarketplaceConnection[],
  resource: SyncResource
): Promise<string | null> {
  const mlConnections = connections.filter(
    (c) => c.marketplace === 'mercado_livre' && c.status === 'connected'
  );
  if (mlConnections.length === 0) return null;

  const { data: syncStates } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, last_success_at')
    .eq('resource', resource)
    .in(
      'marketplace_connection_id',
      mlConnections.map((c) => c.id)
    );

  const lastSuccessByConnection = new Map<string, string | null>(
    (syncStates ?? []).map((s) => [s.marketplace_connection_id, s.last_success_at])
  );

  const timestamps = mlConnections.map((c) => lastSuccessByConnection.get(c.id) ?? null);
  if (timestamps.some((t) => t === null)) return null;

  return (timestamps as string[]).reduce((oldest, t) => (new Date(t) < new Date(oldest) ? t : oldest));
}

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
