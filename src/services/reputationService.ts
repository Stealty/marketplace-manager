import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { MarketplaceConnection, MarketplaceType, ReputationMetric } from '@/types/database';
import { syncReputation } from '@/services/sync/reputationSync';
import { isStale, SYNC_TTL_MINUTES } from '@/lib/sync/freshness';

export interface ReputationMetricWithRelations extends ReputationMetric {
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
}

async function ensureReputationFresh(supabase: SupabaseClient, connections: MarketplaceConnection[]) {
  const mlConnections = connections.filter(
    (c) => c.marketplace === 'mercado_livre' && c.status === 'connected'
  );
  if (mlConnections.length === 0) return;

  const { data: syncStates } = await supabase
    .from('sync_state')
    .select('marketplace_connection_id, last_synced_at')
    .eq('resource', 'reputation')
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
      await syncReputation(supabase, connection);
    } else if (isStale(lastSyncedAt, SYNC_TTL_MINUTES.reputation)) {
      after(() => syncReputation(supabase, connection));
    }
  }
}

export async function getReputationMetrics(): Promise<ReputationMetricWithRelations[]> {
  const supabase = await createClient();

  const { data: connections } = await supabase.from('marketplace_connections').select('*');
  await ensureReputationFresh(supabase, connections ?? []);

  const { data, error } = await supabase
    .from('reputation_metrics')
    .select('*, marketplace_connections(label, marketplace)')
    .order('metric_date', { ascending: false })
    .returns<ReputationMetricWithRelations[]>();

  if (error) throw error;

  const latestByConnection = new Map<string, ReputationMetricWithRelations>();
  for (const metric of data) {
    if (!latestByConnection.has(metric.marketplace_connection_id)) {
      latestByConnection.set(metric.marketplace_connection_id, metric);
    }
  }

  return Array.from(latestByConnection.values());
}
