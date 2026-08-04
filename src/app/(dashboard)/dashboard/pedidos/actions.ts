'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { syncAllListings } from '@/services/sync/listingsSync';
import { syncAllConnectionProfiles } from '@/services/sync/connectionProfileSync';
import { isSyncedSince } from '@/lib/sync/freshness';
import { getMarketplaceConnections } from '@/services/connectionsService';
import { getOrders, getOrdersLastSyncedAt, type OrderWithRelations } from '@/services/ordersService';

export interface OrdersData {
  orders: OrderWithRelations[];
  lastSuccessAt: string | null;
}

export async function getOrdersData(): Promise<OrdersData> {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);
  return { orders, lastSuccessAt };
}

// A sincronização roda em background (after()) em vez de bloquear a
// resposta: com muitos anúncios/pedidos, sincronizar tudo antes de responder
// passava do tempo máximo da function no Vercel e o gateway devolvia 504.
// O botão (RefreshButton) faz polling em sync_state via checkOrdersRefreshDone
// até a rodada iniciada em `startedAt` terminar.
export async function refreshOrders(): Promise<{ error?: string; startedAt?: string }> {
  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  after(async () => {
    try {
      // listings antes de orders: orders resolve product_listing_id (foto do
      // produto) via lookup pontual em product_listings no momento do sync.
      await syncAllListings(supabase);
      await syncAllOrders(supabase);
      await syncAllConnectionProfiles(supabase);
    } catch (error) {
      console.error('[refreshOrders] sincronização em background falhou', error);
    }
    revalidatePath('/dashboard/pedidos');
  });
  return { startedAt };
}

export async function checkOrdersRefreshDone(startedAt: string): Promise<boolean> {
  const supabase = await createClient();
  const connections = await getMarketplaceConnections();
  return isSyncedSince(supabase, connections, ['listings', 'orders', 'profile'], startedAt);
}

// Conferência é por PACOTE (padrão do app legado: um "conferido" cobre a compra
// inteira). Recebe todos os order_items do grupo e marca de uma vez — para a
// compra de item único é só um id.
export async function toggleOrderItemConferido(
  orderItemIds: string[],
  conferido: boolean
): Promise<{ error?: string }> {
  if (orderItemIds.length === 0) return {};
  const supabase = await createClient();
  const { error } = await supabase.from('order_items').update({ conferido }).in('id', orderItemIds);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/pedidos');
  return {};
}
