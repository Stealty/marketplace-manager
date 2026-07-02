-- Estado de sincronização por conexão/recurso — base do cache-aside das telas
-- (evita depender de cron: a própria leitura da tela decide se precisa
-- atualizar em background ou não, olhando last_synced_at).

create table sync_state (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  resource text not null,
  last_synced_at timestamptz,
  last_status text,
  last_error text,
  unique (marketplace_connection_id, resource)
);
create index sync_state_org_idx on sync_state (org_id);

alter table sync_state enable row level security;
create policy "org members can access" on sync_state
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
