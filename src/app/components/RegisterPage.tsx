import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { GraduationCap, Eye, EyeOff, ChevronRight, ShieldCheck } from 'lucide-react';
import { UserRole } from '../context/AuthContext';
import { registerAccount } from '../lib/supabaseApi';
import { supabase } from '../lib/supabase';

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('intern');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false); // sync guard against double-click race
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: '' });

  const validatePassword = (value: string) => {
    let score = 0;
    const requirements: string[] = [];

    if (value.length >= 8) score++;
    else requirements.push('at least 8 characters');

    if (/[A-Z]/.test(value)) score++;
    else requirements.push('one uppercase letter');

    if (/[0-9]/.test(value)) score++;
    else requirements.push('one number');

    if (/[^A-Za-z0-9]/.test(value)) score++;
    else requirements.push('one special symbol');

    const strengthLevels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500'];

    return {
      score,
      message: score === 4 ? 'Strong password' : `Add ${requirements.join(', ')} to make it ${strengthLevels[score + 1]}`,
      color: strengthColors[Math.max(0, score - 1)],
    };
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const strength = validatePassword(password);

    if (strength.score < 4) {
      // Exemption: if the account already exists and this password works,
      // allow the flow to continue (existing account should not be forced
      // to satisfy new registration password rules).
      try {
        const { data: existingSession, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!signInError && existingSession?.user) {
          // Keep this consistent with other flows that clear auth state when done.
          await supabase.auth.signOut();
        } else {
          setError(`Password is too weak. ${strength.message}`);
          return;
        }
      } catch {
        setError(`Password is too weak. ${strength.message}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const timeoutError = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          'Request timed out. Please check your internet connection and try again.'
        )), 20000)
      );
      const result = await Promise.race([registerAccount({
        role,
        fullName,
        studentId,
        email,
        password,
        college: role === 'intern' ? college : department,
        course,
        yearLevel,
      }), timeoutError]);

      if (result.requiresEmailVerification) {
        setSuccess('Registration successful. Please verify your email before logging in.');
      } else if ((result as any).alreadySignedIn) {
        // User already existed and was auto-signed in with the same password
        setSuccess('Account found! Signing you in...');
        setTimeout(() => navigate(role === 'admin' ? '/admin' : '/intern'), 1200);
      } else {
        setSuccess('Registration successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (e: any) {
      const message = e?.message ?? 'Registration failed. Please try again.';
      setError(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F9F7F7] via-[#DBE2EF] to-[#3F72AF] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#112D4E] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#F9F7F7] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white text-2xl" style={{ fontWeight: 700 }}>InternTrack</h1>
          <p className="text-[#DBE2EF] text-sm mt-1">Create your account</p>
          <p className="text-[#F9F7F7]/70 text-xs mt-1">Biometric Internship Attendance System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => { setRole('intern'); setStudentId(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'intern' ? 'bg-[#3F72AF] text-white' : 'text-gray-500 hover:bg-[#DBE2EF]/20'}`}
              style={{ fontWeight: 600 }}
            >
              Student / Intern
            </button>
            <button
              onClick={() => { setRole('admin'); setStudentId(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'admin' ? 'bg-[#3F72AF] text-white' : 'text-gray-500 hover:bg-[#DBE2EF]/20'}`}
              style={{ fontWeight: 600 }}
            >
              Administrator
            </button>
          </div>

          <div className="p-7">
            <h2 className="text-gray-800 mb-1" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              {role === 'intern' ? 'Intern Registration' : 'Admin Registration'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">Fill in your details to create an account</p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Juan dela Cruz"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>{role === 'intern' ? 'Student ID' : 'Admin ID'}</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder={role === 'intern' ? '2026-00001' : 'ADMIN002'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@university.edu.ph"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  {role === 'intern' ? 'College' : 'Department'}
                </label>
                <input
                  type="text"
                  value={role === 'intern' ? college : department}
                  onChange={e => role === 'intern' ? setCollege(e.target.value) : setDepartment(e.target.value)}
                  placeholder={role === 'intern' ? 'College of Engineering' : 'IT Department'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                />
              </div>

              {role === 'intern' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Course</label>
                    <input
                      type="text"
                      value={course}
                      onChange={e => setCourse(e.target.value)}
                      placeholder="BSIT"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Year Level</label>
                    <input
                      type="text"
                      value={yearLevel}
                      onChange={e => setYearLevel(e.target.value)}
                      placeholder="4th Year"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-[#3F72AF] focus:ring-2 focus:ring-[#3F72AF]/20 transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => {
                      const next = e.target.value;
                      setPassword(next);
                      setPasswordStrength(validatePassword(next));
                    }}
                    placeholder="Enter password"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            passwordStrength.score === 0 ? 'bg-red-500'
                              : passwordStrength.score === 1 ? 'bg-orange-500'
                                : passwordStrength.score === 2 ? 'bg-yellow-500'
                                  : passwordStrength.score === 3 ? 'bg-blue-500'
                                    : 'bg-green-500'
                          }`}
                          style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs ${passwordStrength.color}`}>{passwordStrength.message}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-red-600 text-xs">{error}</p>
                  </div>
                  {(error.includes('already registered') || error.includes('student ID') || error.includes('Sign in')) && (
                    <Link to="/login" className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                      Sign in instead →
                    </Link>
                  )}
                </div>
              )}

              {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-emerald-700 text-xs">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#3F72AF] hover:bg-[#112D4E] text-white py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-90"
                style={{ fontWeight: 600 }}
              >
                {submitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>Create Account <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
              {submitting && (
                <p className="text-center text-gray-500 text-xs">This may take a few seconds.</p>
              )}
            </form>

            <p className="text-center text-gray-500 text-sm mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-[#3F72AF] hover:text-[#112D4E]" style={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
