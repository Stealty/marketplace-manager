import { createClient } from '@/lib/supabase/server';
import type { ErpConnection, MarketplaceConnection } from '@/types/database';
import { getCurrentUserOrgIds } from '@/services/organizationService';

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
