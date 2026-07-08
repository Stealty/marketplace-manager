import type { SupabaseClient } from '@supabase/supabase-js';
import {
  updateItemPrice,
  updateItemStatus,
  updateItemStock,
  type MercadoLivreItemStatus,
} from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

interface ListingWriteResult {
  price: number | null;
  status: string;
  stock: number | null;
}

// O ML é a fonte da verdade: persistimos os campos vindos da resposta do PUT,
// nunca o valor que o usuário digitou — cobre efeitos colaterais como
// available_quantity=0 pausando o anúncio automaticamente.
async function persistListingFields(
  supabase: SupabaseClient,
  connectionId: string,
  externalId: string,
  fields: ListingWriteResult
): Promise<void> {
  const { error } = await supabase
    .from('product_listings')
    .update({ price: fields.price, status: fields.status, stock: fields.stock })
    .eq('marketplace_connection_id', connectionId)
    .eq('external_id', externalId);

  if (error) throw error;
}

export async function pauseOrReactivateListing(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  externalId: string,
  status: MercadoLivreItemStatus
): Promise<ListingWriteResult> {
  const item = await updateItemStatus(supabase, connection, externalId, status);
  const result: ListingWriteResult = {
    price: item.price,
    status: item.status,
    stock: item.available_quantity ?? null,
  };
  await persistListingFields(supabase, connection.id, externalId, result);
  return result;
}

export async function updateListingPriceRemote(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  externalId: string,
  price: number
): Promise<ListingWriteResult> {
  const item = await updateItemPrice(supabase, connection, externalId, price);
  const result: ListingWriteResult = {
    price: item.price,
    status: item.status,
    stock: item.available_quantity ?? null,
  };
  await persistListingFields(supabase, connection.id, externalId, result);
  return result;
}

export async function updateListingStockRemote(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  externalId: string,
  stock: number
): Promise<ListingWriteResult> {
  const item = await updateItemStock(supabase, connection, externalId, stock);
  const result: ListingWriteResult = {
    price: item.price,
    status: item.status,
    stock: item.available_quantity ?? null,
  };
  await persistListingFields(supabase, connection.id, externalId, result);
  return result;
}
