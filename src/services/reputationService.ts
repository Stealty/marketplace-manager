import { createClient } from '@/lib/supabase/server';
import type { MarketplaceType, ReputationMetric } from '@/types/database';
import { syncReputation } from '@/services/sync/reputationSync';
import { ensureFresh, getLastSuccessAt } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface ReputationMetricWithRelations extends ReputationMetric {
  marketplace_connections: { label: string; marketplace: MarketplaceType; seller_nickname: string | null } | null;
}

export async function getReputationMetrics(): Promise<ReputationMetricWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  await ensureFresh(supabase, connections ?? [], 'reputation', syncReputation);

  const { data, error } = await supabase
    .from('reputation_metrics')
    .select('*, marketplace_connections(label, marketplace, seller_nickname)')
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

export async function getReputationLastSyncedAt(): Promise<string | null> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);

  return getLastSuccessAt(supabase, connections ?? [], 'reputation');
}
