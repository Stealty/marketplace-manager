export const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

// chat_messages.sender e claim_messages.sender guardam o valor cru do ML
// (perguntas: sempre 'buyer'/'seller', escrito por nós — reclamações:
// message.sender_role do ML, ainda não confirmado contra conta real, ver
// memory project-mercadolivre-claims-api-unverified). Mapa cobre os valores
// conhecidos e cai para o próprio valor em vez de esconder um rótulo novo.
const SENDER_LABELS: Record<string, string> = {
  buyer: 'Comprador',
  seller: 'Vendedor',
  complainant: 'Reclamante',
  respondent: 'Vendedor',
  mediator: 'Mercado Livre',
};

export function senderLabel(sender: string): string {
  return SENDER_LABELS[sender.toLowerCase()] ?? sender;
}

// status do anúncio vem cru do ML ('active'/'paused'/'closed'/...). O painel
// legado (top100.html) exibia ATIVO/PAUSADO/FECHADO — mapeia para pt-BR e cai
// para o próprio valor em vez de mostrar o inglês cru.
const LISTING_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  closed: 'Fechado',
  under_review: 'Em revisão',
  inactive: 'Inativo',
  payment_required: 'Aguardando pagamento',
};

export function listingStatusLabel(status: string): string {
  return LISTING_STATUS_LABELS[status.toLowerCase()] ?? status;
}

// Reclamações/Devoluções: type/stage/status vêm crus do ML (API ainda não
// validada contra conta real — ver memory claims-api-unverified). Todos os
// mapas caem para o valor cru, então um enum novo/desconhecido aparece como
// está em vez de sumir ou virar um rótulo errado.
const CLAIM_TYPE_LABELS: Record<string, string> = {
  mediations: 'Mediação',
  return: 'Devolução',
  change: 'Troca',
  cancellation: 'Cancelamento',
  cancel_purchase: 'Cancelamento',
  service: 'Serviço',
  fulfillment: 'Logística (Full)',
};

const CLAIM_STAGE_LABELS: Record<string, string> = {
  claim: 'Reclamação',
  dispute: 'Disputa',
  recontact: 'Recontato',
  none: 'Sem etapa',
  stale: 'Parada',
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  opened: 'Aberta',
  open: 'Aberta',
  closed: 'Fechada',
  in_progress: 'Em andamento',
  pending: 'Pendente',
};

export function claimTypeLabel(type: string): string {
  return CLAIM_TYPE_LABELS[type.toLowerCase()] ?? type;
}

export function claimStageLabel(stage: string): string {
  return CLAIM_STAGE_LABELS[stage.toLowerCase()] ?? stage;
}

export function claimStatusLabel(status: string): string {
  return CLAIM_STATUS_LABELS[status.toLowerCase()] ?? status;
}

// Reputação do vendedor no ML. level_id vem como "5_green"/"1_red"; mapeamos
// para a cor pt-BR do termômetro. power_seller_status: os níveis MercadoLíder.
const REPUTATION_LEVEL_LABELS: Record<string, string> = {
  '5_green': 'Verde (5)',
  '4_light_green': 'Verde-claro (4)',
  '3_yellow': 'Amarelo (3)',
  '2_orange': 'Laranja (2)',
  '1_red': 'Vermelho (1)',
};

const POWER_SELLER_LABELS: Record<string, string> = {
  silver: 'MercadoLíder',
  gold: 'MercadoLíder Gold',
  platinum: 'MercadoLíder Platinum',
};

export function reputationLevelLabel(levelId: string): string {
  return REPUTATION_LEVEL_LABELS[levelId.toLowerCase()] ?? levelId;
}

export function powerSellerLabel(status: string): string {
  return POWER_SELLER_LABELS[status.toLowerCase()] ?? status;
}

export function parseCost(raw: string): number | null {
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
