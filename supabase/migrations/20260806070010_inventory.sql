-- ============================================
-- POSTIA — Inventario: stock de productos y movimientos
-- Migración 008
-- ============================================

-- Stock acumulado en cada producto del catálogo
alter table products add column stock int not null default 0;

create table inventory_movements (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id bigint not null references products(id) on delete cascade,
  qty int not null,
  type text not null check (type in ('entrada','salida')),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_inventory_movements_organization on inventory_movements(organization_id);

-- RLS: los miembros de la organización administran sus propios movimientos
alter table inventory_movements enable row level security;

create policy "inventory_movements_member_all" on inventory_movements
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = inventory_movements.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = inventory_movements.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on inventory_movements to authenticated;
grant usage, select on sequence inventory_movements_id_seq to authenticated;
