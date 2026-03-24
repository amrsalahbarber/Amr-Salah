-- ============================================================================
-- DEBUG: Check the NEW account (shop@gmail.com)
-- ============================================================================

-- Find the account with shop@gmail.com
SELECT 
  pu.id,
  pu.phone,
  pu.email as "portal_users_email",
  au.email as "auth_users_email",
  CASE 
    WHEN pu.email = au.email THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status,
  pu.created_at
FROM portal_users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE pu.email = 'shop@gmail.com'
  OR au.email = 'shop@gmail.com';

-- Show all portal users
SELECT 
  id,
  phone,
  email,
  name,
  created_at
FROM portal_users
ORDER BY created_at DESC;
