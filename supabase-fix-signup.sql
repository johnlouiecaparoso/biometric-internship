-- =============================================================================
-- !! RUN THIS FIRST — Fixes 409 Conflict + "Account profile not found" errors !!
-- Supabase Dashboard → SQL Editor → New query → paste below → Run
-- =============================================================================

-- 1. Recreate the reclaim RPC (SECURITY DEFINER so it bypasses RLS)
CREATE OR REPLACE FUNCTION public.reclaim_profile_for_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_meta  jsonb;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users WHERE id = auth.uid();

  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;

  UPDATE public.profiles
  SET
    auth_user_id = auth.uid(),
    is_active    = true,
    role         = COALESCE(NULLIF(v_meta->>'role', ''),       role),
    full_name    = COALESCE(NULLIF(v_meta->>'full_name', ''),  full_name),
    student_id   = COALESCE(NULLIF(v_meta->>'student_id', ''), student_id),
    department   = COALESCE(v_meta->>'department', department),
    course       = CASE WHEN v_meta->>'role' = 'intern'
                        THEN COALESCE(v_meta->>'course', course)
                        ELSE null END,
    year_level   = CASE WHEN v_meta->>'role' = 'intern'
                        THEN COALESCE(v_meta->>'year_level', year_level)
                        ELSE null END
  WHERE email = v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reclaim_profile_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_profile_for_current_user() TO service_role;

-- 2. Email-based reclaim RLS policy (lets the current user re-link an orphaned profile)
DROP POLICY IF EXISTS "profiles_update_reclaim_by_email" ON public.profiles;
CREATE POLICY "profiles_update_reclaim_by_email"
  ON public.profiles FOR UPDATE TO authenticated
  USING  (email = (auth.jwt() ->> 'email'))
  WITH CHECK (auth.uid() = auth_user_id);

-- 3. Fix orphaned profiles whose auth_user_id is NULL (trigger may have set it wrong)
-- Safe to run — only targets rows with no linked auth user
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE p.email = u.email
  AND p.auth_user_id IS NULL;

-- =============================================================================
-- Fix "Database error saving new user" on signup (Supabase Auth)
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================
-- The error means a database trigger runs when Auth inserts into auth.users and
-- that trigger is failing. Usually it's a "create profile" trigger that doesn't
-- match your public.profiles table schema.
-- =============================================================================

-- Step 1: List triggers on auth.users (see what runs on new user signup)
SELECT
  tgname AS trigger_name,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
  AND NOT t.tgisinternal;

-- Step 2: See the function definition (replace <function_name> with result from Step 1)
-- Example: select pg_get_functiondef(oid) from pg_proc where proname = 'handle_new_user';

-- Step 3: DROP the trigger so signup works (your app creates the profile in public.profiles)
-- Replace trigger_name and function_name with the actual names from Step 1.
-- Common Supabase default: trigger "on_auth_user_created", function "handle_new_user"

-- Option A: Drop only the trigger (function stays but won't run)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Option B: If your trigger has a different name, run this and replace TRIGGER_NAME:
-- DROP TRIGGER IF EXISTS TRIGGER_NAME ON auth.users;

-- =============================================================================
-- RECOMMENDED FIX: Drop the trigger that runs on new user signup.
-- Your app already creates the profile in registerAccount() after signup,
-- so this trigger is redundant and (when it fails) causes "Database error saving new user".
-- =============================================================================
-- Run Step 1 first and note the trigger_name. Then run ONE of the lines below,
-- using your trigger name if it's not "on_auth_user_created".
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- If Step 1 showed a different trigger name (e.g. "handle_new_user_trigger"),
-- use that name instead:
-- DROP TRIGGER IF EXISTS <your_trigger_name> ON auth.users;


-- =============================================================================
-- FIX: 409 Conflict on /rest/v1/profiles during login
-- =============================================================================
-- A 409 on the profiles table means a trigger or function is trying to INSERT a
-- profile row that already exists (duplicate key violation). This is caused by
-- a trigger on auth.users that fires on UPDATE (e.g. when last_sign_in_at is
-- updated during sign-in) and tries to insert a profile without ON CONFLICT handling.
--
-- Run the query below to find all triggers on auth.users (not just INSERT ones):
-- =============================================================================
SELECT
  tgname AS trigger_name,
  proname AS function_name,
  CASE tgtype & 2 WHEN 2 THEN 'BEFORE' ELSE 'AFTER' END AS timing,
  CASE
    WHEN tgtype & 4 > 0 THEN 'INSERT '
    ELSE ''
  END ||
  CASE
    WHEN tgtype & 8 > 0 THEN 'DELETE '
    ELSE ''
  END ||
  CASE
    WHEN tgtype & 16 > 0 THEN 'UPDATE'
    ELSE ''
  END AS events
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
  AND NOT t.tgisinternal;

-- If a trigger fires on UPDATE (during sign-in), either drop it or make its
-- function idempotent by replacing INSERT with INSERT ... ON CONFLICT DO NOTHING:
--
-- Example idempotent trigger function fix:
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (auth_user_id, email, full_name, role, ...)
--   VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 'intern', ...)
--   ON CONFLICT (auth_user_id) DO NOTHING;    -- <-- add this line
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- Or simply drop the trigger if your app handles profile creation:
-- DROP TRIGGER IF EXISTS <trigger_name> ON auth.users;


-- =============================================================================
-- FIX: "new row violates row-level security policy for table profiles" (403)
-- =============================================================================

-- =============================================================================
-- STEP 1: DROP *ALL* EXISTING POLICIES on every affected table.
-- =============================================================================
-- This is more reliable than dropping by name — old Dashboard-created policies
-- or policies from a previous run with slightly different names will survive a
-- DROP POLICY IF EXISTS "exact name" statement, leaving the recursion intact.
-- Running this DO block first guarantees a clean slate.
-- =============================================================================

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','internships','attendance_records',
        'correction_requests','user_settings','system_settings'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      pol.policyname, pol.tablename
    );
  END LOOP;
END $$;


-- =============================================================================
-- STEP 2: Create get_my_role() — a SECURITY DEFINER helper.
-- =============================================================================
-- SECURITY DEFINER means it runs as the function owner (postgres/supabase),
-- which bypasses RLS entirely. Every admin-check in every policy calls this
-- function instead of a raw subquery on profiles, which would recurse forever.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;


-- =============================================================================
-- STEP 3: Re-create all RLS policies (clean, no recursion).
-- =============================================================================

-- profiles -----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "profiles_update_reclaim_by_email" ON public.profiles;
CREATE POLICY "profiles_update_reclaim_by_email"
  ON public.profiles FOR UPDATE TO authenticated
  USING (email = (auth.jwt() ->> 'email'))
  WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);

-- Admin reads ALL profiles. Uses get_my_role() (SECURITY DEFINER) to avoid
-- the infinite-recursion 500 that occurs when a profiles policy subqueries profiles.
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

-- internships --------------------------------------------------------------
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internships_select_own"
  ON public.internships FOR SELECT TO authenticated
  USING (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "internships_select_admin"
  ON public.internships FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin');

CREATE POLICY "internships_insert_own"
  ON public.internships FOR INSERT TO authenticated
  WITH CHECK (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "internships_update_own"
  ON public.internships FOR UPDATE TO authenticated
  USING (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- attendance_records -------------------------------------------------------
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_select_own_or_admin"
  ON public.attendance_records FOR SELECT TO authenticated
  USING (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
    OR public.get_my_role() = 'admin'
  );

CREATE POLICY "attendance_insert_own"
  ON public.attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "attendance_update_own"
  ON public.attendance_records FOR UPDATE TO authenticated
  USING (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- correction_requests ------------------------------------------------------
ALTER TABLE public.correction_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "correction_requests_select_own_or_admin"
  ON public.correction_requests FOR SELECT TO authenticated
  USING (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
    OR public.get_my_role() = 'admin'
  );

CREATE POLICY "correction_requests_insert_own"
  ON public.correction_requests FOR INSERT TO authenticated
  WITH CHECK (
    intern_profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "correction_requests_update_admin"
  ON public.correction_requests FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- user_settings ------------------------------------------------------------
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_own"
  ON public.user_settings FOR SELECT TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "user_settings_update_own"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );


-- =============================================================================
-- FIX: "duplicate key value violates unique constraint profiles_email_key" (409)
-- =============================================================================
-- The app now does a minimal reclaim (only auth_user_id and is_active) to avoid
-- 500 errors from triggers or constraints when updating other columns.
-- If you still get 500 on profiles?email=eq.... use the RPC below instead.
-- =============================================================================

-- Reclaim profile by email via RPC (avoids 500 from RLS/trigger on direct UPDATE).
-- Call from app: supabase.rpc('reclaim_profile_for_current_user')
-- Also updates role, name, and student_id from auth user metadata so re-registration
-- with a different role works correctly.
CREATE OR REPLACE FUNCTION public.reclaim_profile_for_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_meta  jsonb;
BEGIN
  SELECT email, raw_user_meta_data INTO v_email, v_meta FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL OR v_email = '' THEN RETURN; END IF;
  UPDATE public.profiles
  SET
    auth_user_id = auth.uid(),
    is_active    = true,
    role         = COALESCE(NULLIF(v_meta->>'role', ''), role),
    full_name    = COALESCE(NULLIF(v_meta->>'full_name', ''), full_name),
    student_id   = COALESCE(NULLIF(v_meta->>'student_id', ''), student_id),
    department   = COALESCE(v_meta->>'department', department),
    course       = CASE WHEN v_meta->>'role' = 'intern' THEN COALESCE(v_meta->>'course', course) ELSE null END,
    year_level   = CASE WHEN v_meta->>'role' = 'intern' THEN COALESCE(v_meta->>'year_level', year_level) ELSE null END
  WHERE email = v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.reclaim_profile_for_current_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reclaim_profile_for_current_user() TO service_role;

-- If 500 on reclaim still happens, list triggers on profiles (one may be failing):
-- SELECT tgname, proname FROM pg_trigger t JOIN pg_proc p ON t.tgfoid = p.oid
-- JOIN pg_class c ON t.tgrelid = c.oid WHERE c.relname = 'profiles' AND NOT t.tgisinternal;
-- =============================================================================


-- =============================================================================
-- FIX: system_settings RLS policies
-- =============================================================================
-- Without these, fetchSystemSettings() (called by recordAttendanceScan) returns
-- a 403 and falls back to hardcoded defaults.  saveSystemSettings() silently
-- fails and the admin sees no success message.
--
-- All authenticated users need SELECT so interns can read the schedule thresholds.
-- Only admins can INSERT/UPDATE/DELETE.
-- =============================================================================

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can read system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can write system settings" ON public.system_settings;
CREATE POLICY "Admins can write system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
