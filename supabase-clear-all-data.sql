-- =============================================================================
-- DANGER: Clear ALL application data and auth users
-- Use this to wipe everything and start fresh (development only).
-- Run in: Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- Step 1: Delete all application data (order matters — FK constraints)
DELETE FROM public.user_settings;
DELETE FROM public.correction_requests;
DELETE FROM public.attendance_records;
DELETE FROM public.internships;
DELETE FROM public.profiles;

-- Step 2: Delete all auth users
-- This removes all registered accounts from Supabase Auth.
DELETE FROM auth.users;

-- =============================================================================
-- Step 3: Verify everything is empty
-- Run this block to confirm all tables are cleared:
-- =============================================================================
SELECT 'profiles'            AS table_name, COUNT(*) AS row_count FROM public.profiles
UNION ALL
SELECT 'internships',                        COUNT(*) FROM public.internships
UNION ALL
SELECT 'attendance_records',                 COUNT(*) FROM public.attendance_records
UNION ALL
SELECT 'correction_requests',                COUNT(*) FROM public.correction_requests
UNION ALL
SELECT 'user_settings',                      COUNT(*) FROM public.user_settings
UNION ALL
SELECT 'auth.users',                         COUNT(*) FROM auth.users;

-- =============================================================================
-- OPTIONAL: Fix a specific account's wrong data without clearing everything
-- =============================================================================

-- View all profiles and their roles/IDs:
-- SELECT id, full_name, email, role, student_id FROM public.profiles ORDER BY role, full_name;

-- Fix a specific profile's role (e.g. change from admin → intern):
-- UPDATE public.profiles SET role = 'intern' WHERE email = 'user@example.com';

-- Fix a specific profile's student_id (e.g. admin whose ID was auto-set to 'admin1'):
-- UPDATE public.profiles SET student_id = 'ADMIN001' WHERE email = 'admin@example.com';

-- Fix both at once:
-- UPDATE public.profiles
-- SET role = 'intern', student_id = '2026-00001'
-- WHERE email = 'user@example.com';
