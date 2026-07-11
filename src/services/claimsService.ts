import { createClient } from '@/lib/supabase/server';
import type { Claim, ClaimMessage, MarketplaceType } from '@/types/database';
import { syncClaims } from '@/services/sync/claimsSync';
import { syncOrders } from '@/services/sync/ordersSync';
import { ensureFresh, getLastSuccessAt } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface ClaimWithRelations extends Claim {
  orders: { external_order_id: string } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
  claim_messages: ClaimMessage[];
}

export async function getClaims(): Promise<ClaimWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  // Antes de claims: syncClaims resolve claims.order_id via lookup pontual em
  // orders (busca por external_order_id) — se orders nunca rodou para essa
  // conexão, o vínculo fica null até a próxima sincronização de claims depois
  // que orders existir (ver ordersService.ts para o mesmo padrão).
  await ensureFresh(supabase, connections ?? [], 'orders', syncOrders);
  await ensureFresh(supabase, connections ?? [], 'claims', syncClaims);

  const { data, error } = await supabase
    .from('claims')
    .select(
      '*, orders(external_order_id), marketplace_connections(label, marketplace), claim_messages(*)'
    )
    .order('last_updated', { ascending: false, nullsFirst: false })
    .returns<ClaimWithRelations[]>();

  if (error) throw error;

  return data;
}

export async function getClaimsLastSyncedAt(): Promise<string | null> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);

  return getLastSuccessAt(supabase, connections ?? [], 'claims');
}
