'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function disconnectConnection(connectionId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  // NOTE: o Mercado Livre não expõe um endpoint público/estável de "revoke"
  // de token para apps de terceiros — limpar os tokens localmente e marcar a
  // conexão como desconectada é o que garante que nenhum sync futuro rode.
  const { error } = await supabase
    .from('marketplace_connections')
    .update({
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      expires_at: null,
      status: 'disconnected',
    })
    .eq('id', connectionId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/conexoes');
  return {};
}
