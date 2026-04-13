import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAttendanceHistory } from '../../lib/supabaseApi';
import { AttendanceRecord } from '../../types/models';
import { Search, Filter, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const statusStyles: Record<string, { badge: string; dot: string }> = {
  present:   { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  late:      { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500' },
  absent:    { badge: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  undertime: { badge: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500' },
};

const PAGE_SIZE = 8;

export function InternHistory() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchAttendanceHistory(user.id)
      .then(setAttendanceHistory)
      .catch(() => setAttendanceHistory([]));
  }, [user]);

  const filtered = useMemo(() => attendanceHistory.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchSearch = r.date.includes(search) || r.status.includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [attendanceHistory, filterStatus, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    present:   attendanceHistory.filter(r => r.status === 'present').length,
    late:      attendanceHistory.filter(r => r.status === 'late').length,
    absent:    attendanceHistory.filter(r => r.status === 'absent').length,
    undertime: attendanceHistory.filter(r => r.status === 'undertime').length,
  };

  const totalHours = attendanceHistory.reduce((sum, r) => sum + r.hoursRendered, 0);

  return (
    <div className="max-w-5xl space-y-5 dark:[&_*]:text-white">
      {/* Header */}
      <div>
        <h1 style={{ fontWeight: 700, fontSize: '1.375rem' }}>Attendance History</h1>
        <p className="text-muted-foreground text-sm">View your complete attendance records</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Present',   count: counts.present,   style: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
          { label: 'Late',      count: counts.late,      style: 'bg-amber-50 border-amber-200',     text: 'text-amber-700' },
          { label: 'Absent',    count: counts.absent,    style: 'bg-red-50 border-red-200',         text: 'text-red-700' },
          { label: 'Undertime', count: counts.undertime, style: 'bg-orange-50 border-orange-200',   text: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.style}`}>
            <p className={`text-2xl ${s.text}`} style={{ fontWeight: 700 }}>{s.count}</p>
            <p className={`text-xs mt-0.5 ${s.text} opacity-80`}>{s.label} days</p>
          </div>
        ))}
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by date or status..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="undertime">Undertime</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Date', 'Time In', 'Time Out', 'Hours Rendered', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-gray-500 text-xs" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No records found</p>
                  </td>
                </tr>
              ) : (
                paged.map((rec: AttendanceRecord, i) => (
                  <tr key={rec.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <span className="text-gray-800" style={{ fontWeight: 500 }}>
                          {new Date(rec.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 tabular-nums">{rec.timeIn ? `${rec.timeIn}` : <span className="text-gray-400">–</span>}</td>
                    <td className="px-5 py-3.5 text-gray-700 tabular-nums">{rec.timeOut ? `${rec.timeOut}` : <span className="text-gray-400">–</span>}</td>
                    <td className="px-5 py-3.5">
                      {rec.hoursRendered > 0 ? (
                        <span className="text-gray-800" style={{ fontWeight: 500 }}>{rec.hoursRendered.toFixed(2)}h</span>
                      ) : (
                        <span className="text-gray-400">–</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs capitalize ${statusStyles[rec.status].badge}`} style={{ fontWeight: 600 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[rec.status].dot}`} />
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="sm:hidden divide-y divide-gray-100">
          {paged.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No records found</p>
            </div>
          ) : (
            paged.map((rec: AttendanceRecord) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>
                      {new Date(rec.date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-gray-500 text-xs tabular-nums">
                      {rec.timeIn ?? '–'} → {rec.timeOut ?? '–'}
                      {rec.hoursRendered > 0 && <span className="ml-1.5 text-blue-600" style={{ fontWeight: 500 }}>{rec.hoursRendered.toFixed(2)}h</span>}
                    </p>
                  </div>
                </div>
                <span className={`ml-3 flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs capitalize ${statusStyles[rec.status].badge}`} style={{ fontWeight: 600 }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[rec.status].dot}`} />
                  {rec.status}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-gray-500 text-xs">
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
            <span className="ml-2 text-blue-600" style={{ fontWeight: 500 }}>· Total: {totalHours.toFixed(2)}h rendered</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 rounded-lg text-xs transition-colors ${page === p ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                style={{ fontWeight: page === p ? 600 : 400 }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-500"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
