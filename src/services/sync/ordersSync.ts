import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchOrders,
  fetchShipment,
  type MercadoLivreOrder,
  type MercadoLivreShipment,
} from '@/lib/mercadolivre/client';
import { mapWithConcurrency } from '@/lib/concurrency';
import type { MarketplaceConnection } from '@/types/database';

// Chamadas de frete em paralelo, limitadas para não competir demais com o
// rate limit de 1500 req/min do ML nem com o refresh de token concorrente.
const SHIPMENT_FETCH_CONCURRENCY = 8;

export async function syncAllOrders(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncOrders(supabase, connection);
  }
}

async function upsertSyncState(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  status: 'ok' | 'error' | 'partial',
  error?: string
) {
  await supabase.from('sync_state').upsert(
    {
      org_id: connection.org_id,
      marketplace_connection_id: connection.id,
      resource: 'orders',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_orders',
    status: status === 'error' ? 'failed' : 'done',
    payload: error ? { error } : {},
  });
}

async function fetchShipmentsForOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  orders: MercadoLivreOrder[]
): Promise<{ shipments: Map<number, MercadoLivreShipment>; failedShipmentIds: number[] }> {
  const shipmentIds = Array.from(
    new Set(orders.map((o) => o.shipping?.id).filter((id): id is number => id !== undefined))
  );

  const shipments = new Map<number, MercadoLivreShipment>();
  const failedShipmentIds: number[] = [];
  await mapWithConcurrency(shipmentIds, SHIPMENT_FETCH_CONCURRENCY, async (shipmentId) => {
    try {
      shipments.set(shipmentId, await fetchShipment(supabase, connection, shipmentId));
    } catch {
      // Erro pontual do ML (rate limit esgotado, 5xx, envio inválido) — o
      // pedido correspondente fica sem frete calculado nesta rodada, mas o
      // sync continua; a falha é reportada no sync_state em vez de mascarada
      // como sucesso total, para não confundir "sem frete aplicável" com
      // "falha ao consultar frete".
      failedShipmentIds.push(shipmentId);
    }
  });
  return { shipments, failedShipmentIds };
}

// Busca em lote o id do product_listing correspondente a cada item vendido
// (chaveado pelo id interno do ML, hoje também salvo em order_items.sku) —
// evita uma query por item ao popular order_items.product_listing_id.
async function fetchListingIdsByExternalId(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  orders: MercadoLivreOrder[]
): Promise<Map<string, string>> {
  const externalIds = Array.from(
    new Set(orders.flatMap((o) => o.order_items.map((item) => item.item.id)))
  );
  if (externalIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('product_listings')
    .select('id, external_id')
    .eq('marketplace_connection_id', connection.id)
    .in('external_id', externalIds);

  if (error) throw error;

  return new Map((data ?? []).map((listing) => [listing.external_id as string, listing.id as string]));
}

async function upsertOrder(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  mlOrder: MercadoLivreOrder,
  shipments: Map<number, MercadoLivreShipment>,
  listingIdByExternalId: Map<string, string>
) {
  const shipment = mlOrder.shipping?.id ? shipments.get(mlOrder.shipping.id) : undefined;
  const freightValue = shipment?.shipping_option?.cost ?? null;

  const { data: order, error } = await supabase
    .from('orders')
    .upsert(
      {
        org_id: connection.org_id,
        marketplace_connection_id: connection.id,
        external_order_id: String(mlOrder.id),
        status: mlOrder.status,
        order_value: mlOrder.total_amount,
        freight_value: freightValue,
        is_free_shipping: freightValue === 0,
        ordered_at: mlOrder.date_created,
        buyer_nickname: mlOrder.buyer?.nickname ?? null,
      },
      { onConflict: 'marketplace_connection_id,external_order_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  await supabase.from('order_items').delete().eq('order_id', order.id);

  if (mlOrder.order_items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      mlOrder.order_items.map((item) => ({
        org_id: connection.org_id,
        order_id: order.id,
        product_listing_id: listingIdByExternalId.get(item.item.id) ?? null,
        sku: item.item.id,
        title: item.item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );
    if (itemsError) throw itemsError;
  }
}

export async function syncOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const orders = await fetchOrders(supabase, connection);
    const { shipments, failedShipmentIds } = await fetchShipmentsForOrders(supabase, connection, orders);
    const listingIdByExternalId = await fetchListingIdsByExternalId(supabase, connection, orders);
    for (const mlOrder of orders) {
      await upsertOrder(supabase, connection, mlOrder, shipments, listingIdByExternalId);
    }

    if (failedShipmentIds.length > 0) {
      await upsertSyncState(
        supabase,
        connection,
        'partial',
        `Falha ao buscar frete de ${failedShipmentIds.length} envio(s): ${failedShipmentIds.join(', ')}`
      );
    } else {
      await upsertSyncState(supabase, connection, 'ok');
    }
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
