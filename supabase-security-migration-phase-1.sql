-- ============================================================================
-- PHASE 1: SECURITY AUDIT & VERIFICATION (READ-ONLY)
-- ============================================================================
-- This phase ONLY reads the current security state.
-- It safely audits RLS, policies, and view definitions.
-- SAFE TO RUN: Does not modify any data or structure.
-- ============================================================================

-- ==========================================================================
-- 1. AUDIT: Which tables have RLS enabled?
-- ==========================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS_Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('shops', 'admin_users', 'plans', 'settings', 'usage_logs', 
                    'clients', 'transactions', 'expenses', 'barbers', 'visit_logs',
                    'bookings', 'services', 'customer_users', 'customer_bookings', 
                    'customer_reviews', 'portal_settings', 'portal_analytics')
ORDER BY tablename;

-- Expected: All marked as "t" (true) for RLS enabled

-- ==========================================================================
-- 2. AUDIT: What policies exist on VULNERABLE tables?
-- ==========================================================================
SELECT 
    tablename,
    policyname,
    permissive as "Policy_Type",
    cmd as "Operation",
    roles,
    qual as "USING_Clause",
    with_check as "WITH_CHECK_Clause"
FROM pg_policies
WHERE tablename IN ('shops', 'admin_users', 'plans', 'settings', 'usage_logs')
ORDER BY tablename, policyname;

-- Analyze output:
-- - Are there DENY/RESTRICTIVE policies for unauthenticated?
-- - Does admin_users have a policy that requires auth?
-- - Does plans allow overly permissive access?

-- ==========================================================================
-- 3. AUDIT: Check for overly permissive policies
-- ==========================================================================
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%true%' AND permissive = 'PERMISSIVE' THEN '⚠️ OVERLY PERMISSIVE - ALLOWS ALL'
        WHEN qual LIKE '%1=1%' AND permissive = 'PERMISSIVE' THEN '⚠️ OVERLY PERMISSIVE - ALLOWS ALL' 
        WHEN roles::text = '{authenticated}' AND permissive = 'PERMISSIVE' THEN '✓ AUTHENTICATED ONLY'
        ELSE '✓ RESTRICTED'
    END as "Risk_Level"
FROM pg_policies
WHERE tablename IN ('plans', 'shops', 'admin_users', 'settings', 'usage_logs')
ORDER BY tablename;

-- ==========================================================================
-- 4. AUDIT: Check if unauthenticated access is explicitly denied
-- ==========================================================================
WITH sensitive_tables AS (
    SELECT 'admin_users'::text as tbl
    UNION ALL SELECT 'shops'
    UNION ALL SELECT 'plans'
    UNION ALL SELECT 'settings'
    UNION ALL SELECT 'usage_logs'
)
SELECT 
    st.tbl,
    COUNT(p.*) as "Total_Policies",
    COUNT(CASE WHEN p.roles::text != '{}' THEN 1 END) as "Have_Role_Restriction",
    COUNT(CASE WHEN permissive = 'RESTRICTIVE' THEN 1 END) as "Have_RESTRICTIVE_Policies",
    COUNT(CASE WHEN p.cmd = 'SELECT' THEN 1 END) as "SELECT_Policies",
    COUNT(CASE WHEN p.cmd = 'INSERT' THEN 1 END) as "INSERT_Policies",
    COUNT(CASE WHEN p.cmd = 'UPDATE' THEN 1 END) as "UPDATE_Policies",
    COUNT(CASE WHEN p.cmd = 'DELETE' THEN 1 END) as "DELETE_Policies"
FROM sensitive_tables st
LEFT JOIN pg_policies p ON p.tablename = st.tbl
GROUP BY st.tbl
ORDER BY st.tbl;

-- Expected findings:
-- - Each table should have policies for SELECT, INSERT, UPDATE, DELETE
-- - Rows showing NULL or 0 for Have_Role_Restriction are risks

-- ==========================================================================
-- 5. AUDIT: View definitions and their security settings
-- ==========================================================================
SELECT 
    table_schema,
    table_name as view_name,
    view_definition
FROM information_schema.views 
WHERE table_schema = 'public'
  AND table_name IN ('customer_booking_details_view', 'customer_profile_view')
ORDER BY table_name;

-- Analyze: Check if views use JOINs to sensitive tables and if SECURITY DEFINER is set

-- ==========================================================================
-- 6. SECURITY CHECK: Verify SECURITY DEFINER functions/views
-- ==========================================================================
-- Note: Views don't have a direct SECURITY property in Postgres 13+,
-- but functions and triggers do. This checks functions that views might call.

SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition,
    CASE 
        WHEN prokind = 'f' THEN 'Function'
        WHEN prokind = 'p' THEN 'Procedure'
        ELSE 'Other'
    END as type,
    CASE 
        WHEN prosecdef = true THEN '⚠️ SECURITY DEFINER (potential bypass)'
        ELSE '✓ SECURITY INVOKER'
    END as security_setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%booking%' OR p.proname LIKE '%customer%' OR p.proname LIKE '%portal%')
ORDER BY p.proname;

-- ==========================================================================
-- 7. DETAILED POLICY ANALYSIS: admin_users
-- ==========================================================================
SELECT 
    'admin_users' as table_name,
    COUNT(*) as total_policies,
    array_agg(DISTINCT permissive ORDER BY permissive) as policy_types,
    array_agg(policyname ORDER BY policyname) as policy_names
FROM pg_policies
WHERE tablename = 'admin_users'
GROUP BY tablename;

-- Expected: Should have restrictive policies that prevent non-admins from accessing

-- ==========================================================================
-- 8. DETAILED POLICY ANALYSIS: plans
-- ==========================================================================
SELECT 
    'plans' as table_name,
    policyname,
    cmd as operation,
    permissive as policy_type,
    qual as using_clause
FROM pg_policies
WHERE tablename = 'plans'
ORDER BY policyname, cmd;

-- Problem indicator: If "all_can_read_plans" exists with permissive + true, it's too open

-- ==========================================================================
-- 9. DETAILED POLICY ANALYSIS: Unauthenticated access coverage
-- ==========================================================================
-- For each admin/sensitive table, are there explicit DENY policies for unauthenticated users?

WITH policy_analysis AS (
    SELECT 
        tablename,
        EXISTS (
            SELECT 1 FROM pg_policies p2 
            WHERE p2.tablename = p.tablename 
              AND (p2.qual LIKE '%auth.uid()%' OR p2.roles::text LIKE '%authenticated%')
        ) as has_auth_check
    FROM pg_policies p
    WHERE p.tablename IN ('admin_users', 'shops', 'plans')
    LIMIT 1
)
SELECT 
    policyname,
    tablename,
    CASE 
        WHEN roles::text = '{}' THEN 'UNAUTHENTICATED ALLOWED'
        WHEN roles::text LIKE '%authenticated%' THEN 'AUTHENTICATED REQUIRED'
        ELSE roles::text
    END as role_requirement,
    permissive,
    CASE 
        WHEN permissive = 'RESTRICTIVE' THEN '✓ DENY POLICY'
        WHEN permissive = 'PERMISSIVE' THEN 'ALLOW POLICY'
    END as effect
FROM pg_policies
WHERE tablename IN ('admin_users', 'shops', 'plans', 'settings', 'usage_logs')
ORDER BY tablename, permissive DESC, policyname;

-- ==========================================================================
-- 10. RLS POLICY COVERAGE CHECK
-- ==========================================================================
-- For each table, verify it has policies for all 4 operations (SELECT, INSERT, UPDATE, DELETE)

WITH table_list AS (
    SELECT 'admin_users'::text as tbl UNION ALL
    SELECT 'shops' UNION ALL
    SELECT 'plans' UNION ALL
    SELECT 'settings' UNION ALL
    SELECT 'usage_logs' UNION ALL
    SELECT 'clients' UNION ALL
    SELECT 'transactions' UNION ALL
    SELECT 'expenses'
),
commands_list AS (
    SELECT 'SELECT'::text as cmd UNION ALL
    SELECT 'INSERT' UNION ALL
    SELECT 'UPDATE' UNION ALL
    SELECT 'DELETE'
)
SELECT 
    tl.tbl,
    cl.cmd,
    COUNT(p.*) as policies_for_operation,
    CASE 
        WHEN COUNT(p.*) = 0 THEN '⚠️ MISSING'
        WHEN COUNT(p.*) >= 1 THEN '✓ EXISTS'
    END as status
FROM table_list tl
CROSS JOIN commands_list cl
LEFT JOIN pg_policies p ON p.tablename = tl.tbl AND p.cmd = cl.cmd
GROUP BY tl.tbl, cl.cmd
ORDER BY tl.tbl, cl.cmd;

-- Expected: No MISSING status for admin tables. All should have at least one policy per operation.

-- ==========================================================================
-- 11. SECURITY DEFINER RISK CHECK - Functions that could bypass RLS
-- ==========================================================================
SELECT 
    n.nspname,
    p.proname,
    prosecdef,
    CASE 
        WHEN prosecdef THEN '🚨 HIGH RISK - Can bypass RLS'
        ELSE '✓ Safe - Respects RLS'
    END as security_posture,
    COALESCE(obj_description(p.oid, 'pg_proc'), 'No description') as purpose
FROM pg_proc p
JOIN pg_namespace n ON pronamespace = n.oid
WHERE n.nspname = 'public'
  AND prosecdef = true
ORDER BY p.proname;

-- If this returns results, those functions might bypass RLS - audit them carefully

-- ==========================================================================
-- SUMMARY: Key Findings
-- ==========================================================================
-- Run the above queries and look for:
-- 1. ⚠️ Any table with rowsecurity = false
-- 2. ⚠️ admin_users with OVERLY PERMISSIVE policies (should be RESTRICTIVE for non-admins)
-- 3. ⚠️ plans with "all_can_read_plans" and qual = '(true)' (too open)
-- 4. ⚠️ Missing DENY policies for unauthenticated users
-- 5. 🚨 SECURITY DEFINER functions that aren't necessary
-- 6. ✓ All tables have policies for SELECT, INSERT, UPDATE, DELETE

-- ==========================================================================
-- NEXT STEPS:
-- If any ⚠️ or 🚨 found, run:
--   supabase-security-migration-phase-2-3.sql (fix DENY policies + admin)
--   supabase-security-migration-phase-4.sql (fix views)
--   supabase-security-verification.sql (final test)
-- ==========================================================================
