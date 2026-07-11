'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { syncAllListings } from '@/services/sync/listingsSync';
import { syncAllConnectionProfiles } from '@/services/sync/connectionProfileSync';
import { getOrders, getOrdersLastSyncedAt, type OrderWithRelations } from '@/services/ordersService';

export interface OrdersData {
  orders: OrderWithRelations[];
  lastSuccessAt: string | null;
}

export async function getOrdersData(): Promise<OrdersData> {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);
  return { orders, lastSuccessAt };
}

export async function refreshOrders(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    // listings antes de orders: orders resolve product_listing_id (foto do
    // produto) via lookup pontual em product_listings no momento do sync.
    await syncAllListings(supabase);
    await syncAllOrders(supabase);
    await syncAllConnectionProfiles(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/pedidos');
  return {};
}

export async function toggleOrderItemConferido(
  orderItemId: string,
  conferido: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('order_items').update({ conferido }).eq('id', orderItemId);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/pedidos');
  return {};
}
