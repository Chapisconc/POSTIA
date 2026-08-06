-- ============================================
-- POSTIA — Caja: registros de apertura y cierre
-- Migración 008
-- ============================================

create table cash_registers (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  opening_amount numeric(12,2) not null default 0,
  closing_amount numeric(12,2),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status text not null default 'abierta' check (status in ('abierta','cerrada')),
  opened_by uuid references auth.users(id),
  closed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cash_registers_organization on cash_registers(organization_id);

-- RLS: los miembros de la organización administran su propia caja
alter table cash_registers enable row level security;

create policy "cash_registers_member_all" on cash_registers
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = cash_registers.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = cash_registers.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on cash_registers to authenticated;
grant usage, select on sequence cash_registers_id_seq to authenticated;

-- Helper: set updated_at para caja
create trigger trg_cash_registers_updated_at
  before update on cash_registers
  for each row execute function set_updated_at();
