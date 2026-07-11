import type { OrderItemWithListing } from '@/services/ordersService';

export interface ItemProfitability {
  productSku: string | null;
  vendaBruta: number;
  repasse: number;
  repasseFeeKnown: boolean;
  custoUnit: number | null;
  custoTotal: number | null;
  lucroBruto: number | null;
  lucroPct: number | null;
}

export function computeItemProfitability(item: OrderItemWithListing): ItemProfitability {
  const productSku = item.product_listings?.products?.sku ?? null;
  const custoUnit = item.product_listings?.products?.unit_cost ?? null;
  const vendaBruta = (item.unit_price ?? 0) * item.quantity;
  const repasseFeeKnown = item.sale_fee !== null;
  const repasse = vendaBruta - (item.sale_fee ?? 0);
  const custoTotal = custoUnit !== null ? custoUnit * item.quantity : null;
  const lucroBruto = custoTotal !== null ? repasse - custoTotal : null;
  const lucroPct =
    custoTotal !== null && custoTotal > 0 && lucroBruto !== null ? (lucroBruto / custoTotal) * 100 : null;

  return { productSku, vendaBruta, repasse, repasseFeeKnown, custoUnit, custoTotal, lucroBruto, lucroPct };
}
