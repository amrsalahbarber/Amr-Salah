-- Multi-Tenant Migration: Add shop_id to all data tables
-- Dynamic shop_id assignment using earliest created shop
-- ============================================================

DO $$ 
DECLARE
  v_shop_id UUID;
  v_shop_name TEXT;
  v_clients_updated INT;
  v_services_updated INT;
  v_transactions_updated INT;
  v_expenses_updated INT;
  v_bookings_updated INT;
  v_barbers_updated INT;
  v_settings_updated INT;
  v_visit_logs_updated INT;
BEGIN
  -- Get the first (earliest) shop dynamically
  SELECT id, name INTO v_shop_id, v_shop_name 
  FROM shops 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_shop_id IS NULL THEN
    RAISE EXCEPTION 'No shops found in database. Cannot migrate.';
  END IF;

  RAISE NOTICE 'Starting migration for shop: % (%)', v_shop_name, v_shop_id;

  -- Step 1: Add shop_id column to clients table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='clients' AND column_name='shop_id'
  ) THEN
    ALTER TABLE clients ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to clients table';
  END IF;

  -- Step 2: Add shop_id column to services table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='services' AND column_name='shop_id'
  ) THEN
    ALTER TABLE services ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to services table';
  END IF;

  -- Step 3: Add shop_id column to transactions table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='transactions' AND column_name='shop_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to transactions table';
  END IF;

  -- Step 4: Add shop_id column to expenses table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='expenses' AND column_name='shop_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to expenses table';
  END IF;

  -- Step 5: Add shop_id column to bookings table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='bookings' AND column_name='shop_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to bookings table';
  END IF;

  -- Step 6: Add shop_id column to barbers table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='barbers' AND column_name='shop_id'
  ) THEN
    ALTER TABLE barbers ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to barbers table';
  END IF;

  -- Step 7: Add shop_id column to settings table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='settings' AND column_name='shop_id'
  ) THEN
    ALTER TABLE settings ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to settings table';
  END IF;

  -- Step 8: Add shop_id column to visit_logs table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='visit_logs' AND column_name='shop_id'
  ) THEN
    ALTER TABLE visit_logs ADD COLUMN shop_id UUID REFERENCES shops(id);
    RAISE NOTICE 'Added shop_id column to visit_logs table';
  END IF;

  -- ============================================================
  -- Step 9: Populate shop_id for all existing rows with NULL values
  -- ============================================================

  UPDATE clients SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_clients_updated = ROW_COUNT;

  UPDATE services SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_services_updated = ROW_COUNT;

  UPDATE transactions SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_transactions_updated = ROW_COUNT;

  UPDATE expenses SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_expenses_updated = ROW_COUNT;

  UPDATE bookings SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_bookings_updated = ROW_COUNT;

  UPDATE barbers SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_barbers_updated = ROW_COUNT;

  UPDATE settings SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_settings_updated = ROW_COUNT;

  UPDATE visit_logs SET shop_id = v_shop_id WHERE shop_id IS NULL;
  GET DIAGNOSTICS v_visit_logs_updated = ROW_COUNT;

  RAISE NOTICE 'Updated rows - clients: %, services: %, transactions: %, expenses: %, bookings: %, barbers: %, settings: %, visit_logs: %',
    v_clients_updated, v_services_updated, v_transactions_updated, v_expenses_updated,
    v_bookings_updated, v_barbers_updated, v_settings_updated, v_visit_logs_updated;

  -- Step 10: Make shop_id NOT NULL for all tables
  ALTER TABLE clients ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE services ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE transactions ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE expenses ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE bookings ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE barbers ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE settings ALTER COLUMN shop_id SET NOT NULL;
  ALTER TABLE visit_logs ALTER COLUMN shop_id SET NOT NULL;

  RAISE NOTICE 'Migration completed successfully for shop: % (%)', v_shop_name, v_shop_id;
END $$;


-- ============================================================
-- VERIFICATION QUERIES (Run these after migration completes)
-- ============================================================

-- 1. Show all shops in database
SELECT id, name, owner_email, subscription_status, created_at 
FROM shops 
ORDER BY created_at ASC;

-- 2. Verify shop_id columns exist in all tables
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('clients', 'services', 'transactions', 'expenses', 'bookings', 'barbers', 'settings', 'visit_logs')
AND column_name = 'shop_id'
ORDER BY table_name;

-- 3. Count rows per table with shop_id populated and NULL counts
SELECT 
  'clients' as table_name,
  COUNT(*) as total_rows,
  COUNT(shop_id) as rows_with_shop_id,
  COUNT(*) FILTER (WHERE shop_id IS NULL) as rows_with_null_shop_id,
  COUNT(DISTINCT shop_id) as unique_shops
FROM clients
UNION ALL
SELECT 'services', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM services
UNION ALL
SELECT 'transactions', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM transactions
UNION ALL
SELECT 'expenses', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM expenses
UNION ALL
SELECT 'bookings', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM bookings
UNION ALL
SELECT 'barbers', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM barbers
UNION ALL
SELECT 'settings', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM settings
UNION ALL
SELECT 'visit_logs', COUNT(*), COUNT(shop_id), COUNT(*) FILTER (WHERE shop_id IS NULL), COUNT(DISTINCT shop_id)
FROM visit_logs
ORDER BY table_name;

-- 4. Verify foreign key constraints exist
SELECT constraint_name, table_name, column_name, referenced_table_name
FROM information_schema.key_column_usage
WHERE table_name IN ('clients', 'services', 'transactions', 'expenses', 'bookings', 'barbers', 'settings', 'visit_logs')
AND column_name = 'shop_id'
ORDER BY table_name;
