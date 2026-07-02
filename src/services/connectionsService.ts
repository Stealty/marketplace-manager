import { createClient } from '@/lib/supabase/server';
import type { ErpConnection, MarketplaceConnection } from '@/types/database';

export async function getMarketplaceConnections(): Promise<MarketplaceConnection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .order('connected_at', { ascending: false });

  if (error) throw error;

  return data;
}

export async function getErpConnections(): Promise<ErpConnection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('erp_connections')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data;
}
