-- ============================================================
-- POSTIA — Migración Supabase (SEGURO, no destructivo)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================
-- Este script es idempotente: se puede ejecutar múltiples veces.
-- Si las tablas ya existen, solo agrega las columnas/índices faltantes.
-- Si no existen, las crea desde cero.
-- ============================================================

-- ============================================================
-- 1. CREAR TABLAS (si no existen)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'POSTIA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cajero',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer JSONB NOT NULL DEFAULT '{"width":"58mm","ticketEnabled":true,"kitchenEnabled":true,"ticketCopies":1}',
  payments JSONB NOT NULL DEFAULT '{"cardCommission":5,"applyCommission":true,"roundUp":true}',
  notifications JSONB NOT NULL DEFAULT '{"sound":true,"vibration":true,"visual":true}',
  appearance JSONB NOT NULL DEFAULT '{"density":"normal","mode":"operacion","accent":"#16A34A","logoEmoji":"🌿"}',
  delivery JSONB NOT NULL DEFAULT '{"baseCost":30}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍽️',
  "order" INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🍽️',
  image TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INTEGER NOT NULL DEFAULT 0,
  stock NUMERIC NOT NULL DEFAULT 0,
  unit_label TEXT NOT NULL DEFAULT 'pieza',
  low_stock_at NUMERIC NOT NULL DEFAULT 5,
  mod_group_ids UUID[] NOT NULL DEFAULT '{}',
  promo JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mod_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'sabor',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  min INTEGER NOT NULL DEFAULT 0,
  max INTEGER NOT NULL DEFAULT 1,
  surcharge_second JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID REFERENCES salons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'libre',
  order_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  colony TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS riders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'disponible',
  current_order_id UUID,
  deliveries_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio INTEGER NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'mostrador',
  table_id UUID,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  client_phone TEXT,
  client_address TEXT,
  client_colony TEXT,
  client_reference TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  discount_reason TEXT,
  tip NUMERIC NOT NULL DEFAULT 0,
  delivery_cost NUMERIC NOT NULL DEFAULT 0,
  packaging_cost NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  coupon_code TEXT,
  coupon_id UUID,
  status TEXT NOT NULL DEFAULT 'nuevo',
  kitchen_status TEXT NOT NULL DEFAULT 'nuevo',
  payment TEXT,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  payment_info JSONB,
  cash_received NUMERIC,
  cash_change NUMERIC,
  created_by TEXT NOT NULL DEFAULT 'Sistema',
  created_by_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  rider_id UUID REFERENCES riders(id) ON DELETE SET NULL,
  locked_by UUID,
  locked_at TIMESTAMPTZ,
  next_folio INTEGER NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS caja_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_by TEXT NOT NULL DEFAULT 'Sistema',
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'abierta',
  sales JSONB NOT NULL DEFAULT '[]',
  expenses JSONB NOT NULL DEFAULT '[]',
  extra_incomes JSONB NOT NULL DEFAULT '[]',
  retiros JSONB NOT NULL DEFAULT '[]',
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  cash_counted NUMERIC,
  expected_cash NUMERIC,
  difference NUMERIC,
  rounding_profit NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL DEFAULT 'Sistema',
  user_role TEXT NOT NULL DEFAULT 'sistema',
  action TEXT NOT NULL,
  detail TEXT NOT NULL,
  order_id UUID,
  amount NUMERIC,
  before JSONB,
  after JSONB,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Nueva regla',
  when_event TEXT NOT NULL,
  then_action TEXT NOT NULL DEFAULT 'notify',
  target TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. AGREGAR COLUMNAS FALTANTES (migración segura)
-- ============================================================

-- Orders: columnas que pueden no existir en versiones anteriores
DO $$
BEGIN
  -- locked_by
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'locked_by') THEN
    ALTER TABLE orders ADD COLUMN locked_by UUID;
  END IF;
  -- locked_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'locked_at') THEN
    ALTER TABLE orders ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
  -- next_folio
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'next_folio') THEN
    ALTER TABLE orders ADD COLUMN next_folio INTEGER NOT NULL DEFAULT 1000;
  END IF;
  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'updated_at') THEN
    ALTER TABLE orders ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  -- client_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_id') THEN
    ALTER TABLE orders ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
  -- client_name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_name') THEN
    ALTER TABLE orders ADD COLUMN client_name TEXT;
  END IF;
  -- client_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_phone') THEN
    ALTER TABLE orders ADD COLUMN client_phone TEXT;
  END IF;
  -- client_address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_address') THEN
    ALTER TABLE orders ADD COLUMN client_address TEXT;
  END IF;
  -- client_colony
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_colony') THEN
    ALTER TABLE orders ADD COLUMN client_colony TEXT;
  END IF;
  -- client_reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'client_reference') THEN
    ALTER TABLE orders ADD COLUMN client_reference TEXT;
  END IF;
  -- rider_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'rider_id') THEN
    ALTER TABLE orders ADD COLUMN rider_id UUID REFERENCES riders(id) ON DELETE SET NULL;
  END IF;
  -- coupon_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_id') THEN
    ALTER TABLE orders ADD COLUMN coupon_id UUID;
  END IF;
  -- cancel_reason
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cancel_reason') THEN
    ALTER TABLE orders ADD COLUMN cancel_reason TEXT;
  END IF;
  -- created_by_role
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'created_by_role') THEN
    ALTER TABLE orders ADD COLUMN created_by_role TEXT;
  END IF;
END $$;

-- Caja sessions: updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'caja_sessions' AND column_name = 'updated_at') THEN
    ALTER TABLE caja_sessions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Tablas: updated_at (si alguna no lo tiene)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'updated_at') THEN
    ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE users ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'roles' AND column_name = 'updated_at') THEN
    ALTER TABLE roles ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'updated_at') THEN
    ALTER TABLE settings ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'updated_at') THEN
    ALTER TABLE categories ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'updated_at') THEN
    ALTER TABLE products ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mod_groups' AND column_name = 'updated_at') THEN
    ALTER TABLE mod_groups ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salons' AND column_name = 'updated_at') THEN
    ALTER TABLE salons ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tables' AND column_name = 'updated_at') THEN
    ALTER TABLE tables ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'updated_at') THEN
    ALTER TABLE clients ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'riders' AND column_name = 'updated_at') THEN
    ALTER TABLE riders ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rules' AND column_name = 'updated_at') THEN
    ALTER TABLE rules ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- ============================================================
-- 3. CONSTRAINTS (agregar si no existen)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('nuevo','preparando','listo','porcobrar','finalizado','cancelado')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_kitchen_status_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_kitchen_status_check CHECK (
      kitchen_status IN ('nuevo','preparando','listo','entregado')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_service_type_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_service_type_check CHECK (
      service_type IN ('mesa','mostrador','domicilio','menudigital')
    );
  END IF;
END $$;

-- ============================================================
-- 4. ÍNDICES (crear si no existen)
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS orders_folio_idx ON orders(folio);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_updated_at_idx ON orders(updated_at);

-- Índice parcial para locked_by (solo si la columna existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'locked_by') THEN
    CREATE INDEX IF NOT EXISTS orders_locked_by_idx ON orders(locked_by) WHERE locked_by IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- 5. ROW LEVEL SECURITY + POLÍTICAS
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE mod_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON organizations FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON roles FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON products FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mod_groups' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON mod_groups FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salons' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON salons FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tables' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON tables FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clients' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON clients FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'riders' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON riders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON orders FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'caja_sessions' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON caja_sessions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'audit' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON audit FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rules' AND policyname = 'anon_all') THEN
    CREATE POLICY "anon_all" ON rules FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 6. DATA SEED
-- ============================================================

INSERT INTO organizations (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'POSTIA')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. FUNCIONES RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_next_folio()
RETURNS INTEGER AS $$
DECLARE
  f INTEGER;
BEGIN
  LOCK TABLE orders IN EXCLUSIVE MODE;
  SELECT COALESCE(MAX(folio), 0) + 1 INTO f FROM orders;
  RETURN f;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_pay_order(p_order_id UUID, p_machine_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_locked UUID;
  v_locked_at TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_updated INT;
BEGIN
  SELECT locked_by, locked_at INTO v_locked, v_locked_at
  FROM orders WHERE id = p_order_id;

  IF v_locked IS NOT NULL AND v_locked_at < v_now - INTERVAL '5 minutes' THEN
    v_locked := NULL;
  END IF;

  IF v_locked IS NULL THEN
    UPDATE orders SET locked_by = p_machine_id, locked_at = v_now
    WHERE id = p_order_id AND (locked_by IS NULL OR locked_at < v_now - INTERVAL '5 minutes');
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
  ELSIF v_locked = p_machine_id THEN
    UPDATE orders SET locked_at = v_now WHERE id = p_order_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION release_order_lock(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE orders SET locked_by = NULL, locked_at = NULL
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. NOTA REALTIME
-- ============================================================
-- Ejecutar solo una vez:
-- PUBLICATION supabase_realtime ADD TABLE orders;
-- (o desde Dashboard > Replication > orders)
