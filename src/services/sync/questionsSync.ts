import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchQuestions, type MercadoLivreQuestion } from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllQuestions(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncQuestions(supabase, connection);
  }
}

async function upsertSyncState(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  status: 'ok' | 'error',
  error?: string
) {
  await supabase.from('sync_state').upsert(
    {
      org_id: connection.org_id,
      marketplace_connection_id: connection.id,
      resource: 'questions',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_questions',
    status: status === 'ok' ? 'done' : 'failed',
    payload: error ? { error } : {},
  });
}

async function upsertQuestion(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  question: MercadoLivreQuestion
) {
  const isAnswered = Boolean(question.answer);

  // Resposta enviada pela própria UI (answerThread) grava o estado local
  // antes do ML propagar internamente em /questions/search — se o snapshot
  // do ML ainda não mostra a resposta mas já temos uma local, não
  // sobrescreve: evita apagar chat_messages/status de uma resposta que já
  // foi entregue de verdade ao comprador.
  const { data: existingThread } = await supabase
    .from('questions_threads')
    .select('status')
    .eq('marketplace_connection_id', connection.id)
    .eq('external_thread_id', String(question.id))
    .maybeSingle();

  if (!isAnswered && existingThread?.status === 'answered') return;

  const { data: listing } = await supabase
    .from('product_listings')
    .select('id')
    .eq('marketplace_connection_id', connection.id)
    .eq('external_id', question.item_id)
    .maybeSingle();

  const { data: thread, error } = await supabase
    .from('questions_threads')
    .upsert(
      {
        org_id: connection.org_id,
        marketplace_connection_id: connection.id,
        product_listing_id: listing?.id ?? null,
        external_thread_id: String(question.id),
        question_text: question.text,
        status: isAnswered ? 'answered' : 'pending',
        last_message_at: question.answer?.date_created ?? question.date_created,
        answered_at: question.answer?.date_created ?? null,
      },
      { onConflict: 'marketplace_connection_id,external_thread_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  const messages = [
    {
      org_id: connection.org_id,
      thread_id: thread.id,
      sender: 'buyer',
      body: question.text,
      sent_at: question.date_created,
    },
  ];

  if (question.answer) {
    messages.push({
      org_id: connection.org_id,
      thread_id: thread.id,
      sender: 'seller',
      body: question.answer.text,
      sent_at: question.answer.date_created,
    });
  }

  // upsert (não delete+insert) — idempotente mesmo se outro sync da mesma
  // conexão estiver rodando em paralelo (ensureFresh não trava contra isso).
  const { error: messagesError } = await supabase
    .from('chat_messages')
    .upsert(messages, { onConflict: 'thread_id,sender' });
  if (messagesError) throw messagesError;
}

export async function syncQuestions(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const questions = await fetchQuestions(supabase, connection);
    for (const question of questions) {
      await upsertQuestion(supabase, connection, question);
    }
    await upsertSyncState(supabase, connection, 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
