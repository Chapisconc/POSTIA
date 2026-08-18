-- ============================================
-- POSTIA — Promociones
-- Migración 011
-- ============================================

create table promotions (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  discount_type text not null check (discount_type in ('porcentaje', 'fijo')),
  value numeric(12,2) not null check (value >= 0),
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_promotions_organization on promotions(organization_id);

-- RLS: los miembros de la organización administran sus propias promociones
alter table promotions enable row level security;

create policy "promotions_member_all" on promotions
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = promotions.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = promotions.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on promotions to authenticated;
grant usage, select on sequence promotions_id_seq to authenticated;

-- Helper: set updated_at para promociones
create trigger trg_promotions_updated_at
  before update on promotions
  for each row execute function set_updated_at();
