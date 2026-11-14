-- ============================================================
-- DIAGNOSTIC: Run each block ONE AT A TIME in Supabase SQL Editor
-- Check the result after each one before continuing
-- ============================================================

-- BLOCK 1: Check if the tables exist
-- Expected: 3 rows (homes, home_members, home_invitations)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('homes', 'home_members', 'home_invitations')
order by table_name;

-- ============================================================

-- BLOCK 2: Check if is_home_member function exists
-- Expected: 1 row showing the function
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'is_home_member';

-- ============================================================

-- BLOCK 3: Check the CURRENT RLS policies on home_members
-- Look for any policy that SELECTs from home_members in its definition
-- (that would cause infinite recursion)
select policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'home_members';

-- ============================================================

-- BLOCK 4: Try calling is_home_member (only works if BLOCK 2 shows a row)
-- Expected: false
select public.is_home_member(gen_random_uuid(), gen_random_uuid());

-- ============================================================

-- BLOCK 5: Try calling get_my_home
-- Expected: null (if no home) or JSON (if you have one)
select public.get_my_home();

-- ============================================================

-- BLOCK 6: Check if you have any homes in the DB
-- Run this to see if a home was already created
select * from public.homes;

-- ============================================================

-- BLOCK 7: Check if you are in home_members
select * from public.home_members;

