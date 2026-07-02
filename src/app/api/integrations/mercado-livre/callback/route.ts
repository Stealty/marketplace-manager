import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens } from '@/lib/mercadolivre/client';
import { encrypt } from '@/lib/crypto';
import { getCurrentUserOrganizations } from '@/services/organizationService';

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const codeVerifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(VERIFIER_COOKIE);

  if (!code || !state || !expectedState || !codeVerifier || state !== expectedState) {
    return NextResponse.json({ error: 'Falha na validação do OAuth (state inválido)' }, { status: 400 });
  }

  const tokens = await exchangeCodeForTokens(code, codeVerifier);

  const supabase = await createClient();
  const orgs = await getCurrentUserOrganizations();
  const org = orgs[0];
  if (!org) {
    return NextResponse.json({ error: 'Usuário não pertence a nenhuma organização' }, { status: 400 });
  }

  const externalAccountId = String(tokens.user_id);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { data: existing } = await supabase
    .from('marketplace_connections')
    .select('id')
    .eq('org_id', org.id)
    .eq('marketplace', 'mercado_livre')
    .eq('external_account_id', externalAccountId)
    .maybeSingle();

  const connectionPayload = {
    org_id: org.id,
    marketplace: 'mercado_livre' as const,
    label: 'Mercado Livre',
    status: 'connected' as const,
    external_account_id: externalAccountId,
    access_token_encrypted: encrypt(tokens.access_token),
    refresh_token_encrypted: encrypt(tokens.refresh_token),
    expires_at: expiresAt,
  };

  const { error } = existing
    ? await supabase.from('marketplace_connections').update(connectionPayload).eq('id', existing.id)
    : await supabase.from('marketplace_connections').insert(connectionPayload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  redirect('/dashboard/conexoes');
}
