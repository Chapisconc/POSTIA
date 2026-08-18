-- ============================================
-- POSTIA — Clientes: catálogo por negocio
-- Migración 007
-- ============================================

create table customers (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_organization on customers(organization_id);

-- RLS: los miembros de la organización administran sus propios clientes
alter table customers enable row level security;

create policy "customers_member_all" on customers
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = customers.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = customers.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on customers to authenticated;
grant usage, select on sequence customers_id_seq to authenticated;

-- Helper: set updated_at para clientes
create trigger trg_customers_updated_at
  before update on customers
  for each row execute function set_updated_at();
