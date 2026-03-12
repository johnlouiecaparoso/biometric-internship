import { useEffect, useState } from 'react';
import { Bell, Fingerprint, Monitor, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useNotifications } from '../../context/NotificationsContext';
import { fetchBiometricSettings, fetchUserSettings, saveBiometricCredential, saveUserSettings } from '../../lib/supabaseApi';
import { isBiometricSupported, registerBiometricCredential } from '../../lib/biometricAuth';
import { supabase } from '../../lib/supabase';

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
}
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export function InternSettings() {
  const { user } = useAuth();
  const { requestBrowserPermission, browserPermission } = useNotifications();
  const { setDisplay: setDisplayCtx } = useDisplaySettings();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutMsg, setLogoutMsg] = useState('');
  const [notifs, setNotifs] = useState({ email: true, sms: false, browser: true, reminderTimeIn: true, reminderTimeOut: true, weeklyReport: false });
  const [bio, setBio] = useState({ fingerprint: true, faceId: false, fallbackPin: true });
  const [display, setDisplay] = useState({ compactView: false, darkMode: false, show24h: false });
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string | null>(null);
  const [biometricMsg, setBiometricMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchUserSettings(user.id)
      .then((data) => {
        if (!data) return;
        setNotifs((prev) => ({ ...prev, ...(data.notifications ?? {}) }));
        setBio((prev) => ({ ...prev, ...(data.biometric ?? {}) }));
        setDisplay((prev) => ({ ...prev, ...(data.display ?? {}) }));
      })
      .catch(() => null);

    fetchBiometricSettings(user.id)
      .then((settings) => setBiometricCredentialId(settings?.credentialId ?? null))
      .catch(() => setBiometricCredentialId(null));
  }, [user]);

  const handleEnrollBiometric = async () => {
    if (!user) return;
    setBiometricBusy(true);
    setBiometricMsg('');
    try {
      const credentialId = await registerBiometricCredential({
        userId: user.id,
        userName: user.email,
        displayName: user.name,
        existingCredentialId: biometricCredentialId ?? undefined,
      });

      await saveBiometricCredential(user.id, credentialId);
      setBiometricCredentialId(credentialId);
      setBiometricMsg('Biometric device enrolled successfully.');
    } catch (e: any) {
      setBiometricMsg(e?.message ?? 'Biometric enrollment failed.');
    } finally {
      setBiometricBusy(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaveError(null);
    try {
      await saveUserSettings(user.id, { notifications: notifs, biometric: bio, display });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Propagate display changes to the context so they take effect immediately
      setDisplayCtx({ compactView: display.compactView, show24h: display.show24h, darkMode: display.darkMode });
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings. Please try again.');
    }
  };

  const handleLogoutOthers = async () => {
    setLogoutBusy(true);
    setLogoutMsg('');
    try {
      await supabase.auth.signOut({ scope: 'others' });
      setLogoutMsg('All other sessions have been signed out.');
    } catch {
      setLogoutMsg('Failed to sign out other sessions. Please try again.');
    } finally {
      setLogoutBusy(false);
    }
  };

  const section = (title: string, icon: React.ReactNode, children: React.ReactNode) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <span className="text-blue-600">{icon}</span>
        </div>
        <h3 className="text-gray-800" style={{ fontWeight: 600 }}>{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  const row = (label: string, desc: string, checked: boolean, onChange: () => void) => (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{label}</p>
        <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Settings</h1>
        <p className="text-gray-500 text-sm">Manage your preferences and account settings</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Settings saved successfully!
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-red-500" />
          {saveError}
        </div>
      )}

      {section('Notifications', <Bell className="w-4 h-4" />, <>
        {row('Email Notifications', 'Receive attendance updates via email', notifs.email, () => setNotifs(n => ({ ...n, email: !n.email })))}
        {row('SMS Notifications', 'Get SMS alerts for important events', notifs.sms, () => setNotifs(n => ({ ...n, sms: !n.sms })))}
        {row('Browser Notifications', 'Show browser push notifications', notifs.browser, () => {
          const next = !notifs.browser;
          setNotifs(n => ({ ...n, browser: next }));
          if (next && browserPermission !== 'granted') requestBrowserPermission();
        })}
        {row('Time In Reminder', 'Remind me to time in at start of work', notifs.reminderTimeIn, () => setNotifs(n => ({ ...n, reminderTimeIn: !n.reminderTimeIn })))}
        {row('Time Out Reminder', 'Remind me to time out before end of work', notifs.reminderTimeOut, () => setNotifs(n => ({ ...n, reminderTimeOut: !n.reminderTimeOut })))}
        {row('Weekly Report', 'Receive weekly attendance summary', notifs.weeklyReport, () => setNotifs(n => ({ ...n, weeklyReport: !n.weeklyReport })))}
      </>)}

      {section('Biometric Preferences', <Fingerprint className="w-4 h-4" />, <>
        {row('Fingerprint Authentication', 'Use fingerprint scanner for time in/out', bio.fingerprint, () => setBio(b => ({ ...b, fingerprint: !b.fingerprint })))}
        {row('Face ID Authentication', 'Use facial recognition for time in/out', bio.faceId, () => setBio(b => ({ ...b, faceId: !b.faceId })))}
        {row('Fallback PIN', 'Allow PIN entry if biometric fails', bio.fallbackPin, () => setBio(b => ({ ...b, fallbackPin: !b.fallbackPin })))}
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-gray-700 text-xs mb-2" style={{ fontWeight: 600 }}>Device Enrollment</p>
          <p className="text-gray-500 text-xs mb-3">
            {isBiometricSupported()
              ? biometricCredentialId
                ? 'Biometric credential is enrolled on this account.'
                : 'No biometric credential enrolled yet.'
              : 'This browser or device does not support WebAuthn biometric prompts.'}
          </p>
          <button
            onClick={handleEnrollBiometric}
            disabled={!isBiometricSupported() || biometricBusy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ fontWeight: 600 }}
          >
            {biometricBusy ? 'Waiting for device...' : biometricCredentialId ? 'Re-enroll Device' : 'Enroll Device'}
          </button>
          {biometricMsg && (
            <p className="text-xs mt-2 text-gray-600">{biometricMsg}</p>
          )}
        </div>
      </>)}

      {section('Display', <Monitor className="w-4 h-4" />, <>
        {row('Compact View', 'Show more data with less spacing', display.compactView, () => setDisplay(d => ({ ...d, compactView: !d.compactView })))}
        {row('24-Hour Time Format', 'Display time in 24-hour format', display.show24h, () => setDisplay(d => ({ ...d, show24h: !d.show24h })))}
      </>)}

      {section('Security', <Shield className="w-4 h-4" />, <>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-blue-800 text-sm" style={{ fontWeight: 600 }}>Two-Factor Authentication</p>
          <p className="text-blue-600 text-xs mt-1 mb-3">Add an extra layer of security to your account. Requires email verification for each login.</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 600 }}>
            Enable 2FA
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>Active Sessions</p>
          <p className="text-gray-500 text-xs mt-1 mb-3">You are currently logged in from 1 device.</p>
          <button className="border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 600 }} onClick={handleLogoutOthers} disabled={logoutBusy}>
            {logoutBusy ? 'Signing out...' : 'Logout All Other Sessions'}
          </button>
          {logoutMsg && <p className="text-xs mt-2 text-gray-500">{logoutMsg}</p>}
        </div>
      </>)}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-[#0f2a4e] hover:bg-[#1a3f6f] text-white px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          style={{ fontWeight: 600 }}
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
