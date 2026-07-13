import type { OrderItemWithListing, OrderWithRelations } from '@/services/ordersService';

export interface ItemProfitability {
  productSku: string | null;
  vendaBruta: number;
  repasse: number;
  repasseFeeKnown: boolean;
  repasseIsPrecise: boolean;
  freightCost: number;
  freightCostKnown: boolean;
  custoUnit: number | null;
  custoTotal: number | null;
  lucroBruto: number | null;
  lucroPct: number | null;
}

// order.freight_cost_seller é um valor por PEDIDO (não por item) — ratear
// proporcionalmente à venda bruta de cada item dentro do pedido é a única
// forma de refletir isso na margem por item sem uma fonte de custo de frete
// por item na API do ML.
function freightShareForItem(item: OrderItemWithListing, order: OrderWithRelations, vendaBruta: number): number {
  if (order.freight_cost_seller === null) return 0;
  const orderItemsTotal = order.order_items.reduce(
    (sum, orderItem) => sum + (orderItem.unit_price ?? 0) * orderItem.quantity,
    0
  );
  if (orderItemsTotal <= 0) return 0;
  return (order.freight_cost_seller * vendaBruta) / orderItemsTotal;
}

export function computeItemProfitability(item: OrderItemWithListing, order: OrderWithRelations): ItemProfitability {
  const productSku = item.product_listings?.products?.sku ?? null;
  const custoUnit = item.product_listings?.products?.unit_cost ?? null;
  const vendaBruta = (item.unit_price ?? 0) * item.quantity;
  const freightCost = freightShareForItem(item, order, vendaBruta);

  // Repasse preciso (via transação de pagamento real na API do Mercado Pago,
  // calculado sob demanda por getPreciseProfitability) tem prioridade sobre o
  // cálculo simples (venda bruta - sale_fee - frete rateado) quando já foi
  // calculado para este item — já vem líquido de tudo, então sale_fee/frete
  // deixam de ser a fonte de incerteza.
  const repasseIsPrecise = item.net_received_precise !== null;
  const repasseFeeKnown = repasseIsPrecise || item.sale_fee !== null;
  const freightCostKnown = repasseIsPrecise || order.freight_cost_seller !== null;
  const repasse = repasseIsPrecise ? item.net_received_precise! : vendaBruta - (item.sale_fee ?? 0) - freightCost;

  const custoTotal = custoUnit !== null ? custoUnit * item.quantity : null;
  const lucroBruto = custoTotal !== null ? repasse - custoTotal : null;
  const lucroPct =
    custoTotal !== null && custoTotal > 0 && lucroBruto !== null ? (lucroBruto / custoTotal) * 100 : null;

  return {
    productSku,
    vendaBruta,
    repasse,
    repasseFeeKnown,
    repasseIsPrecise,
    freightCost,
    freightCostKnown,
    custoUnit,
    custoTotal,
    lucroBruto,
    lucroPct,
  };
}
