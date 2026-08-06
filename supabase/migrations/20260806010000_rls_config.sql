-- ============================================
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
