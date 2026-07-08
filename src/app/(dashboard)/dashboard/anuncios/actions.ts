'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncAllListings } from '@/services/sync/listingsSync';

export async function refreshListings(): Promise<void> {
  const supabase = await createClient();
  await syncAllListings(supabase);
  revalidatePath('/dashboard/anuncios');
}
