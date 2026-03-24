-- ============================================================================
-- DEBUG 1: Verify SERVICES exist and RLS policy allows access
-- ============================================================================

-- Query 1: Check all service records
SELECT 
  id,
  shop_id,
  "nameAr",
  "nameEn",
  price,
  duration,
  active,
  "createdAt"
FROM services
ORDER BY "createdAt" DESC;

-- Query 2: Check if RLS is enabled on services table
SELECT publication, schemaname, tablename
FROM pg_publication_tables
WHERE tablename = 'services';

-- Query 3: Check RLS policies for services table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'services'
ORDER BY policyname;

-- Query 4: Count services per shop
SELECT 
  shop_id,
  COUNT(*) as active_count,
  COUNT(*) FILTER (WHERE active = true) as enabled_services
FROM services
GROUP BY shop_id;

-- ============================================================================
-- DEBUG 2: Verify BOOKINGS queries work without ILIKE error
-- ============================================================================

-- Query 5: Test the date range query (without ILIKE)
SELECT 
  'Query works without error' as test_result,
  COUNT(*) as booking_count
FROM bookings
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e'
  AND bookingtime >= '2026-03-25T00:00:00'
  AND bookingtime < '2026-03-25T23:59:59'
  AND barberid = '42c7e842-6059-4bf1-8517-8d658a852aac'
  AND status IN ('confirmed', 'pending');

-- Query 6: Check specific shop's services (for debugging)
SELECT 
  id,
  "nameAr",
  "nameEn",
  price,
  duration,
  active
FROM services
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e'
  AND active = true
ORDER BY "createdAt" DESC;

-- Query 7: Final integration test - full booking scenario
SELECT 
  'Services' as data_type,
  COUNT(*) as count
FROM services
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e' AND active = true

UNION ALL

SELECT 
  'Barbers' as data_type,
  COUNT(*) as count
FROM barbers
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e' AND active = true

UNION ALL

SELECT 
  'Clients' as data_type,
  COUNT(*) as count
FROM clients
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e'

UNION ALL

SELECT 
  'Portal Users' as data_type,
  COUNT(*) as count
FROM portal_users
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e';
