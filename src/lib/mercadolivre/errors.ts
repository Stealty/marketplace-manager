import { MercadoLivreApiError } from './client';

// Mensagem exibida na UI nunca expõe detalhes técnicos da API — só orienta
// o usuário a tentar de novo ou acionar o suporte.
const GENERIC_MESSAGE = 'Não foi possível atualizar os dados agora. Atualize a página e tente novamente. Se o problema continuar, contate o suporte.';
const RECONNECT_MESSAGE = 'A conexão com o Mercado Livre expirou. Reconecte a conta em Conexões e tente novamente.';

export function toFriendlySyncError(error: unknown): { error: string } {
  if (error instanceof MercadoLivreApiError && error.code === 'invalid_grant') {
    return { error: RECONNECT_MESSAGE };
  }
  return { error: GENERIC_MESSAGE };
}
