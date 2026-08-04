'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { createClient } from '@/lib/supabase/server';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { syncAllListings } from '@/services/sync/listingsSync';
import { syncAllConnectionProfiles } from '@/services/sync/connectionProfileSync';
import { isSyncedSince } from '@/lib/sync/freshness';
import { getMarketplaceConnections } from '@/services/connectionsService';
import { getOrders, getOrdersLastSyncedAt, type OrderWithRelations } from '@/services/ordersService';
import { getCurrentUserOrganizations } from '@/services/organizationService';
import { saveProductCost } from '@/services/productCostsService';
import { computePreciseProfitability, type PreciseProfitabilityResult } from '@/services/preciseProfitabilityService';

// Teto de segurança contra o botão "Calcular repasse preciso" sendo acionado
// para um período grande demais — cada pedido pode gerar 1 chamada extra ao
// Mercado Pago/ML. A tela já restringe o período selecionável (nunca "todo o
// período"), este limite é a segunda linha de defesa.
const MAX_PRECISE_ORDERS_PER_CALL = 200;

export interface ProfitabilityData {
  orders: OrderWithRelations[];
  lastSuccessAt: string | null;
}

export async function getProfitabilityData(): Promise<ProfitabilityData> {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);
  return { orders, lastSuccessAt };
}

// A sincronização roda em background (after()) em vez de bloquear a
// resposta — ver o mesmo comentário em pedidos/actions.ts.
export async function refreshProfitability(): Promise<{ error?: string; startedAt?: string }> {
  const supabase = await createClient();
  const startedAt = new Date().toISOString();
  after(async () => {
    try {
      // listings antes de orders: orders resolve product_listing_id (usado
      // para achar o custo do produto em products.unit_cost) via lookup
      // pontual em product_listings no momento do sync.
      await syncAllListings(supabase);
      await syncAllOrders(supabase);
      await syncAllConnectionProfiles(supabase);
    } catch (error) {
      console.error('[refreshProfitability] sincronização em background falhou', error);
    }
    revalidatePath('/dashboard/lucratividade');
  });
  return { startedAt };
}

export async function checkProfitabilityRefreshDone(startedAt: string): Promise<boolean> {
  const supabase = await createClient();
  const connections = await getMarketplaceConnections();
  return isSyncedSince(supabase, connections, ['listings', 'orders', 'profile'], startedAt);
}

export async function getPreciseProfitability(
  orderIds: string[]
): Promise<{ error?: string } & Partial<PreciseProfitabilityResult>> {
  if (orderIds.length === 0) return { updated: 0, skipped: 0 };
  if (orderIds.length > MAX_PRECISE_ORDERS_PER_CALL) {
    return {
      error: `Selecione um período com no máximo ${MAX_PRECISE_ORDERS_PER_CALL} pedidos para calcular o repasse preciso (hoje: ${orderIds.length}).`,
    };
  }

  const supabase = await createClient();
  try {
    const result = await computePreciseProfitability(supabase, orderIds);
    revalidatePath('/dashboard/lucratividade');
    return result;
  } catch (error) {
    return toFriendlySyncError(error);
  }
}

export async function saveCost(sku: string, unitCost: number, title?: string): Promise<{ error?: string }> {
  const orgs = await getCurrentUserOrganizations();
  if (orgs.length !== 1) {
    return { error: 'Não foi possível identificar a organização do usuário.' };
  }

  const result = await saveProductCost({ orgId: orgs[0].id, sku, title, unitCost });
  if (result.error) return result;

  revalidatePath('/dashboard/lucratividade');
  return {};
}
