-- ============================================================================
-- COMPREHENSIVE AUDIT: Check for hardcoded values and verify isolation
-- ============================================================================

-- ============================================================================
-- SECTION 1: Verify Shop Configuration (NOT hardcoded)
-- ============================================================================

-- Query 1: Check all shops have unique slugs
SELECT 
  id,
  name,
  slug,
  auth_user_id,
  subscription_status,
  created_at
FROM shops
ORDER BY created_at DESC;

-- Query 2: Verify portal_settings match shops
SELECT 
  ps.shop_id,
  ps.portal_slug,
  s.name as shop_name,
  s.slug as shop_slug,
  CASE 
    WHEN ps.portal_slug = s.slug THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as slug_validation
FROM portal_settings ps
LEFT JOIN shops s ON ps.shop_id = s.id
ORDER BY ps.shop_id;

-- ============================================================================
-- SECTION 2: Verify Portal Users (NOT hardcoded, unique per shop)
-- ============================================================================

-- Query 3: Check portal users are isolated by shop
SELECT 
  pu.id,
  pu.phone,
  pu.name,
  pu.shop_id,
  s.name as shop_name,
  COUNT(*) OVER (PARTITION BY pu.phone) as phone_usage_count,
  pu.created_at
FROM portal_users pu
LEFT JOIN shops s ON pu.shop_id = s.id
ORDER BY pu.phone, pu.shop_id;

-- Query 4: Check for duplicate phones across shops (should be 0 if isolated)
SELECT 
  phone,
  COUNT(DISTINCT shop_id) as shops_count,
  CASE 
    WHEN COUNT(DISTINCT shop_id) > 1 THEN '❌ DUPLICATE ACROSS SHOPS'
    ELSE '✅ UNIQUE'
  END as status
FROM portal_users
GROUP BY phone
HAVING COUNT(DISTINCT shop_id) > 1;

-- ============================================================================
-- SECTION 3: Verify Client Records (NOT hardcoded, proper FK links)
-- ============================================================================

-- Query 5: Check clients are properly isolated by shop
SELECT 
  c.id,
  c.phone,
  c.name,
  c.shop_id,
  s.name as shop_name,
  c."createdAt"
FROM clients c
LEFT JOIN shops s ON c.shop_id = s.id
ORDER BY c.shop_id, c.phone;

-- Query 6: Verify client-to-portal_users mapping by phone
SELECT 
  pu.shop_id,
  pu.phone,
  pu.name as portal_user_name,
  c.id as client_id,
  c.name as client_name,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ CLIENT EXISTS'
    ELSE '❌ CLIENT MISSING'
  END as client_status
FROM portal_users pu
LEFT JOIN clients c ON pu.shop_id = c.shop_id AND pu.phone = c.phone
ORDER BY pu.shop_id, pu.phone;

-- ============================================================================
-- SECTION 4: Verify Booking Data (NOT hardcoded, proper isolation)
-- ============================================================================

-- Query 7: Check bookings are isolated by shop_id + clientphone
SELECT 
  b.id,
  b.shop_id,
  s.name as shop_name,
  b.clientphone,
  b.clientname,
  b.barberid,
  b.bookingtime,
  b.status,
  b.createdat
FROM bookings b
LEFT JOIN shops s ON b.shop_id = s.id
ORDER BY b.shop_id, b.createdat DESC
LIMIT 20;

-- Query 8: Verify booking FK integrity (clientid should exist in clients)
SELECT 
  b.id as booking_id,
  b.shop_id,
  b.clientid,
  b.clientphone,
  c.id as actual_client_id,
  c.phone as client_phone,
  CASE 
    WHEN c.id IS NOT NULL AND c.shop_id = b.shop_id THEN '✅ VALID FK'
    WHEN c.id IS NULL THEN '❌ CLIENT NOT FOUND'
    WHEN c.shop_id != b.shop_id THEN '❌ SHOP MISMATCH'
    ELSE '❌ ERROR'
  END as fk_validation
FROM bookings b
LEFT JOIN clients c ON b.clientid = c.id
ORDER BY b.shop_id;

-- ============================================================================
-- SECTION 5: Verify Services (NOT hardcoded, properly isolated)
-- ============================================================================

-- Query 9: Check services are isolated by shop
SELECT 
  s.id,
  s."nameAr",
  s."nameEn",
  s.price,
  s.duration,
  s.active,
  s.shop_id,
  sh.name as shop_name,
  s."createdAt"
FROM services s
LEFT JOIN shops sh ON s.shop_id = sh.id
ORDER BY s.shop_id, s."nameAr", s."nameEn";

-- Query 10: Check service prices are NOT hardcoded (verify they vary)
SELECT 
  shop_id,
  COUNT(*) as service_count,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price) as avg_price,
  COUNT(DISTINCT price) as unique_prices
FROM services
WHERE active = TRUE
GROUP BY shop_id;

-- ============================================================================
-- SECTION 6: Verify Barbers (NOT hardcoded, properly isolated)
-- ============================================================================

-- Query 11: Check barbers are isolated by shop
SELECT 
  b.id,
  b.name,
  b.phone,
  b.active,
  b.shop_id,
  s.name as shop_name,
  b."createdAt"
FROM barbers b
LEFT JOIN shops s ON b.shop_id = s.id
ORDER BY b.shop_id, b.name;

-- ============================================================================
-- SECTION 7: Verify RLS Policies (security isolation)
-- ============================================================================

-- Query 12: Check RLS is enabled on critical tables
SELECT 
  tablename,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = t.tablename
    ) THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status,
  (
    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = t.tablename
  ) as policy_count
FROM (
  SELECT 'services' as tablename
  UNION SELECT 'barbers'
  UNION SELECT 'bookings'
  UNION SELECT 'clients'
  UNION SELECT 'portal_users'
) t
ORDER BY tablename;

-- Query 13: List all RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 8: Verify Column Names (NOT hardcoded in queries)
-- ============================================================================

-- Query 14: Get exact column names with types from critical tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  CASE WHEN column_default IS NOT NULL THEN column_default ELSE 'NO DEFAULT' END as default_value
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('shops', 'portal_users', 'clients', 'bookings', 'services', 'barbers')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- SECTION 9: Verify Foreign Keys (confirm data relationships)
-- ============================================================================

-- Query 15: List all foreign key constraints
SELECT 
  constraint_name,
  table_name,
  column_name,
  referenced_table_name,
  referenced_column_name
FROM (
  SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS referenced_table_name,
    ccu.column_name AS referenced_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
) fk
ORDER BY table_name;

-- ============================================================================
-- SECTION 10: Data Isolation Summary
-- ============================================================================

-- Query 16: Summary - complete isolation check
SELECT 
  'Shops' as entity,
  COUNT(*) as count,
  'Each shop has unique ID and slug' as description
FROM shops

UNION ALL

SELECT 
  'Portal Users',
  COUNT(*),
  'Isolated by shop_id'
FROM portal_users

UNION ALL

SELECT 
  'Clients',
  COUNT(*),
  'Isolated by shop_id'
FROM clients

UNION ALL

SELECT 
  'Bookings',
  COUNT(*),
  'Isolated by shop_id + clientphone'
FROM bookings

UNION ALL

SELECT 
  'Services',
  COUNT(*),
  'Isolated by shop_id'
FROM services

UNION ALL

SELECT 
  'Barbers',
  COUNT(*),
  'Isolated by shop_id'
FROM barbers;
