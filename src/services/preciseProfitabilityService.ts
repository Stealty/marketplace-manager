import type { SupabaseClient } from '@supabase/supabase-js';
import { getValidAccessToken, fetchShipmentCosts } from '@/lib/mercadolivre/client';
import { fetchPaymentDetail, isSettledPayment, paymentNetValue, type PaymentNetResult } from '@/lib/mercadopago';
import { mapWithConcurrency } from '@/lib/concurrency';
import type { MarketplaceConnection } from '@/types/database';

// Chamadas em paralelo, limitadas — este cálculo roda sob demanda (não no
// sync automático) para um lote pequeno de pedidos já filtrados na tela de
// Lucratividade, mas ainda assim compete com o mesmo rate limit do ML/Mercado
// Pago.
const PAYMENT_FETCH_CONCURRENCY = 5;
const SHIPMENT_COST_FETCH_CONCURRENCY = 5;

interface PreciseOrderRow {
  id: string;
  marketplace_connection_id: string;
  pack_id: string | null;
  shipment_id: number | null;
  payments: { id: number; status: string }[] | null;
  order_items: { id: string; unit_price: number | null; quantity: number }[];
}

export interface PreciseProfitabilityResult {
  updated: number;
  skipped: number;
}

// Réplica de /ml/profit-orders do app legado (ml-oauth, server.js): repasse
// líquido de cada item = (valor líquido real do(s) pagamento(s) do grupo, via
// Mercado Pago + frete pago pelo comprador) ratedo proporcionalmente ao valor
// bruto de cada item. Pedidos que compartilham pack_id são agrupados porque
// no ML um mesmo pagamento/frete pode cobrir vários "pedidos" do mesmo
// carrinho. Persiste o resultado em order_items — uma vez calculado, a tela
// não recalcula (nem gasta chamada de API) de novo para o mesmo pedido.
export async function computePreciseProfitability(
  supabase: SupabaseClient,
  orderIds: string[]
): Promise<PreciseProfitabilityResult> {
  if (orderIds.length === 0) return { updated: 0, skipped: 0 };

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, marketplace_connection_id, pack_id, shipment_id, payments, order_items(id, unit_price, quantity)')
    .in('id', orderIds)
    .returns<PreciseOrderRow[]>();
  if (error) throw error;
  if (!orders || orders.length === 0) return { updated: 0, skipped: 0 };

  const connectionIds = Array.from(new Set(orders.map((order) => order.marketplace_connection_id)));
  const { data: connections, error: connectionsError } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('id', connectionIds)
    .returns<MarketplaceConnection[]>();
  if (connectionsError) throw connectionsError;

  const connectionById = new Map((connections ?? []).map((connection) => [connection.id, connection]));
  const accessTokenByConnectionId = new Map<string, string>();
  for (const connection of connections ?? []) {
    try {
      accessTokenByConnectionId.set(connection.id, await getValidAccessToken(supabase, connection));
    } catch {
      // Conexão expirada/sem token válido — pedidos dela ficam sem repasse
      // preciso nesta rodada; o cálculo simples (sale_fee) continua valendo.
    }
  }

  // Busca pagamentos e custos de frete uma única vez para todos os pedidos do
  // lote (não por grupo), dedupados por id — evita repetir a mesma consulta
  // quando vários itens/pedidos compartilham o mesmo pagamento ou envio.
  const paymentIdsByConnection = new Map<string, Set<number>>();
  const shipmentIdsByConnection = new Map<string, Set<number>>();
  for (const order of orders) {
    const settledIds = (order.payments ?? []).filter(isSettledPayment).map((payment) => payment.id);
    if (settledIds.length > 0) {
      const set = paymentIdsByConnection.get(order.marketplace_connection_id) ?? new Set<number>();
      settledIds.forEach((id) => set.add(id));
      paymentIdsByConnection.set(order.marketplace_connection_id, set);
    }
    if (order.shipment_id) {
      const set = shipmentIdsByConnection.get(order.marketplace_connection_id) ?? new Set<number>();
      set.add(order.shipment_id);
      shipmentIdsByConnection.set(order.marketplace_connection_id, set);
    }
  }

  const paymentById = new Map<number, PaymentNetResult>();
  for (const [connectionId, paymentIds] of paymentIdsByConnection.entries()) {
    const accessToken = accessTokenByConnectionId.get(connectionId);
    if (!accessToken) continue;
    await mapWithConcurrency(Array.from(paymentIds), PAYMENT_FETCH_CONCURRENCY, async (paymentId) => {
      const detail = await fetchPaymentDetail(accessToken, paymentId);
      paymentById.set(paymentId, paymentNetValue(detail));
    });
  }

  const buyerShippingByShipmentId = new Map<number, number>();
  for (const [connectionId, shipmentIds] of shipmentIdsByConnection.entries()) {
    const connection = connectionById.get(connectionId);
    if (!connection) continue;
    await mapWithConcurrency(Array.from(shipmentIds), SHIPMENT_COST_FETCH_CONCURRENCY, async (shipmentId) => {
      try {
        const costs = await fetchShipmentCosts(supabase, connection, shipmentId);
        const receiverCost = costs.receiver?.cost ?? 0;
        buyerShippingByShipmentId.set(shipmentId, receiverCost > 0 ? receiverCost : 0);
      } catch {
        buyerShippingByShipmentId.set(shipmentId, 0);
      }
    });
  }

  const groups = new Map<string, PreciseOrderRow[]>();
  for (const order of orders) {
    const key = order.pack_id ?? order.id;
    const group = groups.get(key) ?? [];
    group.push(order);
    groups.set(key, group);
  }

  let updated = 0;
  let skipped = 0;

  for (const group of groups.values()) {
    const items = group.flatMap((order) => order.order_items);

    const paymentIds = Array.from(
      new Set(group.flatMap((order) => (order.payments ?? []).filter(isSettledPayment).map((payment) => payment.id)))
    );
    const paymentParts = paymentIds.map((id) => paymentById.get(id)).filter((part): part is PaymentNetResult => Boolean(part));

    // Sem nenhum pagamento liquidado localizável para o grupo, não há base
    // para um valor preciso — deixa net_received_precise como está (o
    // cálculo simples de repasse continua valendo para esses itens).
    if (paymentParts.length === 0) {
      skipped += items.length;
      continue;
    }

    const paymentNet = paymentParts.reduce((sum, part) => sum + part.value, 0);
    const shipmentIds = Array.from(
      new Set(group.map((order) => order.shipment_id).filter((id): id is number => id !== null))
    );
    const buyerShippingTotal = shipmentIds.reduce((sum, id) => sum + (buyerShippingByShipmentId.get(id) ?? 0), 0);
    const groupNet = paymentNet + buyerShippingTotal;
    const estimated = paymentParts.some((part) => part.estimated);
    const source = Array.from(new Set(paymentParts.map((part) => part.source))).join('+');

    const groupGross = items.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity, 0);

    for (const item of items) {
      const gross = (item.unit_price ?? 0) * item.quantity;
      const allocation = groupGross > 0 ? gross / groupGross : items.length > 0 ? 1 / items.length : 0;
      const net = groupNet * allocation;

      const { error: updateError } = await supabase
        .from('order_items')
        .update({
          net_received_precise: Number(net.toFixed(2)),
          net_received_source: source,
          net_received_estimated: estimated,
        })
        .eq('id', item.id);

      if (updateError) {
        skipped += 1;
      } else {
        updated += 1;
      }
    }
  }

  return { updated, skipped };
}
