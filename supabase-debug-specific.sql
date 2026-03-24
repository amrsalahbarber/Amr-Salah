-- ============================================================================
-- DEBUG: Find the specific phone number
-- ============================================================================

-- 1. Search for the phone in portal_users
SELECT 
  id,
  shop_id,
  phone,
  email,
  name,
  created_at
FROM portal_users
WHERE phone = '01000139411';

-- 2. Search in auth.users for this phone
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email LIKE '%01000139411%'
  OR raw_user_meta_data->>'phone' = '01000139411';

-- 3. Show ALL portal users with all details
SELECT 
  pu.id,
  pu.shop_id,
  s.name as shop_name,
  pu.phone,
  pu.email,
  pu.name,
  pu.created_at
FROM portal_users pu
JOIN shops s ON pu.shop_id = s.id
ORDER BY pu.created_at DESC;
