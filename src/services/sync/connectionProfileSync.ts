import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSellerNickname } from '@/lib/mercadolivre/client';
import { upsertSyncState } from '@/lib/sync/freshness';
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

    await upsertSyncState(supabase, connection, 'profile', 'sync_connection_profile', 'ok');
  } catch (error) {
    await upsertSyncState(
      supabase,
      connection,
      'profile',
      'sync_connection_profile',
      'error',
      (error as Error).message
    );
    throw error;
  }
}
