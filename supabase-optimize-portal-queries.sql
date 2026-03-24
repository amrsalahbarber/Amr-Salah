-- ============================================================================
-- PERFORMANCE OPTIMIZATION: Add indexes for portal queries
-- ============================================================================
-- Problem: Services and barbers taking a long time to load via RLS
-- Solution: Add strategic indexes to speed up filtering queries

-- Index for services RLS filtering (shop_id + active)
CREATE INDEX IF NOT EXISTS idx_services_shop_active 
ON services(shop_id, active) 
WHERE active = TRUE;

-- Index for barbers RLS filtering (shop_id + active)
CREATE INDEX IF NOT EXISTS idx_barbers_shop_active 
ON barbers(shop_id, active) 
WHERE active = TRUE;

-- Index for clients RLS filtering (shop_id + phone - for booking lookup)
CREATE INDEX IF NOT EXISTS idx_clients_shop_phone 
ON clients(shop_id, phone);

-- Index for portal_users lookup (shop_id + phone - for login)
CREATE INDEX IF NOT EXISTS idx_portal_users_shop_phone 
ON portal_users(shop_id, phone);

-- Index for bookings portal filtering (shop_id + clientphone)
CREATE INDEX IF NOT EXISTS idx_bookings_shop_clientphone 
ON bookings(shop_id, clientphone);

-- Index for bookings shop staff filtering (shop_id + status)
CREATE INDEX IF NOT EXISTS idx_bookings_shop_status 
ON bookings(shop_id, status);

-- Index for bookings time filtering (shop_id + bookingtime)
CREATE INDEX IF NOT EXISTS idx_bookings_shop_bookingtime 
ON bookings(shop_id, bookingtime DESC);

-- Analyze tables to update statistics (helps query planner)
ANALYZE services;
ANALYZE barbers;
ANALYZE clients;
ANALYZE portal_users;
ANALYZE bookings;

-- Verify indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('services', 'barbers', 'clients', 'portal_users', 'bookings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
