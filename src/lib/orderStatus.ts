import type { Tone } from '@/theme/tokens';

const ORDER_STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  payment_required: 'Aguardando pagamento',
  payment_in_process: 'Pagamento em processamento',
  paid: 'Pago',
  partially_paid: 'Parcialmente pago',
  partially_refunded: 'Parcialmente reembolsado',
  pending_cancel: 'Cancelamento pendente',
  cancelled: 'Cancelado',
  invalid: 'Inválido',
};

const ORDER_STATUS_TONES: Record<string, Tone> = {
  confirmed: 'success',
  paid: 'success',
  payment_required: 'warning',
  payment_in_process: 'warning',
  partially_paid: 'warning',
  partially_refunded: 'warning',
  pending_cancel: 'error',
  cancelled: 'error',
  invalid: 'error',
};

export function translateOrderStatus(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function orderStatusTone(status: string): Tone {
  return ORDER_STATUS_TONES[status] ?? 'neutral';
}
