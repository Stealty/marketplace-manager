import { createClient } from '@/lib/supabase/server';
import type { ChatMessage, MarketplaceType, QuestionThread } from '@/types/database';

export interface QuestionThreadWithRelations extends QuestionThread {
  product_listings: { title: string | null } | null;
  marketplace_connections: { label: string; marketplace: MarketplaceType } | null;
  chat_messages: ChatMessage[];
}

export async function getQuestionThreads(): Promise<QuestionThreadWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('questions_threads')
    .select(
      '*, product_listings(title), marketplace_connections(label, marketplace), chat_messages(*)'
    )
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .returns<QuestionThreadWithRelations[]>();

  if (error) throw error;

  return data;
}
