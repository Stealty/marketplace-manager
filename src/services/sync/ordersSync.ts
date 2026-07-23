import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchOrders,
  fetchShipment,
  fetchShipmentCosts,
  type MercadoLivreOrder,
  type MercadoLivreShipment,
  type MercadoLivreShipmentCosts,
} from '@/lib/mercadolivre/client';
import { mapWithConcurrency } from '@/lib/concurrency';
import { upsertSyncState } from '@/lib/sync/freshness';
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

async function fetchShipmentsForOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  orders: MercadoLivreOrder[]
): Promise<{
  shipments: Map<number, MercadoLivreShipment>;
  shipmentCosts: Map<number, MercadoLivreShipmentCosts>;
  failedShipmentIds: number[];
  failedShipmentCostIds: number[];
}> {
  const shipmentIds = Array.from(
    new Set(orders.map((o) => o.shipping?.id).filter((id): id is number => id !== undefined))
  );

  const shipments = new Map<number, MercadoLivreShipment>();
  const shipmentCosts = new Map<number, MercadoLivreShipmentCosts>();
  const failedShipmentIds: number[] = [];
  const failedShipmentCostIds: number[] = [];
  await mapWithConcurrency(shipmentIds, SHIPMENT_FETCH_CONCURRENCY, async (shipmentId) => {
    try {
      shipments.set(shipmentId, await fetchShipment(supabase, connection, shipmentId));
    } catch {
      // Erro pontual do ML (rate limit esgotado, 5xx, envio inválido) — o
      // pedido correspondente fica sem frete calculado nesta rodada, mas o
      // sync continua; a falha é reportada no sync_state em vez de mascarada
      // como sucesso total, para não confundir "sem frete aplicável" com
      // "falha ao consultar frete". Sem o shipment base, não adianta tentar
      // /costs — o pedido já fica sem nenhum dado de frete nesta rodada.
      failedShipmentIds.push(shipmentId);
      return;
    }
    try {
      shipmentCosts.set(shipmentId, await fetchShipmentCosts(supabase, connection, shipmentId));
    } catch {
      // Falha isolada em /costs não deve derrubar freight_value/is_free_shipping
      // (que já vieram de /shipments/{id} com sucesso) — só freight_cost_seller
      // fica desconhecido (null) para este pedido nesta rodada.
      failedShipmentCostIds.push(shipmentId);
    }
  });
  return { shipments, shipmentCosts, failedShipmentIds, failedShipmentCostIds };
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

// Identifica a linha do pedido de forma única mesmo quando o anúncio tem
// variações: `item.id` é o mesmo para todas as variações de um anúncio, então
// duas variações diferentes vendidas no mesmo pedido colidiriam no
// unique(order_id, sku) e uma sobrescreveria a outra. `seller_sku` é o SKU
// que o vendedor de fato cadastrou para aquela variação — usado como valor
// exibido quando existe; o sufixo de variation_id garante unicidade mesmo sem
// seller_sku cadastrado.
function extractOrderItemSku(item: MercadoLivreOrder['order_items'][number]['item']): string {
  if (item.seller_sku) return item.seller_sku;
  if (item.variation_id) return `${item.id}-${item.variation_id}`;
  return item.id;
}

// Custo de frete absorvido pelo vendedor a partir de /shipments/{id}/costs
// (confirmado em produção pelo app legado ml-oauth): casa `senders[]` pelo
// seller_id da conexão; se não achar (remessa sem esse vendedor listado ou
// schema diferente por tipo de envio), cai no primeiro sender; sem nenhum
// sender, o custo do vendedor é 0 (resposta chegou, só não tem o que ratear).
// `undefined` (chamada falhou) é tratado à parte, como null/desconhecido.
function extractSellerFreightCost(
  costs: MercadoLivreShipmentCosts | undefined,
  sellerId: string | null
): number | null {
  if (!costs) return null;
  const senders = costs.senders ?? [];
  // Produção (server.js) casa por `user_id`; mantemos `id` como fallback caso o
  // schema da resposta varie por tipo de envio. Antes casava só por `id`, o que
  // fazia toda remessa cair no primeiro sender (custo errado em remessas
  // multi-vendedor).
  const matched = sellerId
    ? senders.find((sender) => String(sender.user_id) === sellerId || String(sender.id) === sellerId)
    : undefined;
  return matched?.cost ?? senders[0]?.cost ?? 0;
}

async function upsertOrder(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  mlOrder: MercadoLivreOrder,
  shipments: Map<number, MercadoLivreShipment>,
  shipmentCosts: Map<number, MercadoLivreShipmentCosts>,
  listingIdByExternalId: Map<string, string>
) {
  const shipment = mlOrder.shipping?.id ? shipments.get(mlOrder.shipping.id) : undefined;
  const costs = mlOrder.shipping?.id ? shipmentCosts.get(mlOrder.shipping.id) : undefined;
  // `cost`: quanto o comprador paga pelo frete (0 = frete grátis pro
  // comprador) — segue sendo a base do indicador is_free_shipping.
  const freightValue = shipment?.shipping_option?.cost ?? null;
  const freightCostSeller = extractSellerFreightCost(costs, connection.external_account_id);

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
        freight_cost_seller: freightCostSeller,
        is_free_shipping: freightValue === 0,
        ordered_at: mlOrder.date_created,
        buyer_nickname: mlOrder.buyer?.nickname ?? null,
        pack_id: mlOrder.pack_id ? String(mlOrder.pack_id) : null,
        shipment_id: mlOrder.shipping?.id ?? null,
        shipping_status: shipment?.status ?? null,
        shipping_substatus: shipment?.substatus ?? null,
        logistic_type: shipment?.logistic_type ?? null,
        date_shipped: shipment?.date_shipped ?? null,
        label_printed_at: shipment?.date_first_printed ?? null,
        payments: mlOrder.payments ?? null,
      },
      { onConflict: 'marketplace_connection_id,external_order_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  // Remove apenas os itens que saíram do pedido no ML — itens que continuam
  // são upsertados por (order_id, sku) para preservar o campo `conferido`
  // (delete+insert resetava a conferência a cada ressincronização).
  const currentSkus = mlOrder.order_items.map((item) => extractOrderItemSku(item.item));
  const { data: existingItems } = await supabase
    .from('order_items')
    .select('sku')
    .eq('order_id', order.id);
  const staleSkus = (existingItems ?? [])
    .map((item) => item.sku as string | null)
    .filter((sku): sku is string => sku !== null && !currentSkus.includes(sku));
  if (staleSkus.length > 0) {
    await supabase.from('order_items').delete().eq('order_id', order.id).in('sku', staleSkus);
  }

  if (mlOrder.order_items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').upsert(
      mlOrder.order_items.map((item) => ({
        org_id: connection.org_id,
        order_id: order.id,
        product_listing_id: listingIdByExternalId.get(item.item.id) ?? null,
        sku: extractOrderItemSku(item.item),
        title: item.item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sale_fee: item.sale_fee ?? null,
      })),
      { onConflict: 'order_id,sku' }
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
    const { shipments, shipmentCosts, failedShipmentIds, failedShipmentCostIds } = await fetchShipmentsForOrders(
      supabase,
      connection,
      orders
    );
    const listingIdByExternalId = await fetchListingIdsByExternalId(supabase, connection, orders);
    for (const mlOrder of orders) {
      await upsertOrder(supabase, connection, mlOrder, shipments, shipmentCosts, listingIdByExternalId);
    }

    const failureMessages: string[] = [];
    if (failedShipmentIds.length > 0) {
      failureMessages.push(`frete de ${failedShipmentIds.length} envio(s): ${failedShipmentIds.join(', ')}`);
    }
    if (failedShipmentCostIds.length > 0) {
      failureMessages.push(
        `custo de frete do vendedor de ${failedShipmentCostIds.length} envio(s): ${failedShipmentCostIds.join(', ')}`
      );
    }

    if (failureMessages.length > 0) {
      await upsertSyncState(
        supabase,
        connection,
        'orders',
        'sync_orders',
        'partial',
        `Falha ao buscar ${failureMessages.join('; ')}`
      );
    } else {
      await upsertSyncState(supabase, connection, 'orders', 'sync_orders', 'ok');
    }
  } catch (error) {
    await upsertSyncState(supabase, connection, 'orders', 'sync_orders', 'error', (error as Error).message);
    throw error;
  }
}
