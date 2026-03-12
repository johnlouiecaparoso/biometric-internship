import { useEffect, useState } from 'react';
import { Settings, Clock, Bell, Shield, Users, Monitor, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { useNotifications } from '../../context/NotificationsContext';
import { fetchSystemSettings, saveSystemSettings, fetchSystemInfoStats, fetchUserSettings, saveUserSettings } from '../../lib/supabaseApi';

interface ToggleProps { checked: boolean; onChange: () => void; }
function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button onClick={onChange} className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export function AdminSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setDisplay: setDisplayCtx } = useDisplaySettings();
  const { requestBrowserPermission, browserPermission, updateBrowserEnabled } = useNotifications();
  const [saveError, setSaveError] = useState<string | null>(null);

  const DEFAULT_SCHEDULE = { timeIn: '08:00', timeOut: '17:00', graceMinutes: '15', undertimeMinutes: '60' };
  const DEFAULT_NOTIFS   = { absenceAlert: true, lateAlert: true, completionAlert: true, weeklyReport: true, pendingRequest: true };
  const DEFAULT_SYSTEM   = { allowCorrections: true, requireSupervisor: true, autoApprove: false, biometricOnly: false };
  const DEFAULT_DISPLAY  = { compactView: false, darkMode: false, show24h: false };

  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);
  const [system, setSystem] = useState(DEFAULT_SYSTEM);
  const [display, setDisplay] = useState(DEFAULT_DISPLAY);
  const [sysInfo, setSysInfo] = useState({ activeInterns: 0, totalRecords: 0, adminCount: 0 });

  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [notifsDirty, setNotifsDirty] = useState(false);
  const [systemDirty, setSystemDirty] = useState(false);
  const [displayDirty, setDisplayDirty] = useState(false);

  const [savingSection, setSavingSection] = useState<'schedule' | 'notifs' | 'system' | 'display' | null>(null);
  const [savedSection, setSavedSection] = useState<'schedule' | 'notifs' | 'system' | 'display' | null>(null);

  useEffect(() => {
    fetchSystemSettings()
      .then((data) => {
        if (!data) return;
        setSchedule((prev) => ({ ...prev, ...(data.schedule ?? {}) }));
        setNotifs((prev) => ({ ...prev, ...(data.notifications ?? {}) }));
        setSystem((prev) => ({ ...prev, ...(data.policies ?? {}) }));
      })
      .catch(() => null);

    if (user) {
      fetchUserSettings(user.id)
        .then((data) => { if (data?.display) setDisplay((prev) => ({ ...prev, ...data.display })); })
        .catch(() => null);
    }

    fetchSystemInfoStats()
      .then((stats) => setSysInfo(stats))
      .catch(() => null);
  }, [user]);

  // Section-aware updaters
  const updateSchedule = (fn: (s: typeof schedule) => typeof schedule) => { setSchedule(fn); setScheduleDirty(true); };
  const updateNotifs   = (fn: (n: typeof notifs)   => typeof notifs)   => { setNotifs(fn);   setNotifsDirty(true);   };
  const updateSystem   = (fn: (s: typeof system)   => typeof system)   => { setSystem(fn);   setSystemDirty(true);   };
  const updateDisplay  = (fn: (d: typeof display)  => typeof display)  => { setDisplay(fn);  setDisplayDirty(true);  };

  const handleSaveSection = async (sec: 'schedule' | 'notifs' | 'system' | 'display') => {
    setSavingSection(sec);
    setSaveError(null);
    try {
      if (sec === 'display') {
        if (user) {
          const existing = await fetchUserSettings(user.id).catch(() => null);
          await saveUserSettings(user.id, {
            notifications: existing?.notifications ?? {},
            biometric: existing?.biometric ?? {},
            display,
          });
          setDisplayDirty(false);
          setDisplayCtx({ compactView: display.compactView, show24h: display.show24h, darkMode: display.darkMode });
        }
      } else {
        await saveSystemSettings({ schedule, notifications: notifs, policies: system, updatedByProfileId: user?.id });
        if (sec === 'schedule') setScheduleDirty(false);
        if (sec === 'notifs')   { setNotifsDirty(false); updateBrowserEnabled(notifs.pendingRequest); }
        if (sec === 'system')   setSystemDirty(false);
      }
      setSavedSection(sec);
      setTimeout(() => setSavedSection((s) => (s === sec ? null : s)), 2000);
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save settings. Please try again.');
    } finally {
      setSavingSection(null);
    }
  };

  const handleReset = () => {
    setSchedule(DEFAULT_SCHEDULE); setScheduleDirty(false);
    setNotifs(DEFAULT_NOTIFS);     setNotifsDirty(false);
    setSystem(DEFAULT_SYSTEM);     setSystemDirty(false);
    setDisplay(DEFAULT_DISPLAY);   setDisplayDirty(false);
  };

  const sectionFooter = (key: 'schedule' | 'notifs' | 'system' | 'display', isDirty: boolean) => {
    if (!isDirty && savedSection !== key) return null;
    return (
      <div className="pt-3 mt-1 border-t border-gray-100 flex justify-end items-center gap-3">
        {savedSection === key && !isDirty && (
          <span className="flex items-center gap-1.5 text-emerald-600 text-xs" style={{ fontWeight: 500 }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
          </span>
        )}
        {isDirty && (
          <button
            onClick={() => handleSaveSection(key)}
            disabled={savingSection === key}
            className="bg-[#0f2a4e] hover:bg-[#1a3f6f] disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition-colors"
            style={{ fontWeight: 600 }}
          >
            {savingSection === key ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>
    );
  };

  const section = (title: string, icon: React.ReactNode, children: React.ReactNode, footer?: React.ReactNode) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
        <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
          <span className="text-blue-600">{icon}</span>
        </div>
        <h3 className="text-gray-800" style={{ fontWeight: 600 }}>{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
      {footer}
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

  const inputRow = (label: string, key: keyof typeof schedule, suffix?: string) => (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{label}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type={key.includes('Minutes') ? 'number' : 'time'}
          value={schedule[key]}
          onChange={e => updateSchedule(s => ({ ...s, [key]: e.target.value }))}
          className="border border-gray-200 bg-gray-50 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-400 w-28 text-center"
        />
        {suffix && <span className="text-gray-400 text-xs">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>System Settings</h1>
        <p className="text-gray-500 text-sm">Configure internship monitoring system settings</p>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-700 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}

      {section('Work Schedule', <Clock className="w-4 h-4" />, <>
        {inputRow('Standard Time In', 'timeIn')}
        {inputRow('Standard Time Out', 'timeOut')}
        {inputRow('Grace Period', 'graceMinutes', 'minutes')}
        {inputRow('Undertime Threshold', 'undertimeMinutes', 'minutes early')}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
          <p className="text-amber-700 text-xs">
            <span style={{ fontWeight: 600 }}>Note:</span> Grace period defines how many minutes after standard Time In an intern is marked "Late" instead of "Present".
          </p>
        </div>
      </>, sectionFooter('schedule', scheduleDirty))}

      {section('Notifications', <Bell className="w-4 h-4" />, <>
        {row('Absence Alerts', 'Send alert when intern has not timed in by 10:00 AM', notifs.absenceAlert, () => updateNotifs(n => ({ ...n, absenceAlert: !n.absenceAlert })))}
        {row('Late Arrival Alerts', 'Notify admin when intern arrives past grace period', notifs.lateAlert, () => updateNotifs(n => ({ ...n, lateAlert: !n.lateAlert })))}
        {row('Completion Alerts', 'Alert when intern is near or reaches required hours', notifs.completionAlert, () => updateNotifs(n => ({ ...n, completionAlert: !n.completionAlert })))}
        {row('Weekly Summary Report', 'Receive automated weekly attendance report', notifs.weeklyReport, () => updateNotifs(n => ({ ...n, weeklyReport: !n.weeklyReport })))}
        {row('Pending Requests Alert', 'Notify when correction requests need review', notifs.pendingRequest, () => {
          const next = !notifs.pendingRequest;
          updateNotifs(n => ({ ...n, pendingRequest: next }));
          if (next && browserPermission !== 'granted') requestBrowserPermission();
        })}
      </>, sectionFooter('notifs', notifsDirty))}

      {section('Intern Policies', <Users className="w-4 h-4" />, <>
        {row('Allow Correction Requests', 'Enable interns to submit attendance correction requests', system.allowCorrections, () => updateSystem(s => ({ ...s, allowCorrections: !s.allowCorrections })))}
        {row('Require Supervisor Approval', 'Correction requests need supervisor sign-off', system.requireSupervisor, () => updateSystem(s => ({ ...s, requireSupervisor: !s.requireSupervisor })))}
        {row('Auto-Approve Minor Corrections', 'Automatically approve small time adjustments (<15 min)', system.autoApprove, () => updateSystem(s => ({ ...s, autoApprove: !s.autoApprove })))}
        {row('Biometric Only Mode', 'Disable manual time logging, require biometric only', system.biometricOnly, () => updateSystem(s => ({ ...s, biometricOnly: !s.biometricOnly })))}
      </>, sectionFooter('system', systemDirty))}

      {section('Display', <Monitor className="w-4 h-4" />, <>
        {row('Compact View', 'Show more data with less spacing', display.compactView, () => updateDisplay(d => ({ ...d, compactView: !d.compactView })))}
        {row('Dark Mode', 'Switch the app to a dark colour scheme', display.darkMode, () => updateDisplay(d => ({ ...d, darkMode: !d.darkMode })))}
        {row('24-Hour Time Format', 'Display times in 24-hour format', display.show24h, () => updateDisplay(d => ({ ...d, show24h: !d.show24h })))}
      </>, sectionFooter('display', displayDirty))}

      {section('Security & Access', <Shield className="w-4 h-4" />, <>
        <div className="space-y-3">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-gray-700 text-sm mb-1" style={{ fontWeight: 600 }}>Admin Access Control</p>
            <p className="text-gray-400 text-xs mb-3">
              {sysInfo.adminCount} admin account{sysInfo.adminCount !== 1 ? 's' : ''} active
            </p>
            <button
              onClick={() => navigate('/admin/interns')}
              className="text-blue-600 border border-blue-200 hover:bg-blue-50 text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ fontWeight: 600 }}
            >
              View Intern List
            </button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-gray-700 text-sm mb-1" style={{ fontWeight: 600 }}>Audit Logs</p>
            <p className="text-gray-400 text-xs mb-3">All system actions are logged for accountability</p>
            <button className="text-blue-600 border border-blue-200 hover:bg-blue-50 text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 600 }}>
              View Audit Logs
            </button>
          </div>
        </div>
      </>)}

      {section('System Information', <Settings className="w-4 h-4" />, <>
        {[
          { label: 'System Version',   value: '2.1.4' },
          { label: 'Database',         value: 'PostgreSQL 16.0' },
          { label: 'Last Backup',      value: 'March 10, 2026 03:00 AM' },
          { label: 'Active Interns',   value: String(sysInfo.activeInterns) },
          { label: 'Total Records',    value: `${sysInfo.totalRecords.toLocaleString()} attendance records` },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 text-xs">{item.label}</span>
            <span className="text-gray-800 text-xs" style={{ fontWeight: 500 }}>{item.value}</span>
          </div>
        ))}
      </>)}

      <div className="flex justify-end">
        <button className="border border-gray-200 hover:bg-gray-50 text-gray-600 px-5 py-2.5 rounded-xl text-sm transition-colors" style={{ fontWeight: 500 }} onClick={handleReset}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
