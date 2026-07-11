'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { syncAllConnectionProfiles } from '@/services/sync/connectionProfileSync';
import { getOrders, type OrderWithRelations } from '@/services/ordersService';

export async function getOrdersData(): Promise<OrderWithRelations[]> {
  return getOrders();
}

export async function refreshOrders(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
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
