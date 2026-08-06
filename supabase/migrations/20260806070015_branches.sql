-- ============================================
-- POSTIA — Sucursales: múltiples locales por negocio
-- Migración 009
-- ============================================

create table branches (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_branches_organization on branches(organization_id);

-- RLS: los miembros de la organización administran sus propias sucursales
alter table branches enable row level security;

create policy "branches_member_all" on branches
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = branches.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = branches.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on branches to authenticated;
grant usage, select on sequence branches_id_seq to authenticated;

-- Helper: set updated_at para sucursales
create trigger trg_branches_updated_at
  before update on branches
  for each row execute function set_updated_at();
