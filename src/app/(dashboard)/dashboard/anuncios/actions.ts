'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllListings } from '@/services/sync/listingsSync';

export async function refreshListings(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await syncAllListings(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/anuncios');
  return {};
}
