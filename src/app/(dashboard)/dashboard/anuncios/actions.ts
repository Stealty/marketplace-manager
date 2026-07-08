'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import { syncAllListings } from '@/services/sync/listingsSync';
import {
  pauseOrReactivateListing,
  updateListingPriceRemote,
  updateListingStockRemote,
} from '@/services/sync/listingsActions';
import type { MarketplaceConnection } from '@/types/database';
import type { MercadoLivreItemStatus } from '@/lib/mercadolivre/client';

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

async function getListingConnection(listingId: string) {
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from('product_listings')
    .select('external_id, marketplace_connections(*)')
    .eq('id', listingId)
    .returns<Array<{ external_id: string; marketplace_connections: MarketplaceConnection | null }>>()
    .maybeSingle();

  if (error) return { error: error.message } as const;
  if (!listing?.marketplace_connections) {
    return { error: 'Anúncio ou conexão do marketplace não encontrado.' } as const;
  }

  return { supabase, externalId: listing.external_id, connection: listing.marketplace_connections } as const;
}

export async function toggleListingStatus(
  listingId: string,
  newStatus: MercadoLivreItemStatus
): Promise<{ error?: string }> {
  const found = await getListingConnection(listingId);
  if ('error' in found) return { error: found.error };

  try {
    await pauseOrReactivateListing(found.supabase, found.connection, found.externalId, newStatus);
  } catch (error) {
    return toFriendlySyncError(error);
  }

  revalidatePath('/dashboard/anuncios');
  return {};
}

export async function updateListingPrice(listingId: string, newPrice: number): Promise<{ error?: string }> {
  if (!Number.isFinite(newPrice) || newPrice <= 0) return { error: 'Preço inválido.' };

  const found = await getListingConnection(listingId);
  if ('error' in found) return { error: found.error };

  try {
    await updateListingPriceRemote(found.supabase, found.connection, found.externalId, newPrice);
  } catch (error) {
    return toFriendlySyncError(error);
  }

  revalidatePath('/dashboard/anuncios');
  return {};
}

export async function updateListingStock(listingId: string, newStock: number): Promise<{ error?: string }> {
  if (!Number.isInteger(newStock) || newStock < 0) return { error: 'Estoque inválido.' };

  const found = await getListingConnection(listingId);
  if ('error' in found) return { error: found.error };

  try {
    await updateListingStockRemote(found.supabase, found.connection, found.externalId, newStock);
  } catch (error) {
    return toFriendlySyncError(error);
  }

  revalidatePath('/dashboard/anuncios');
  return {};
}
