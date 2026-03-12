-- =============================================================================
-- REMOVE ALL REGISTERED USERS (clean slate)
-- Run in: Supabase Dashboard → SQL Editor
-- WARNING: This deletes ALL auth users and their profiles and related data.
-- Use only for development/testing. Cannot be undone.
-- =============================================================================

-- 1. Delete data that references profiles (order matters for foreign keys)
DELETE FROM public.attendance_records;
DELETE FROM public.correction_requests;
DELETE FROM public.user_settings;
UPDATE public.system_settings SET updated_by_profile_id = NULL WHERE updated_by_profile_id IS NOT NULL;

-- 2. Delete internships (if your FK is profile_id or intern_profile_id → profiles.id)
DELETE FROM public.internships;

-- 3. Delete all profiles
DELETE FROM public.profiles;

-- 4. Delete all auth users (so you can re-register with the same emails)
DELETE FROM auth.users;

-- Done. All registered emails and their data are removed.
-- You can now register again with any email.
