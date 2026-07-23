import type { SupabaseClient } from '@supabase/supabase-js';
import { decrypt, encrypt } from '@/lib/crypto';
import { getMercadoLivreConfig } from './config';
import type { MarketplaceConnection } from '@/types/database';

// NOTE: endpoints/campos conferidos com o conhecimento geral da API do ML —
// revalidar contra a documentação atual do Mercado Livre Developers ao
// registrar o app, especialmente nomes de campos de frete/shipping.
const AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const API_BASE = 'https://api.mercadolibre.com';

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface MercadoLivreTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
}

// Formato oficial de erro da API do ML: { message, error, status, cause }.
// Guardamos os campos estruturados para permitir tratar códigos específicos
// (ex: invalid_grant) sem depender de parsear texto livre.
export class MercadoLivreApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly cause_?: unknown
  ) {
    super(message);
    this.name = 'MercadoLivreApiError';
  }
}

async function parseErrorResponse(response: Response, context: string): Promise<never> {
  const text = await response.text();
  let parsed: { message?: string; error?: string; cause?: unknown } = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    // corpo não é JSON — segue com texto cru
  }
  // Log do corpo bruto do erro — a mensagem da exception costuma ser
  // genérica (ex: "At least one policy returned UNAUTHORIZED"), mas o
  // `cause` do ML normalmente traz o código da policy específica que falhou.
  console.error(`[mercadolivre] ${context} -> ${response.status}`, parsed.cause ?? text);
  throw new MercadoLivreApiError(
    parsed.message ?? `Mercado Livre API error on ${context}: ${response.status} ${text}`,
    response.status,
    parsed.error,
    parsed.cause
  );
}

export function buildAuthorizationUrl(state: string, codeChallenge: string) {
  const { clientId, redirectUri } = getMercadoLivreConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function requestToken(body: Record<string, string>): Promise<MercadoLivreTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    await parseErrorResponse(response, 'oauth/token');
  }

  return response.json();
}

export function exchangeCodeForTokens(code: string, codeVerifier: string) {
  const { clientId, clientSecret, redirectUri } = getMercadoLivreConfig();
  return requestToken({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
}

function refreshTokens(refreshToken: string) {
  const { clientId, clientSecret } = getMercadoLivreConfig();
  return requestToken({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
}

async function persistTokens(
  supabase: SupabaseClient,
  connectionId: string,
  tokens: MercadoLivreTokens
) {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const { error } = await supabase
    .from('marketplace_connections')
    .update({
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      expires_at: expiresAt,
      status: 'connected',
    })
    .eq('id', connectionId);

  if (error) throw error;
}

// Dedupe de refresh concorrente dentro do mesmo processo: várias chamadas de
// getValidAccessToken para a mesma conexão (ex: orders/questions/listings
// disparados em paralelo por Promise.all) compartilham a mesma promise em vez
// de cada uma trocar o refresh_token isoladamente — o ML invalida o
// refresh_token assim que ele é usado uma vez, então duas trocas simultâneas
// com o mesmo refresh_token sempre resultam em invalid_grant para a perdedora.
const inFlightRefreshes = new Map<string, Promise<string>>();

async function refreshAccessToken(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  refreshToken: string
): Promise<string> {
  const existing = inFlightRefreshes.get(connection.id);
  if (existing) return existing;

  const promise = (async () => {
    try {
      // O ML rotaciona o refresh_token a cada uso — a resposta inteira precisa
      // ser regravada, não só o access_token.
      const tokens = await refreshTokens(refreshToken);
      await persistTokens(supabase, connection.id, tokens);
      return tokens.access_token;
    } catch (error) {
      // invalid_grant: refresh_token expirado, revogado ou já usado. Antes de
      // desistir, reconfere o estado atual no banco — se outro processo (fora
      // do dedupe em memória, ex: outra instância serverless) já rotacionou
      // com sucesso enquanto esta chamada estava em voo, usa o token que ele
      // gravou em vez de sobrescrever uma conexão válida como expirada.
      if (error instanceof MercadoLivreApiError && error.code === 'invalid_grant') {
        const { data: current } = await supabase
          .from('marketplace_connections')
          .select('access_token_encrypted, expires_at, status')
          .eq('id', connection.id)
          .single();

        const currentExpiresAt = current?.expires_at ? new Date(current.expires_at).getTime() : 0;
        const alreadyRefreshed =
          current?.status === 'connected' &&
          currentExpiresAt > Date.now() &&
          Boolean(current.access_token_encrypted);

        if (alreadyRefreshed) {
          return decrypt(current!.access_token_encrypted!);
        }

        await supabase
          .from('marketplace_connections')
          .update({ status: 'expired' })
          .eq('id', connection.id);
      }
      throw error;
    }
  })();

  inFlightRefreshes.set(connection.id, promise);
  try {
    return await promise;
  } finally {
    inFlightRefreshes.delete(connection.id);
  }
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<string> {
  if (!connection.access_token_encrypted || !connection.refresh_token_encrypted) {
    throw new Error(`Conexão ${connection.id} não tem tokens salvos`);
  }

  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const needsRefresh = expiresAt - Date.now() < REFRESH_MARGIN_MS;

  if (!needsRefresh) {
    return decrypt(connection.access_token_encrypted);
  }

  const refreshToken = decrypt(connection.refresh_token_encrypted);
  return refreshAccessToken(supabase, connection, refreshToken);
}

const MAX_RATE_LIMIT_RETRIES = 3;

async function mlFetch(
  path: string,
  accessToken: string,
  attempt = 0,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers },
  });

  // Limite documentado: 1500 req/min por vendedor. Em 429, respeita
  // Retry-After quando presente; senão usa backoff exponencial (1s, 2s, 4s).
  if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
    const backoffMs = retryAfterMs && !Number.isNaN(retryAfterMs) ? retryAfterMs : 2 ** attempt * 1000;
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
    return mlFetch(path, accessToken, attempt + 1, init);
  }

  if (!response.ok) {
    await parseErrorResponse(response, path);
  }

  return response;
}

// Recebe o access_token diretamente (em vez de `connection`) porque é chamada
// no callback do OAuth, antes de existir uma linha em marketplace_connections
// para decorar com getValidAccessToken.
export async function fetchUserNickname(accessToken: string, userId: string): Promise<string | null> {
  const response = await mlFetch(`/users/${userId}`, accessToken);
  const data = await response.json();
  return data.nickname ?? null;
}

// Fonte de verdade para manter marketplace_connections.seller_nickname em dia
// fora do callback do OAuth — independe de a conexão ter pedidos (ao contrário
// de tirar o nickname de orders[0].seller, que fica preso em null para contas
// sem nenhum pedido ainda).
export async function fetchSellerNickname(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<string | null> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  return fetchUserNickname(accessToken, sellerId);
}

// Formato confirmado a partir de uma resposta real de /orders/search (ver
// histórico do console.log de depuração) — `buyer` e `seller` sempre vêm
// preenchidos com `id`/`nickname` nos pedidos observados.
// NOTE: `sale_fee` (comissão do ML para aquele item específico) presente na
// resposta segundo conhecimento geral da API — revalidar contra a doc atual
// do Mercado Livre Developers (usar o console.log de fetchOrders abaixo para
// conferir contra uma resposta real) antes de confiar neste valor em produção.
export interface MercadoLivreOrder {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  // Pedidos de um mesmo "carrinho"/pagamento combinado compartilham pack_id —
  // usado para agrupar pagamento e frete por grupo (ver
  // src/lib/mercadolivre/shippingReadiness.ts e getPreciseProfitability),
  // igual ao app legado (server.js, groups por pack_id).
  pack_id?: number | null;
  buyer?: { id: number; nickname: string };
  seller?: { id: number; nickname: string };
  shipping?: { id?: number };
  // IDs de pagamento do pedido — a resposta de /orders/search traz um resumo;
  // o valor líquido real (net_received_amount) só vem consultando cada
  // pagamento individualmente na API do Mercado Pago (ver
  // src/lib/mercadopago.ts), por isso só guardamos os ids aqui.
  payments?: { id: number; status: string }[];
  order_items: {
    // `variation_id`/`seller_sku` só vêm preenchidos quando o item vendido tem
    // variação (tamanho, cor, etc.) — sem eles, dois tamanhos do mesmo anúncio
    // chegam com o mesmo `item.id` e não há como distinguir qual foi vendido
    // (ver extractOrderItemSku em ordersSync.ts). Revalidar contra a doc atual
    // do Mercado Livre Developers.
    item: { id: string; title: string; variation_id?: number | null; seller_sku?: string | null };
    quantity: number;
    unit_price: number;
    sale_fee?: number;
  }[];
}

export interface MercadoLivreOrdersSearchResponse {
  results: MercadoLivreOrder[];
  paging: { total: number; offset: number; limit: number };
}

// NOTE: /orders/search pagina em no máximo 50 resultados por página (mesmo
// pedindo `limit` maior) e não tem paginação via search_type=scan/scroll_id
// como /items/search e /questions/search — por isso o teto aqui é o mesmo
// OFFSET_PAGINATION_LIMIT (1000) usado nos outros recursos, sem fallback de
// scroll. Contas com mais de 1000 pedidos no histórico da conexão vão parar
// de sincronizar pedidos mais antigos que isso; revalidar se isso vira um
// caso real (a saída seria paginar por janela de `order.date_created.to`).
export async function fetchOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<MercadoLivreOrder[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const orders: MercadoLivreOrder[] = [];
  const limit = 50;
  let offset = 0;

  while (offset < OFFSET_PAGINATION_LIMIT) {
    const response = await mlFetch(
      `/orders/search?seller=${sellerId}&sort=date_desc&limit=${limit}&offset=${offset}`,
      accessToken
    );
    const data: MercadoLivreOrdersSearchResponse = await response.json();
    const results = data.results ?? [];
    orders.push(...results);

    const total = data.paging?.total;
    offset += limit;
    if (results.length === 0) return orders;
    if (total !== undefined ? offset >= total : results.length < limit) return orders;
  }

  console.warn(
    `[mercadolivre] fetchOrders: conexão ${connection.id} tem mais de ${OFFSET_PAGINATION_LIMIT} pedidos — ` +
      'pedidos mais antigos que esse teto não são sincronizados (ver NOTE em fetchOrders).'
  );
  return orders;
}

// NOTE: schema de /shipments/{id} varia por tipo de envio (mercado envios
// full, flex, correios, retirada em loja) — revalidar contra a doc atual do
// Mercado Livre Developers antes de confiar nos nomes de campo abaixo.
// `cost` = quanto o COMPRADOR paga pelo frete (0 em anúncios com frete
// grátis); usado só para o indicador is_free_shipping e freight_value (tela
// Frete). O custo de frete absorvido pelo vendedor vem de fetchShipmentCosts
// (/shipments/{id}/costs) abaixo, não deste endpoint.
export interface MercadoLivreShipment {
  id: number;
  status?: string;
  substatus?: string | null;
  logistic_type?: string;
  date_shipped?: string | null;
  date_first_printed?: string | null;
  shipping_option?: { cost?: number; list_cost?: number; base_cost?: number };
}

export async function fetchShipment(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  shipmentId: number
): Promise<MercadoLivreShipment> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const response = await mlFetch(`/shipments/${shipmentId}`, accessToken);
  return response.json();
}

// Confirmado em produção pelo app legado (ml-oauth): `/shipments/{id}/costs`
// devolve a divisão real do frete entre comprador e vendedor —
// `receiver.cost` é o que o comprador pagou, `senders[].cost` é o que cada
// vendedor da remessa absorveu. O app legado (produção) casa o sender pelo
// campo `user_id` (server.js extractSellerFreightCost); `id` também aparece em
// algumas respostas, então mantemos ambos para casar em qualquer schema. Em
// remessas de vendedor único, geralmente há um único sender.
export interface MercadoLivreShipmentCosts {
  receiver?: { cost?: number };
  senders?: { id?: number; user_id?: number; cost?: number }[];
}

export async function fetchShipmentCosts(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  shipmentId: number
): Promise<MercadoLivreShipmentCosts> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const response = await mlFetch(`/shipments/${shipmentId}/costs`, accessToken);
  return response.json();
}

// NOTE: nome do atributo de SKU do vendedor varia por categoria/conta
// (SELLER_SKU em attributes, ou seller_custom_field na raiz) — revalidar
// contra a doc atual do Mercado Livre Developers.
export interface MercadoLivreItem {
  id: string;
  title: string;
  price: number;
  status: string;
  available_quantity?: number;
  // Unidades vendidas (ranking de mais vendidos) e saúde/qualidade do anúncio.
  // `health` vem do multiget /items: numérico 0..1 na maioria das contas, mas
  // o app legado também aceitava a forma categórica (healthy/warning/unhealthy)
  // via `reputation_health_gauge` — tratamos as duas em listingsSync.
  sold_quantity?: number;
  health?: number | string | null;
  reputation_health_gauge?: number | string | null;
  seller_custom_field?: string | null;
  attributes?: { id: string; value_name: string | null }[];
  thumbnail?: string;
  permalink?: string;
}

// A API do ML limita `offset` a 1000 registros em /items/search e
// /questions/search — acima disso é preciso trocar para
// search_type=scan + scroll_id (que não tem esse teto).
const OFFSET_PAGINATION_LIMIT = 1000;

export async function fetchItemIds(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<string[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const ids: string[] = [];
  const limit = 100;
  let offset = 0;

  while (offset < OFFSET_PAGINATION_LIMIT) {
    const response = await mlFetch(
      `/users/${sellerId}/items/search?limit=${limit}&offset=${offset}`,
      accessToken
    );
    const data = await response.json();
    const results: string[] = data.results ?? [];
    ids.push(...results);

    // Se `paging.total` não vier na resposta, não dá pra confiar no
    // acumulado para decidir parar (encerraria a paginação antes de
    // realmente esgotar os itens) — nesse caso só para quando uma página vem
    // com menos resultados que o `limit` pedido (indicando última página).
    const total = data.paging?.total;
    offset += limit;
    if (results.length === 0) return ids;
    if (total !== undefined ? offset >= total : results.length < limit) return ids;
  }

  // Catálogo maior que o teto de offset — continua via scroll, que não tem
  // limite de profundidade (scroll_id expira em 5 min, então cada página
  // precisa ser consumida em sequência, sem pausas longas entre chamadas).
  let scrollId: string | undefined;
  while (true) {
    const scrollParam = scrollId ? `&scroll_id=${scrollId}` : '';
    const response = await mlFetch(
      `/users/${sellerId}/items/search?search_type=scan&limit=${limit}${scrollParam}`,
      accessToken
    );
    const data = await response.json();
    const results: string[] = data.results ?? [];
    if (results.length === 0) break;
    ids.push(...results);
    scrollId = data.scroll_id;
    if (!scrollId) break;
  }

  return ids;
}

const ITEMS_BATCH_SIZE = 20;

export async function fetchItemsDetails(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  itemIds: string[]
): Promise<MercadoLivreItem[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const items: MercadoLivreItem[] = [];

  for (let i = 0; i < itemIds.length; i += ITEMS_BATCH_SIZE) {
    const batch = itemIds.slice(i, i + ITEMS_BATCH_SIZE);
    const response = await mlFetch(`/items?ids=${batch.join(',')}`, accessToken);
    const data: { code: number; body: MercadoLivreItem }[] = await response.json();
    items.push(...data.filter((entry) => entry.code === 200).map((entry) => entry.body));
  }

  return items;
}

export function extractSellerSku(item: MercadoLivreItem): string | null {
  if (item.seller_custom_field) return item.seller_custom_field;
  // App legado casa por SELLER_SKU ou SKU (server.js fetchItemsBulkQuality) —
  // checar só SELLER_SKU perdia anúncios que cadastram o código em SKU.
  const skuAttribute = item.attributes?.find(
    (attr) => attr.id === 'SELLER_SKU' || attr.id === 'SKU'
  );
  return skuAttribute?.value_name ?? null;
}

// NOTE: filtro/paginação de /questions/search conferidos com conhecimento
// geral da API — revalidar contra a doc atual do Mercado Livre Developers.
// `status` documentado: ANSWERED, UNANSWERED, CLOSED_UNANSWERED, UNDER_REVIEW,
// BANNED, DELETED, DISABLED. Qualquer um desses (incluindo UNDER_REVIEW) pode
// voltar com `text` vazio por moderação do próprio ML (não é falha de sync) —
// questionsSync.ts trata texto vazio como sinal de "sem nada a responder",
// não uma lista fixa de status.
export type MercadoLivreQuestionStatus =
  | 'ANSWERED'
  | 'UNANSWERED'
  | 'CLOSED_UNANSWERED'
  | 'UNDER_REVIEW'
  | 'BANNED'
  | 'DELETED'
  | 'DISABLED';

export interface MercadoLivreQuestion {
  id: number;
  item_id: string;
  text: string;
  status: MercadoLivreQuestionStatus | string;
  date_created: string;
  answer?: { text: string; date_created: string } | null;
}

export async function fetchQuestions(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<MercadoLivreQuestion[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const questions: MercadoLivreQuestion[] = [];
  const limit = 50;
  let offset = 0;

  while (offset < OFFSET_PAGINATION_LIMIT) {
    const response = await mlFetch(
      `/questions/search?seller_id=${sellerId}&limit=${limit}&offset=${offset}`,
      accessToken
    );
    const data = await response.json();
    const results: MercadoLivreQuestion[] = data.questions ?? [];
    questions.push(...results);

    // Mesma ressalva de fetchItemIds: sem `total` confiável, só para quando
    // a página vier incompleta (última página), não pelo acumulado.
    const total = data.total;
    offset += limit;
    if (results.length === 0) return questions;
    if (total !== undefined ? offset >= total : results.length < limit) return questions;
  }

  // Mais de 1000 perguntas — mesmo mecanismo de scroll usado em fetchItemIds.
  let scrollId: string | undefined;
  while (true) {
    const scrollParam = scrollId ? `&scroll_id=${scrollId}` : '';
    const response = await mlFetch(
      `/questions/search?seller_id=${sellerId}&search_type=scan&limit=${limit}${scrollParam}`,
      accessToken
    );
    const data = await response.json();
    const results: MercadoLivreQuestion[] = data.questions ?? [];
    if (results.length === 0) break;
    questions.push(...results);
    scrollId = data.scroll_id;
    if (!scrollId) break;
  }

  return questions;
}

export async function answerQuestion(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  questionId: number,
  text: string
): Promise<void> {
  const accessToken = await getValidAccessToken(supabase, connection);
  await mlFetch('/answers', accessToken, 0, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, text }),
  });
}

export type MercadoLivreItemStatus = 'active' | 'paused';

async function putItem(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  itemId: string,
  body: Record<string, unknown>
): Promise<MercadoLivreItem> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const response = await mlFetch(`/items/${itemId}`, accessToken, 0, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

export function updateItemStatus(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  itemId: string,
  status: MercadoLivreItemStatus
): Promise<MercadoLivreItem> {
  return putItem(supabase, connection, itemId, { status });
}

// Editar preço manualmente desativa qualquer automação de preço ativa no ML.
export function updateItemPrice(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  itemId: string,
  price: number
): Promise<MercadoLivreItem> {
  return putItem(supabase, connection, itemId, { price });
}

// available_quantity=0 pausa o anúncio automaticamente no lado do ML
// (status muda para "paused" com substatus "out_of_stock") — por isso as
// funções que chamam isso devem persistir o `status` da resposta, não supor
// que ele ficou inalterado.
export function updateItemStock(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  itemId: string,
  availableQuantity: number
): Promise<MercadoLivreItem> {
  return putItem(supabase, connection, itemId, { available_quantity: availableQuantity });
}

// NOTE: `seller_reputation` é retornado dentro de GET /users/{id} — schema
// pode variar; revalidar contra a doc atual do Mercado Livre Developers.
export interface MercadoLivreReputation {
  level_id: string | null;
  power_seller_status: string | null;
  metrics?: {
    claims?: { rate?: number };
    delayed_handling_time?: { rate?: number };
    cancellations?: { rate?: number };
  };
}

export async function fetchReputation(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<MercadoLivreReputation> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const response = await mlFetch(`/users/${sellerId}`, accessToken);
  const data = await response.json();
  return data.seller_reputation ?? {};
}

// ─── Reclamações / devoluções (post-purchase) ──────────────────────────────
// NOTE: a API de claims migrou para /post-purchase/v1/claims/ em 2024 (a v1
// antiga em /claims/ foi descontinuada). Os campos/ações abaixo vêm de
// documentação indireta — o fetch direto à doc oficial retornou 403 durante
// o desenvolvimento. Revalidar assim que houver uma reclamação real numa
// conta conectada; se o formato divergir, o ajuste fica isolado aqui.

export interface MercadoLivreClaimPlayer {
  role?: string;
  type: string;
  available_actions?: string[];
}

export interface MercadoLivreClaim {
  id: number;
  type: string;
  stage: string;
  status: string;
  reason_id?: string;
  resource?: string;
  resource_id?: string;
  last_updated?: string;
  players?: MercadoLivreClaimPlayer[];
}

export interface MercadoLivreClaimMessage {
  id: string;
  sender_role: string;
  message: string;
  date_created: string;
}

export async function fetchClaims(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<MercadoLivreClaim[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const claims: MercadoLivreClaim[] = [];
  const limit = 50;
  let offset = 0;

  while (offset < OFFSET_PAGINATION_LIMIT) {
    const response = await mlFetch(
      `/post-purchase/v1/claims/search?seller_id=${sellerId}&limit=${limit}&offset=${offset}`,
      accessToken
    );
    const data = await response.json();
    const results: MercadoLivreClaim[] = data.data ?? data.results ?? [];
    claims.push(...results);

    const total = data.paging?.total;
    offset += limit;
    if (results.length === 0) return claims;
    if (total !== undefined ? offset >= total : results.length < limit) return claims;
  }

  return claims;
}

export async function fetchClaimDetail(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  claimId: string
): Promise<MercadoLivreClaim> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const response = await mlFetch(`/post-purchase/v1/claims/${claimId}`, accessToken);
  return response.json();
}

export async function fetchClaimMessages(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  claimId: string
): Promise<MercadoLivreClaimMessage[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const response = await mlFetch(`/post-purchase/v1/claims/${claimId}/messages`, accessToken);
  const data = await response.json();
  return Array.isArray(data) ? data : (data.messages ?? []);
}

export async function sendClaimMessage(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  claimId: string,
  text: string
): Promise<void> {
  const accessToken = await getValidAccessToken(supabase, connection);
  await mlFetch(`/post-purchase/v1/claims/${claimId}/messages`, accessToken, 0, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: text }),
  });
}

export type ClaimReturnReviewAction = 'return_review_ok' | 'return_review_fail';

export async function reviewClaimReturn(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  claimId: string,
  action: ClaimReturnReviewAction
): Promise<void> {
  const accessToken = await getValidAccessToken(supabase, connection);
  await mlFetch(`/post-purchase/v1/claims/${claimId}/actions/${action}`, accessToken, 0, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
