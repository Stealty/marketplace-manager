import { createClient } from '@/lib/supabase/server';
import type { MarketplaceType, Order, OrderItem } from '@/types/database';
import { syncOrders } from '@/services/sync/ordersSync';
import { syncConnectionProfile } from '@/services/sync/connectionProfileSync';
import { ensureFresh, getLastSuccessAt } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface OrderItemWithListing extends OrderItem {
  product_listings: {
    external_id: string;
    image_url: string | null;
    products: { sku: string; title: string; unit_cost: number | null } | null;
  } | null;
}

export interface OrderWithRelations extends Order {
  marketplace_connections: {
    label: string;
    marketplace: MarketplaceType;
    seller_nickname: string | null;
  } | null;
  order_items: OrderItemWithListing[];
}

export async function getOrders(): Promise<OrderWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  await ensureFresh(supabase, connections ?? [], 'orders', syncOrders);
  // Independente do sync de pedidos: garante o nickname mesmo para conexões
  // sem nenhum pedido ainda (ver connectionProfileSync.ts).
  await ensureFresh(supabase, connections ?? [], 'profile', syncConnectionProfile);

  const { data, error } = await supabase
    .from('orders')
    .select(
      '*, marketplace_connections(label, marketplace, seller_nickname), ' +
        'order_items(*, product_listings(external_id, image_url, products(sku, title, unit_cost)))'
    )
    .order('ordered_at', { ascending: false, nullsFirst: false })
    .returns<OrderWithRelations[]>();

  if (error) throw error;

  return data;
}

export async function getOrdersLastSyncedAt(): Promise<string | null> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);

  return getLastSuccessAt(supabase, connections ?? [], 'orders');
}
