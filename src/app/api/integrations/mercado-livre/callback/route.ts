import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, after, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, fetchUserNickname } from '@/lib/mercadolivre/client';
import { encrypt } from '@/lib/crypto';
import { getCurrentUserOrganizations } from '@/services/organizationService';
import { syncAllResourcesForConnection } from '@/services/sync/fullSync';
import type { MarketplaceConnection } from '@/types/database';

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';
const CONNECTION_ID_COOKIE = 'ml_oauth_connection_id';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  const expectedConnectionId = cookieStore.get(CONNECTION_ID_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(VERIFIER_COOKIE);
  cookieStore.delete(CONNECTION_ID_COOKIE);

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    return NextResponse.json({ error: 'Falha na validação do OAuth (state inválido)' }, { status: 400 });
  }

  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code, codeVerifier);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const supabase = await createClient();
  const orgs = await getCurrentUserOrganizations();
  // if (orgs.length === 0) {
  //   return NextResponse.json({ error: 'Usuário não pertence a nenhuma organização' }, { status: 400 });
  // }
  // if (orgs.length > 1) {
  //   // Não há hoje um seletor de "organização ativa" na UI para desambiguar —
  //   // melhor abortar do que gravar o token na org errada silenciosamente.
  //   return NextResponse.json(
  //     { error: 'Usuário pertence a múltiplas organizações; seleção de organização ainda não suportada neste fluxo' },
  //     { status: 400 }
  //   );
  // }
  const org = orgs[0];

  const externalAccountId = String(tokens.user_id);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Busca o nickname aqui em vez de depender do primeiro sync de pedidos:
  // contas sem nenhum pedido nunca disparariam esse update (ver
  // updateSellerNickname em ordersSync.ts). Não fatal — se falhar, o
  // connectionPayload abaixo simplesmente não inclui `seller_nickname` e o
  // sync de pedidos preenche depois.
  let sellerNickname: string | null = null;
  try {
    sellerNickname = await fetchUserNickname(tokens.access_token, externalAccountId);
  } catch (error) {
    console.error('[mercadolivre] falha ao buscar nickname do vendedor no callback', error);
  }

  // "Reconectar" veio com um connectionId esperado — se a conta ML que
  // autenticou for diferente da conexão que o usuário pretendia reconectar,
  // aborta em vez de atualizar/criar silenciosamente a linha errada.
  if (expectedConnectionId) {
    const { data: expectedConnection } = await supabase
      .from('marketplace_connections')
      .select('external_account_id')
      .eq('id', expectedConnectionId)
      .eq('org_id', org.id)
      .maybeSingle();

    if (expectedConnection && expectedConnection.external_account_id !== externalAccountId) {
      return NextResponse.json(
        {
          error:
            'A conta do Mercado Livre usada no login é diferente da conta já conectada nesta linha. Reconecte usando a mesma conta ou desconecte antes de conectar uma conta diferente.',
        },
        { status: 400 }
      );
    }
  }

  const { data: existing } = await supabase
    .from('marketplace_connections')
    .select('id')
    .eq('org_id', org.id)
    .eq('marketplace', 'mercado_livre')
    .eq('external_account_id', externalAccountId)
    .maybeSingle();

  let connectionPayload;
  try {
    connectionPayload = {
      org_id: org.id,
      marketplace: 'mercado_livre' as const,
      label: 'Mercado Livre',
      status: 'connected' as const,
      external_account_id: externalAccountId,
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: encrypt(tokens.refresh_token),
      expires_at: expiresAt,
      ...(sellerNickname ? { seller_nickname: sellerNickname } : {}),
    };
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  const isNewConnection = !existing;

  const { data: connectionRow, error } = existing
    ? await supabase
        .from('marketplace_connections')
        .update(connectionPayload)
        .eq('id', existing.id)
        .select('*')
        .returns<MarketplaceConnection[]>()
        .single()
    : await supabase
        .from('marketplace_connections')
        .insert(connectionPayload)
        .select('*')
        .returns<MarketplaceConnection[]>()
        .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (isNewConnection) {
    after(() => syncAllResourcesForConnection(supabase, connectionRow));
    redirect(`/dashboard/carregando?conexao=${connectionRow.id}`);
  }

  redirect('/dashboard/conexoes');
}
