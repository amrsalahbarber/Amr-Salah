-- ============================================================================
-- DEBUG: Check if RLS is blocking everything
-- ============================================================================

-- Check portal_settings accessibility
SELECT 
  id,
  shop_id,
  is_active,
  created_at
FROM portal_settings
LIMIT 5;

-- Check current RLS policies on portal_settings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  qual
FROM pg_policies
WHERE tablename = 'portal_settings'
ORDER BY policyname;

-- Check if any policy allows public read
SELECT 
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'portal_settings'
  AND qual LIKE '%true%'
  OR qual LIKE '%public%';
