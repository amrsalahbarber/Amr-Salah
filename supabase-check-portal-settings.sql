-- ============================================================================
-- CHECK: Portal Settings Data
-- ============================================================================

-- 1. Check all portal_settings
SELECT 
  id,
  shop_id,
  shop_name,
  is_active,
  status,
  created_at
FROM portal_settings
ORDER BY created_at DESC;

-- 2. Check portal_settings for the specific shop
SELECT 
  ps.id,
  ps.shop_id,
  s.name as shop_name,
  ps.is_active,
  ps.status,
  ps.created_at
FROM portal_settings ps
JOIN shops s ON ps.shop_id = s.id
WHERE s.name = 'محل الحلاقة'
ORDER BY ps.created_at DESC;

-- 3. Count portal users per shop
SELECT 
  s.id,
  s.name,
  COUNT(pu.id) as portal_users_count
FROM shops s
LEFT JOIN portal_users pu ON s.id = pu.shop_id
GROUP BY s.id, s.name;
