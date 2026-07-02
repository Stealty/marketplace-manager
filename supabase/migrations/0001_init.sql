-- Marketplace Command Center — schema inicial (multi-tenant, RLS por organização)

create extension if not exists "pgcrypto";

create type membership_role as enum ('admin', 'atendente', 'financeiro');
create type marketplace_type as enum (
  'mercado_livre', 'amazon', 'tiktok_shop', 'shopee', 'magalu', 'americanas', 'shein'
);
create type connection_status as enum ('connected', 'expired', 'error', 'disconnected');
create type sync_job_status as enum ('pending', 'running', 'done', 'failed');
create type event_severity as enum ('info', 'warning', 'critical');

-- ─── Tenancy ────────────────────────────────────────────────────────────────

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role membership_role not null default 'atendente',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

-- security definer helpers avoid RLS recursion on memberships itself
create or replace function is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org_id and user_id = auth.uid()
  );
$$;

create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where org_id = target_org_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Marketplace / ERP connections ──────────────────────────────────────────
-- uma org pode ter várias conexões do mesmo marketplace (multi-conta/multi-marca)

create table marketplace_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace marketplace_type not null,
  label text not null,
  status connection_status not null default 'connected',
  external_account_id text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  connected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index marketplace_connections_org_idx on marketplace_connections (org_id);

create table erp_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null default 'bling',
  label text not null,
  status connection_status not null default 'connected',
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index erp_connections_org_idx on erp_connections (org_id);

-- ─── Catálogo / estoque ─────────────────────────────────────────────────────

create table products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  sku text not null,
  title text not null,
  package_weight_kg numeric,
  package_height_cm numeric,
  package_width_cm numeric,
  package_length_cm numeric,
  created_at timestamptz not null default now(),
  unique (org_id, sku)
);
create index products_org_idx on products (org_id);

create table product_listings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  external_id text not null,
  title text,
  price numeric,
  status text,
  quality_score numeric,
  created_at timestamptz not null default now(),
  unique (marketplace_connection_id, external_id)
);
create index product_listings_org_idx on product_listings (org_id);
create index product_listings_product_idx on product_listings (product_id);

create table stock_levels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (product_id)
);
create index stock_levels_org_idx on stock_levels (org_id);

-- ─── Pedidos / frete ────────────────────────────────────────────────────────
-- freight_ratio replica o indicador "% Frete/Pedido" validado no protótipo

create table orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  external_order_id text not null,
  status text,
  order_value numeric,
  freight_value numeric,
  freight_ratio numeric generated always as (
    case when order_value is not null and order_value <> 0
      then round((freight_value / order_value) * 100, 2)
      else null end
  ) stored,
  is_free_shipping boolean not null default false,
  ordered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (marketplace_connection_id, external_order_id)
);
create index orders_org_idx on orders (org_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_listing_id uuid references product_listings(id),
  sku text,
  title text,
  quantity integer not null default 1,
  unit_price numeric
);
create index order_items_org_idx on order_items (org_id);
create index order_items_order_idx on order_items (order_id);

-- ─── Perguntas / chat / reputação ───────────────────────────────────────────

create table questions_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  product_listing_id uuid references product_listings(id),
  external_thread_id text not null,
  question_text text,
  status text not null default 'pending',
  last_message_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (marketplace_connection_id, external_thread_id)
);
create index questions_threads_org_idx on questions_threads (org_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  thread_id uuid not null references questions_threads(id) on delete cascade,
  sender text not null,
  body text,
  sent_at timestamptz not null default now()
);
create index chat_messages_org_idx on chat_messages (org_id);
create index chat_messages_thread_idx on chat_messages (thread_id);

create table reputation_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid not null references marketplace_connections(id) on delete cascade,
  metric_date date not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (marketplace_connection_id, metric_date)
);
create index reputation_metrics_org_idx on reputation_metrics (org_id);

-- ─── Jobs / eventos (base para alertas na v2) ──────────────────────────────

create table sync_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  marketplace_connection_id uuid references marketplace_connections(id) on delete cascade,
  job_type text not null,
  payload jsonb not null default '{}',
  status sync_job_status not null default 'pending',
  attempts integer not null default 0,
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index sync_jobs_status_run_idx on sync_jobs (status, run_at);
create index sync_jobs_org_idx on sync_jobs (org_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  type text not null,
  severity event_severity not null default 'info',
  entity_type text,
  entity_id uuid,
  message text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index events_org_created_idx on events (org_id, created_at desc);

-- ─── Beta access / billing (schema pronto, não usado para bloquear no MVP) ──

create table beta_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table stripe_customers (
  org_id uuid primary key references organizations(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table organizations enable row level security;
alter table memberships enable row level security;
alter table marketplace_connections enable row level security;
alter table erp_connections enable row level security;
alter table products enable row level security;
alter table product_listings enable row level security;
alter table stock_levels enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table questions_threads enable row level security;
alter table chat_messages enable row level security;
alter table reputation_metrics enable row level security;
alter table sync_jobs enable row level security;
alter table events enable row level security;
alter table stripe_customers enable row level security;
alter table subscriptions enable row level security;

create policy "members can view their orgs" on organizations
  for select using (is_org_member(id));
create policy "admins can update their org" on organizations
  for update using (is_org_admin(id));

create policy "members can view memberships in their org" on memberships
  for select using (is_org_member(org_id));
create policy "admins manage memberships" on memberships
  for insert with check (is_org_admin(org_id));
create policy "admins update memberships" on memberships
  for update using (is_org_admin(org_id));
create policy "admins delete memberships" on memberships
  for delete using (is_org_admin(org_id));

-- todas as tabelas de domínio seguem o mesmo padrão: acesso total para membros da org
do $$
declare
  t text;
begin
  foreach t in array array[
    'marketplace_connections', 'erp_connections', 'products', 'product_listings',
    'stock_levels', 'orders', 'order_items', 'questions_threads', 'chat_messages',
    'reputation_metrics', 'sync_jobs', 'events', 'stripe_customers', 'subscriptions'
  ]
  loop
    execute format(
      'create policy "org members can access" on %I for all using (is_org_member(org_id)) with check (is_org_member(org_id));',
      t
    );
  end loop;
end $$;
