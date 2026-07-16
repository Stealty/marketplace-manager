import { createClient } from '@/lib/supabase/server';
import type { ErpConnection, MarketplaceConnection } from '@/types/database';
import { getCurrentUserOrgIds } from '@/services/organizationService';
import type { SyncResource } from '@/lib/sync/freshness';

export async function getMarketplaceConnections(): Promise<MarketplaceConnection[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();
  if (orgIds.length === 0) return [];

  const { data, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds)
    .order('connected_at', { ascending: false });

  if (error) throw error;

  return data;
}

export interface SyncResourceError {
  connectionId: string;
  connectionLabel: string;
  resource: SyncResource;
  lastError: string | null;
  lastSuccessAt: string | null;
}

// Só busca erro de sync para conexões com status 'connected': quando a
// conexão está expired/error/disconnected já existe um aviso próprio no nível
// da conexão, então um erro de sync_state só é informação nova quando a
// conexão em si parece saudável.
export async function getConnectionSyncErrors(
  connections: MarketplaceConnection[]
): Promise<SyncResourceError[]> {
  const healthy = connections.filter((c) => c.status === 'connected');
  if (healthy.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, resource, last_error, last_success_at')
    .eq('last_status', 'error')
    .in(
      'marketplace_connection_id',
      healthy.map((c) => c.id)
    );

  if (error) throw error;

  const labelById = new Map(healthy.map((c) => [c.id, c.label]));

  return (data ?? []).map((row) => ({
    connectionId: row.marketplace_connection_id,
    connectionLabel: labelById.get(row.marketplace_connection_id) ?? 'Conta',
    resource: row.resource as SyncResource,
    lastError: row.last_error,
    lastSuccessAt: row.last_success_at,
  }));
}

export async function getErpConnections(): Promise<ErpConnection[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();
  if (orgIds.length === 0) return [];

  const { data, error } = await supabase
    .from('erp_connections')
    .select('*')
    .in('org_id', orgIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
}
