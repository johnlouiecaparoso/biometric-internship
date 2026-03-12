import { supabase } from './supabase';
import { AttendanceRecord, CorrectionRequest, InternProfile, User, UserRole } from '../types/models';

const toLocalDate = (d: Date) => {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${day}`;
};

const toLocalTime = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const normalizeTime = (value: string | null) => {
  if (!value) return null;
  return value.slice(0, 5);
};

const toDisplayDate = (value?: string | null) => value ?? '';

function mapUser(profile: any): User {
  const internship = Array.isArray(profile.internships) ? profile.internships[0] : profile.internships;

  return {
    id: profile.id,
    name: profile.full_name,
    studentId: profile.student_id,
    role: profile.role,
    department: profile.department ?? '',
    email: profile.email,
    requiredHours: internship?.required_hours ?? 0,
    renderedHours: Number(internship?.rendered_hours ?? 0),
    company: internship?.company ?? '',
    supervisor: internship?.supervisor ?? '',
    startDate: toDisplayDate(internship?.start_date),
    endDate: toDisplayDate(internship?.end_date),
    course: profile.course ?? '',
    yearLevel: profile.year_level ?? '',
  };
}

export async function resolveLoginEmail(identifier: string, role: UserRole): Promise<string> {
  if (identifier.includes('@')) return identifier;

  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('student_id', identifier)
    .eq('role', role)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data?.email) {
    throw new Error('Use your email address to sign in.');
  }

  return data.email;
}

export async function registerAccount(payload: {
  role: UserRole;
  fullName: string;
  studentId: string;
  email: string;
  password: string;
  department?: string;
  course?: string;
  yearLevel?: string;
}) {
  const { data: authResult, error: signUpError } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.fullName,
        student_id: payload.studentId,
        role: payload.role,
        department: payload.department ?? '',
        course: payload.course ?? '',
        year_level: payload.yearLevel ?? '',
      },
    },
  });

  if (signUpError) {
    const code = (signUpError as any).code;
    const msg = signUpError.message || '';
    const isExisting = code === 'user_already_exists' || msg.toLowerCase().includes('already registered');

    if (isExisting) {
      // The auth user already exists (likely from a previous interrupted
      // registration). Try to sign in with the provided password — if it
      // matches, ensure the profile exists and treat as a successful registration.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });

      if (!signInError && signInData?.user) {
        // Sign-in worked — make sure a profile row exists with correct role from payload
        const userWithCorrectRole = {
          ...signInData.user,
          user_metadata: {
            ...signInData.user.user_metadata,
            full_name: payload.fullName,
            student_id: payload.studentId,
            role: payload.role,
            department: payload.department ?? '',
            course: payload.course ?? '',
            year_level: payload.yearLevel ?? '',
          }
        };
        const profile = await ensureProfileExists(userWithCorrectRole);
        if (!profile) {
          // Profile couldn't be linked — sign out (fire-and-forget, don't await
          // or it hangs for 15s) and surface a clear error.
          supabase.auth.signOut().catch(() => {});
          throw new Error(
            'Your account exists but its profile could not be linked. ' +
            'Please ask your administrator to run the SQL fix, then sign in from the Login page.'
          );
        }
        return { requiresEmailVerification: false, alreadySignedIn: true };
      }

      // Sign-in with the same password failed.
      const signInCode = (signInError as any)?.code ?? '';
      const signInMsg  = (signInError as any)?.message ?? '';

      if (
        signInCode === 'email_not_confirmed' ||
        signInMsg.toLowerCase().includes('email not confirmed') ||
        signInMsg.toLowerCase().includes('not confirmed')
      ) {
        throw new Error(
          'Your email address has not been confirmed yet. ' +
          'Please check your inbox for the confirmation email and click the link, then try signing in. ' +
          'Or ask your administrator to disable email confirmation in Supabase Auth settings.'
        );
      }

      if (
        signInCode === 'invalid_credentials' ||
        signInMsg.toLowerCase().includes('invalid') ||
        signInMsg.toLowerCase().includes('wrong')
      ) {
        throw new Error(
          'An account with this email already exists but the password does not match. ' +
          'Please sign in from the Login page using your original password, ' +
          'or ask your administrator to clear your account and re-register.'
        );
      }

      // Unknown sign-in error
      throw new Error(
        `Sign-in failed (${signInMsg || signInCode || 'unknown error'}). ` +
        'Please try signing in from the Login page, or ask your administrator to clear your account.'
      );
    }

    throw signUpError;
  }

  // If no session was returned, email verification is required.
  if (!authResult.session || !authResult.user) {
    return { requiresEmailVerification: !authResult.session };
  }

  // A session is available — try to ensure a profile row exists.
  // A database trigger (on_auth_user_created) may have already created
  // the profile, so check first before inserting.
  const authUserId = authResult.user.id;

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!existingProfile) {
    // No profile yet — try to create one.
    const profilePayload = {
      auth_user_id: authUserId,
      full_name: payload.fullName,
      student_id: payload.studentId,
      email: payload.email,
      role: payload.role,
      department: payload.department ?? '',
      // Only include course and year_level for interns, not admins
      course: payload.role === 'intern' ? (payload.course ?? '') : null,
      year_level: payload.role === 'intern' ? (payload.yearLevel ?? '') : null,
      is_active: true,
    };

    const { error: profileError } = await supabase.from('profiles').insert(profilePayload);

    if (profileError) {
      const code = (profileError as any).code;
      const msg = profileError.message || '';
      const isDupKey = code === '23505';
      const isDuplicateStudentId = isDupKey && (msg.includes('profiles_student_id_key') || msg.includes('student_id'));
      const isDuplicateEmail = isDupKey && (msg.includes('profiles_email_key') || msg.includes('email'));

      if (isDupKey) {
        const reclaimPayload: Record<string, any> = {
          auth_user_id: authUserId,
          is_active: true,
          full_name: payload.fullName,
          student_id: payload.studentId,
          role: payload.role,
          department: payload.department ?? '',
          course: payload.role === 'intern' ? (payload.course ?? '') : null,
          year_level: payload.role === 'intern' ? (payload.yearLevel ?? '') : null,
        };

        // 1. Reclaim by auth_user_id — handles trigger-created profiles (most common case).
        //    RLS allows updating a row where auth_user_id = auth.uid(), so no privilege needed.
        const { data: byAuthId } = await supabase
          .from('profiles')
          .update(reclaimPayload)
          .eq('auth_user_id', authUserId)
          .select('id');
        if (byAuthId && byAuthId.length > 0) return { requiresEmailVerification: false };

        // 2. Reclaim by email — handles leftover profiles from a previous registration.
        const { data: byEmail } = await supabase
          .from('profiles')
          .update(reclaimPayload)
          .eq('email', payload.email)
          .select('id');
        if (byEmail && byEmail.length > 0) return { requiresEmailVerification: false };

        // 3. Reclaim by student_id — handles student_id-specific conflicts.
        if (isDuplicateStudentId && payload.studentId) {
          const { data: byStudentId } = await supabase
            .from('profiles')
            .update(reclaimPayload)
            .eq('student_id', payload.studentId)
            .select('id');
          if (byStudentId && byStudentId.length > 0) return { requiresEmailVerification: false };
        }

        // 4. Last resort: privileged RPC (may not exist — 400 is non-fatal here).
        const { error: rpcError } = await supabase.rpc('reclaim_profile_for_current_user');
        if (!rpcError) return { requiresEmailVerification: false };

        // 5. All reclaim attempts failed. The auth user WAS created, so return success
        //    for auth_user_id conflicts (trigger race). Only throw for true duplicates.
        if (isDuplicateStudentId) {
          throw new Error('This student ID is already registered under a different account. Please sign in or use a different student ID.');
        }
        if (isDuplicateEmail) {
          throw new Error('This email is already registered. Please sign in or use a different email.');
        }
        // Auth_user_id conflict — trigger already created the profile, treat as success.
        return { requiresEmailVerification: false };
      }

      // Not fatal — auth user was created. ensureProfileExists() will retry on login.
    }
  }

  return { requiresEmailVerification: false };
}

export async function fetchCurrentUser(sessionUser?: { id: string } | null): Promise<User | null> {
  const authUserId = sessionUser?.id;
  let authUser = authUserId ? { id: authUserId } : null;

  if (!authUser) {
    const { data: authData } = await supabase.auth.getUser();
    authUser = authData.user;
  }
  if (!authUser) return null;

  const profileSelect = `
    id,
    role,
    student_id,
    full_name,
    email,
    department,
    course,
    year_level,
    internships (
      required_hours,
      rendered_hours,
      company,
      supervisor,
      start_date,
      end_date
    )
  `;

  let { data, error } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  // If 500 (e.g. RLS/trigger on internships), retry without relation so login still works
  if (error && (error as any).code !== 'PGRST116') {
    const { data: profileOnly, error: err2 } = await supabase
      .from('profiles')
      .select('id, role, student_id, full_name, email, department, course, year_level')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (!err2 && profileOnly) {
      data = { ...profileOnly, internships: null };
      error = null;
    }
  }

  if (error) throw error;
  if (!data) return null;
  return mapUser(data);
}

/**
 * If a user authenticated successfully but has no profile in the
 * `profiles` table (e.g. because a previous registration was interrupted
 * by a bug), this function creates the profile from the auth user's
 * metadata that was stored during signUp.
 */
export async function ensureProfileExists(authUser: { id: string; email?: string; user_metadata?: Record<string, any> }): Promise<User | null> {
  // First check if profile already exists
  const existing = await fetchCurrentUser({ id: authUser.id });
  if (existing) return existing;

  // No profile – try to create one from auth user metadata
  const meta = authUser.user_metadata ?? {};
  const email = authUser.email ?? meta.email ?? '';
  const role = meta.role ?? 'intern';
  const profilePayload = {
    auth_user_id: authUser.id,
    full_name: meta.full_name ?? '',
    student_id: meta.student_id ?? '',
    email,
    role,
    department: meta.department ?? '',
    // Only include course and year_level for interns, not admins
    course: role === 'intern' ? (meta.course ?? '') : null,
    year_level: role === 'intern' ? (meta.year_level ?? '') : null,
    is_active: true,
  };

  const { error: insertError } = await supabase.from('profiles').insert(profilePayload);

  if (insertError) {
    const code = (insertError as any).code;
    const msg = insertError.message || '';
    const isDuplicateEmail =
      code === '23505' && (msg.includes('profiles_email_key') || msg.includes('duplicate key') || msg.includes('email'));
    const isDuplicateStudentId =
      code === '23505' && (msg.includes('profiles_student_id_key') || msg.includes('student_id'));

    if (isDuplicateEmail) {
      // Reclaim: try direct UPDATE first, then RPC (avoids 500 from RLS/trigger on direct UPDATE).
      // Update role and other metadata from auth user to ensure correct role is set
      const updatePayload: any = {
        auth_user_id: authUser.id,
        is_active: true,
        role: role,
        full_name: meta.full_name ?? profilePayload.full_name,
        student_id: meta.student_id ?? profilePayload.student_id,
        department: meta.department ?? profilePayload.department,
      };
      // Only update course and year_level for interns
      if (role === 'intern') {
        updatePayload.course = meta.course ?? profilePayload.course;
        updatePayload.year_level = meta.year_level ?? profilePayload.year_level;
      } else {
        // Clear course and year_level for admins
        updatePayload.course = null;
        updatePayload.year_level = null;
      }

      const { data: reclaimedByEmail, error: reclaimError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('email', email)
        .select('id');

      // If update returned at least one row, the profile is now linked.
      if (!reclaimError && reclaimedByEmail && reclaimedByEmail.length > 0) {
        return fetchCurrentUser({ id: authUser.id });
      }

      // Direct update returned 0 rows (RLS blocked it) — try the SECURITY DEFINER RPC.
      const { error: rpcError } = await supabase.rpc('reclaim_profile_for_current_user');
      if (!rpcError) {
        return fetchCurrentUser({ id: authUser.id });
      }

      return null;
    } else if (isDuplicateStudentId) {
      // Same student_id already in use — try reclaim by student_id (link row to this auth user).
      const studentId = meta.student_id ?? '';
      if (studentId) {
        const updatePayload: any = {
          auth_user_id: authUser.id,
          is_active: true,
          role: role,
          full_name: meta.full_name ?? profilePayload.full_name,
          department: meta.department ?? profilePayload.department,
        };
        // Only update course and year_level for interns
        if (role === 'intern') {
          updatePayload.course = meta.course ?? profilePayload.course;
          updatePayload.year_level = meta.year_level ?? profilePayload.year_level;
        } else {
          updatePayload.course = null;
          updatePayload.year_level = null;
        }

        const { error: reclaimError } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('student_id', studentId)
          .eq('email', email);

        if (!reclaimError) {
          return fetchCurrentUser({ id: authUser.id });
        }
      }
      return null;
    } else {
      return null;
    }
  }

  // Fetch the newly created/updated profile
  return fetchCurrentUser({ id: authUser.id });
}

export async function updateProfileInfo(
  profileId: string,
  info: { name: string; course: string; yearLevel: string; department: string }
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: info.name,
      course: info.course,
      year_level: info.yearLevel,
      department: info.department,
    })
    .eq('id', profileId);
  if (error) throw error;
}

export async function updateOjtDetails(
  profileId: string,
  details: {
    company: string;
    supervisor: string;
    requiredHours: number;
    renderedHours: number;
    startDate: string;
    endDate: string;
  }
): Promise<void> {
  // Try update first
  const { data: existing } = await supabase
    .from('internships')
    .select('id')
    .eq('intern_profile_id', profileId)
    .maybeSingle();

  const payload = {
    intern_profile_id: profileId,
    company: details.company,
    supervisor: details.supervisor,
    required_hours: details.requiredHours,
    rendered_hours: details.renderedHours,
    start_date: details.startDate || null,
    end_date: details.endDate || null,
  };

  if (existing) {
    const { error } = await supabase
      .from('internships')
      .update(payload)
      .eq('intern_profile_id', profileId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('internships')
      .insert(payload);
    if (error) throw error;
  }
}

export async function fetchAttendanceHistory(internProfileId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, attendance_date, time_in, time_out, hours_rendered, status')
    .eq('intern_profile_id', internProfileId)
    .order('attendance_date', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.attendance_date,
    timeIn: normalizeTime(row.time_in),
    timeOut: normalizeTime(row.time_out),
    hoursRendered: Number(row.hours_rendered ?? 0),
    status: row.status,
  }));
}

export async function fetchTodayAttendance(internProfileId: string): Promise<AttendanceRecord | null> {
  const today = toLocalDate(new Date());
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id, attendance_date, time_in, time_out, hours_rendered, status')
    .eq('intern_profile_id', internProfileId)
    .eq('attendance_date', today)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    date: data.attendance_date,
    timeIn: normalizeTime(data.time_in),
    timeOut: normalizeTime(data.time_out),
    hoursRendered: Number(data.hours_rendered ?? 0),
    status: data.status,
  };
}

export async function recordAttendanceScan(
  internProfileId: string,
  mode: 'time-in' | 'time-out',
  biometricType: 'fingerprint' | 'face'
): Promise<AttendanceRecord> {
  const now = new Date();
  const today = toLocalDate(now);
  const nowTime = toLocalTime(now);

  const { data: existing, error: lookupError } = await supabase
    .from('attendance_records')
    .select('id, time_in, time_out, status')
    .eq('intern_profile_id', internProfileId)
    .eq('attendance_date', today)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (mode === 'time-in' && existing?.time_in) {
    throw new Error('You have already timed in today.');
  }
  if (mode === 'time-out' && existing?.time_out) {
    throw new Error('You have already timed out today.');
  }

  // Load schedule settings — fall back to safe defaults if not configured
  const sysSettings = await fetchSystemSettings().catch(() => null);
  const schedule = (sysSettings?.schedule ?? {}) as Record<string, string>;
  const schedTimeIn = schedule.timeIn ?? '08:00';
  const graceMinutes = parseInt(schedule.graceMinutes ?? '15', 10);
  const schedTimeOut = schedule.timeOut ?? '17:00';
  const undertimeGraceMinutes = parseInt(schedule.undertimeMinutes ?? '60', 10);

  // Late threshold = scheduled time-in + grace period
  const [tiH, tiM] = schedTimeIn.split(':').map(Number);
  const lateThreshold = String(Math.floor((tiH * 60 + tiM + graceMinutes) / 60)).padStart(2, '0') +
    ':' + String((tiH * 60 + tiM + graceMinutes) % 60).padStart(2, '0');

  // Minimum hours before marked undertime = (timeOut - timeIn) - undertimeGrace in minutes
  const [toH, toM] = schedTimeOut.split(':').map(Number);
  const expectedMinutes = (toH * 60 + toM) - (tiH * 60 + tiM);
  const minHours = (expectedMinutes - undertimeGraceMinutes) / 60;

  if (mode === 'time-in') {
    const late = nowTime > lateThreshold;
    const payload = {
      intern_profile_id: internProfileId,
      attendance_date: today,
      time_in: nowTime,
      biometric_type: biometricType,
      status: late ? 'late' : 'present',
    };

    const { error } = existing
      ? await supabase.from('attendance_records').update(payload).eq('id', existing.id)
      : await supabase.from('attendance_records').insert(payload);

    if (error) throw error;
  } else {
    if (!existing?.time_in) {
      throw new Error('Time in must be recorded first.');
    }

    const [inHour, inMinute] = String(existing.time_in).slice(0, 5).split(':').map(Number);
    const inMinutes = inHour * 60 + inMinute;
    const outMinutes = now.getHours() * 60 + now.getMinutes();
    const diff = Math.max(0, outMinutes - inMinutes);
    const hoursRendered = Math.round((diff / 60) * 100) / 100;

    let computedStatus: 'present' | 'late' | 'undertime' = existing.status === 'late' ? 'late' : 'present';
    if (hoursRendered < minHours) computedStatus = 'undertime';

    const payload = {
      intern_profile_id: internProfileId,
      attendance_date: today,
      time_out: nowTime,
      hours_rendered: hoursRendered,
      biometric_type: biometricType,
      status: computedStatus,
    };

    const { error } = await supabase.from('attendance_records').update(payload).eq('id', existing.id);
    if (error) throw error;

    // Auto-update total rendered_hours in the internships table
    const { data: internship } = await supabase
      .from('internships')
      .select('id, rendered_hours')
      .eq('intern_profile_id', internProfileId)
      .maybeSingle();

    if (internship) {
      const newTotal = Number(internship.rendered_hours ?? 0) + hoursRendered;
      await supabase
        .from('internships')
        .update({ rendered_hours: Math.round(newTotal * 100) / 100 })
        .eq('id', internship.id);
    }
  }

  const latest = await fetchTodayAttendance(internProfileId);
  if (!latest) throw new Error('Unable to fetch latest attendance.');
  return latest;
}

export async function fetchCorrectionRequests(internProfileId: string): Promise<CorrectionRequest[]> {
  const { data, error } = await supabase
    .from('correction_requests')
    .select(`
      id,
      intern_profile_id,
      request_type,
      request_date,
      reason,
      status,
      submitted_at,
      profiles:intern_profile_id ( full_name )
    `)
    .eq('intern_profile_id', internProfileId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    internId: row.intern_profile_id,
    internName: row.profiles?.full_name ?? '',
    type: row.request_type,
    date: row.request_date,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
  }));
}

export async function fetchAllCorrectionRequests(): Promise<CorrectionRequest[]> {
  const { data, error } = await supabase
    .from('correction_requests')
    .select(`
      id,
      intern_profile_id,
      request_type,
      request_date,
      reason,
      status,
      submitted_at,
      profiles:intern_profile_id ( full_name )
    `)
    .order('submitted_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    internId: row.intern_profile_id,
    internName: row.profiles?.full_name ?? '',
    type: row.request_type,
    date: row.request_date,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
  }));
}

export async function updateCorrectionRequestStatus(
  requestId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('correction_requests')
    .update({ status })
    .eq('id', requestId);

  if (error) throw error;
}

export async function createCorrectionRequest(
  internProfileId: string,
  payload: {
    type: 'missing-time-in' | 'missing-time-out' | 'correction';
    date: string;
    reason: string;
    timeIn?: string;
    timeOut?: string;
  }
): Promise<void> {
  const { error } = await supabase.from('correction_requests').insert({
    intern_profile_id: internProfileId,
    request_type: payload.type,
    request_date: payload.date,
    reason: payload.reason,
    requested_time_in: payload.timeIn || null,
    requested_time_out: payload.timeOut || null,
  });

  if (error) throw error;
}

export async function fetchInternProfiles(filterDept = 'all'): Promise<InternProfile[]> {
  let query = supabase
    .from('profiles')
    .select(`
      id,
      student_id,
      full_name,
      department,
      course,
      email,
      internships (
        required_hours,
        rendered_hours,
        status,
        company,
        supervisor,
        start_date
      )
    `)
    .eq('role', 'intern');

  if (filterDept !== 'all') query = query.eq('department', filterDept);

  const { data, error } = await query.order('full_name', { ascending: true });
  if (error) throw error;

  const today = toLocalDate(new Date());
  const internIds = (data ?? []).map((row: any) => row.id);

  let presentMap = new Map<string, boolean>();
  if (internIds.length > 0) {
    const { data: todayRows } = await supabase
      .from('attendance_records')
      .select('intern_profile_id, status, time_in')
      .in('intern_profile_id', internIds)
      .eq('attendance_date', today);

    presentMap = new Map(
      (todayRows ?? []).map((row: any) => [
        row.intern_profile_id,
        !!row.time_in && row.status !== 'absent',
      ])
    );
  }

  return (data ?? []).map((row: any) => {
    const internship = Array.isArray(row.internships) ? row.internships[0] : row.internships;

    return {
    id: row.id,
    name: row.full_name,
    studentId: row.student_id,
    department: row.department ?? '',
    course: row.course ?? '',
    requiredHours: Number(internship?.required_hours ?? 0),
    renderedHours: Number(internship?.rendered_hours ?? 0),
    status: internship?.status ?? 'inactive',
    email: row.email ?? '',
    company: internship?.company ?? '',
    supervisor: internship?.supervisor ?? '',
    startDate: toDisplayDate(internship?.start_date),
    progress: internship?.required_hours
      ? Math.round((Number(internship.rendered_hours ?? 0) / Number(internship.required_hours)) * 100)
      : 0,
    presentToday: presentMap.get(row.id) ?? false,
  };
  });
}

export async function fetchWeeklyAttendanceData() {
  const today = new Date();
  const days: string[] = [];
  const keyMap: Record<string, string> = {};

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDate(d);
    const dayLabel = d.toLocaleDateString('en-PH', { weekday: 'short' });
    days.push(key);
    keyMap[key] = dayLabel;
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('attendance_date, status')
    .gte('attendance_date', days[0])
    .lte('attendance_date', days[days.length - 1]);

  if (error) throw error;

  const byDay = new Map<string, { present: number; late: number; absent: number }>();
  days.forEach((d) => byDay.set(d, { present: 0, late: 0, absent: 0 }));

  (data ?? []).forEach((row: any) => {
    const entry = byDay.get(row.attendance_date);
    if (!entry) return;
    if (row.status === 'present') entry.present += 1;
    else if (row.status === 'late') entry.late += 1;
    else if (row.status === 'absent') entry.absent += 1;
  });

  return days.map((d) => ({ day: keyMap[d], ...byDay.get(d)! }));
}

export async function fetchMonthlyHoursData(months = 10) {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);

  const { data, error } = await supabase
    .from('attendance_records')
    .select('attendance_date, hours_rendered')
    .gte('attendance_date', toLocalDate(start));

  if (error) throw error;

  const map = new Map<string, number>();
  for (let i = 0; i < months; i += 1) {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map.set(k, 0);
  }

  (data ?? []).forEach((row: any) => {
    const k = String(row.attendance_date).slice(0, 7);
    if (!map.has(k)) return;
    map.set(k, Number(map.get(k) ?? 0) + Number(row.hours_rendered ?? 0));
  });

  return Array.from(map.entries()).map(([k, total]) => {
    const [year, month] = k.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return {
      month: d.toLocaleDateString('en-PH', { month: 'short' }),
      hours: Math.round(total * 100) / 100,
    };
  });
}

export function buildDepartmentData(interns: InternProfile[]) {
  const map = new Map<string, number>();
  interns.forEach((i) => {
    const key = i.course || i.department || 'Unknown';
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  return Array.from(map.entries()).map(([name, value], idx) => ({
    name,
    value,
    color: colors[idx % colors.length],
  }));
}

export async function fetchUserSettings(profileId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('notifications, biometric, display')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveUserSettings(profileId: string, payload: { notifications: any; biometric: any; display: any }) {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      profile_id: profileId,
      notifications: payload.notifications,
      biometric: payload.biometric,
      display: payload.display,
    }, { onConflict: 'profile_id' });

  if (error) throw error;
}

export async function fetchBiometricSettings(profileId: string): Promise<{ credentialId?: string; enrolledAt?: string; faceId?: boolean; fingerprint?: boolean } | null> {
  const data = await fetchUserSettings(profileId);
  if (!data?.biometric) return null;
  const biometric = data.biometric as Record<string, any>;
  return {
    credentialId: typeof biometric.credentialId === 'string' ? biometric.credentialId : undefined,
    enrolledAt: typeof biometric.enrolledAt === 'string' ? biometric.enrolledAt : undefined,
    faceId: typeof biometric.faceId === 'boolean' ? biometric.faceId : false,
    fingerprint: typeof biometric.fingerprint === 'boolean' ? biometric.fingerprint : true,
  };
}

export async function saveBiometricCredential(profileId: string, credentialId: string) {
  const settings = await fetchUserSettings(profileId);
  const notifications = settings?.notifications ?? {};
  const display = settings?.display ?? {};
  const biometric = {
    ...(settings?.biometric ?? {}),
    credentialId,
    enrolledAt: new Date().toISOString(),
  };

  await saveUserSettings(profileId, { notifications, biometric, display });
}

export async function fetchSystemSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('schedule, notifications, policies')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveSystemSettings(payload: { schedule: any; notifications: any; policies: any; updatedByProfileId?: string }) {
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      id: 1,
      schedule: payload.schedule,
      notifications: payload.notifications,
      policies: payload.policies,
      updated_by_profile_id: payload.updatedByProfileId ?? null,
    }, { onConflict: 'id' });

  if (error) throw error;
}

export async function fetchSystemInfoStats(): Promise<{ activeInterns: number; totalRecords: number; adminCount: number }> {
  const [internRes, recordRes, adminRes] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'intern').eq('is_active', true),
    supabase.from('attendance_records').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('is_active', true),
  ]);
  return {
    activeInterns: internRes.count ?? 0,
    totalRecords: recordRes.count ?? 0,
    adminCount: adminRes.count ?? 0,
  };
}

export interface AuditLogEntry {
  id: string;
  category: 'attendance' | 'request' | 'registration';
  action: string;
  actor: string;
  timestamp: string;
  status?: string;
}

export async function fetchAdminAuditLogs(): Promise<AuditLogEntry[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const [attRes, reqRes, regRes] = await Promise.all([
    supabase
      .from('attendance_records')
      .select('id, attendance_date, time_in, time_out, status, profiles:intern_profile_id(full_name)')
      .gte('attendance_date', cutoffDate)
      .order('attendance_date', { ascending: false })
      .limit(60),
    supabase
      .from('correction_requests')
      .select('id, submitted_at, status, request_type, request_date, profiles:intern_profile_id(full_name)')
      .order('submitted_at', { ascending: false })
      .limit(60),
    supabase
      .from('profiles')
      .select('id, full_name, created_at, role')
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const entries: AuditLogEntry[] = [];

  (attRes.data ?? []).forEach((row: any) => {
    const name = (row.profiles as any)?.full_name ?? 'Unknown Intern';
    if (row.time_in) {
      entries.push({
        id: `att-in-${row.id}`,
        category: 'attendance',
        action: `Timed in at ${String(row.time_in).slice(0, 5)}`,
        actor: name,
        timestamp: `${row.attendance_date}T${row.time_in}`,
        status: row.status,
      });
    }
    if (row.time_out) {
      entries.push({
        id: `att-out-${row.id}`,
        category: 'attendance',
        action: `Timed out at ${String(row.time_out).slice(0, 5)}`,
        actor: name,
        timestamp: `${row.attendance_date}T${row.time_out}`,
        status: row.status,
      });
    }
  });

  (reqRes.data ?? []).forEach((row: any) => {
    const name = (row.profiles as any)?.full_name ?? 'Unknown Intern';
    const typeLabel =
      row.request_type === 'missing-time-in' ? 'Missing Time-In' :
      row.request_type === 'missing-time-out' ? 'Missing Time-Out' : 'Correction';
    entries.push({
      id: `req-${row.id}`,
      category: 'request',
      action: `Submitted ${typeLabel} request for ${row.request_date}`,
      actor: name,
      timestamp: row.submitted_at,
      status: row.status,
    });
  });

  (regRes.data ?? []).forEach((row: any) => {
    entries.push({
      id: `reg-${row.id}`,
      category: 'registration',
      action: `New ${row.role} account registered`,
      actor: row.full_name ?? 'Unknown',
      timestamp: row.created_at,
      status: 'info',
    });
  });

  entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return entries.slice(0, 120);
}
