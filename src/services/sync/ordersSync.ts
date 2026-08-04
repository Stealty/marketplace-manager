import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchOrders,
  fetchShipment,
  fetchShipmentCosts,
  fetchItemsDetails,
  resolveOrderItemImage,
  type MercadoLivreItem,
  type MercadoLivreOrder,
  type MercadoLivreShipment,
  type MercadoLivreShipmentCosts,
} from '@/lib/mercadolivre/client';
import { mapWithConcurrency, chunk } from '@/lib/concurrency';
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

// Busca os detalhes (multiget /items) de todo item vendido no lote de pedidos,
// chaveado por item.id. Usado para resolver a foto de cada item — inclusive a
// da variação vendida — direto no order_item, sem depender de o anúncio ainda
// existir em product_listings (anúncios encerrados/pausados/apagados não
// aparecem no /users/{seller}/items/search do listingsSync, então antes esses
// itens ficavam sem foto). Espelha o fetchItemsBulk do app legado (server.js).
async function fetchItemsByExternalId(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  orders: MercadoLivreOrder[]
): Promise<Map<string, MercadoLivreItem>> {
  const externalIds = Array.from(
    new Set(orders.flatMap((o) => o.order_items.map((item) => item.item.id)))
  );
  if (externalIds.length === 0) return new Map();

  const items = await fetchItemsDetails(supabase, connection, externalIds);
  return new Map(items.map((item) => [item.id, item]));
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

// Teto de linhas por upsert/select/delete em lote — protege contra estourar
// limite de payload/parâmetros do Postgres em contas com volume grande de
// pedidos.
const UPSERT_CHUNK_SIZE = 500;

// Grava todo o lote de pedidos em poucas chamadas (antes: upsert do pedido +
// select + delete condicional + upsert dos itens, um pedido por vez em loop
// sequencial — inviável para contas com muitos pedidos, chegava a travar a
// function do Vercel).
async function upsertOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  orders: MercadoLivreOrder[],
  shipments: Map<number, MercadoLivreShipment>,
  shipmentCosts: Map<number, MercadoLivreShipmentCosts>,
  listingIdByExternalId: Map<string, string>,
  itemByExternalId: Map<string, MercadoLivreItem>
) {
  if (orders.length === 0) return;

  const orderRows = orders.map((mlOrder) => {
    const shipment = mlOrder.shipping?.id ? shipments.get(mlOrder.shipping.id) : undefined;
    const costs = mlOrder.shipping?.id ? shipmentCosts.get(mlOrder.shipping.id) : undefined;
    // `cost`: quanto o comprador paga pelo frete (0 = frete grátis pro
    // comprador) — segue sendo a base do indicador is_free_shipping.
    const freightValue = shipment?.shipping_option?.cost ?? null;
    const freightCostSeller = extractSellerFreightCost(costs, connection.external_account_id);
    return {
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
    };
  });

  const orderIdByExternalId = new Map<string, string>();
  for (const rows of chunk(orderRows, UPSERT_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('orders')
      .upsert(rows, { onConflict: 'marketplace_connection_id,external_order_id' })
      .select('id, external_order_id');
    if (error) throw error;
    for (const row of data ?? []) orderIdByExternalId.set(row.external_order_id as string, row.id as string);
  }

  const allOrderIds = Array.from(orderIdByExternalId.values());

  // Remove apenas os itens que saíram do pedido no ML — itens que continuam
  // são upsertados por (order_id, sku) para preservar o campo `conferido`
  // (delete+insert resetava a conferência a cada ressincronização).
  const existingItemsByOrderId = new Map<string, { id: string; sku: string | null }[]>();
  for (const idBatch of chunk(allOrderIds, UPSERT_CHUNK_SIZE)) {
    const { data: existingItems, error } = await supabase
      .from('order_items')
      .select('id, order_id, sku')
      .in('order_id', idBatch);
    if (error) throw error;
    for (const item of existingItems ?? []) {
      const orderId = item.order_id as string;
      const list = existingItemsByOrderId.get(orderId) ?? [];
      list.push({ id: item.id as string, sku: item.sku as string | null });
      existingItemsByOrderId.set(orderId, list);
    }
  }

  const staleItemIds: string[] = [];
  for (const mlOrder of orders) {
    const orderId = orderIdByExternalId.get(String(mlOrder.id));
    if (!orderId) continue;
    const currentSkus = mlOrder.order_items.map((item) => extractOrderItemSku(item.item));
    for (const existing of existingItemsByOrderId.get(orderId) ?? []) {
      if (existing.sku !== null && !currentSkus.includes(existing.sku)) staleItemIds.push(existing.id);
    }
  }
  for (const idBatch of chunk(staleItemIds, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from('order_items').delete().in('id', idBatch);
    if (error) throw error;
  }

  const itemRows = orders.flatMap((mlOrder) => {
    const orderId = orderIdByExternalId.get(String(mlOrder.id));
    if (!orderId) return [];
    return mlOrder.order_items.map((item) => ({
      org_id: connection.org_id,
      order_id: orderId,
      product_listing_id: listingIdByExternalId.get(item.item.id) ?? null,
      sku: extractOrderItemSku(item.item),
      title: item.item.title,
      quantity: item.quantity,
      unit_price: item.unit_price,
      image_url: resolveOrderItemImage(itemByExternalId.get(item.item.id), item.item.variation_id),
      sale_fee: item.sale_fee ?? null,
    }));
  });

  for (const rows of chunk(itemRows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase.from('order_items').upsert(rows, { onConflict: 'order_id,sku' });
    if (error) throw error;
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
    const itemByExternalId = await fetchItemsByExternalId(supabase, connection, orders);
    await upsertOrders(
      supabase,
      connection,
      orders,
      shipments,
      shipmentCosts,
      listingIdByExternalId,
      itemByExternalId
    );

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
