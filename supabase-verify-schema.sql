-- ============================================================================
-- SCHEMA VERIFICATION: Check all column names and types
-- ============================================================================

-- Query 1: Check BOOKINGS table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
ORDER BY ordinal_position;

-- Query 2: Check CLIENTS table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'clients'
ORDER BY ordinal_position;

-- Query 3: Check PORTAL_USERS table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'portal_users'
ORDER BY ordinal_position;

-- ============================================================================
-- DATA VERIFICATION: Check sample data types match schema
-- ============================================================================

-- Query 4: Sample bookings data with types
SELECT 
  id::text as id_type,
  shop_id::text as shop_id_type,
  clientphone,
  bookingtime,
  barberid::text as barberid_type,
  status,
  'bookingtime is: ' || pg_typeof(bookingtime) as bookingtime_type
FROM bookings
LIMIT 1;

-- Query 5: Check for any NULL values in critical columns
SELECT 
  'bookings' as table_name,
  COUNT(*) as total_records,
  COUNT(shop_id) as has_shop_id,
  COUNT(clientid) as has_clientid,
  COUNT(bookingtime) as has_bookingtime,
  COUNT(barberid) as has_barberid
FROM bookings

UNION ALL

SELECT 
  'clients' as table_name,
  COUNT(*) as total_records,
  COUNT(shop_id) as has_shop_id,
  COUNT(id) as has_id,
  COUNT(phone) as has_phone,
  COUNT(name) as has_name
FROM clients;

-- ============================================================================
-- EXACT DATA VERIFICATION: Run these queries to debug the exact issue
-- ============================================================================

-- Query 6: Check bookings for a specific date range (change date as needed)
SELECT 
  id,
  shop_id,
  clientphone,
  bookingtime,
  bookingtime::text as bookingtime_as_text,
  DATE(bookingtime) as booking_date,
  barberid,
  status
FROM bookings
WHERE DATE(bookingtime) = '2026-03-25'
LIMIT 5;

-- Query 7: Test the date range query logic
SELECT 
  COUNT(*) as matching_bookings
FROM bookings
WHERE shop_id = 'ef8f12b6-de83-4043-84e6-f3a386262a5e'
  AND bookingtime >= '2026-03-25T00:00:00'
  AND bookingtime < '2026-03-25T23:59:59'
  AND barberid = '42c7e842-6059-4bf1-8517-8d658a852aac'
  AND status IN ('confirmed', 'pending');

-- Query 8: Check all bookings in the system
SELECT 
  COUNT(*) as total_bookings,
  COUNT(DISTINCT shop_id) as unique_shops,
  COUNT(DISTINCT clientphone) as unique_client_phones,
  COUNT(DISTINCT barberid) as unique_barbers,
  MIN(bookingtime) as earliest_booking,
  MAX(bookingtime) as latest_booking
FROM bookings;

-- Query 9: Verify indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('bookings', 'clients', 'portal_users')
  AND indexname LIKE 'idx_%'
ORDER BY tablename;
