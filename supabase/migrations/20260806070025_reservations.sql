-- ============================================
-- POSTIA — Reservaciones: reservas de mesas y clientes
-- ============================================

create table reservations (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id bigint references customers(id) on delete set null,
  name text not null,
  phone text,
  guests int not null default 1 check (guests > 0),
  reserved_at date not null,
  reserved_time time not null,
  status text not null default 'confirmada' check (status in ('confirmada','cancelada','completada')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reservations_organization on reservations(organization_id);

-- RLS: los miembros de la organización administran sus propias reservaciones
alter table reservations enable row level security;

create policy "reservations_member_all" on reservations
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = reservations.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = reservations.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on reservations to authenticated;
grant usage, select on sequence reservations_id_seq to authenticated;

-- Helper: set updated_at para reservaciones
create trigger trg_reservations_updated_at
  before update on reservations
  for each row execute function set_updated_at();
