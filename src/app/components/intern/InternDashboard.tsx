import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { fetchAttendanceHistory } from '../../lib/supabaseApi';
import { AttendanceRecord } from '../../types/models';
import {
  Clock, CheckCircle2, AlertCircle, TrendingUp, Calendar,
  Fingerprint, ChevronRight, Target, Hourglass, Award
} from 'lucide-react';

const statusColors: Record<string, string> = {
  present:   'bg-emerald-100 text-emerald-700',
  late:      'bg-amber-100 text-amber-700',
  absent:    'bg-red-100 text-red-700',
  undertime: 'bg-orange-100 text-orange-700',
};

export function InternDashboard() {
  const { user } = useAuth();
  const { display, formatTime, formatShortTime } = useDisplaySettings();
  const [now, setNow] = useState(new Date());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAttendanceHistory(user.id)
      .then(setAttendanceHistory)
      .catch(() => setAttendanceHistory([]));
  }, [user]);

  if (!user) return null;

  const required = Number(user.requiredHours) || 0;
  const rendered = Number(user.renderedHours) || 0;
  const remaining = Math.max(0, required - rendered);
  const pct = required > 0 ? Math.min(100, Math.round((rendered / required) * 100)) : 0;

  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayRecord = attendanceHistory.find(r => r.date === todayDateStr) ?? null;
  const recentHistory = attendanceHistory.filter(r => r.date !== todayDateStr).slice(0, 5);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const stats = [
    { label: 'Required Hours',  value: required, unit: 'hrs', icon: <Target className="w-5 h-5" />,   color: 'from-blue-500 to-blue-700',   bg: 'bg-blue-50',   text: 'text-blue-600' },
    { label: 'Hours Rendered',  value: rendered, unit: 'hrs', icon: <CheckCircle2 className="w-5 h-5" />, color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: 'Remaining Hours', value: remaining, unit: 'hrs', icon: <Hourglass className="w-5 h-5" />, color: 'from-amber-500 to-amber-600',  bg: 'bg-amber-50',  text: 'text-amber-600' },
    { label: 'Completion',      value: pct,      unit: '%',   icon: <Award className="w-5 h-5" />,      color: 'from-violet-500 to-violet-700', bg: 'bg-violet-50', text: 'text-violet-600' },
  ];

  return (
    <div className={`${display.compactView ? 'space-y-4' : 'space-y-6'} max-w-6xl`}>
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>
            Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(now)}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-gray-800 text-sm tabular-nums" style={{ fontWeight: 600 }}>{formatTime(now)}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2.5 rounded-xl ${s.bg} mb-3`}>
              <span className={s.text}>{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.75rem' }}>{Number(s.value) ?? 0}</span>
              <span className="text-gray-400 text-sm">{s.unit}</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Internship Progress</h3>
            <p className="text-gray-500 text-sm">{rendered} of {required} hours completed</p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded-full ${pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct >= 75 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
            style={{ fontWeight: 600 }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1.5">
          <span>0 hrs</span>
          <span>{required} hrs</span>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Today's Attendance</h3>
            <span className="text-xs text-gray-400">{now.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${todayRecord?.timeIn ? 'bg-emerald-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${todayRecord?.timeIn ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>Time In</p>
                  <p className={`text-xs ${todayRecord?.timeIn ? 'text-emerald-700' : 'text-gray-400'}`}>
                    {todayRecord?.timeIn ? 'Recorded successfully' : 'Not yet recorded'}
                  </p>
                </div>
              </div>
              <span className={`text-sm tabular-nums ${todayRecord?.timeIn ? 'text-gray-800' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>
                {todayRecord?.timeIn ?? '–'}
              </span>
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${todayRecord?.timeOut ? 'bg-orange-50' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${todayRecord?.timeOut ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>Time Out</p>
                  <p className={`text-xs ${todayRecord?.timeOut ? 'text-orange-700' : 'text-gray-400'}`}>
                    {todayRecord?.timeOut ? 'Recorded successfully' : 'Not yet recorded'}
                  </p>
                </div>
              </div>
              <span className={`text-sm tabular-nums ${todayRecord?.timeOut ? 'text-gray-800' : 'text-gray-400'}`} style={{ fontWeight: 600 }}>
                {todayRecord?.timeOut ?? '–'}
              </span>
            </div>
          </div>
          <Link
            to="/intern/attendance"
            className="mt-4 flex items-center justify-center gap-2 w-full bg-[#0f2a4e] hover:bg-[#1a3f6f] text-white py-2.5 rounded-xl text-sm transition-colors"
            style={{ fontWeight: 500 }}
          >
            <Fingerprint className="w-4 h-4" /> Go to Attendance
          </Link>
        </div>

        {/* Recent History */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Recent Attendance</h3>
            <Link to="/intern/history" className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1" style={{ fontWeight: 500 }}>
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2.5">
            {recentHistory.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>
                      {new Date(rec.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {rec.timeIn ? `${rec.timeIn} – ${rec.timeOut ?? '–'}` : 'No record'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rec.status !== 'absent' && (
                    <span className="text-gray-500 text-xs">{rec.hoursRendered}h</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusColors[rec.status]}`} style={{ fontWeight: 500 }}>
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Internship Info Banner */}
      <div className="bg-gradient-to-r from-[#0f2a4e] to-[#1a4a80] rounded-2xl p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>{user.company}</p>
              <p className="text-blue-200 text-xs">Supervisor: {user.supervisor}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center sm:justify-end gap-4 sm:gap-6 text-center">
            <div>
              <p className="text-white text-lg" style={{ fontWeight: 700 }}>{user.startDate}</p>
              <p className="text-blue-200 text-xs">Start Date</p>
            </div>
            <div>
              <p className="text-white text-lg" style={{ fontWeight: 700 }}>{user.endDate}</p>
              <p className="text-blue-200 text-xs">End Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
