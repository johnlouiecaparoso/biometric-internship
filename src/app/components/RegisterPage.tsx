import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { GraduationCap, Eye, EyeOff, ChevronRight, ShieldCheck } from 'lucide-react';
import { UserRole } from '../context/AuthContext';
import { registerAccount } from '../lib/supabaseApi';

export function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('intern');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [course, setCourse] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const timeoutError = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          'Connection timed out. Your Supabase project may be paused — visit the Supabase dashboard to resume it, then try again.'
        )), 15000)
      );
      const result = await Promise.race([registerAccount({
        role,
        fullName,
        studentId,
        email,
        password,
        department,
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
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-[#0f2a4e] via-[#1a4478] to-[#0f2a4e] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4 border border-white/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white text-2xl" style={{ fontWeight: 700 }}>UniTrack</h1>
          <p className="text-blue-200 text-sm mt-1">Create your account</p>
          <p className="text-blue-300/70 text-xs mt-1">University Internship Monitoring System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => { setRole('intern'); setStudentId(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'intern' ? 'bg-[#1e3a5f] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              style={{ fontWeight: 600 }}
            >
              Student / Intern
            </button>
            <button
              onClick={() => { setRole('admin'); setStudentId(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'admin' ? 'bg-[#1e3a5f] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="Information Technology"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Year Level</label>
                    <input
                      type="text"
                      value={yearLevel}
                      onChange={e => setYearLevel(e.target.value)}
                      placeholder="4th Year"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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
                    onChange={e => setPassword(e.target.value)}
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
                className="w-full bg-[#1e3a5f] hover:bg-[#2a4f7c] text-white py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-90"
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
              <Link to="/login" className="text-blue-600 hover:text-blue-700" style={{ fontWeight: 600 }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
