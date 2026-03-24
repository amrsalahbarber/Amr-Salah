-- ============================================================================
-- DEBUG: Check Portal Users Registration
-- ============================================================================

-- 1. Check ALL portal users
SELECT 
  id,
  shop_id,
  phone,
  email,
  name,
  created_at
FROM portal_users
ORDER BY created_at DESC;

-- 2. Check specific phone number
SELECT 
  id,
  shop_id,
  phone,
  email,
  name,
  created_at
FROM portal_users
WHERE phone = '01000139411';

-- 3. Check if auth user exists
SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email LIKE '%01000139411%'
  OR raw_user_meta_data->>'phone' = '01000139411';

-- 4. Check portal_users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'portal_users';

-- 5. Check RLS policies on portal_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'portal_users'
ORDER BY policyname;

-- 6. Count total portal users per shop
SELECT 
  s.id,
  s.name as shop_name,
  COUNT(p.id) as portal_user_count
FROM shops s
LEFT JOIN portal_users p ON s.id = p.shop_id
GROUP BY s.id, s.name
ORDER BY portal_user_count DESC;
