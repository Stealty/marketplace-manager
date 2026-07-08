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
    throw new Error(`Mercado Livre token request failed: ${response.status} ${await response.text()}`);
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

  // O ML rotaciona o refresh_token a cada uso — a resposta inteira precisa
  // ser regravada, não só o access_token.
  const refreshToken = decrypt(connection.refresh_token_encrypted);
  const tokens = await refreshTokens(refreshToken);
  await persistTokens(supabase, connection.id, tokens);

  return tokens.access_token;
}

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

  if (response.status === 429 && attempt < 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mlFetch(path, accessToken, attempt + 1, init);
  }

  if (!response.ok) {
    throw new Error(`Mercado Livre API error on ${path}: ${response.status} ${await response.text()}`);
  }

  return response;
}

export interface MercadoLivreOrder {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  shipping?: { id?: number };
  order_items: {
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }[];
}

export async function fetchOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<MercadoLivreOrder[]> {
  const accessToken = await getValidAccessToken(supabase, connection);
  const sellerId = connection.external_account_id;
  if (!sellerId) throw new Error(`Conexão ${connection.id} não tem external_account_id (seller id)`);

  const response = await mlFetch(`/orders/search?seller=${sellerId}&sort=date_desc`, accessToken);
  const data = await response.json();
  return data.results ?? [];
}

// NOTE: schema de /shipments/{id} varia por tipo de envio (mercado envios
// full, flex, correios, retirada em loja) — revalidar contra a doc atual do
// Mercado Livre Developers antes de confiar nos nomes de campo abaixo.
export interface MercadoLivreShipment {
  id: number;
  shipping_option?: { cost?: number; list_cost?: number };
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

// NOTE: nome do atributo de SKU do vendedor varia por categoria/conta
// (SELLER_SKU em attributes, ou seller_custom_field na raiz) — revalidar
// contra a doc atual do Mercado Livre Developers.
export interface MercadoLivreItem {
  id: string;
  title: string;
  price: number;
  status: string;
  seller_custom_field?: string | null;
  attributes?: { id: string; value_name: string | null }[];
}

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

  while (true) {
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
    if (results.length === 0) break;
    if (total !== undefined ? offset >= total : results.length < limit) break;
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
  const skuAttribute = item.attributes?.find((attr) => attr.id === 'SELLER_SKU');
  return skuAttribute?.value_name ?? null;
}

// NOTE: filtro/paginação de /questions/search conferidos com conhecimento
// geral da API — revalidar contra a doc atual do Mercado Livre Developers.
export interface MercadoLivreQuestion {
  id: number;
  item_id: string;
  text: string;
  status: string;
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

  while (true) {
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
    if (results.length === 0) break;
    if (total !== undefined ? offset >= total : results.length < limit) break;
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
