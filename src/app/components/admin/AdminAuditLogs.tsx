import { useEffect, useState } from 'react';
import { Clock, Fingerprint, FileEdit, UserPlus, RefreshCw } from 'lucide-react';
import { fetchAdminAuditLogs, AuditLogEntry } from '../../lib/supabaseApi';

type FilterType = 'all' | 'attendance' | 'request' | 'registration';

const categoryConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  attendance:   { label: 'Attendance',   color: 'bg-blue-100 text-blue-700',    icon: <Fingerprint className="w-3.5 h-3.5" /> },
  request:      { label: 'Request',      color: 'bg-amber-100 text-amber-700',  icon: <FileEdit className="w-3.5 h-3.5" /> },
  registration: { label: 'Registration', color: 'bg-emerald-100 text-emerald-700', icon: <UserPlus className="w-3.5 h-3.5" /> },
};

const statusBadge: Record<string, string> = {
  present:  'bg-emerald-100 text-emerald-700',
  late:     'bg-amber-100 text-amber-700',
  absent:   'bg-red-100 text-red-700',
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = () => {
    setLoading(true);
    setError(null);
    fetchAdminAuditLogs()
      .then(data => setLogs(data))
      .catch(() => setError('Failed to load audit logs. Check your connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.category === filter);

  const formatTs = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return ts; }
  };

  return (
    <div className="max-w-4xl space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Audit Logs</h1>
          <p className="text-gray-500 text-sm">Recent system activity — last 30 days</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-sm transition-colors self-start"
          style={{ fontWeight: 500 }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(['attendance', 'request', 'registration'] as FilterType[]).map(cat => {
          const cfg = categoryConfig[cat];
          const count = logs.filter(l => l.category === cat).length;
          return (
            <div key={cat} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded-lg ${cfg.color}`}>{cfg.icon}</div>
              <div>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>{count}</p>
                <p className="text-gray-400 text-xs">{cfg.label} events</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'attendance', 'request', 'registration'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filter === f
                ? 'bg-[#0f2a4e] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={{ fontWeight: filter === f ? 600 : 500 }}
          >
            {f === 'all' ? `All (${logs.length})` : categoryConfig[f].label + ` (${logs.filter(l => l.category === f).length})`}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading audit logs…</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={load} className="mt-3 text-blue-600 text-xs hover:underline">Try again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No events found for this filter.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((entry) => {
              const cat = categoryConfig[entry.category];
              return (
                <div key={entry.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  {/* Category badge */}
                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full flex-shrink-0 mt-0.5 ${cat.color}`} style={{ fontWeight: 600 }}>
                    {cat.icon}
                    <span className="hidden sm:inline">{cat.label}</span>
                  </div>

                  {/* Action + actor */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{entry.action}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{entry.actor}</p>
                  </div>

                  {/* Status badge */}
                  {entry.status && statusBadge[entry.status] && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 capitalize ${statusBadge[entry.status]}`} style={{ fontWeight: 500 }}>
                      {entry.status}
                    </span>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span className="hidden md:inline">{formatTs(entry.timestamp)}</span>
                    <span className="md:hidden">{new Date(entry.timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && !error && (
        <p className="text-gray-400 text-xs text-center">
          Showing {filtered.length} of {logs.length} event{logs.length !== 1 ? 's' : ''} in the last 30 days
        </p>
      )}
    </div>
  );
}
