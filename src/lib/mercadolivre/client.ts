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

async function mlFetch(path: string, accessToken: string, attempt = 0): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 429 && attempt < 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return mlFetch(path, accessToken, attempt + 1);
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
