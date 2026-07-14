import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Rota de confirmação padrão do fluxo @supabase/ssr: troca o token_hash do
// e-mail (convite, magic link, recuperação de senha) por uma sessão via
// cookies (só o client server-side grava cookie; o client do browser não
// serve aqui). Requer configurar o template de e-mail do Supabase para
// apontar pra cá com token_hash/type — ver 0017_admin_panel.sql.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const requestedNext = searchParams.get('next') ?? '/dashboard';
  const next = requestedNext.startsWith('/') ? requestedNext : '/dashboard';

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
  }

  redirect('/login');
}
