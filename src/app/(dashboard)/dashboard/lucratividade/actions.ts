'use server';

import { revalidatePath } from 'next/cache';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { createClient } from '@/lib/supabase/server';
import { syncAllOrders } from '@/services/sync/ordersSync';
import { syncAllConnectionProfiles } from '@/services/sync/connectionProfileSync';
import { getOrders, getOrdersLastSyncedAt, type OrderWithRelations } from '@/services/ordersService';
import { getCurrentUserOrganizations } from '@/services/organizationService';
import { saveProductCost } from '@/services/productCostsService';

export interface ProfitabilityData {
  orders: OrderWithRelations[];
  lastSuccessAt: string | null;
}

export async function getProfitabilityData(): Promise<ProfitabilityData> {
  const [orders, lastSuccessAt] = await Promise.all([getOrders(), getOrdersLastSyncedAt()]);
  return { orders, lastSuccessAt };
}

export async function refreshProfitability(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await syncAllOrders(supabase);
    await syncAllConnectionProfiles(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/lucratividade');
  return {};
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
