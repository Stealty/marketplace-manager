'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { syncAllReputation } from '@/services/sync/reputationSync';

export async function refreshReputation(): Promise<void> {
  const supabase = await createClient();
  await syncAllReputation(supabase);
  revalidatePath('/dashboard/reputacao');
}
