-- ============================================
-- POSTIA — Productos: categorías y catálogo
-- Migración 005
-- ============================================

create table categories (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  position int not null default 0,
  unique (organization_id, name)
);

create table products (
  id bigint generated always as identity primary key,
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id bigint references categories(id) on delete set null,
  name text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_organization on products(organization_id);
create index idx_categories_organization on categories(organization_id);

-- RLS: los miembros de la organización administran su propio catálogo
alter table categories enable row level security;
alter table products enable row level security;

create policy "categories_member_all" on categories
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = categories.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = categories.organization_id
        and p.id = auth.uid()
    )
  );

create policy "products_member_all" on products
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = products.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.organization_id = products.organization_id
        and p.id = auth.uid()
    )
  );

grant select, insert, update, delete on categories to authenticated;
grant select, insert, update, delete on products to authenticated;
grant usage, select on sequence categories_id_seq to authenticated;
grant usage, select on sequence products_id_seq to authenticated;

-- Helper: set updated_at para productos
create trigger trg_products_updated_at
  before update on products
  for each row execute function set_updated_at();
