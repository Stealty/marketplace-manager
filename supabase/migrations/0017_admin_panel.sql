-- Tela de administração de organização: super-admin global + reforço de
-- permissões do admin de organização, reaproveitando memberships.role
-- (valor 'super_admin' adicionado no migration 0016).

-- ─── Super-admin ────────────────────────────────────────────────────────────
-- não é escopado por org: um super-admin enxerga/administra qualquer organização.

create or replace function is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid() and role = 'super_admin'
  );
$$;

-- super-admin passa a satisfazer is_org_admin() para qualquer org — propaga
-- automaticamente para todas as policies que já usam essa função (update de
-- organizations, insert/update/delete de memberships), sem precisar duplicá-las.
create or replace function is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_super_admin() or exists (
    select 1 from memberships
    where org_id = target_org_id and user_id = auth.uid() and role = 'admin'
  );
$$;

-- ─── Guard contra escalação de privilégio ───────────────────────────────────
-- role agora aceita 'super_admin' na mesma coluna que um admin comum pode
-- editar: sem isso, qualquer admin de org poderia se auto-promover (ou
-- promover terceiros) a super_admin, ou alterar/remover a membership de um
-- super-admin existente.

drop policy if exists "admins manage memberships" on memberships;
create policy "admins manage memberships" on memberships
  for insert
  with check (is_org_admin(org_id) and (role <> 'super_admin' or is_super_admin()));

drop policy if exists "admins update memberships" on memberships;
create policy "admins update memberships" on memberships
  for update
  using (is_org_admin(org_id) and (role <> 'super_admin' or is_super_admin()))
  with check (is_org_admin(org_id) and (role <> 'super_admin' or is_super_admin()));

drop policy if exists "admins delete memberships" on memberships;
create policy "admins delete memberships" on memberships
  for delete
  using (is_org_admin(org_id) and (role <> 'super_admin' or is_super_admin()));

-- ─── Visibilidade e criação de organizações para super-admin ───────────────
-- is_org_member()/is_org_admin() continuam escopadas a uma org específica —
-- para listar/criar organizações que o usuário ainda não é membro, precisa de
-- policies próprias.

create policy "super admins can view all orgs" on organizations
  for select using (is_super_admin());

create policy "super admins can create orgs" on organizations
  for insert with check (is_super_admin());

create policy "super admins can view all memberships" on memberships
  for select using (is_super_admin());

-- ─── Seed do super-admin inicial ────────────────────────────────────────────
-- se a conta ainda não existir no Supabase Auth neste ambiente, este bloco
-- não faz nada — rodar o update/insert manualmente depois que ela existir.

do $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  select id into v_user_id from auth.users where email = 'comercial@taskmind.com';

  if v_user_id is not null then
    update memberships set role = 'super_admin' where user_id = v_user_id;

    if not found then
      insert into organizations (name) values ('Taskmind (interno)')
        returning id into v_org_id;
      insert into memberships (org_id, user_id, role) values (v_org_id, v_user_id, 'super_admin');
    end if;
  end if;
end $$;
