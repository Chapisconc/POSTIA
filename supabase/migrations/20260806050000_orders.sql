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
