-- ============================================
-- POSTIA — RLS: perfiles y organizaciones legibles por sus miembros
-- Migración 004
-- ============================================

-- El usuario puede leer su propio perfil
create policy "profiles_own_read" on profiles
  for select to authenticated
  using (auth.uid() = id);

-- Los miembros de una organización pueden leerla
create policy "organizations_member_read" on organizations
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = organizations.id
        and p.id = auth.uid()
    )
  );

-- El usuario puede actualizar su propio perfil
create policy "profiles_own_update" on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Grants base (las tablas nuevas no se auto-exponen por defecto)
grant select on profiles to authenticated;
grant select on organizations to authenticated;
grant update on profiles to authenticated;
