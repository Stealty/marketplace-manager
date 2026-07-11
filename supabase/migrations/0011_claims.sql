-- Reclamações e devoluções (post-purchase claims da API do Mercado Livre).
-- NOTE: a API de claims migrou para /post-purchase/v1/claims/ em 2024 (a v1
-- antiga em /claims/ foi descontinuada) — nomes de campo abaixo vêm de
-- documentação indireta, não da doc oficial (fetch direto retornou 403).
-- Revalidar assim que houver uma reclamação real numa conta conectada.

create table claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  order_id uuid references orders(id),
  external_claim_id text not null,
  external_order_id text,
  type text,
  stage text,
  status text,
  reason text,
  seller_available_actions text[] not null default '{}',
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  unique (marketplace_connection_id, external_claim_id)
);
create index claims_org_idx on claims (org_id);
create index claims_order_idx on claims (order_id);

create table claim_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  claim_id uuid not null references claims(id) on delete cascade,
  external_message_id text,
  sender text not null,
  body text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (claim_id, external_message_id)
);
create index claim_messages_org_idx on claim_messages (org_id);
create index claim_messages_claim_idx on claim_messages (claim_id);

alter table claims enable row level security;
create policy "org members can access" on claims
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));

alter table claim_messages enable row level security;
create policy "org members can access" on claim_messages
  for all using (is_org_member(org_id)) with check (is_org_member(org_id));
