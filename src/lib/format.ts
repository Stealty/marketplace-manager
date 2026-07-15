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

export function parseCost(raw: string): number | null {
  const normalized = raw.replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
