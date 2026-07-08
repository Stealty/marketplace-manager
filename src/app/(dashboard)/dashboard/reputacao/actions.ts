'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllReputation } from '@/services/sync/reputationSync';

export async function refreshReputation(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await syncAllReputation(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/reputacao');
  return {};
}
