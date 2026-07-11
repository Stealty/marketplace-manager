import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSellerNickname } from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllConnectionProfiles(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncConnectionProfile(supabase, connection);
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
      resource: 'profile',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_connection_profile',
    status: status === 'ok' ? 'done' : 'failed',
    payload: error ? { error } : {},
  });
}

export async function syncConnectionProfile(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const nickname = await fetchSellerNickname(supabase, connection);
    if (nickname && nickname !== connection.seller_nickname) {
      const { error } = await supabase
        .from('marketplace_connections')
        .update({ seller_nickname: nickname })
        .eq('id', connection.id);
      if (error) throw error;
    }

    await upsertSyncState(supabase, connection, 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
