import { useState, useEffect, useRef } from 'react';
import { Fingerprint, Scan, CheckCircle2, XCircle, Clock, LogIn, LogOut, Camera, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { fetchAutoTimeoutSettings, fetchBiometricSettings, fetchTodayAttendance, recordAttendanceScan } from '../../lib/supabaseApi';
import { verifyBiometricCredential } from '../../lib/biometricAuth';

type ScanState = 'idle' | 'scanning' | 'success' | 'failed';
type ScanMode = 'time-in' | 'time-out';
type BiometricType = 'fingerprint' | 'face';

interface TodayRecord {
  timeIn: string | null;
  timeOut: string | null;
}

export function InternAttendance() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [mode, setMode] = useState<ScanMode>('time-in');
  const [bioType, setBioType] = useState<BiometricType>('fingerprint');
  const [credentialId, setCredentialId] = useState<string | null>(null);
  const [faceIdEnabled, setFaceIdEnabled] = useState(false);
  const [todayRecord, setTodayRecord] = useState<TodayRecord>({ timeIn: null, timeOut: null });
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [autoTimeout, setAutoTimeout] = useState({ enabled: false, minutes: 480 });
  const autoTimeoutTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    void Promise.all([
      fetchBiometricSettings(user.id),
      fetchTodayAttendance(user.id),
      fetchAutoTimeoutSettings(user.id),
    ])
      .then(([settings, record, timeoutSettings]) => {
        setCredentialId(settings?.credentialId ?? null);
        setFaceIdEnabled(settings?.faceId ?? false);
        setAutoTimeout(timeoutSettings);

        if (!record) {
          setTodayRecord({ timeIn: null, timeOut: null });
          setMode('time-in');
          return;
        }
        setTodayRecord({ timeIn: record.timeIn, timeOut: record.timeOut });
        setMode(record.timeIn && !record.timeOut ? 'time-out' : 'time-in');
      })
      .catch(() => {
        setCredentialId(null);
        setFaceIdEnabled(false);
        setTodayRecord({ timeIn: null, timeOut: null });
      });
  }, [user]);

  useEffect(() => {
    const clearAutoTimer = () => {
      if (autoTimeoutTimerRef.current !== null) {
        window.clearTimeout(autoTimeoutTimerRef.current);
        autoTimeoutTimerRef.current = null;
      }
    };

    if (!user || !autoTimeout.enabled || !todayRecord.timeIn || todayRecord.timeOut) {
      clearAutoTimer();
      return clearAutoTimer;
    }

    const [inHour, inMinute] = todayRecord.timeIn.split(':').map(Number);
    const start = new Date();
    start.setHours(inHour, inMinute, 0, 0);
    const autoAt = new Date(start.getTime() + autoTimeout.minutes * 60_000);
    const delayMs = autoAt.getTime() - Date.now();

    const runAutoTimeout = async () => {
      if (!user) return;
      try {
        const updated = await recordAttendanceScan(user.id, 'time-out', 'fingerprint');
        setTodayRecord({ timeIn: updated.timeIn, timeOut: updated.timeOut });
        setMessage(`✓ Auto Time Out recorded at ${updated.timeOut ?? formatShortTime(new Date())}`);
      } catch {
        // If the student already timed out in another tab/device, ignore.
      }
    };

    if (delayMs <= 0) {
      void runAutoTimeout();
      return clearAutoTimer;
    }

    autoTimeoutTimerRef.current = window.setTimeout(() => {
      void runAutoTimeout();
    }, delayMs);

    return clearAutoTimer;
  }, [user, autoTimeout.enabled, autoTimeout.minutes, todayRecord.timeIn, todayRecord.timeOut]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formatShortTime = (d: Date) =>
    d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });

  const calcHours = (): string => {
    if (!todayRecord.timeIn) return '0h 0m';
    const [inH, inM] = todayRecord.timeIn.split(':').map(Number);
    const start = new Date(); start.setHours(inH, inM, 0);
    if (todayRecord.timeOut) {
      const [outH, outM] = todayRecord.timeOut.split(':').map(Number);
      const end = new Date(); end.setHours(outH, outM, 0);
      const diff = (end.getTime() - start.getTime()) / 60000;
      return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
    }
    const diff = (now.getTime() - start.getTime()) / 60000;
    return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
  };

  const handleScan = () => {
    if (scanState !== 'idle') return;
    if (mode === 'time-in' && todayRecord.timeIn) {
      setMessage('You have already timed in today.');
      return;
    }
    if (mode === 'time-out' && todayRecord.timeOut) {
      setMessage('You have already timed out today.');
      return;
    }
    setMessage('');
    setScanState('scanning');
    setTimeout(async () => {
      if (!user) {
        setScanState('failed');
        return;
      }

      if (!credentialId) {
        setScanState('failed');
        setMessage('No biometric credential enrolled. Enroll your device in Settings first.');
        setTimeout(() => setScanState('idle'), 2000);
        return;
      }

      try {
        await verifyBiometricCredential(credentialId);
        const updated = await recordAttendanceScan(user.id, mode, bioType);
        setScanState('success');
        setTodayRecord({ timeIn: updated.timeIn, timeOut: updated.timeOut });
        if (mode === 'time-in') {
          setMessage(`✓ Time In recorded at ${updated.timeIn ?? formatShortTime(new Date())}`);
          setMode('time-out');
        } else {
          setMessage(`✓ Time Out recorded at ${updated.timeOut ?? formatShortTime(new Date())}`);
        }
      } catch (e: any) {
        setScanState('failed');
        setMessage(e?.message ?? 'Unable to record attendance.');
      }
      setTimeout(() => setScanState('idle'), 2000);
    }, 1800);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !password.trim()) return;
    if (mode === 'time-in' && todayRecord.timeIn) {
      setMessage('You have already timed in today.');
      return;
    }
    if (mode === 'time-out' && todayRecord.timeOut) {
      setMessage('You have already timed out today.');
      return;
    }
    setPasswordBusy(true);
    setMessage('');
    try {
      const updated = await recordAttendanceScan(user.id, mode, bioType);
      setTodayRecord({ timeIn: updated.timeIn, timeOut: updated.timeOut });
      if (mode === 'time-in') {
        setMessage(`✓ Time In recorded at ${updated.timeIn ?? formatShortTime(new Date())}`);
        setMode('time-out');
      } else {
        setMessage(`✓ Time Out recorded at ${updated.timeOut ?? formatShortTime(new Date())}`);
      }
      setPassword('');
    } catch (e: any) {
      setMessage(e?.message ?? 'Unable to record attendance.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const scannerLabel = {
    idle: bioType === 'face' ? 'Tap to scan face' : 'Tap to scan fingerprint',
    scanning: bioType === 'face' ? 'Hold still, scanning face...' : 'Keep finger on scanner...',
    success: mode === 'time-in' ? 'Time In Recorded!' : 'Time Out Recorded!',
    failed: 'Scan failed. Try again.',
  };

  const scannerIcon = {
    idle:     bioType === 'face' ? <Camera className="w-16 h-16 text-blue-300" /> : <Fingerprint className="w-16 h-16 text-blue-300" />,
    scanning: bioType === 'face' ? <Scan className="w-16 h-16 text-blue-400" /> : <Fingerprint className="w-16 h-16 text-blue-400" />,
    success:  <CheckCircle2 className="w-16 h-16 text-emerald-400" />,
    failed:   <XCircle className="w-16 h-16 text-red-400" />,
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Attendance</h1>
        <p className="text-gray-500 text-sm">Use biometric authentication to record your attendance</p>
      </div>

      {/* Live Clock */}
      <div className="bg-gradient-to-r from-[#0f2a4e] to-[#1a4a80] rounded-2xl p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-blue-200 text-sm">Current Date & Time</p>
          <p className="text-white mt-1" style={{ fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.02em' }}>
            {formatTime(now)}
          </p>
          <p className="text-blue-200 text-sm">
            {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl">
          <div className={`w-2 h-2 rounded-full ${todayRecord.timeIn && !todayRecord.timeOut ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
          <span className="text-white text-sm" style={{ fontWeight: 500 }}>
            {todayRecord.timeIn && !todayRecord.timeOut ? 'Currently Timed In' : todayRecord.timeOut ? 'Shift Complete' : 'Not Yet Timed In'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Biometric Scanner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Biometric Scanner</h3>

          {/* Bio Type Toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => { setBioType('fingerprint'); setMessage(''); setScanState('idle'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${bioType === 'fingerprint' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              style={{ fontWeight: bioType === 'fingerprint' ? 600 : 400 }}
            >
              <Fingerprint className="w-4 h-4" /> Fingerprint
            </button>
            <button
              onClick={() => { setBioType('face'); setMessage(''); setScanState('idle'); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${bioType === 'face' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              style={{ fontWeight: bioType === 'face' ? 600 : 400 }}
            >
              <Camera className="w-4 h-4" /> Face ID
            </button>
          </div>

          {/* Biometric scanner area – always visible */}
          <div
            onClick={handleScan}
            className={`relative flex flex-col items-center justify-center h-52 rounded-2xl border-2 cursor-pointer transition-all ${
              scanState === 'idle' ? 'border-blue-200 hover:border-blue-400 bg-blue-50/30' :
              scanState === 'scanning' ? 'border-blue-400 bg-blue-50' :
              scanState === 'success' ? 'border-emerald-400 bg-emerald-50' :
              'border-red-300 bg-red-50'
            }`}
          >
            {/* Pulse rings */}
            {scanState === 'scanning' && (
              <>
                <div className="absolute w-36 h-36 rounded-full border-2 border-blue-300 animate-pulse-ring" />
                <div className="absolute w-36 h-36 rounded-full border-2 border-blue-300 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
              </>
            )}

            {/* Scan line */}
            {scanState === 'scanning' && (
              <div className="absolute inset-x-6 overflow-hidden" style={{ height: '64px', top: '50%', transform: 'translateY(-50%)' }}>
                <div
                  className="absolute w-full h-0.5 bg-blue-400/70 animate-scan-line"
                  style={{ position: 'absolute' }}
                />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={scanState}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center gap-3"
              >
                {scannerIcon[scanState]}
                <span className={`text-sm text-center ${
                  scanState === 'success' ? 'text-emerald-600' :
                  scanState === 'failed' ? 'text-red-500' :
                  scanState === 'scanning' ? 'text-blue-600' :
                  'text-gray-500'
                }`} style={{ fontWeight: 500 }}>
                  {scannerLabel[scanState]}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Password fallback – always available below the scanner */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or use password</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <form onSubmit={handlePasswordSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-blue-400"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={passwordBusy || !password.trim()}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
                style={{ fontWeight: 600 }}
              >
                {passwordBusy ? 'Verifying…' : mode === 'time-in' ? 'Time In' : 'Time Out'}
              </button>
            </form>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              onClick={() => { setMode('time-in'); setMessage(''); }}
              disabled={!!todayRecord.timeIn}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
                mode === 'time-in' && !todayRecord.timeIn
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : todayRecord.timeIn
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontWeight: 600 }}
            >
              <LogIn className="w-4 h-4" />
              {todayRecord.timeIn ? '✓ Timed In' : 'Time In'}
            </button>
            <button
              onClick={() => { setMode('time-out'); setMessage(''); }}
              disabled={!todayRecord.timeIn || !!todayRecord.timeOut}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all ${
                mode === 'time-out' && todayRecord.timeIn && !todayRecord.timeOut
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : !todayRecord.timeIn || todayRecord.timeOut
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontWeight: 600 }}
            >
              <LogOut className="w-4 h-4" />
              {todayRecord.timeOut ? '✓ Timed Out' : 'Time Out'}
            </button>
          </div>

          {message && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-3 p-3 rounded-xl text-sm text-center ${
                message.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
              style={{ fontWeight: 500 }}
            >
              {message}
            </motion.div>
          )}
        </div>

        {/* Today's Record */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Today's Record</h3>

            <div className="space-y-3">
              {/* Time In */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${todayRecord.timeIn ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${todayRecord.timeIn ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                    <LogIn className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Time In</p>
                    <p className={`text-xs ${todayRecord.timeIn ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {todayRecord.timeIn ? 'Recorded' : 'Not yet recorded'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm tabular-nums ${todayRecord.timeIn ? 'text-gray-800' : 'text-gray-400'}`} style={{ fontWeight: 700 }}>
                  {todayRecord.timeIn ?? '–:–– ––'}
                </span>
              </div>

              {/* Time Out */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${todayRecord.timeOut ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${todayRecord.timeOut ? 'bg-orange-500' : 'bg-gray-300'}`}>
                    <LogOut className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Time Out</p>
                    <p className={`text-xs ${todayRecord.timeOut ? 'text-orange-600' : 'text-gray-400'}`}>
                      {todayRecord.timeOut ? 'Recorded' : 'Not yet recorded'}
                    </p>
                  </div>
                </div>
                <span className={`text-sm tabular-nums ${todayRecord.timeOut ? 'text-gray-800' : 'text-gray-400'}`} style={{ fontWeight: 700 }}>
                  {todayRecord.timeOut ?? '–:–– ––'}
                </span>
              </div>

              {/* Total Hours */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Hours Today</p>
                    <p className="text-xs text-blue-600">{todayRecord.timeOut ? 'Shift complete' : 'In progress'}</p>
                  </div>
                </div>
                <span className="text-blue-700 text-sm tabular-nums" style={{ fontWeight: 700 }}>{calcHours()}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-blue-800 text-sm mb-2" style={{ fontWeight: 600 }}>How to Scan</h4>
            <ol className="space-y-1.5">
              {[
                'Select Time In or Time Out mode',
                'Place finger on scanner or face camera',
                'Hold still until scan is complete',
                'Wait for confirmation message',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-blue-700 text-xs">
                  <span className="w-4 h-4 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 mt-0.5 text-blue-700" style={{ fontWeight: 700, fontSize: '10px' }}>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
