'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllOrders } from '@/services/sync/ordersSync';

export async function refreshOrders(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await syncAllOrders(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/frete');
  return {};
}
