'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { answerQuestion } from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function answerThread(threadId: string, text: string): Promise<{ error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'A resposta não pode ficar em branco.' };

  const supabase = await createClient();

  const { data: thread, error: threadError } = await supabase
    .from('questions_threads')
    .select('*, marketplace_connections(*)')
    .eq('id', threadId)
    .returns<Array<{ external_thread_id: string; org_id: string; marketplace_connections: MarketplaceConnection | null }>>()
    .maybeSingle();

  if (threadError) return { error: threadError.message };
  if (!thread || !thread.marketplace_connections) {
    return { error: 'Pergunta ou conexão do marketplace não encontrada.' };
  }

  try {
    await answerQuestion(
      supabase,
      thread.marketplace_connections,
      Number(thread.external_thread_id),
      trimmed
    );
  } catch (error) {
    return { error: (error as Error).message };
  }

  const answeredAt = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('questions_threads')
    .update({ status: 'answered', answered_at: answeredAt, last_message_at: answeredAt })
    .eq('id', threadId);

  if (updateError) return { error: updateError.message };

  const { error: messageError } = await supabase.from('chat_messages').insert({
    org_id: thread.org_id,
    thread_id: threadId,
    sender: 'seller',
    body: trimmed,
    sent_at: answeredAt,
  });

  if (messageError) return { error: messageError.message };

  revalidatePath('/dashboard/perguntas');
  return {};
}
