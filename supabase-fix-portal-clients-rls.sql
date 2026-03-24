-- ============================================================================
-- FIX: Portal Users - RLS Policies to Create Client Records
-- ============================================================================
-- Problem: Portal users register and create portal_users record, but can't insert
-- into clients table due to missing RLS policies
--
-- Solution: Add policies allowing portal users to:
-- 1. INSERT their own client record during registration
-- 2. READ clients table for duplicate phone check
--
-- Actual Column Names (case-sensitive, must be quoted):
-- id, name, phone, birthday, notes, "totalVisits", "totalSpent", "isVIP", 
-- "lastVisit", "createdAt", "updatedAt", shop_id
-- ============================================================================

-- Step 1: Drop existing policies if they exist
-- ============================================================================
DROP POLICY IF EXISTS "portal_users_insert_own_client" ON clients;
DROP POLICY IF EXISTS "portal_users_read_clients_for_portal" ON clients;

-- Step 2: Allow portal users to INSERT their own client record
-- ============================================================================
-- This specifically allows auth.uid() to insert a client with their phone number
CREATE POLICY "portal_users_insert_own_client" ON clients
FOR INSERT TO authenticated
WITH CHECK (
  -- Check 1: The client's shop_id matches a shop where user has a portal_users record
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND
  -- Check 2: The phone being inserted matches the portal user's phone (security check)
  phone = (
    SELECT phone FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Step 3: Allow portal users to READ clients in their shop
-- ============================================================================
-- Needed for duplicate check during registration and to view clients in their shop
CREATE POLICY "portal_users_read_clients_for_portal" ON clients
FOR SELECT TO authenticated
USING (
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  -- Also allow shop owners and admins to read
  OR shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
);

-- Step 4: Backfill - Create client records for existing portal_users who don't have one
-- ============================================================================
-- This inserts a client record for each portal_user that doesn't already have a matching phone
INSERT INTO clients (
  shop_id, 
  name, 
  phone, 
  "totalVisits", 
  "totalSpent", 
  "isVIP", 
  notes, 
  "createdAt", 
  "updatedAt"
)
SELECT 
  pu.shop_id,
  COALESCE(pu.name, pu.phone) as name,
  pu.phone,
  0 as "totalVisits",
  0 as "totalSpent",
  false as "isVIP",
  'مسجل عبر البوابة الإلكترونية' as notes,
  pu.created_at as "createdAt",
  pu.created_at as "updatedAt"
FROM portal_users pu
WHERE NOT EXISTS (
  SELECT 1 FROM clients c 
  WHERE c.shop_id = pu.shop_id 
  AND c.phone = pu.phone
)
ON CONFLICT (phone) DO NOTHING;

-- Step 5: Verify backfill worked - Count results
-- ============================================================================
SELECT 
  COUNT(DISTINCT pu.shop_id) as shops_with_portal_users,
  COUNT(DISTINCT pu.phone) as total_portal_users,
  COUNT(DISTINCT c.id) as total_clients
FROM portal_users pu
LEFT JOIN clients c ON c.phone = pu.phone AND c.shop_id = pu.shop_id;

-- Step 6: Show newly created clients from portal users
-- ============================================================================
SELECT 
  c.phone,
  c.name,
  c.shop_id,
  c.notes,
  c."createdAt"
FROM clients c
WHERE c.notes = 'مسجل عبر البوابة الإلكترونية'
ORDER BY c."createdAt" DESC
LIMIT 20;
