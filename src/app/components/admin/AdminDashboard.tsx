import { useEffect, useState } from 'react';
import { buildDepartmentData, fetchAllCorrectionRequests, fetchInternProfiles, fetchWeeklyAttendanceData, updateCorrectionRequestStatus } from '../../lib/supabaseApi';
import { CorrectionRequest, InternProfile } from '../../types/models';
import { Users, UserCheck, UserX, Award, TrendingUp, AlertCircle, Clock, FileEdit, CheckCircle, XCircle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export function AdminDashboard() {
  const [internProfiles, setInternProfiles] = useState<InternProfile[]>([]);
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<Array<{ day: string; present: number; late: number; absent: number }>>([]);
  const [correctionRequests, setCorrectionRequests] = useState<CorrectionRequest[]>([]);

  useEffect(() => {
    fetchInternProfiles('all').then(setInternProfiles).catch(() => setInternProfiles([]));
    fetchWeeklyAttendanceData().then(setWeeklyAttendanceData).catch(() => setWeeklyAttendanceData([]));
    fetchAllCorrectionRequests().then(setCorrectionRequests).catch(() => setCorrectionRequests([]));
  }, []);

  const handleRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    await updateCorrectionRequestStatus(id, action).catch(() => null);
    setCorrectionRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: action } : r)
    );
  };

  const departmentData = buildDepartmentData(internProfiles);
  const total     = internProfiles.length;
  const present   = internProfiles.filter(i => i.presentToday).length;
  const absent    = total - present;
  const completed = internProfiles.filter(i => i.status === 'completed').length;
  const active    = internProfiles.filter(i => i.status === 'active').length;

  const recentActivity = internProfiles.filter(i => i.presentToday).slice(0, 5);

  const stats = [
    { label: 'Total Interns',       value: total,     icon: <Users className="w-5 h-5" />,     color: 'from-blue-500 to-blue-700',     bg: 'bg-blue-50',     text: 'text-blue-600',     sub: `${active} active` },
    { label: 'Present Today',        value: present,   icon: <UserCheck className="w-5 h-5" />,  color: 'from-emerald-500 to-emerald-700',bg: 'bg-emerald-50',  text: 'text-emerald-600',  sub: `${total > 0 ? Math.round((present / total) * 100) : 0}% attendance rate` },
    { label: 'Absent Today',         value: absent,    icon: <UserX className="w-5 h-5" />,      color: 'from-red-500 to-red-600',        bg: 'bg-red-50',      text: 'text-red-600',      sub: `${total > 0 ? Math.round((absent / total) * 100) : 0}% of total` },
    { label: 'Completed Internship', value: completed, icon: <Award className="w-5 h-5" />,      color: 'from-violet-500 to-violet-700',  bg: 'bg-violet-50',   text: 'text-violet-600',   sub: `${total > 0 ? Math.round((completed / total) * 100) : 0}% completion rate` },
  ];

  const barColors = { present: '#10b981', late: '#f59e0b', absent: '#ef4444' };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Admin Dashboard</h1>
        <p className="text-gray-500 text-sm">Overview of internship attendance and progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2.5 rounded-xl ${s.bg} mb-3`}>
              <span className={s.text}>{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-gray-900" style={{ fontWeight: 700, fontSize: '2rem' }}>{s.value}</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            <p className="text-gray-400 text-xs mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Weekly Attendance Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Weekly Attendance</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">This Week</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyAttendanceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="present" stackId="a" fill={barColors.present} radius={[0,0,0,0]} name="Present" />
              <Bar dataKey="late"    stackId="a" fill={barColors.late}    radius={[0,0,0,0]} name="Late" />
              <Bar dataKey="absent"  stackId="a" fill={barColors.absent}  radius={[4,4,0,0]} name="Absent" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Pie Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>By Department</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={departmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                {departmentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: number) => [v, 'Interns']} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {departmentData.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-gray-600 text-xs">{d.name}</span>
                </div>
                <span className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Present Today */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Present Today</h3>
            <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>{present} interns</span>
          </div>
          <div className="space-y-2.5">
            {recentActivity.map(intern => (
              <div key={intern.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 text-xs" style={{ fontWeight: 700 }}>
                    {intern.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm truncate" style={{ fontWeight: 500 }}>{intern.name}</p>
                  <p className="text-gray-400 text-xs">{intern.studentId} · {intern.department}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-600 text-xs" style={{ fontWeight: 500 }}>Present</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Alerts & Notifications</h3>
            <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full" style={{ fontWeight: 600 }}>
              {correctionRequests.filter(r => r.status === 'pending').length > 0
                ? `${correctionRequests.filter(r => r.status === 'pending').length} pending`
                : 'All clear'}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { type: 'absent',   icon: <UserX className="w-4 h-4 text-red-500" />,     bg: 'bg-red-50',    text: 'text-red-700',    msg: `${absent} intern${absent !== 1 ? 's' : ''} ${absent !== 1 ? 'have' : 'has'} not timed in today`, time: 'Today' },
              { type: 'trend',    icon: <TrendingUp className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50',  text: 'text-blue-700',   msg: `Attendance rate this week: ${total > 0 ? Math.round((present / total) * 100) : 0}%`, time: 'Today' },
            ].map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${a.bg}`}>
                <div className="mt-0.5 flex-shrink-0">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${a.text}`} style={{ fontWeight: 500 }}>{a.msg}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Correction Requests */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <FileEdit className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Correction Requests</h3>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full ${correctionRequests.filter(r => r.status === 'pending').length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`} style={{ fontWeight: 600 }}>
            {correctionRequests.filter(r => r.status === 'pending').length} pending
          </span>
        </div>

        {correctionRequests.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-6">No correction requests submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {correctionRequests.slice(0, 10).map(req => (
              <div key={req.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border ${
                req.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                req.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                'bg-red-50 border-red-200'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>{req.internName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      req.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                      req.status === 'approved' ? 'bg-emerald-200 text-emerald-800' :
                      'bg-red-200 text-red-800'
                    }`} style={{ fontWeight: 600 }}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {req.type === 'missing-time-in' ? 'Missing Time In' :
                       req.type === 'missing-time-out' ? 'Missing Time Out' : 'Attendance Correction'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">
                    {req.date} — {req.reason}
                  </p>
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRequestAction(req.id, 'approved')}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(req.id, 'rejected')}
                      className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
