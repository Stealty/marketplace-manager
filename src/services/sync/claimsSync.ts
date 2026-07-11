import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchClaimDetail,
  fetchClaimMessages,
  fetchClaims,
  type MercadoLivreClaim,
} from '@/lib/mercadolivre/client';
import { upsertSyncState } from '@/lib/sync/freshness';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllClaims(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncClaims(supabase, connection);
  }
}

async function upsertClaim(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  claim: MercadoLivreClaim
): Promise<void> {
  // Busca o detalhe (players/available_actions) — a busca em lista
  // (/claims/search) não traz esses campos, só o detalhe por id.
  const detail = await fetchClaimDetail(supabase, connection, String(claim.id));
  const sellerPlayer = detail.players?.find((player) => player.type === 'seller');
  const externalOrderId = detail.resource_id ? String(detail.resource_id) : null;

  const { data: order } = externalOrderId
    ? await supabase
        .from('orders')
        .select('id')
        .eq('marketplace_connection_id', connection.id)
        .eq('external_order_id', externalOrderId)
        .maybeSingle()
    : { data: null };

  const { data: row, error } = await supabase
    .from('claims')
    .upsert(
      {
        org_id: connection.org_id,
        marketplace_connection_id: connection.id,
        order_id: order?.id ?? null,
        external_claim_id: String(detail.id),
        external_order_id: externalOrderId,
        type: detail.type ?? null,
        stage: detail.stage ?? null,
        status: detail.status ?? null,
        reason: detail.reason_id ?? null,
        seller_available_actions: sellerPlayer?.available_actions ?? [],
        last_updated: detail.last_updated ?? null,
      },
      { onConflict: 'marketplace_connection_id,external_claim_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  const messages = await fetchClaimMessages(supabase, connection, String(claim.id));
  if (messages.length === 0) return;

  const { error: messagesError } = await supabase.from('claim_messages').upsert(
    messages.map((message) => ({
      org_id: connection.org_id,
      claim_id: row.id,
      external_message_id: String(message.id),
      sender: message.sender_role,
      body: message.message,
      sent_at: message.date_created,
    })),
    { onConflict: 'claim_id,external_message_id' }
  );
  if (messagesError) throw messagesError;
}

export async function syncClaims(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const claims = await fetchClaims(supabase, connection);
    for (const claim of claims) {
      await upsertClaim(supabase, connection, claim);
    }
    await upsertSyncState(supabase, connection, 'claims', 'sync_claims', 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'claims', 'sync_claims', 'error', (error as Error).message);
    throw error;
  }
}
