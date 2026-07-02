'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncAllOrders } from '@/services/sync/ordersSync';

export async function refreshOrders(): Promise<void> {
  const supabase = await createClient();
  await syncAllOrders(supabase);
  revalidatePath('/dashboard/frete');
}
