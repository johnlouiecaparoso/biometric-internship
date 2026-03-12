import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAttendanceHistory, fetchMonthlyHoursData } from '../../lib/supabaseApi';
import { AttendanceRecord } from '../../types/models';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { FileDown, FileSpreadsheet, Filter, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export function InternReports() {
  const { user } = useAuth();
  const [exportMsg, setExportMsg] = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [monthlyHoursData, setMonthlyHoursData] = useState<{ month: string; hours: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAttendanceHistory(user.id).then(setAttendanceHistory).catch(() => setAttendanceHistory([]));
    fetchMonthlyHoursData(10).then(setMonthlyHoursData).catch(() => setMonthlyHoursData([]));
  }, [user]);

  const triggerExport = (type: string) => {
    setExportMsg(`${type} export initiated. File will be downloaded shortly.`);
    setTimeout(() => setExportMsg(''), 3000);
  };

  if (!user) return null;

  const present  = attendanceHistory.filter(r => r.status === 'present').length;
  const late     = attendanceHistory.filter(r => r.status === 'late').length;
  const absent   = attendanceHistory.filter(r => r.status === 'absent').length;
  const totalH   = attendanceHistory.reduce((s, r) => s + r.hoursRendered, 0);
  const totalDays = attendanceHistory.filter(r => r.status !== 'absent').length;

  const recentMonthData = useMemo(() => monthlyHoursData.slice(-6), [monthlyHoursData]);

  const dailyData = attendanceHistory
    .filter(r => r.status !== 'absent')
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      hours: r.hoursRendered,
    }));

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>My Reports</h1>
          <p className="text-gray-500 text-sm">View and export your attendance summary</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => triggerExport('PDF')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <FileDown className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={() => triggerExport('Excel')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {exportMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-2 text-blue-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {exportMsg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-sm outline-none text-gray-700">
          <option>All Dates</option>
          <option>This Month</option>
          <option>Last Month</option>
          <option>Last 3 Months</option>
        </select>
        <select className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-sm outline-none text-gray-700">
          <option>All Status</option>
          <option>Present</option>
          <option>Late</option>
          <option>Absent</option>
        </select>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl text-sm transition-colors" style={{ fontWeight: 500 }}>
          Apply Filter
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Days Attended',  value: totalDays, unit: 'days', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Hours Rendered', value: totalH.toFixed(1), unit: 'hrs', icon: <Clock className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Days Late',            value: late, unit: 'days', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Days Absent',          value: absent, unit: 'days', icon: <TrendingUp className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.5rem' }}>{s.value}</span>
              <span className="text-gray-400 text-xs">{s.unit}</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily Hours */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Daily Hours (Recent)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`${v}h`, 'Hours']}
              />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Hours Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Monthly Hours Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={recentMonthData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                formatter={(v: number) => [`${v}h`, 'Hours']}
              />
              <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Summary Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Attendance Summary</h3>
          <div className="flex gap-2">
            <button onClick={() => triggerExport('PDF')} className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 500 }}>
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => triggerExport('Excel')} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 500 }}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Day', 'Time In', 'Time Out', 'Hours', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-gray-500 text-xs" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.slice(0, 8).map((rec, i) => (
                <tr key={rec.id} className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-5 py-3 text-gray-700 text-xs">{new Date(rec.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{new Date(rec.date).toLocaleDateString('en-PH', { weekday: 'short' })}</td>
                  <td className="px-5 py-3 text-gray-700 text-xs tabular-nums">{rec.timeIn ?? '–'}</td>
                  <td className="px-5 py-3 text-gray-700 text-xs tabular-nums">{rec.timeOut ?? '–'}</td>
                  <td className="px-5 py-3 text-gray-700 text-xs" style={{ fontWeight: 500 }}>{rec.hoursRendered > 0 ? `${rec.hoursRendered}h` : '–'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      rec.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                      rec.status === 'late' ? 'bg-amber-100 text-amber-700' :
                      rec.status === 'absent' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`} style={{ fontWeight: 600 }}>{rec.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
