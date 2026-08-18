
-- Idempotent cleanup (drops in reverse dependency order)
drop table if exists deliveries cascade;
drop table if exists invoices cascade;
drop table if exists promotions cascade;
drop table if exists loyalty_entries cascade;
drop table if exists reservations cascade;
drop table if exists branches cascade;
drop table if exists inventory_movements cascade;
drop table if exists cash_registers cascade;
drop table if exists customers cascade;
drop table if exists orders cascade;
drop table if exists products cascade;
drop table if exists categories cascade;
drop table if exists order_statuses cascade;
drop table if exists order_types cascade;
drop table if exists payment_methods cascade;
drop table if exists org_modules cascade;
drop table if exists org_settings cascade;
drop table if exists role_permissions cascade;
drop table if exists profiles cascade;
drop table if exists organizations cascade;
drop table if exists modules cascade;
drop table if exists permissions cascade;

-- ============================================
-- POSTIA — SQL consolidado para despliegue (Supabase remoto)
-- Copiar TODO este bloque en el SQL Editor de Supabase
-- ============================================
-- 1) Limpiar tablas existentes (idempotente, dev)
--    Si hay datos reales, comentar esta sección.
do $$
declare
  r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('truncate table %I.%I cascade', 'public', r.tablename);
  end loop;
end $$;

-- ============================================
-- POSTIA — Fundación multi-tenant + motor de configuración
-- Migración 001
-- ============================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================
-- Organizations (tenant)
-- ============================================
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_slug on organizations(slug);

-- ============================================
-- Profiles (users)
-- ============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'cajero', 'cocina', 'mesero')),
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_organization on profiles(organization_id);

-- ============================================
-- Modules catalog (static reference)
-- ============================================
create table modules (
  key text primary key,
  label text not null,
  description text not null,
  icon text default 'square',
  position int not null default 0
);

insert into modules (key, label, description, icon, position) values
  ('pos',            'POS',             'Punto de venta',                       'shopping-cart', 0),
  ('productos',      'Productos',       'Catálogo de productos',               'package',        1),
  ('caja',           'Caja',            'Apertura y cierre de caja',            'bank',           2),
  ('reportes',       'Reportes',        'Reportes de ventas y productos',       'chart-bar',      3),
  ('inventario',     'Inventario',      'Recetas, ingredientes, compras',       'warehouse',      4),
  ('cocina',         'Cocina',          'Pantalla de cocina',                   'fire',           5),
  ('delivery',       'Delivery',        'Repartidores y GPS',                   'truck',          6),
  ('reservaciones',  'Reservaciones',   'Reservas de mesas',                    'calendar',       7),
  ('facturacion',    'Facturación',     'Facturas y CFDI',                      'receipt',        8),
  ('clientes',       'Clientes',        'Registro de clientes',                 'users',          9),
  ('promociones',    'Promociones',     'Descuentos y ofertas',                 'tag',            10),
  ('puntos',         'Programa de puntos','Puntos y recompensas',                'star',           11),
  ('sucursales',     'Sucursales',      'Múltiples sucursales',                 'building',       12);

-- ============================================
-- Organization modules (which are active per org)
-- ============================================
create table org_modules (
  organization_id uuid references organizations(id) on delete cascade,
  module_key text references modules(key) on delete cascade,
  primary key (organization_id, module_key)
);

-- ============================================
-- Order statuses (configurable per org)
-- ============================================
create table order_statuses (
  id bigint generated always as identity primary key,
  organization_id uuid references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  color text default '#6B7280',
  icon text default 'circle',
  position int not null default 0,
  notify_kitchen boolean not null default false,
  permite_cobro boolean not null default false,
  unique (organization_id, key),
  unique (organization_id, position)
);

-- ============================================
-- Order types (configurable per org)
-- ============================================
create table order_types (
  id bigint generated always as identity primary key,
  organization_id uuid references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  icon text default 'circle',
  position int not null default 0,
  requires_address boolean not null default false,
  requires_phone boolean not null default false,
  unique (organization_id, key),
  unique (organization_id, position)
);

-- ============================================
-- Payment methods (catalog + per-org activation)
-- ============================================
create table payment_methods (
  id bigint generated always as identity primary key,
  organization_id uuid references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  icon text default 'credit-card',
  position int not null default 0,
  commission_rate numeric(5,2) default 0,
  unique (organization_id, key),
  unique (organization_id, position)
);

-- ============================================
-- Permissions catalog
-- ============================================
create table permissions (
  key text primary key,
  label text not null,
  description text not null
);

insert into permissions (key, label, description) values
  ('orders.create',       'Crear pedidos',              'Puede crear un nuevo pedido'),
  ('orders.cancel',       'Cancelar pedidos',           'Puede cancelar pedidos existentes'),
  ('orders.edit',         'Editar pedidos',             'Puede modificar pedidos pendientes'),
  ('orders.view',         'Ver pedidos',                'Puede ver la lista de pedidos'),
  ('products.create',     'Crear productos',            'Puede agregar productos al catálogo'),
  ('products.edit',       'Editar productos',           'Puede modificar productos existentes'),
  ('products.delete',     'Eliminar productos',         'Puede eliminar productos del catálogo'),
  ('products.view',       'Ver productos',              'Puede ver el catálogo de productos'),
  ('prices.edit',         'Editar precios',             'Puede modificar precios de productos'),
  ('discounts.apply',     'Aplicar descuentos',         'Puede aplicar descuentos en pedidos'),
  ('cash.open',           'Abrir caja',                 'Puede abrir una sesión de caja'),
  ('cash.close',          'Cerrar caja',                'Puede cerrar la sesión de caja'),
  ('cash.view',           'Ver ganancias',              'Puede ver reportes de caja y ganancias'),
  ('receipt.print',       'Reimprimir tickets',         'Puede reimprimir tickets'),
  ('settings.view',       'Ver configuración',          'Puede ver la configuración del negocio'),
  ('settings.edit',       'Editar configuración',       'Puede modificar la configuración del negocio');

-- ============================================
-- Role permissions (granular, per-org)
-- ============================================
create table role_permissions (
  organization_id uuid references organizations(id) on delete cascade,
  role text not null,
  permission_key text references permissions(key) on delete cascade,
  granted boolean not null default true,
  primary key (organization_id, role, permission_key)
);

-- ============================================
-- Organization settings (JSONB feature flags)
-- ============================================
create table org_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ============================================
-- Helper: set updated_at
-- ============================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated_at
  before update on organizations
  for each row execute function set_updated_at();

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger trg_org_settings_updated_at
  before update on org_settings
  for each row execute function set_updated_at();-- ============================================
-- POSTIA — RLS y permisos para el motor de configuración
-- Migración 002
-- ============================================

-- Catálogos de referencia (lectura pública para anon y authenticated)
alter table modules enable row level security;
create policy "modules_public_read" on modules
  for select to anon, authenticated using (true);

alter table permissions enable row level security;
create policy "permissions_public_read" on permissions
  for select to anon, authenticated using (true);

-- Configuración por organización (lectura temporal abierta a anon mientras
-- no exista auth; se endurecerá en la fase de autenticación)
alter table org_modules enable row level security;
create policy "org_modules_read" on org_modules
  for select to anon, authenticated using (true);

alter table org_settings enable row level security;
create policy "org_settings_read" on org_settings
  for select to anon, authenticated using (true);

alter table order_statuses enable row level security;
create policy "order_statuses_read" on order_statuses
  for select to anon, authenticated using (true);

alter table order_types enable row level security;
create policy "order_types_read" on order_types
  for select to anon, authenticated using (true);

alter table payment_methods enable row level security;
create policy "payment_methods_read" on payment_methods
  for select to anon, authenticated using (true);

alter table role_permissions enable row level security;
create policy "role_permissions_read" on role_permissions
  for select to anon, authenticated using (true);

-- Datos sensibles: organizations y profiles quedan protegidos
-- (sin políticas de SELECT para anon; solo acceso por service_role)
alter table organizations enable row level security;
alter table profiles enable row level security;

-- Grants explícitos por si auto_expose_new_tables sigue en su default (false)
grant select on modules to anon, authenticated;
grant select on permissions to anon, authenticated;
grant select on org_modules to anon, authenticated;
grant select on org_settings to anon, authenticated;
grant select on order_statuses to anon, authenticated;
grant select on order_types to anon, authenticated;
grant select on payment_methods to anon, authenticated;
grant select on role_permissions to anon, authenticated;
-- ============================================
-- POSTIA — Onboarding: creación atómica de negocio
-- Migración 003
-- ============================================

-- Crea la organización del usuario autenticado junto con su perfil de owner,
-- los módulos por defecto, los settings iniciales y los catálogos
-- (estados de pedido, tipos de pedido, métodos de pago) con valores por defecto.
create or replace function create_organization(
  org_name text,
  org_slug text,
  owner_display_name text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  new_org_id uuid;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  if org_name is null or trim(org_name) = '' then
    raise exception 'El nombre del negocio es obligatorio';
  end if;

  insert into organizations (name, slug)
  values (trim(org_name), lower(trim(org_slug)))
  returning id into new_org_id;

  insert into profiles (id, organization_id, role, display_name)
  values (uid, new_org_id, 'owner', coalesce(owner_display_name, trim(org_name)));

  insert into org_modules (organization_id, module_key)
  select new_org_id, key from modules
  where key in ('pos', 'productos', 'caja', 'reportes', 'clientes');

  insert into org_settings (organization_id, settings)
  values (
    new_org_id,
    '{"moneda": "MXN", "impuestos": {"activo": true, "porcentaje": 16}}'::jsonb
  );

  insert into order_statuses (organization_id, key, label, color, position, notify_kitchen, permite_cobro) values
    (new_org_id, 'nuevo',     'Nuevo',      '#3B82F6', 0, true,  false),
    (new_org_id, 'preparando','Preparando', '#F59E0B', 1, true,  false),
    (new_org_id, 'listo',     'Listo',      '#10B981', 2, false, false),
    (new_org_id, 'entregado', 'Entregado',  '#6B7280', 3, false, true),
    (new_org_id, 'pagado',    'Pagado',     '#10B981', 4, false, true),
    (new_org_id, 'cancelado', 'Cancelado',  '#EF4444', 5, false, false);

  insert into order_types (organization_id, key, label, position, requires_address, requires_phone) values
    (new_org_id, 'mesa',        'En mesa',     0, false, false),
    (new_org_id, 'para_llevar', 'Para llevar', 1, false, false),
    (new_org_id, 'delivery',    'A domicilio', 2, true,  true);

  insert into payment_methods (organization_id, key, label, position) values
    (new_org_id, 'efectivo', 'Efectivo', 0),
    (new_org_id, 'tarjeta',  'Tarjeta',  1);

  return new_org_id;
end;
$$;

grant execute on function create_organization(text, text, text) to authenticated;
-- ============================================
-- POSTIA — RLS: perfiles y organizaciones legibles por sus miembros
-- Migración 004
-- ============================================

-- El usuario puede leer su propio perfil
create policy "profiles_own_read" on profiles
  for select to authenticated
  using (auth.uid() = id);

-- Los miembros de una organización pueden leerla
create policy "organizations_member_read" on organizations
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.organization_id = organizations.id
        and p.id = auth.uid()
    )
  );

-- El usuario puede actualizar su propio perfil
create policy "profiles_own_update" on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Grants base (las tablas nuevas no se auto-exponen por defecto)
grant select on profiles to authenticated;
grant select on organizations to authenticated;
grant update on profiles to authenticated;
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
-- 006_orders.sql
-- Pedidos del POS. Los items son un snapshot (nombre/precio al momento de la venta).
-- El flujo de estados/tipos/métodos vive en order_statuses / order_types / payment_methods.

create table public.orders (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_type_id bigint references public.order_types(id),
  status_id bigint references public.order_statuses(id),
  payment_method_id bigint references public.payment_methods(id),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_organization_id_idx on public.orders(organization_id);
create index orders_status_id_idx on public.orders(status_id);

alter table public.orders enable row level security;

create policy "orders_member_all" on public.orders
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.organization_id = orders.organization_id
        and p.id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.organization_id = orders.organization_id
        and p.id = auth.uid()
    )
  );

-- trigger updated_at
create trigger orders_updated_at
  before update on public.orders
  for each row execute function set_updated_at();

-- grants
grant select, insert, update, delete on public.orders to authenticated;
grant usage, select on sequence public.orders_id_seq to authenticated;
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
