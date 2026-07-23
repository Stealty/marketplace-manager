import type { Tone } from '@/theme/tokens';

// Rótulos/cores pt-BR dos status de thread de pergunta (questionsSync
// resolveThreadStatus). Centralizado para lista e drawer não divergirem.
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Pendente', tone: 'warning' },
  answered: { label: 'Respondida', tone: 'success' },
  under_review: { label: 'Em análise', tone: 'accent' },
  closed: { label: 'Encerrada', tone: 'neutral' },
  removed: { label: 'Removida pelo ML', tone: 'neutral' },
};

export function threadStatusMeta(status: string): { label: string; tone: Tone } {
  return STATUS_META[status] ?? { label: status, tone: 'neutral' };
}

// Texto de fallback quando a pergunta não tem texto sincronizado (moderação/
// análise do ML). Cada status explica por que o texto está ausente.
export function threadEmptyText(status: string): string {
  switch (status) {
    case 'under_review':
      return 'Pergunta em análise pelo Mercado Livre';
    case 'closed':
      return 'Pergunta encerrada sem resposta';
    case 'removed':
      return 'Pergunta removida/moderada pelo Mercado Livre';
    default:
      return 'Pergunta sem texto sincronizado';
  }
}

// Perguntas que ainda podem ser respondidas pelo vendedor (mostram a caixa de
// resposta). Encerradas/em análise/removidas não aceitam resposta no ML.
export function isAnswerable(status: string): boolean {
  return status === 'pending';
}
