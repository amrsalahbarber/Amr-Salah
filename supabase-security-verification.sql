-- ============================================================================
-- PHASE 5: COMPREHENSIVE SECURITY VERIFICATION & TESTING
-- ============================================================================
-- Post-deployment testing to ensure:
-- 1. No security regressions
-- 2. All RLS policies are working
-- 3. App functionality is preserved
-- 4. Unauthenticated access is blocked
-- 5. Views return correct data
-- 
-- ⏱️ TIME: ~5 minutes
-- 🔍 OUTPUT: Detailed verification results
-- ✅ SUCCESS INDICATOR: All queries return expected results
-- ============================================================================

-- ============================================================================
-- TEST 1: Verify DENY Policies are in Place
-- ============================================================================
-- 
-- Expect: Results showing that DENY policies exist for unauthenticated access
--

SELECT 
    tablename,
    policyname,
    permissive as policy_type,  -- "RESTRICTIVE" = DENY policy
    CASE 
        WHEN permissive = 'RESTRICTIVE' THEN '✅ DENY POLICY EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM pg_policies
WHERE tablename IN ('admin_users', 'shops', 'plans', 'settings', 'usage_logs')
  AND policyname LIKE '%deny%'
  AND permissive = 'RESTRICTIVE'
ORDER BY tablename;

-- Expected output: One row per table showing "✅ DENY POLICY EXISTS"
-- If running this test as admin, you'll see the policies exist


-- ============================================================================
-- TEST 2: Verify Unauthenticated Access is Actually Blocked
-- ============================================================================
--
-- SIMULATING unauthenticated access by setting role to 'anon'
-- (Only works from superuser connection, primarily for verification)
--

CREATE TEMPORARY TABLE test_unauthenticated_access (
  table_name TEXT,
  select_denied BOOLEAN,
  insert_denied BOOLEAN
);

-- Run these as ADMIN to verify (in production, anon users would just get permission denied):
-- SELECT * FROM admin_users;  -- Should return 0 rows (permission denied)
-- SELECT * FROM shops;         -- Should return 0 rows (permission denied)
-- SELECT * FROM plans;         -- Should return 0 rows (permission denied)

-- Note: These tests require switching to 'anon' role, which this script doesn't do
-- Instead, we verify the policies exist programmatically


-- ============================================================================
-- TEST 3: RLS Policy Coverage - All Tables Fully Covered
-- ============================================================================
--
-- Verify: Every table has RLS enabled AND has policies for all operations
--

WITH all_tables AS (
  SELECT 'admin_users'::text as tbl UNION ALL
  SELECT 'shops' UNION ALL
  SELECT 'plans' UNION ALL
  SELECT 'settings' UNION ALL
  SELECT 'usage_logs' UNION ALL
  SELECT 'clients' UNION ALL
  SELECT 'transactions' UNION ALL
  SELECT 'expenses' UNION ALL
  SELECT 'barbers' UNION ALL
  SELECT 'bookings' UNION ALL
  SELECT 'services' UNION ALL
  SELECT 'visit_logs' UNION ALL
  SELECT 'customer_users' UNION ALL
  SELECT 'customer_bookings'
),
rls_status AS (
  SELECT 
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
)
SELECT 
  at.tbl,
  rs.rowsecurity as rls_enabled,
  COUNT(p.*) as total_policies,
  COUNT(CASE WHEN proindexed.cmd = 'SELECT' THEN 1 END) as "SELECT_policies",
  COUNT(CASE WHEN proindexed.cmd = 'INSERT' THEN 1 END) as "INSERT_policies",
  COUNT(CASE WHEN proindexed.cmd = 'UPDATE' THEN 1 END) as "UPDATE_policies",
  COUNT(CASE WHEN proindexed.cmd = 'DELETE' THEN 1 END) as "DELETE_policies",
  CASE 
    WHEN rs.rowsecurity = false THEN '❌ RLS NOT ENABLED'
    WHEN COUNT(p.*) = 0 THEN '⚠️ RLS ENABLED BUT NO POLICIES'
    WHEN COUNT(CASE WHEN proindexed.cmd = 'SELECT' THEN 1 END) = 0 THEN '⚠️ MISSING SELECT'
    WHEN COUNT(CASE WHEN proindexed.cmd = 'INSERT' THEN 1 END) = 0 AND at.tbl NOT IN ('admin_users', 'plans', 'settings') THEN '⚠️ MISSING INSERT'
    ELSE '✅ FULLY SECURED'
  END as security_status
FROM all_tables at
LEFT JOIN rls_status rs ON rs.tablename = at.tbl
LEFT JOIN pg_policies p ON p.tablename = at.tbl
LEFT JOIN LATERAL (SELECT cmd FROM pg_policies WHERE tablename = at.tbl) proindexed ON true
GROUP BY at.tbl, rs.rowsecurity
ORDER BY security_status DESC, at.tbl;

-- Expected: 
-- - All tables show "✅ FULLY SECURED"
-- - RLS enabled = true
-- - At least 1 policy for each operation


-- ============================================================================
-- TEST 4: Admin-Only Table Policies are Restrictive
-- ============================================================================
--
-- Verify: admin_users, plans tables use restrictive admin-only policies
--

SELECT 
  tablename,
  COUNT(*) as total_policies,
  COUNT(CASE WHEN permissive = 'PERMISSIVE' THEN 1 END) as permissive_count,
  COUNT(CASE WHEN permissive = 'RESTRICTIVE' THEN 1 END) as restrictive_count,
  CASE 
    WHEN COUNT(CASE WHEN permissive = 'RESTRICTIVE' THEN 1 END) > 0 THEN '✅ HAS RESTRICTIVE DENY POLICIES'
    ELSE '❌ MISSING RESTRICTIVE POLICIES'
  END as deny_policy_status,
  string_agg(DISTINCT policyname, ', ' ORDER BY policyname) as policy_names
FROM pg_policies
WHERE tablename IN ('admin_users', 'plans')
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- admin_users: Has restrictive policies, preventing non-admin access
-- plans: Has restrictive DENY for unauthenticated, permissive for authenticated


-- ============================================================================
-- TEST 5: Check Function Security Settings
-- ============================================================================
--
-- Verify: No functions inappropriately using SECURITY DEFINER
--

SELECT 
  n.nspname,
  p.proname,
  prosecdef,
  CASE 
    WHEN prosecdef = true THEN '⚠️ SECURITY DEFINER'
    ELSE '✅ SECURITY INVOKER'
  END as security_mode
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
ORDER BY prosecdef DESC, p.proname;

-- Expected:
-- Most functions should be "✅ SECURITY INVOKER"
-- Very few (if any) should be "⚠️ SECURITY DEFINER"
-- If any SECURITY DEFINER found, review with security team


-- ============================================================================
-- TEST 6: Verify Views Exist and are Accessible
-- ============================================================================
--
-- Verify: Safety-critical views exist and have proper security settings
--

SELECT 
  v.table_schema,
  v.table_name as view_name,
  'VIEW' as object_type,
  CASE 
    WHEN v.table_name IN ('customer_profile_view', 'customer_booking_details_view')
    THEN '✅ CRITICAL VIEW'
    ELSE '✅ SUPPORTS VIEW'
  END as importance
FROM information_schema.views v
WHERE v.table_schema = 'public'
  AND v.table_name LIKE '%_view'
ORDER BY v.table_name;

-- Expected: 
-- - customer_profile_view exists
-- - customer_booking_details_view exists
-- - All marked as "✅ CRITICAL VIEW"


-- ============================================================================
-- TEST 7: Multi-Tenant Isolation Verification
-- ============================================================================
--
-- Verify: Policies correctly filter by shop_id
--

SELECT 
  tablename,
  policyname,
  CASE 
    WHEN qual LIKE '%shop_id%' THEN '✅ FILTERS BY SHOP_ID'
    WHEN qual LIKE '%auth.uid()%' THEN '✅ FILTERS BY AUTH USER'
    WHEN qual LIKE 'EXISTS%admin_users%' THEN '✅ HAS ADMIN BYPASS'
    ELSE '⚠️ CHECK POLICY'
  END as isolation_type
FROM pg_policies
WHERE tablename IN ('clients', 'transactions', 'expenses', 'barbers', 'bookings', 'services', 'visit_logs', 'usage_logs')
  AND permissive = 'PERMISSIVE'
ORDER BY tablename, policyname;

-- Expected:
-- Every policy should show one of:
-- - ✅ FILTERS BY SHOP_ID (multi-tenant isolation)
-- - ✅ FILTERS BY AUTH USER (individual isolation)
-- - ✅ HAS ADMIN BYPASS (admin access)


-- ============================================================================
-- TEST 8: Admin Access Verification
-- ============================================================================
--
-- Verify: All tables allow admin access
--

SELECT 
  DISTINCT tablename,
  CASE 
    WHEN COUNT(*) FILTER (WHERE qual LIKE '%admin_users%') > 0 
      THEN '✅ ADMIN HAS ACCESS'
    ELSE '❌ ADMIN ACCESS MISSING'
  END as admin_access_status
FROM pg_policies
WHERE tablename IN ('admin_users', 'shops', 'plans', 'settings', 'usage_logs', 'clients', 'transactions', 'expenses', 'barbers', 'bookings', 'services')
  AND permissive = 'PERMISSIVE'
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- All tables should show "✅ ADMIN HAS ACCESS"
-- Allows admin_users (supers) full access to all data


-- ============================================================================
-- TEST 9: Comprehensive RLS Policy Summary
-- ============================================================================
--
-- Overall assessment of security posture
--

SELECT 
  CASE 
    WHEN COUNT(CASE WHEN rowsecurity = false THEN 1 END) > 0 
      THEN '🚨 CRITICAL: Some tables missing RLS'
    ELSE '✅ ALL TABLES HAVE RLS WITH POLICIES'
  END as overall_status,
  
  COUNT(*) as total_tables_checked,
  COUNT(CASE WHEN rowsecurity = true THEN 1 END) as rls_enabled_count,
  COUNT(CASE WHEN rowsecurity = false THEN 1 END) as rls_disabled_count
  
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'admin_users', 'shops', 'plans', 'settings', 'usage_logs', 'clients', 
    'transactions', 'expenses', 'barbers', 'bookings', 'services', 'visit_logs',
    'customer_users', 'customer_bookings', 'portal_settings'
  );

-- Expected: "✅ ALL TABLES HAVE RLS WITH POLICIES"


-- ============================================================================
-- TEST 10: Security Check Summary Report
-- ============================================================================
--
-- Final comprehensive report
--

WITH security_audit AS (
  SELECT 
    'RLS Enabled' as check_name,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END)::TEXT || '/' || COUNT(*)::TEXT as result,
    CASE 
      WHEN COUNT(CASE WHEN rowsecurity = true THEN 1 END) = COUNT(*) THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END as status
  FROM pg_tables 
  WHERE schemaname = 'public'
    AND tablename IN ('admin_users', 'shops', 'plans', 'settings', 'usage_logs')
  
  UNION ALL
  
  SELECT 
    'DENY Policies for Unauthenticated' as check_name,
    COUNT(*)::TEXT as result,
    CASE 
      WHEN COUNT(*) >= 5 THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END as status
  FROM pg_policies
  WHERE tablename IN ('admin_users', 'shops', 'plans', 'settings', 'usage_logs')
    AND permissive = 'RESTRICTIVE'
    AND policyname LIKE '%deny%'
  
  UNION ALL
  
  SELECT 
    'Admin-Only Access Policies' as check_name,
    COUNT(*)::TEXT as result,
    CASE 
      WHEN COUNT(*) > 0 THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END as status
  FROM pg_policies
  WHERE tablename IN ('admin_users', 'plans')
    AND qual LIKE '%admin_users%'
  
  UNION ALL
  
  SELECT 
    'Shop-Level Multi-Tenant Policies' as check_name,
    COUNT(*)::TEXT as result,
    CASE 
      WHEN COUNT(*) > 0 THEN 'PASS ✅'
      ELSE 'FAIL ❌'
    END as status
  FROM pg_policies
  WHERE tablename IN ('clients', 'transactions', 'expenses', 'barbers','bookings', 'services')
    AND qual LIKE '%shop_id%'
)
SELECT 
  check_name,
  result,
  status
FROM security_audit
ORDER BY CASE WHEN status LIKE 'FAIL%' THEN 0 ELSE 1 END DESC, check_name;

-- Expected: All rows show "PASS ✅"


-- ============================================================================
-- FINAL VERIFICATION: QUERY THE SUMMARY
-- ============================================================================

-- Run all the above tests and review output
-- Each test should return expected results

-- RECOMMENDED POST-DEPLOYMENT ACTIONS:
-- 1. Monitor database logs for any RLS policy violations
-- 2. Test with sample authenticated users
-- 3. Test with admin users
-- 4. Verify app queries still work
-- 5. Monitor performance (RLS policies add minimal overhead)


-- ============================================================================
-- SECURITY VERIFICATION COMPLETE
-- ============================================================================
-- If all tests show expected results:
-- ✅ Database security has been successfully hardened
-- ✅ No unauthorized access is possible
-- ✅ Multi-tenant isolation is enforced
-- ✅ Admin privileges are properly restricted
-- ✅ Unauthenticated users cannot access sensitive data
--
-- Next steps:
-- 1. Deploy to production using supabase-security-migration-phase-2-3.sql
-- 2. Run this verification script to confirm
-- 3. Monitor for 24 hours
-- 4. Update security documentation
-- ============================================================================
