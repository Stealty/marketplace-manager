import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { buildAuthorizationUrl } from '@/lib/mercadolivre/client';

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';
const COOKIE_MAX_AGE = 5 * 60;

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET() {
  let authorizationUrl: string;

  try {
    const state = base64url(randomBytes(16));
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
    authorizationUrl = buildAuthorizationUrl(state, codeChallenge);

    const cookieStore = await cookies();
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    cookieStore.set(VERIFIER_COOKIE, codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } catch (error) {
    // Erro de configuração (ex: env vars do ML ausentes) — devolve a causa
    // em vez de deixar cair num 500 genérico sem contexto.
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  redirect(authorizationUrl);
}
