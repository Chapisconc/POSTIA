-- ============================================
-- POSTIA — Puntos (lealtad)
-- Migración 012
-- ============================================

create table loyalty_entries (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id bigint not null references customers(id) on delete cascade,
  points int not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_loyalty_entries_organization on loyalty_entries(organization_id);

-- RLS: los miembros de la organización administran los puntos de sus clientes
alter table loyalty_entries enable row level security;

create policy "loyalty_entries_member_all" on loyalty_entries
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = loyalty_entries.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = loyalty_entries.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on loyalty_entries to authenticated;
grant usage, select on sequence loyalty_entries_id_seq to authenticated;
