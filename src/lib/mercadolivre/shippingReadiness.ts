import type { Order } from '@/types/database';

// Réplica do critério "Painel de Conferência" do app legado (ml-oauth,
// server.js): pedido com envio pronto para coleta, etiqueta já impressa,
// ainda não postado e fora do Mercado Envios Full. Único lugar onde esse
// critério é definido — no legado ele estava duplicado em dois endpoints
// (frete e lucratividade) e podia divergir entre eles; aqui os dois
// consumidores (filtro da tela e cálculo de repasse preciso) chamam a mesma
// função.
export function isAwaitingShipment(
  order: Pick<Order, 'shipping_status' | 'shipping_substatus' | 'logistic_type' | 'date_shipped' | 'label_printed_at'>
): boolean {
  if (order.shipping_status !== 'ready_to_ship') return false;
  if (order.date_shipped) return false;
  // "ready_for_pickup" já exclui por definição os substatus de etapas
  // posteriores (picked_up, authorized_by_carrier, in_hub).
  if (order.shipping_substatus !== 'ready_for_pickup') return false;
  if (!order.label_printed_at) return false;
  if (order.logistic_type === 'fulfillment') return false;
  return true;
}
