import { createClient } from '@/lib/supabase/server';
import type { ChatMessage, MarketplaceType, QuestionThread } from '@/types/database';
import { syncQuestions } from '@/services/sync/questionsSync';
import { syncListings } from '@/services/sync/listingsSync';
import { ensureFresh, getLastSuccessAt } from '@/lib/sync/freshness';
import { getCurrentUserOrgIds } from '@/services/organizationService';

export interface QuestionThreadWithRelations extends QuestionThread {
  product_listings: { title: string | null; permalink: string | null } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType; seller_nickname: string | null } | null;
  chat_messages: ChatMessage[];
}

export async function getQuestionThreads(): Promise<QuestionThreadWithRelations[]> {
  const supabase = await createClient();
  const orgIds = await getCurrentUserOrgIds();

  const { data: connections } = await supabase
    .from('marketplace_connections')
    .select('*')
    .in('org_id', orgIds);
  // Antes de questions: syncQuestions resolve questions_threads.product_listing_id
  // via lookup pontual em product_listings — mesmo padrão de ordersService.ts.
  await ensureFresh(supabase, connections ?? [], 'listings', syncListings);
  await ensureFresh(supabase, connections ?? [], 'questions', syncQuestions);

  const { data, error } = await supabase
    .from('questions_threads')
    .select(
      '*, product_listings(title, permalink), marketplace_connections(label, marketplace, seller_nickname), chat_messages(*)'
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
