# Troubleshooting: Registration & Login

---

## "Invalid credentials" even though the account exists in Supabase

**Symptoms:** You register or see the account in Supabase (Auth → Users and/or Table Editor → profiles), but when you log in with the same email and password you get **"Invalid credentials"**.

**Root cause (RLS):** Row Level Security on `profiles` is enabled, but there is **no policy allowing authenticated users to SELECT their own profile**. So:

1. Login calls `signInWithPassword` → **succeeds** (auth user exists, password correct).
2. The app then calls `fetchCurrentUser()` → runs `SELECT ... FROM profiles WHERE auth_user_id = current user`.
3. RLS blocks the read (no SELECT policy), so the query returns **no rows**.
4. The app treats "no profile" as failed login and shows **"Invalid credentials"**.

**Fix:** Add the **SELECT** policy so users can read their own profile. In **Supabase Dashboard → SQL Editor**, run:

```sql
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
CREATE POLICY "Users can select own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id);
```

This is already in **`supabase-fix-signup.sql`** — run the full RLS section of that file if you haven’t.

**After adding the policy:** Log in again with your email and password; it should succeed.

---

## "Email already registered" on first-time registration

**Symptoms:** You register with an email that has no prior record, but the UI says the email is already registered. The account may still appear in Supabase.

**Cause:** A row in `profiles` with that email already exists (e.g. from an old test or a deleted auth user). The app tries to create a new profile; the insert fails on the **unique email** constraint. The **auth user** is created, but the profile is only linked if "reclaim" works (UPDATE profile by email). If reclaim fails (e.g. missing RLS policy or JWT email), you see "email already registered" and the new auth user has no profile → login then fails with "invalid credentials" until the SELECT policy above is in place and (if needed) the reclaim policy is added.

**Fix:** Ensure the **reclaim** and **SELECT** policies in `supabase-fix-signup.sql` are applied. Then try logging in with that email and password; `ensureProfileExists()` may create or reclaim the profile on first login.

---

## 403 on `/auth/v1/user`

**Symptoms:** Console shows repeated `Failed to load resource: 403` for `.../auth/v1/user`.

**Cause:** The app was calling `getUser()` when there was no valid session (e.g. on load or after sign-out). That request is forbidden without a valid JWT.

**Fix (in app):** The auth context now uses `getSession()` first and only fetches the profile when a session exists, so 403s when logged out should stop. If 403 still appears after login, check Supabase → **Authentication** → **Settings** (JWT expiry, URL allowlist) and that `.env` has the correct `VITE_SUPABASE_ANON_KEY`.

---

## 500 on `/rest/v1/profiles?email=eq....` (reclaim)

**Symptoms:** After registration or login, console shows 500 on a request to `profiles` with `?email=eq....` and `ensureProfileExists: could not reclaim orphaned profile`.

**Cause:** The app tries to “reclaim” an existing profile (update `auth_user_id`) when email or student_id is already in use. The direct UPDATE can return 500 if an **RLS policy** or a **trigger on `profiles`** fails.

**Fix (1) – use the RPC:** Run the SQL in **`supabase-fix-signup.sql`** that creates **`reclaim_profile_for_current_user()`**. The app will call this RPC when the direct reclaim fails; the function runs with elevated privileges and can avoid the 500. After running that SQL, try logging in again (or register then login).

**Fix (2) – find the trigger:** If 500 persists, a **trigger on `profiles`** may be failing. In **Supabase** → **Logs** → **Postgres**, find the error for the failing request. List triggers on `profiles`:

```sql
SELECT tgname, proname FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'profiles' AND NOT t.tgisinternal;
```

Fix or temporarily drop the trigger that runs on UPDATE, then try again.

---

## Duplicate student ID

**Symptoms:** Registration fails with duplicate key on `profiles_student_id_key`, or console shows “profile creation failed … student_id”.

**Cause:** The `profiles` table has a UNIQUE constraint on `student_id`. Another profile already has that student ID.

**Fix:** The app now shows: *“This student ID is already registered. Use a different one or sign in.”* Use a different student ID to register, or sign in with the account that has that student ID.

---

## Troubleshooting: Registration 500 Error

When you see **"Failed to load resource: the server responded with a status of 500"** on register, the failure is coming from Supabase (either Auth or the database). Use the steps below to find and fix the cause.

---

## 500 on `/auth/v1/signup` (Auth signup)

If the console points to **`pkynuyhitoyqxpsslksr.supabase.co/auth/v1/signup`** or **`/auth/v1/signup`** with status **500**, the error is from **Supabase Auth** during signup, not from the profile insert. Common causes:

### 1. Check Supabase Logs (most reliable)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project (**pkynuyhitoyqxpsslksr**).
2. Go to **Logs** → **Log Explorer** (or **Auth Logs**).
3. Set the time range to when you tried to register.
4. Look for **Auth** or **Postgres** errors around that time.

**Database errors (trigger/constraint):**  
In Log Explorer, run:

```sql
select
  cast(postgres_logs.timestamp as datetime) as timestamp,
  event_message,
  parsed.error_severity,
  parsed.user_name,
  parsed.query,
  parsed.detail,
  parsed.hint,
  parsed.sql_state_code
from postgres_logs
cross join unnest(metadata) as metadata
cross join unnest(metadata.parsed) as parsed
where regexp_contains(parsed.error_severity, 'ERROR|FATAL|PANIC')
  and regexp_contains(parsed.user_name, 'supabase_auth_admin')
order by timestamp desc
limit 100;
```

**Auth-level errors:**  
Run:

```sql
select
  cast(metadata.timestamp as datetime) as timestamp,
  msg,
  event_message,
  status,
  path,
  level
from auth_logs
cross join unnest(metadata) as metadata
where status::INT = 500 OR regexp_contains(level, 'error|fatal')
order by timestamp desc;
```

What you find here (trigger name, constraint, SMTP, etc.) is the real cause of the 500.

### 2. Project paused

In **Settings** → **General**, check if the project is **Paused**. If yes, click **Restore project**.

### 3. Log says "Database error saving new user"

If Auth logs show **`/signup | 500: Database error saving new user`**, a **trigger on `auth.users`** is failing. Often it's a "create profile" trigger that doesn't match your `public.profiles` table.

**Fix:** Run the SQL in **`supabase-fix-signup.sql`** (Supabase Dashboard → SQL Editor): run Step 1 to list triggers, then run `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;` (or the trigger name from Step 1). Your app already creates the profile in `registerAccount()` after signup, so removing this trigger is safe.

### 4. Trigger on `auth.users`

A trigger that runs when a new user is created (e.g. “create profile in `public.profiles`”) can cause 500 if it:

- References a missing table/column
- Lacks permissions (needs `SECURITY DEFINER`)
- Violates a constraint or RLS

Fix or temporarily drop the trigger in **SQL Editor** and try signup again. Official guide: [Resolving 500 status authentication errors](https://supabase.com/docs/guides/troubleshooting/resolving-500-status-authentication-errors-7bU5U8).

### 5. SMTP / email templates

If Auth is sending a confirmation email and SMTP is misconfigured or the email template is invalid, signup can return 500. Check **Auth** → **Email Templates** and **Auth** → **Providers** (SMTP). Try disabling “Confirm email” temporarily to see if signup succeeds.

---

## 1. Check the browser console for the real error

After the code change in this project, **try registering again** and open DevTools → **Console**. You should see:

```text
Registration error (message): ...
Registration error (full): ...
```

Use the **message** and **code** to narrow down the cause.

- **If `message` mentions "profile" or "insert" or "row-level security"**  
  The error is from the **profiles table insert** (step after sign-up). See section “Profiles table insert returning 500” below.

- **If the failing request is `/auth/v1/signup`**  
  The error is from **Supabase Auth**. Use the “500 on Auth signup” section above and the Log Explorer.

## 2. Supabase Auth returning 500

- **Project paused (very common on free tier)**  
  In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Settings** → **General**, check if the project is **Paused**. If so, click **Restore project**.

- **Wrong URL or anon key**  
  In the project root, ensure `.env` has:
  - `VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=eyJ...` (from Dashboard → Settings → API → anon public key)  
  Restart the dev server after changing `.env` (`npm run dev`).

## 3. Profiles table insert returning 500

Registration creates a row in the `profiles` table right after sign-up. A 500 here is usually due to **database schema** or **RLS (Row Level Security)**.

- **Table and columns**  
  In Supabase → **Table Editor**, open the `profiles` table and confirm it has (at least):
  - `auth_user_id` (uuid, links to `auth.users.id`)
  - `full_name`, `student_id`, `email`, `role`, `department`, `course`, `year_level`, `is_active`

- **RLS**  
  In **Table Editor** → `profiles` → **Policies**, ensure there is a policy that **allows INSERT** for the authenticated user (e.g. `auth.uid() = auth_user_id` or a policy that allows new profile creation right after sign-up).  
  If unsure, you can temporarily disable RLS on `profiles` to test; if registration then works, the fix is to add the correct INSERT policy.

- **Triggers**  
  In **SQL Editor**, check for triggers on `profiles` (e.g. `CREATE TRIGGER ... ON profiles`). If a trigger runs on INSERT and fails (e.g. missing table/column or permission), the API can return 500. Fix or temporarily disable the trigger to test.

## 4. Quick checklist

- [ ] Console shows the new `Registration error:` log with `message` / `code` / `details`.
- [ ] Supabase project is **not** paused.
- [ ] `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; dev server restarted after changes.
- [ ] `profiles` table exists with the expected columns.
- [ ] RLS on `profiles` allows INSERT for the signed-up user (or RLS disabled temporarily to test).
- [ ] No trigger on `profiles` that could throw on INSERT.

Once you have the exact `message` and `code` from the console, you can search Supabase docs or share them for more targeted help.
