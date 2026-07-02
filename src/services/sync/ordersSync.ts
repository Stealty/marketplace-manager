import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchOrders, type MercadoLivreOrder } from '@/lib/mercadolivre/client';
import type { MarketplaceConnection } from '@/types/database';

export async function syncAllOrders(supabase: SupabaseClient): Promise<void> {
  const { data: connections, error } = await supabase
    .from('marketplace_connections')
    .select('*')
    .eq('marketplace', 'mercado_livre')
    .eq('status', 'connected')
    .returns<MarketplaceConnection[]>();

  if (error) throw error;

  for (const connection of connections ?? []) {
    await syncOrders(supabase, connection);
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
      resource: 'orders',
      last_synced_at: new Date().toISOString(),
      last_status: status,
      last_error: error ?? null,
    },
    { onConflict: 'marketplace_connection_id,resource' }
  );

  await supabase.from('sync_jobs').insert({
    org_id: connection.org_id,
    marketplace_connection_id: connection.id,
    job_type: 'sync_orders',
    status: status === 'ok' ? 'done' : 'failed',
    payload: error ? { error } : {},
  });
}

async function upsertOrder(
  supabase: SupabaseClient,
  connection: MarketplaceConnection,
  mlOrder: MercadoLivreOrder
) {
  const { data: order, error } = await supabase
    .from('orders')
    .upsert(
      {
        org_id: connection.org_id,
        marketplace_connection_id: connection.id,
        external_order_id: String(mlOrder.id),
        status: mlOrder.status,
        order_value: mlOrder.total_amount,
        // frete depende de uma chamada extra ao endpoint de shipments do ML
        // (mlOrder.shipping.id) — deixado para a próxima rodada.
        ordered_at: mlOrder.date_created,
      },
      { onConflict: 'marketplace_connection_id,external_order_id' }
    )
    .select('id')
    .single();

  if (error) throw error;

  await supabase.from('order_items').delete().eq('order_id', order.id);

  if (mlOrder.order_items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(
      mlOrder.order_items.map((item) => ({
        org_id: connection.org_id,
        order_id: order.id,
        sku: item.item.id,
        title: item.item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );
    if (itemsError) throw itemsError;
  }
}

export async function syncOrders(
  supabase: SupabaseClient,
  connection: MarketplaceConnection
): Promise<void> {
  try {
    const orders = await fetchOrders(supabase, connection);
    for (const mlOrder of orders) {
      await upsertOrder(supabase, connection, mlOrder);
    }
    await upsertSyncState(supabase, connection, 'ok');
  } catch (error) {
    await upsertSyncState(supabase, connection, 'error', (error as Error).message);
    throw error;
  }
}
