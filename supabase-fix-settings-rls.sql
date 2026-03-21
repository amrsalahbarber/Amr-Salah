-- Fix Settings Table RLS for Multi-Tenant Shops
-- This allows each shop to manage its own settings (shop_name, phone, etc.)

-- Ensure RLS is enabled
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "shops_select_own_settings" ON settings;
DROP POLICY IF EXISTS "shops_insert_own_settings" ON settings;
DROP POLICY IF EXISTS "shops_update_own_settings" ON settings;
DROP POLICY IF EXISTS "shops_delete_own_settings" ON settings;

-- Allow authenticated users to SELECT their own shop's settings
CREATE POLICY "shops_select_own_settings" ON settings
FOR SELECT TO authenticated
USING (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow authenticated users to INSERT settings for their own shop
CREATE POLICY "shops_insert_own_settings" ON settings
FOR INSERT TO authenticated
WITH CHECK (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow authenticated users to UPDATE their own shop's settings
CREATE POLICY "shops_update_own_settings" ON settings
FOR UPDATE TO authenticated
USING (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow authenticated users to DELETE their own shop's settings
CREATE POLICY "shops_delete_own_settings" ON settings
FOR DELETE TO authenticated
USING (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Also allow admin users (admin_users table) to manage all settings
DROP POLICY IF EXISTS "admin_manage_all_settings" ON settings;
CREATE POLICY "admin_manage_all_settings" ON settings
TO authenticated
USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
);
