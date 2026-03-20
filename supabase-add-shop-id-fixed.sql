-- Multi-Tenant Migration: Add shop_id to all data tables
-- Dynamic shop_id assignment using earliest created shop
-- Production-safe: no data deletion, uses IF NOT EXISTS
-- ============================================================

DO $$ 
DECLARE
  v_shop_id UUID;
BEGIN
  -- Get the first (earliest) shop dynamically
  SELECT id INTO v_shop_id 
  FROM shops 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'No shops found in database. Cannot proceed.';
  END IF;

  -- Add shop_id column to clients
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='shop_id') THEN
    ALTER TABLE clients ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE clients SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE clients ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to services
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='shop_id') THEN
    ALTER TABLE services ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE services SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE services ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to transactions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='shop_id') THEN
    ALTER TABLE transactions ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE transactions SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE transactions ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='expenses' AND column_name='shop_id') THEN
    ALTER TABLE expenses ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE expenses SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE expenses ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to bookings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='shop_id') THEN
    ALTER TABLE bookings ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE bookings SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE bookings ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to barbers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='barbers' AND column_name='shop_id') THEN
    ALTER TABLE barbers ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE barbers SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE barbers ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='settings' AND column_name='shop_id') THEN
    ALTER TABLE settings ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE settings SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE settings ALTER COLUMN shop_id SET NOT NULL;

  -- Add shop_id column to visit_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visit_logs' AND column_name='shop_id') THEN
    ALTER TABLE visit_logs ADD COLUMN shop_id UUID REFERENCES shops(id);
  END IF;
  UPDATE visit_logs SET shop_id = v_shop_id WHERE shop_id IS NULL;
  ALTER TABLE visit_logs ALTER COLUMN shop_id SET NOT NULL;

END $$;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE column_name = 'shop_id'
AND table_name IN ('clients', 'services', 'transactions', 'expenses', 'bookings', 'barbers', 'settings', 'visit_logs')
ORDER BY table_name;
