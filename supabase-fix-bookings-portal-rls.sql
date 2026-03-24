-- ============================================================================
-- FIX: Bookings Table - Add RLS Policies for Portal Users
-- ============================================================================
-- Problem: Portal users can't create bookings because RLS only allows shop staff
-- 
-- Solution: Add policies allowing portal users to:
-- 1. INSERT their own booking into the bookings table
-- 2. READ their own bookings
-- 3. UPDATE/DELETE their own bookings (cancel)
--
-- Data Isolation: All bookings filtered by shop_id to prevent cross-shop leakage
-- ============================================================================

-- Step 1: Ensure bookings table has RLS enabled
-- ============================================================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Step 2: Add policy to allow portal users to INSERT their own bookings
-- ============================================================================
-- Portal users can create bookings for their shop with their phone number
DROP POLICY IF EXISTS "portal_users_insert_own_bookings" ON bookings;

CREATE POLICY "portal_users_insert_own_bookings" ON bookings
FOR INSERT TO authenticated
WITH CHECK (
  -- The booking's shop must match a shop where user is a portal_user
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND
  -- The booking's phone must match the portal user's phone
  clientphone = (
    SELECT phone FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Step 3: Add policy to allow portal users to READ their own bookings
-- ============================================================================
-- Portal users can see only their own bookings (by phone + shop)
DROP POLICY IF EXISTS "portal_users_select_own_bookings" ON bookings;

CREATE POLICY "portal_users_select_own_bookings" ON bookings
FOR SELECT TO authenticated
USING (
  -- Portal user sees own bookings (by phone + shop)
  (
    shop_id = (
      SELECT shop_id FROM portal_users 
      WHERE id = auth.uid() 
      LIMIT 1
    )
    AND
    clientphone = (
      SELECT phone FROM portal_users 
      WHERE id = auth.uid() 
      LIMIT 1
    )
  )
);

-- Step 4: Add policy to allow portal users to UPDATE/CANCEL their own bookings
-- ============================================================================
-- Portal users can cancel (update status) their own bookings
DROP POLICY IF EXISTS "portal_users_update_own_bookings" ON bookings;

CREATE POLICY "portal_users_update_own_bookings" ON bookings
FOR UPDATE TO authenticated
USING (
  -- Must be their own booking
  clientphone = (
    SELECT phone FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
)
WITH CHECK (
  -- Same checks for new data
  clientphone = (
    SELECT phone FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Step 5: Add policy to allow portal users to DELETE their own bookings
-- ============================================================================
DROP POLICY IF EXISTS "portal_users_delete_own_bookings" ON bookings;

CREATE POLICY "portal_users_delete_own_bookings" ON bookings
FOR DELETE TO authenticated
USING (
  clientphone = (
    SELECT phone FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
  AND
  shop_id = (
    SELECT shop_id FROM portal_users 
    WHERE id = auth.uid() 
    LIMIT 1
  )
);

-- Step 6: Verify shop staff can still create bookings (existing policy)
-- ============================================================================
-- This already exists but confirming it's still there:
-- shop_insert_own_bookings - allows authenticated users linked to shops table
-- to INSERT bookings with their shop_id

-- Step 7: Test query - Show all bookings for a specific shop
-- ============================================================================
-- Run this to verify data isolation - replace shop_id with your shop UUID
-- SELECT 
--   id, 
--   clientname, 
--   clientphone, 
--   barbername, 
--   bookingtime, 
--   servicetype, 
--   status,
--   shop_id
-- FROM bookings 
-- WHERE shop_id = 'YOUR_SHOP_UUID_HERE'
-- ORDER BY bookingtime DESC;
