'use server';

import { createClient } from '@/lib/supabase/server';
import type { SyncResource } from '@/lib/sync/freshness';

export interface ResourceProgress {
  resource: SyncResource;
  status: 'pending' | 'ok' | 'error';
}

const RESOURCES: SyncResource[] = ['orders', 'listings', 'questions', 'reputation', 'profile'];

export async function getConnectionSyncProgress(connectionId: string): Promise<ResourceProgress[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('sync_state')
    .select('resource, last_status')
    .eq('marketplace_connection_id', connectionId)
    .in('resource', RESOURCES);

  const statusByResource = new Map((data ?? []).map((row) => [row.resource, row.last_status]));

  return RESOURCES.map((resource) => {
    const raw = statusByResource.get(resource) ?? null;
    // null (nunca sincronizado) e 'running' contam como "pendente"; 'partial'
    // (só orders) é tratado como sucesso terminal aqui — o detalhe de frete
    // parcial continua visível na própria página de Pedidos.
    const status: ResourceProgress['status'] =
      raw === 'ok' || raw === 'partial' ? 'ok' : raw === 'error' ? 'error' : 'pending';
    return { resource, status };
  });
}
