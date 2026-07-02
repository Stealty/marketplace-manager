import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildAuthorizationUrl } from '@/lib/mercadolivre/client';

const STATE_COOKIE = 'ml_oauth_state';
const VERIFIER_COOKIE = 'ml_oauth_verifier';
const COOKIE_MAX_AGE = 5 * 60;

function base64url(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function GET() {
  const state = base64url(randomBytes(16));
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());

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

  redirect(buildAuthorizationUrl(state, codeChallenge));
}
