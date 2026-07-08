import { NextResponse, type NextRequest } from 'next/server';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncOrders } from '@/services/sync/ordersSync';
import { syncListings } from '@/services/sync/listingsSync';
import { syncQuestions } from '@/services/sync/questionsSync';
import type { MarketplaceConnection } from '@/types/database';

// Nome exato de cada tópico pode variar por versão da API do ML (orders_v2 é
// o atual no momento em que isso foi escrito) — conferir no painel de
// notificações do app.
const ORDER_TOPICS = new Set(['orders_v2', 'orders']);
const ITEM_TOPICS = new Set(['items']);
const QUESTION_TOPICS = new Set(['questions']);

interface MercadoLivreNotification {
  topic?: string;
  user_id?: number | string;
  resource?: string;
}

export async function POST(request: NextRequest) {
  const body: MercadoLivreNotification | null = await request.json().catch(() => null);

  if (body?.topic && body.user_id !== undefined) {
    const externalAccountId = String(body.user_id);

    // Responde rápido pro Mercado Livre; a sincronização real roda depois,
    // em background — reaproveita o mesmo sync usado pelo botão "Atualizar"
    // e pelo cache-aside das telas.
    if (ORDER_TOPICS.has(body.topic)) {
      after(() => syncForExternalAccount(externalAccountId, syncOrders));
    } else if (ITEM_TOPICS.has(body.topic)) {
      after(() => syncForExternalAccount(externalAccountId, syncListings));
    } else if (QUESTION_TOPICS.has(body.topic)) {
      after(() => syncForExternalAccount(externalAccountId, syncQuestions));
    }
  }

  return NextResponse.json({ received: true });
}

async function syncForExternalAccount(
  externalAccountId: string,
  sync: (supabase: ReturnType<typeof createAdminClient>, connection: MarketplaceConnection) => Promise<void>
) {
  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('external_account_id', externalAccountId)
    .returns<MarketplaceConnection[]>()
    .maybeSingle();

  if (!connection) return;

  await sync(supabase, connection);
}
