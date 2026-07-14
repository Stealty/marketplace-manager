-- Ninguém pode alterar a própria role de membership via API — nem um
-- super-admin deve conseguir se rebaixar/promover a si mesmo por aqui. Sem
-- isso, um admin comum poderia tentar se auto-promover a super-admin editando
-- a própria linha (a checagem de target role sozinha, do migration 0017, não
-- cobre esse caso da forma mais robusta: trava por linha própria, não só por
-- valor de destino).

drop policy if exists "admins update memberships" on memberships;
create policy "admins update memberships" on memberships
  for update
  using (
    is_org_admin(org_id)
    and (role <> 'super_admin' or is_super_admin())
    and user_id <> auth.uid()
  )
  with check (
    is_org_admin(org_id)
    and (role <> 'super_admin' or is_super_admin())
    and user_id <> auth.uid()
  );
