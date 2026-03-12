import { useEffect, useMemo, useState } from 'react';
import { fetchInternProfiles } from '../../lib/supabaseApi';
import { InternProfile } from '../../types/models';
import { Search, Filter, Eye, Edit2, Users, CheckCircle2, Clock, XCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const statusConfig = {
  active:    { badge: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500',    label: 'Active' },
  completed: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', label: 'Completed' },
  inactive:  { badge: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400',    label: 'Inactive' },
};

export function AdminInterns() {
  const [internProfiles, setInternProfiles] = useState<InternProfile[]>([]);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<InternProfile | null>(null);

  useEffect(() => {
    fetchInternProfiles('all').then(setInternProfiles).catch(() => setInternProfiles([]));
  }, []);

  const departments = useMemo(() => ['all', ...Array.from(new Set(internProfiles.map(i => i.department)))], [internProfiles]);

  const filtered = internProfiles.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = i.name.toLowerCase().includes(q) || i.studentId.toLowerCase().includes(q) || i.email.toLowerCase().includes(q);
    const matchDept = filterDept === 'all' || i.department === filterDept;
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchDept && matchStatus;
  });

  const getProgressColor = (pct: number) =>
    pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';

  return (
    <div className="max-w-6xl space-y-5">
      <div>
        <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Intern Management</h1>
        <p className="text-gray-500 text-sm">Manage and monitor all registered interns</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Total Interns',  value: internProfiles.length,                                    icon: <Users className="w-4 h-4" />,        bg: 'bg-blue-50',    text: 'text-blue-600' },
          { label: 'Completed',      value: internProfiles.filter(i => i.status === 'completed').length, icon: <CheckCircle2 className="w-4 h-4" />,  bg: 'bg-emerald-50', text: 'text-emerald-600' },
          { label: 'Active',         value: internProfiles.filter(i => i.status === 'active').length,    icon: <Clock className="w-4 h-4" />,         bg: 'bg-amber-50',   text: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
              <span className={s.text}>{s.icon}</span>
            </div>
            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.5rem' }}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="w-full sm:w-auto border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none text-gray-700"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
                ))}
              </select>
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none text-gray-700"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Intern', 'Student ID', 'Department', 'Required', 'Rendered', 'Progress', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((intern, i) => {
                const sc = statusConfig[intern.status];
                return (
                  <tr key={intern.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 text-xs" style={{ fontWeight: 700 }}>
                            {intern.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-800 text-sm whitespace-nowrap" style={{ fontWeight: 500 }}>{intern.name}</p>
                          <p className="text-gray-400 text-xs">{intern.course}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs whitespace-nowrap">{intern.studentId}</td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs whitespace-nowrap">{intern.department}</td>
                    <td className="px-4 py-3.5 text-gray-700 text-xs" style={{ fontWeight: 500 }}>{intern.requiredHours}h</td>
                    <td className="px-4 py-3.5 text-gray-700 text-xs" style={{ fontWeight: 500 }}>{intern.renderedHours}h</td>
                    <td className="px-4 py-3.5">
                      <div className="min-w-[80px]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500 text-xs">{intern.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getProgressColor(intern.progress)}`}
                            style={{ width: `${intern.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${sc.badge}`} style={{ fontWeight: 600 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelected(intern)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No interns found</p>
            </div>
          ) : (
            filtered.map(intern => {
              const sc = statusConfig[intern.status];
              return (
                <div key={intern.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-700 text-sm" style={{ fontWeight: 700 }}>
                      {intern.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-gray-800 text-sm truncate" style={{ fontWeight: 600 }}>{intern.name}</p>
                      <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${sc.badge}`} style={{ fontWeight: 600 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{intern.studentId} · {intern.department}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getProgressColor(intern.progress)}`}
                          style={{ width: `${intern.progress}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs flex-shrink-0">{intern.progress}% · {intern.renderedHours}/{intern.requiredHours}h</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(intern)}
                    className="flex-shrink-0 p-2 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-gray-400 text-xs">Showing {filtered.length} of {internProfiles.length} interns</p>
        </div>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-[#0f2a4e] to-[#1a4a80] p-5 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                    <span className="text-white" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      {selected.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white" style={{ fontWeight: 600 }}>{selected.name}</h3>
                    <p className="text-blue-200 text-xs">{selected.studentId} · {selected.course}</p>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="text-blue-200 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: 'Email',          value: selected.email },
                  { label: 'Department',     value: selected.department },
                  { label: 'Company',        value: selected.company },
                  { label: 'Supervisor',     value: selected.supervisor },
                  { label: 'Required Hours', value: `${selected.requiredHours} hours` },
                  { label: 'Hours Rendered', value: `${selected.renderedHours} hours` },
                  { label: 'Remaining',      value: `${Math.max(0, selected.requiredHours - selected.renderedHours)} hours` },
                  { label: 'Start Date',     value: selected.startDate },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-400 text-xs">{row.label}</span>
                    <span className="text-gray-800 text-xs" style={{ fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-gray-500 text-xs">Progress</span>
                    <span className="text-gray-800 text-xs" style={{ fontWeight: 600 }}>{selected.progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${selected.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                      style={{ width: `${selected.progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${statusConfig[selected.status].badge}`} style={{ fontWeight: 600 }}>
                    {selected.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : selected.status === 'inactive' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {statusConfig[selected.status].label}
                  </span>
                  {selected.presentToday && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700" style={{ fontWeight: 600 }}>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Present Today
                    </span>
                  )}
                </div>
              </div>
              <div className="px-5 pb-5">
                <button onClick={() => setSelected(null)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-sm transition-colors" style={{ fontWeight: 500 }}>
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
