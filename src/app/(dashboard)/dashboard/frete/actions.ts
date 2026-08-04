'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { isSyncedSince } from '@/lib/sync/freshness';
import { getMarketplaceConnections } from '@/services/connectionsService';

// A sincronização roda em background (after()) em vez de bloquear a
// resposta — ver o mesmo comentário em pedidos/actions.ts.
export async function refreshOrders(): Promise<{ error?: string; startedAt?: string }> {
  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  after(async () => {
    try {
      await syncAllOrders(supabase);
    } catch (error) {
      console.error('[refreshOrders] sincronização em background falhou', error);
    }
    revalidatePath('/dashboard/frete');
  });
  return { startedAt };
}

export async function checkOrdersRefreshDone(startedAt: string): Promise<boolean> {
  const supabase = await createClient();
  const connections = await getMarketplaceConnections();
  return isSyncedSince(supabase, connections, ['orders'], startedAt);
}
