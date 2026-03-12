-- =============================================================================
-- CLEAR ALL ACCOUNTS & DATA — Clean slate for development/testing
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- WARNING: Permanently deletes ALL users and ALL data. Cannot be undone.
-- =============================================================================

-- 1. Nullify any foreign key references to profiles before deleting
UPDATE public.system_settings
  SET updated_by_profile_id = NULL
  WHERE updated_by_profile_id IS NOT NULL;

-- 2. Delete all user data (order respects foreign key constraints)
DELETE FROM public.attendance_records;
DELETE FROM public.correction_requests;
DELETE FROM public.user_settings;
DELETE FROM public.internships;
DELETE FROM public.profiles;

-- 3. Delete all Supabase Auth users (frees up the emails for re-registration)
DELETE FROM auth.users;

-- =============================================================================
-- Done. All accounts and data are removed.
-- You can now register fresh accounts with any email.
-- =============================================================================
