import { createClient } from '@/lib/supabase/server';
import type { ChatMessage, MarketplaceType, QuestionThread } from '@/types/database';
import { syncQuestions } from '@/services/sync/questionsSync';
import { ensureFresh, getLastSuccessAt } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface QuestionThreadWithRelations extends QuestionThread {
  product_listings: { title: string | null; permalink: string | null } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
  chat_messages: ChatMessage[];
}

export async function getQuestionThreads(): Promise<QuestionThreadWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  await ensureFresh(supabase, connections ?? [], 'questions', syncQuestions);

  const { data, error } = await supabase
    .from('questions_threads')
    .select(
      '*, product_listings(title, permalink), marketplace_connections(label, marketplace), chat_messages(*)'
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .returns<QuestionThreadWithRelations[]>();

  if (error) throw error;

  return data;
}

export async function getQuestionsLastSyncedAt(): Promise<string | null> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);

  return getLastSuccessAt(supabase, connections ?? [], 'questions');
}
