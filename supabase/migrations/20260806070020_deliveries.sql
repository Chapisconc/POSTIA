-- ============================================
-- POSTIA — Delivery: entregas por pedido
-- ============================================

create table deliveries (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id bigint not null references orders(id) on delete cascade,
  courier text,
  status text not null default 'asignado' check (status in ('asignado','en_camino','entregado')),
  note text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deliveries_organization on deliveries(organization_id);

-- RLS: los miembros de la organización administran sus propias entregas
alter table deliveries enable row level security;

create policy "deliveries_member_all" on deliveries
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = deliveries.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = deliveries.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on deliveries to authenticated;
grant usage, select on sequence deliveries_id_seq to authenticated;

-- Helper: set updated_at para entregas
create trigger trg_deliveries_updated_at
  before update on deliveries
  for each row execute function set_updated_at();
