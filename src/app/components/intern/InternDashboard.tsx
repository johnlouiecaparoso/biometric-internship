import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useDisplaySettings } from '../../context/DisplaySettingsContext';
import { fetchAttendanceHistory } from '../../lib/supabaseApi';
import { AttendanceRecord } from '../../types/models';
import {
  Clock, CheckCircle2, AlertCircle, TrendingUp, Hourglass, Award, Target,
} from 'lucide-react';

export function InternDashboard() {
  const { user } = useAuth();
  const { display, formatTime } = useDisplaySettings();
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
  const historyRendered = Math.round(
    attendanceHistory.reduce((sum, r) => sum + Number(r.hoursRendered || 0), 0) * 100
  ) / 100;
  const rendered = Math.max(Number(user.renderedHours) || 0, historyRendered);
  const remaining = Math.max(0, required - rendered);
  const pct = required > 0 ? Math.min(100, Math.round((rendered / required) * 100)) : 0;

  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayRecord = attendanceHistory.find((r) => r.date === todayDateStr) ?? null;
  const recentHistory = attendanceHistory.filter((r) => r.date !== todayDateStr).slice(0, 5);

  const formatDate = (d: Date) => d.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = [
    {
      label: 'Required Hours', value: required, unit: 'hrs', icon: <Target className="w-5 h-5" />, bg: 'bg-[#3F72AF]/20', text: 'text-[#3F72AF]',
    },
    {
      label: 'Hours Rendered', value: rendered, unit: 'hrs', icon: <CheckCircle2 className="w-5 h-5" />, bg: 'bg-[#3F72AF]/20', text: 'text-[#112D4E]',
    },
    {
      label: 'Remaining Hours', value: remaining, unit: 'hrs', icon: <Hourglass className="w-5 h-5" />, bg: 'bg-[#3F72AF]/20', text: 'text-[#112D4E] dark:text-slate-200',
    },
    {
      label: 'Completion', value: pct, unit: '%', icon: <Award className="w-5 h-5" />, bg: 'bg-[#3F72AF]/20', text: 'text-[#3F72AF]',
    },
  ];

  return (
    <div className={`${display.compactView ? 'space-y-4' : 'space-y-6'} max-w-6xl dark:[&_*]:text-white`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[#3F72AF]" style={{ fontWeight: 700, fontSize: '1.375rem' }}>
            Good {now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-black dark:text-slate-200 text-sm mt-0.5">{formatDate(now)}</p>
        </div>
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#DBE2EF]/30 rounded-xl px-4 py-2.5 shadow-sm">
          <Clock className="w-4 h-4 text-[#3F72AF]" />
          <span className="text-[#3F72AF] text-sm tabular-nums" style={{ fontWeight: 600 }}>{formatTime(now)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-border">
            <div className={`inline-flex p-2.5 rounded-xl ${s.bg} mb-3`}>
              <span className={s.text}>{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-foreground" style={{ fontWeight: 700, fontSize: '1.75rem' }}>{Number(s.value).toFixed(2) ?? '0.00'}</span>
              <span className="text-black dark:text-slate-200 text-sm">{s.unit}</span>
            </div>
            <p className="text-gray-700 dark:text-slate-300 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[#3F72AF]" style={{ fontWeight: 600 }}>Internship Progress</h3>
            <p className="text-black dark:text-slate-200 text-sm">{rendered} of {required} hours completed</p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded-full ${pct >= 100 ? 'bg-[#3F72AF]/20 text-[#3F72AF]' : pct >= 75 ? 'bg-[#112D4E]/20 text-[#112D4E]' : 'bg-[#DBE2EF]/30 text-[#3F72AF]'}`}
            style={{ fontWeight: 600 }}
          >
            {pct}%
          </span>
        </div>
        <div className="h-3 bg-[#DBE2EF]/30 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 100 ? 'bg-gradient-to-r from-[#3F72AF] to-[#112D4E]' : pct >= 75 ? 'bg-gradient-to-r from-[#112D4E] to-[#DBE2EF]' : 'bg-gradient-to-r from-[#DBE2EF] to-[#3F72AF]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 dark:text-slate-400 mt-1.5">
          <span>0 hrs</span>
          <span>{required} hrs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#3F72AF]" style={{ fontWeight: 600 }}>Today's Attendance</h3>
            <span className="text-xs text-gray-600 dark:text-slate-400">{now.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="space-y-3">
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${todayRecord?.timeIn ? 'bg-primary/20' : 'bg-muted'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${todayRecord?.timeIn ? 'bg-[#3F72AF]' : 'bg-[#DBE2EF]/50'}`}>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-foreground text-sm" style={{ fontWeight: 500 }}>Time In</p>
                  <p className={`text-xs ${todayRecord?.timeIn ? 'text-[#3F72AF]' : 'text-gray-600 dark:text-slate-400'}`}>
                    {todayRecord?.timeIn ? 'Recorded successfully' : 'Not yet recorded'}
                  </p>
                </div>
              </div>
              <span className={`text-sm tabular-nums ${todayRecord?.timeIn ? 'text-foreground' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>
                {todayRecord?.timeIn ?? '–'}
              </span>
            </div>
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${todayRecord?.timeOut ? 'bg-[#112D4E]/20' : 'bg-[#DBE2EF]/10'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${todayRecord?.timeOut ? 'bg-[#112D4E]' : 'bg-[#DBE2EF]/50'}`}>
                  <AlertCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-foreground text-sm" style={{ fontWeight: 500 }}>Time Out</p>
                  <p className={`text-xs ${todayRecord?.timeOut ? 'text-[#112D4E] dark:text-slate-200' : 'text-gray-600 dark:text-slate-400'}`}>
                    {todayRecord?.timeOut ? 'Recorded successfully' : 'Not yet recorded'}
                  </p>
                </div>
              </div>
              <span className={`text-sm tabular-nums ${todayRecord?.timeOut ? 'text-foreground' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>
                {todayRecord?.timeOut ?? '–'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#3F72AF]" style={{ fontWeight: 600 }}>Recent History</h3>
            <Link to="/intern/history" className="text-xs text-[#3F72AF] hover:text-[#112D4E] transition-colors" style={{ fontWeight: 500 }}>
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentHistory.length === 0 ? (
              <p className="text-gray-600 dark:text-slate-400 text-sm text-center py-4">No recent attendance records</p>
            ) : (
              recentHistory.map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-muted">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        record.status === 'present' ? 'bg-[#3F72AF] text-white'
                          : record.status === 'late' ? 'bg-[#112D4E] text-white'
                            : 'bg-[#F9F7F7]/50 text-[#3F72AF]'
                      }`}
                    >
                      {record.status === 'present' ? 'P' : record.status === 'late' ? 'L' : 'A'}
                    </div>
                    <div>
                      <p className="text-foreground text-sm" style={{ fontWeight: 500 }}>
                        {new Date(record.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-gray-600 dark:text-slate-400 text-xs">
                        {record.timeIn || '–'} → {record.timeOut || '–'}
                      </p>
                    </div>
                  </div>
                  <span className="text-foreground text-sm" style={{ fontWeight: 600 }}>
                    {record.hoursRendered > 0 ? `${record.hoursRendered}h` : '–'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

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
