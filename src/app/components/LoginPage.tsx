import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, Fingerprint, Eye, EyeOff, ShieldCheck, ChevronRight, Key, Mail, X } from 'lucide-react';
import { motion } from 'motion/react';
import { isBiometricSupported, verifyBiometricCredential } from '../lib/biometricAuth';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState<UserRole>('intern');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [biometricState, setBiometricState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [hasBiometricHint, setHasBiometricHint] = useState(false);
  const biometricSupported = isBiometricSupported();

  useEffect(() => {
    setHasBiometricHint(
      biometricSupported && !!localStorage.getItem('biometric_login_hint')
    );
  }, [biometricSupported]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetMessage('Please enter your email address');
      return;
    }
    
    setResetLoading(true);
    setResetMessage('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        setResetMessage(error.message);
      } else {
        setResetMessage('Password reset link sent! Check your email.');
        setTimeout(() => {
          setShowResetPassword(false);
          setResetEmail('');
          setResetMessage('');
        }, 3000);
      }
    } catch (error) {
      setResetMessage('An error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const timeoutError = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          'Request timed out. Please check your internet connection and try again.'
        )), 20000)
      );
      const result = await Promise.race([login(studentId, password, role), timeoutError]);
      if (result.success) {
        // Save a biometric login hint so future biometric logins can restore the session
        try {
          if (biometricSupported) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.refresh_token) {
              localStorage.setItem('biometric_login_hint', JSON.stringify({
                refreshToken: session.refresh_token,
                role,
              }));
              setHasBiometricHint(true);
            }
          }
        } catch { /* non-critical */ }
        navigate(role === 'admin' ? '/admin' : '/intern');
      } else {
        setError(result.error ?? 'Invalid credentials. Please check your email/ID, password, and role.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometric = async () => {
    if (biometricState === 'scanning') return;

    if (!biometricSupported) {
      setError('Biometric authentication is not supported on this device or browser.');
      return;
    }

    const hintRaw = localStorage.getItem('biometric_login_hint');
    if (!hintRaw) {
      setError('Log in with your password once on this device first to enable biometric login.');
      return;
    }

    setBiometricState('scanning');
    setError('');

    try {
      await verifyBiometricCredential();

      // Biometric verified — restore Supabase session from stored refresh token
      const hint = JSON.parse(hintRaw) as { refreshToken: string; role: UserRole };
      const { data, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: hint.refreshToken,
      });

      if (refreshError || !data.session) {
        localStorage.removeItem('biometric_login_hint');
        setHasBiometricHint(false);
        throw new Error('Your session has expired. Please log in with your password again to re-enable biometric login.');
      }

      // Rotate the stored refresh token (Supabase rotates on each use)
      localStorage.setItem('biometric_login_hint', JSON.stringify({
        refreshToken: data.session.refresh_token,
        role: hint.role,
      }));

      setBiometricState('success');
      // AuthContext's onAuthStateChange will pick up the new session automatically
      setTimeout(() => navigate(hint.role === 'admin' ? '/admin' : '/intern'), 500);
    } catch (e: any) {
      setBiometricState('failed');
      setError(e?.message ?? 'Biometric login failed. Please try again or use your password.');
      setTimeout(() => setBiometricState('idle'), 2000);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#355872] via-[#4a6b89] to-[#355872] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#7AAACE] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#9CD5FF] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-lg mb-4 border border-white/20">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white text-2xl" style={{ fontWeight: 700 }}>InternTrack</h1>
          <p className="text-[#7AAACE] text-sm mt-1">Biometric Internship Attendance System</p>
          <p className="text-[#9CD5FF]/70 text-xs mt-1">Caraga State University - Main Campus</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Role Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => { setRole('intern'); setError(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'intern' ? 'bg-[#355872] text-white' : 'text-gray-500 hover:bg-[#7AAACE]/20'}`}
              style={{ fontWeight: 600 }}
            >
              Student / Intern
            </button>
            <button
              onClick={() => { setRole('admin'); setStudentId(''); }}
              className={`flex-1 py-3.5 text-sm transition-all ${role === 'admin' ? 'bg-[#355872] text-white' : 'text-gray-500 hover:bg-[#7AAACE]/20'}`}
              style={{ fontWeight: 600 }}
            >
              Administrator
            </button>
          </div>

          <div className="p-7">
            <h2 className="text-gray-800 mb-1" style={{ fontWeight: 600, fontSize: '1.125rem' }}>
              {role === 'intern' ? 'Intern Login' : 'Admin Login'}
            </h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to access your account</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  {role === 'intern' ? 'Email or Student ID' : 'Email or Admin ID'}
                </label>
                <input
                  type="text"
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  placeholder={role === 'intern' ? 'e.g. juan@university.edu.ph or 2021-00123' : 'e.g. admin@university.edu.ph'}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
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

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#355872] hover:bg-[#4a6b89] text-white py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-90"
                style={{ fontWeight: 600 }}
              >
                {submitting ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>Sign In <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
              {submitting && (
                <p className="text-center text-gray-500 text-xs">Connecting to your account…</p>
              )}
            </form>

            {/* Divider */}
            <div className="flex items-center my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 text-gray-400 text-xs">or use biometric</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Biometric Button — only shown when WebAuthn is supported by this browser */}
            {biometricSupported && (
              <>
                <button
                  onClick={handleBiometric}
                  disabled={biometricState === 'scanning'}
                  className="w-full border-2 border-gray-200 hover:border-[#9CD5FF] hover:bg-[#7AAACE]/20 rounded-xl py-3 flex items-center justify-center gap-3 transition-all disabled:opacity-60"
                >
                  <div className="relative">
                    <Fingerprint
                      className={`w-6 h-6 transition-colors ${
                        biometricState === 'scanning' ? 'text-blue-500' :
                        biometricState === 'success' ? 'text-green-500' :
                        biometricState === 'failed' ? 'text-red-500' :
                        'text-gray-500'
                      }`}
                    />
                    {biometricState === 'scanning' && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-blue-400"
                        animate={{ scale: [1, 1.8], opacity: [0.8, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-gray-600 text-sm" style={{ fontWeight: 500 }}>
                    {biometricState === 'idle' ? 'Login with Fingerprint' :
                     biometricState === 'scanning' ? 'Scanning...' :
                     biometricState === 'success' ? 'Authenticated!' :
                     'Scan failed, try again'}
                  </span>
                </button>
                {!hasBiometricHint && biometricState === 'idle' && (
                  <p className="text-center text-gray-400 text-xs -mt-1">
                    Sign in with your password once to enable fingerprint login
                  </p>
                )}
              </>
            )}

            <p className="text-center text-gray-500 text-sm mt-5">
              No account yet?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700" style={{ fontWeight: 600 }}>
                Register
              </Link>
            </p>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setShowResetPassword(true)}
                className="text-blue-600 hover:text-blue-700 text-sm"
                style={{ fontWeight: 600 }}
              >
                Forgot your password?
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800 text-lg" style={{ fontWeight: 600 }}>Reset Password</h3>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setResetEmail('');
                  setResetMessage('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    required
                  />
                </div>
              </div>
              
              {resetMessage && (
                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                  resetMessage.includes('sent') 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  {resetMessage}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(false);
                    setResetEmail('');
                    setResetMessage('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors text-sm"
                  style={{ fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-[#07588A] hover:bg-[#064a79] text-white py-2.5 rounded-xl transition-colors text-sm disabled:opacity-90"
                  style={{ fontWeight: 600 }}
                >
                  {resetLoading ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
