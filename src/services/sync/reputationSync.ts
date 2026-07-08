import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchReputation } from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllReputation(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncReputation(supabase, connection);
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
      resource: 'reputation',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_reputation',
    status: status === 'ok' ? 'done' : 'failed',
    payload: error ? { error } : {},
  });
}

export async function syncReputation(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const reputation = await fetchReputation(supabase, connection);

    const { error } = await supabase.from('reputation_metrics').upsert(
      {
        org_id: connection.org_id,
        marketplace_connection_id: connection.id,
        metric_date: new Date().toISOString().slice(0, 10),
        metrics: {
          level_id: reputation.level_id ?? null,
          power_seller_status: reputation.power_seller_status ?? null,
          claims_rate: reputation.metrics?.claims?.rate ?? null,
          delayed_handling_rate: reputation.metrics?.delayed_handling_time?.rate ?? null,
          cancellations_rate: reputation.metrics?.cancellations?.rate ?? null,
        },
      },
      { onConflict: 'marketplace_connection_id,metric_date' }
    );

    if (error) throw error;

    await upsertSyncState(supabase, connection, 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
