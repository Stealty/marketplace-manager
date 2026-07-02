import { NextResponse, type NextRequest } from 'next/server';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncOrders } from '@/services/sync/ordersSync';
import type { MarketplaceConnection } from '@/types/database';

// Nome exato do tópico de pedidos pode variar por versão da API do ML
// (orders_v2 é o atual no momento em que isso foi escrito) — conferir no
// painel de notificações do app. Tópicos sem sync implementado ainda
// (questions, items) são só reconhecidos e ignorados por enquanto.
const ORDER_TOPICS = new Set(['orders_v2', 'orders']);

interface MercadoLivreNotification {
  topic?: string;
  user_id?: number | string;
  resource?: string;
}

export async function POST(request: NextRequest) {
  const body: MercadoLivreNotification | null = await request.json().catch(() => null);

  if (body?.topic && body.user_id !== undefined && ORDER_TOPICS.has(body.topic)) {
    // Responde rápido pro Mercado Livre; a sincronização real roda depois,
    // em background — reaproveita o mesmo `syncOrders` usado pelo botão
    // "Atualizar" e pelo cache-aside das telas.
    after(() => syncOrdersForExternalAccount(String(body.user_id)));
  }

  return NextResponse.json({ received: true });
}

async function syncOrdersForExternalAccount(externalAccountId: string) {
  const supabase = createAdminClient();

  const { data: connection } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('external_account_id', externalAccountId)
    .returns<MarketplaceConnection[]>()
    .maybeSingle();

  if (!connection) return;

  await syncOrders(supabase, connection);
}
