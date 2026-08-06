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
  for each row execute function set_updated_at();