-- Migración: folio de pedidos por día (reinicia en #1 cada día)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS folio_date DATE NOT NULL DEFAULT CURRENT_DATE;
DROP INDEX IF EXISTS orders_folio_idx;
CREATE UNIQUE INDEX orders_folio_idx ON orders(folio_date, folio);

CREATE OR REPLACE FUNCTION get_next_folio(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  f INTEGER;
BEGIN
  LOCK TABLE orders IN EXCLUSIVE MODE;
  SELECT COALESCE(MAX(folio), 0) + 1 INTO f FROM orders WHERE folio_date = p_date;
  RETURN f;
END;
$$ LANGUAGE plpgsql;
