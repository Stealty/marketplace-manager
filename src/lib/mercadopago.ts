const MERCADO_PAGO_API_BASE = 'https://api.mercadopago.com';

export interface MercadoPagoFeeDetail {
  type?: string;
  amount?: number;
}

export interface MercadoPagoPayment {
  id: number;
  status: string;
  transaction_amount?: number;
  fee_details?: MercadoPagoFeeDetail[];
  transaction_details?: { net_received_amount?: number };
}

// Payments com esses status não representam dinheiro efetivamente recebido —
// mesmo critério do app legado (ml-oauth, server.js) para excluir da
// lucratividade.
const EXCLUDED_PAYMENT_STATUSES = new Set(['rejected', 'cancelled', 'refunded', 'charged_back']);

export function isSettledPayment(payment: Pick<MercadoPagoPayment, 'status'>): boolean {
  return !EXCLUDED_PAYMENT_STATUSES.has((payment.status ?? '').toLowerCase());
}

// Confirmado pelo app legado (ml-oauth, server.js): o access_token OAuth do
// Mercado Livre também autoriza a API de pagamentos do Mercado Pago
// (api.mercadopago.com) — mesma conta, gateway de pagamento compartilhado.
// Endpoint/domínio diferente do ML (api.mercadolibre.com), por isso não
// reaproveita mlFetch/getValidAccessToken de mercadolivre/client.ts; falha
// silenciosamente (retorna null) para o chamador cair no cálculo simples já
// existente em vez de quebrar a tela de Lucratividade.
export async function fetchPaymentDetail(accessToken: string, paymentId: number): Promise<MercadoPagoPayment | null> {
  try {
    const response = await fetch(`${MERCADO_PAGO_API_BASE}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export interface PaymentNetResult {
  value: number;
  source: 'net_received_amount' | 'transaction_amount_menos_tarifas' | 'indisponivel';
  estimated: boolean;
}

// Réplica de paymentNetValue do app legado (server.js): prefere o valor
// líquido já confirmado pelo Mercado Pago; sem ele, estima descontando as
// tarifas do valor bruto da transação; sem nenhum dos dois, fica 0/estimado
// (chamador decide se cai de volta pro cálculo simples de sale_fee).
export function paymentNetValue(payment: MercadoPagoPayment | null): PaymentNetResult {
  const confirmedNet = payment?.transaction_details?.net_received_amount;
  if (typeof confirmedNet === 'number' && Number.isFinite(confirmedNet) && confirmedNet >= 0) {
    return { value: confirmedNet, source: 'net_received_amount', estimated: false };
  }

  const transactionAmount = payment?.transaction_amount;
  if (typeof transactionAmount === 'number' && Number.isFinite(transactionAmount)) {
    const totalFees = (payment?.fee_details ?? []).reduce((sum, fee) => sum + Math.abs(fee.amount ?? 0), 0);
    return {
      value: Math.max(0, transactionAmount - totalFees),
      source: 'transaction_amount_menos_tarifas',
      estimated: true,
    };
  }

  return { value: 0, source: 'indisponivel', estimated: true };
}
