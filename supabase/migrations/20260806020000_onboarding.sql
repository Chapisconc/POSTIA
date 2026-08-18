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
