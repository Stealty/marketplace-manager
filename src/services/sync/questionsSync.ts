import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchQuestions, type MercadoLivreQuestion } from '@/lib/mercadolivre/client';
import { upsertSyncState } from '@/lib/sync/freshness';
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

export type ThreadStatus = 'answered' | 'pending' | 'under_review' | 'closed' | 'removed';

// Banidas/removidas/desativadas pelo ML: bloqueadas de fato, não voltam a ser
// respondíveis. UNDER_REVIEW é transitória (em moderação — pode voltar como
// pendente) e por isso NÃO é escondida: vira 'under_review' e continua visível
// (antes caía em 'removed' por vir com texto vazio e sumia da fila).
// CLOSED_UNANSWERED foi encerrada sem resposta e não aceita mais resposta —
// vira 'closed' para não ser rotulada "Pendente" com uma caixa de resposta que
// falharia no ML. Texto vazio nos demais status segue sendo tratado como
// removido (moderação), como antes.
const BLOCKED_QUESTION_STATUSES = new Set(['BANNED', 'DELETED', 'DISABLED']);

function resolveThreadStatus(question: MercadoLivreQuestion): ThreadStatus {
  if (BLOCKED_QUESTION_STATUSES.has(question.status)) return 'removed';
  if (question.status === 'CLOSED_UNANSWERED') return 'closed';
  if (question.status === 'UNDER_REVIEW') return 'under_review';
  if (!question.text?.trim()) return 'removed';
  return question.answer ? 'answered' : 'pending';
}

async function upsertQuestion(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  question: MercadoLivreQuestion
) {
  const status = resolveThreadStatus(question);

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

  if (status !== 'answered' && existingThread?.status === 'answered') return;

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
        status,
        last_message_at: question.answer?.date_created ?? question.date_created,
        answered_at: question.answer?.date_created ?? null,
      },
      { onConflict: 'marketplace_connection_id,external_thread_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  // Não grava chat_messages com corpo vazio (pergunta moderada/em análise sem
  // texto) — o upsert exige `body`, e a UI já mostra um texto de fallback. Só
  // registra a mensagem do comprador quando há texto e a do vendedor quando há
  // resposta; sem nenhuma das duas, mantém só a thread (para continuar visível).
  const messages: {
    org_id: string;
    thread_id: string;
    sender: string;
    body: string;
    sent_at: string;
  }[] = [];

  if (question.text?.trim()) {
    messages.push({
      org_id: connection.org_id,
      thread_id: thread.id,
      sender: 'buyer',
      body: question.text,
      sent_at: question.date_created,
    });
  }

  if (question.answer) {
    messages.push({
      org_id: connection.org_id,
      thread_id: thread.id,
      sender: 'seller',
      body: question.answer.text,
      sent_at: question.answer.date_created,
    });
  }

  if (messages.length === 0) return;

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
    await upsertSyncState(supabase, connection, 'questions', 'sync_questions', 'ok');
  } catch (error) {
    await upsertSyncState(
      supabase,
      connection,
      'questions',
      'sync_questions',
      'error',
      (error as Error).message
    );
    throw error;
  }
}
