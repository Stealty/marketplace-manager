import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse, type NextRequest } from 'next/server';
import { buildAuthorizationUrl } from '@/lib/mercadolivre/client';

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';
const CONNECTION_ID_COOKIE = 'ml_oauth_connection_id';
const COOKIE_MAX_AGE = 5 * 60;

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET(request: NextRequest) {
  // connectionId presente = fluxo de "Reconectar" de uma conexão existente;
  // ausente = "Conectar" uma conta nova. O callback usa esse hint para
  // avisar se a conta ML autenticada não bate com a conexão que o usuário
  // pretendia reconectar, em vez de atualizar silenciosamente a linha errada.
  const connectionId = request.nextUrl.searchParams.get('connectionId');
  let authorizationUrl: string;

  try {
    const state = base64url(randomBytes(16));
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
    authorizationUrl = buildAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    };
    cookieStore.set(STATE_COOKIE, state, cookieOptions);
    cookieStore.set(VERIFIER_COOKIE, codeVerifier, cookieOptions);
    if (connectionId) {
      cookieStore.set(CONNECTION_ID_COOKIE, connectionId, cookieOptions);
    }
  } catch (error) {
    // Erro de configuração (ex: env vars do ML ausentes) — devolve a causa
    // em vez de deixar cair num 500 genérico sem contexto.
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  redirect(authorizationUrl);
}
