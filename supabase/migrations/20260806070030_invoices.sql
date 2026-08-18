-- ============================================
-- POSTIA — Facturación (CFDI)
-- Migración 010
-- ============================================

create table invoices (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id bigint not null references orders(id) on delete cascade unique,
  rfc text not null,
  customer_name text,
  cfdi_status text not null default 'pendiente'
    check (cfdi_status in ('pendiente', 'emitida')),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_invoices_organization on invoices(organization_id);

-- RLS: los miembros de la organización administran sus propias facturas
alter table invoices enable row level security;

create policy "invoices_member_all" on invoices
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = invoices.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = invoices.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on invoices to authenticated;
grant usage, select on sequence invoices_id_seq to authenticated;

-- Helper: set updated_at para facturas
create trigger trg_invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();
