-- Fix RLS Policies for Customer Portal System
-- This file fixes Row-Level Security policies to allow portal operations

-- ===== PORTAL_SETTINGS TABLE =====
-- Drop existing conflicting policies
DROP POLICY IF EXISTS "shop_sees_own_portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "shop_updates_own_portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "shop_inserts_own_portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "public_read_portal_settings" ON portal_settings;
DROP POLICY IF EXISTS "admin_manage_portal_settings" ON portal_settings;

-- Allow shop to SELECT own portal settings
CREATE POLICY "shop_select_portal_settings" ON portal_settings
FOR SELECT TO authenticated
USING (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
);

-- Allow shop to INSERT own portal settings (FIX FOR ISSUE 1)
CREATE POLICY "shop_insert_portal_settings" ON portal_settings
FOR INSERT TO authenticated
WITH CHECK (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow shop to UPDATE own portal settings
CREATE POLICY "shop_update_portal_settings" ON portal_settings
FOR UPDATE TO authenticated
USING (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Allow PUBLIC (anon) to READ active portal settings (for customer portal pages)
CREATE POLICY "public_read_active_portal" ON portal_settings
FOR SELECT TO anon
USING (is_active = true);

-- Allow admin full access
CREATE POLICY "admin_full_access_portal" ON portal_settings
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));

-- ===== CUSTOMER_USERS TABLE =====
-- Drop existing policies
DROP POLICY IF EXISTS "customer_sees_own_profile" ON customer_users;
DROP POLICY IF EXISTS "customer_updates_own_profile" ON customer_users;
DROP POLICY IF EXISTS "shop_manages_customer_users" ON customer_users;

-- Public can INSERT (register new customer)
CREATE POLICY "public_register_customer" ON customer_users
FOR INSERT TO anon
WITH CHECK (true);

-- Authenticated customer can INSERT (after signUp)
CREATE POLICY "auth_register_customer" ON customer_users
FOR INSERT TO authenticated
WITH CHECK (true);

-- Customer sees own profile
CREATE POLICY "customer_select_own" ON customer_users
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
);

-- Allow all authenticated users to SELECT (portal uses this)
CREATE POLICY "customer_select_all_anon" ON customer_users
FOR SELECT TO anon
USING (true);

-- Customer updates own profile
CREATE POLICY "customer_update_own" ON customer_users
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- ===== CUSTOMER_BOOKINGS TABLE =====
-- Drop existing policies
DROP POLICY IF EXISTS "customer_sees_own_bookings" ON customer_bookings;
DROP POLICY IF EXISTS "customer_creates_own_bookings" ON customer_bookings;
DROP POLICY IF EXISTS "customer_updates_own_bookings" ON customer_bookings;

-- Customer can INSERT bookings
CREATE POLICY "customer_insert_booking" ON customer_bookings
FOR INSERT TO authenticated
WITH CHECK (true);

-- Anon users can INSERT bookings (guest checkout)
CREATE POLICY "anon_insert_booking" ON customer_bookings
FOR INSERT TO anon
WITH CHECK (true);

-- Customer can SELECT own bookings
CREATE POLICY "customer_select_booking" ON customer_bookings
FOR SELECT TO authenticated
USING (
  customer_user_id = (SELECT id FROM customer_users WHERE auth_user_id = auth.uid() LIMIT 1)
  OR shop_id = (SELECT id FROM shops WHERE auth_user_id = auth.uid() LIMIT 1)
  OR EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
);

-- Anon can select bookings (portal)
CREATE POLICY "anon_select_booking" ON customer_bookings
FOR SELECT TO anon
USING (true);

-- Customer can UPDATE own bookings
CREATE POLICY "customer_update_booking" ON customer_bookings
FOR UPDATE TO authenticated
USING (
  customer_user_id = (SELECT id FROM customer_users WHERE auth_user_id = auth.uid() LIMIT 1)
);

-- Admin can update any booking
CREATE POLICY "admin_update_booking" ON customer_bookings
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid()));
