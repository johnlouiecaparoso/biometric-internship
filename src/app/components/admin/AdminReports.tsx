import { useEffect, useState } from 'react';
import { fetchInternProfiles, fetchMonthlyHoursData, fetchWeeklyAttendanceData } from '../../lib/supabaseApi';
import { InternProfile } from '../../types/models';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { FileDown, FileSpreadsheet, Filter, CheckCircle2, Users, Clock, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function AdminReports() {
  const [internProfiles, setInternProfiles] = useState<InternProfile[]>([]);
  const [weeklyAttendanceData, setWeeklyAttendanceData] = useState<Array<{ day: string; present: number; late: number; absent: number }>>([]);
  const [monthlyHoursData, setMonthlyHoursData] = useState<Array<{ month: string; hours: number }>>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterDate, setFilterDate] = useState('this-month');
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    fetchInternProfiles('all').then(setInternProfiles).catch(() => setInternProfiles([]));
    fetchWeeklyAttendanceData().then(setWeeklyAttendanceData).catch(() => setWeeklyAttendanceData([]));
    fetchMonthlyHoursData(10).then(setMonthlyHoursData).catch(() => setMonthlyHoursData([]));
  }, []);

  const triggerExport = async (type: 'PDF' | 'Excel') => {
    setExportMsg(`Generating ${type} report...`);
    
    try {
      const reportData = filteredInterns.map(intern => ({
        'Name': intern.name,
        'Student ID': intern.studentId,
        'Department': intern.department || 'N/A',
        'Required Hours': intern.requiredHours,
        'Rendered Hours': intern.renderedHours.toFixed(2),
        'Remaining Hours': (intern.requiredHours - intern.renderedHours).toFixed(2),
        'Progress': `${intern.progress}%`,
        'Status': intern.status,
        'Present Today': intern.presentToday ? 'Yes' : 'No'
      }));

      if (type === 'PDF') {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(18);
        doc.text('Internship Attendance Report', 14, 15);
        
        // Add metadata
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
        doc.text(`Filter: ${filterDept === 'all' ? 'All Departments' : filterDept}`, 14, 32);
        doc.text(`Total Interns: ${filteredInterns.length}`, 14, 39);
        
        // Add table
        autoTable(doc, {
          head: [['Name', 'Student ID', 'Department', 'Required Hours', 'Rendered Hours', 'Remaining Hours', 'Progress', 'Status']],
          body: reportData.map(row => [
            row.Name,
            row['Student ID'],
            row.Department,
            row['Required Hours'],
            row['Rendered Hours'],
            row['Remaining Hours'],
            row.Progress,
            row.Status
          ]),
          startY: 50,
          styles: {
            fontSize: 8,
            cellPadding: 2
          },
          headStyles: {
            fillColor: [53, 88, 114],
            textColor: 255
          }
        });
        
        doc.save('internship-report.pdf');
      } else if (type === 'Excel') {
        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Internship Report');
        
        // Add summary sheet
        const summaryData = [
          { 'Metric': 'Total Interns', 'Value': filteredInterns.length },
          { 'Metric': 'Total Hours Rendered', 'Value': totalHours.toFixed(2) },
          { 'Metric': 'Average Progress', 'Value': `${avgProgress}%` },
          { 'Metric': 'Completed Interns', 'Value': completed },
          { 'Metric': 'Present Today', 'Value': present }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
        
        XLSX.writeFile(wb, 'internship-report.xlsx');
      }
      
      setExportMsg(`${type} report generated successfully!`);
    } catch (error) {
      setExportMsg(`Failed to generate ${type} report. Please try again.`);
      console.error('Export error:', error);
    }
    
    setTimeout(() => setExportMsg(''), 3500);
  };

  const departments = ['all', ...Array.from(new Set(internProfiles.map(i => i.department)))];

  const filteredInterns = filterDept === 'all'
    ? internProfiles
    : internProfiles.filter(i => i.department === filterDept);

  const avgProgress = filteredInterns.length > 0
    ? Math.round(filteredInterns.reduce((s, i) => s + i.progress, 0) / filteredInterns.length)
    : 0;
  const totalHours  = filteredInterns.reduce((s, i) => s + i.renderedHours, 0);
  const completed   = filteredInterns.filter(i => i.status === 'completed').length;
  const present     = filteredInterns.filter(i => i.presentToday).length;

  return (
    <div className="max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>Reports</h1>
          <p className="text-gray-500 text-sm">Generate and export attendance analytics reports</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={() => triggerExport('PDF')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <FileDown className="w-4 h-4" /> Export PDF
          </button>
          <button
            onClick={() => triggerExport('Excel')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {exportMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-700 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {exportMsg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-gray-500 text-sm" style={{ fontWeight: 500 }}>Filters:</span>
        </div>
        <select
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-sm outline-none text-gray-700"
        >
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="last-month">Last Month</option>
          <option value="custom">Custom Range</option>
        </select>
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-sm outline-none text-gray-700"
        >
          {departments.map(d => (
            <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
          ))}
        </select>
        <select className="border border-gray-200 bg-gray-50 rounded-xl px-3 py-1.5 text-sm outline-none text-gray-700">
          <option>All Interns</option>
          {filteredInterns.map(i => <option key={i.id}>{i.name}</option>)}
        </select>
        <button className="bg-[#0f2a4e] hover:bg-[#1a3f6f] text-white px-4 py-1.5 rounded-xl text-sm transition-colors" style={{ fontWeight: 500 }}>
          Generate Report
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Interns Included', value: filteredInterns.length, icon: <Users className="w-4 h-4" />,       color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Total Hours',      value: `${totalHours.toFixed(2)}h`,       icon: <Clock className="w-4 h-4" />,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg. Progress',    value: `${avgProgress}%`,      icon: <TrendingUp className="w-4 h-4" />,  color: 'text-violet-600',  bg: 'bg-violet-50' },
          { label: 'Completed',        value: completed,              icon: <CheckCircle2 className="w-4 h-4" />,color: 'text-amber-600',   bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.4rem' }}>{s.value}</p>
            <p className="text-gray-500 text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 600 }}>Weekly Attendance Trend</h3>
          <p className="text-gray-400 text-xs mb-4">Present vs Late vs Absent</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={weeklyAttendanceData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" name="Present" fill="#10b981" radius={[3,3,0,0]} />
              <Bar dataKey="late"    name="Late"    fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Hours Area */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-1" style={{ fontWeight: 600 }}>Monthly Total Hours</h3>
          <p className="text-gray-400 text-xs mb-4">All interns combined</p>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={monthlyHoursData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }} formatter={(v: number) => [`${v}h`, 'Hours']} />
              <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorHours)" dot={{ r: 4, fill: '#3b82f6' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interns Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Internship Summary Report</h3>
          <div className="flex gap-2">
            <button onClick={() => triggerExport('PDF')} className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 500 }}>
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={() => triggerExport('Excel')} className="flex items-center gap-1.5 text-xs text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors" style={{ fontWeight: 500 }}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Name', 'Student ID', 'Department', 'Required', 'Rendered', 'Remaining', 'Progress', 'Status', 'Present Today'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-500 text-xs whitespace-nowrap" style={{ fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInterns.map((intern, i) => (
                <tr key={intern.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                  <td className="px-4 py-3 text-gray-800 text-xs" style={{ fontWeight: 500 }}>{intern.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{intern.studentId}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{intern.department}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{intern.requiredHours.toFixed(2)}h</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{intern.renderedHours.toFixed(2)}h</td>
                  <td className="px-4 py-3 text-gray-700 text-xs">{Math.max(0, intern.requiredHours - intern.renderedHours).toFixed(2)}h</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${intern.progress >= 100 ? 'bg-emerald-500' : intern.progress >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${intern.progress}%` }}
                        />
                      </div>
                      <span className="text-gray-600 text-xs whitespace-nowrap" style={{ fontWeight: 500 }}>{intern.progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      intern.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      intern.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`} style={{ fontWeight: 600 }}>
                      {intern.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {intern.presentToday
                      ? <span className="text-emerald-600 text-xs" style={{ fontWeight: 600 }}>✓ Yes</span>
                      : <span className="text-red-400 text-xs">✗ No</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-200">
                <td colSpan={3} className="px-4 py-3 text-gray-600 text-xs" style={{ fontWeight: 600 }}>Totals ({filteredInterns.length} interns)</td>
                <td className="px-4 py-3 text-gray-700 text-xs" style={{ fontWeight: 700 }}>{filteredInterns.reduce((s, i) => s + i.requiredHours, 0).toFixed(2)}h</td>
                <td className="px-4 py-3 text-gray-700 text-xs" style={{ fontWeight: 700 }}>{totalHours.toFixed(2)}h</td>
                <td className="px-4 py-3 text-gray-700 text-xs" style={{ fontWeight: 700 }}>{filteredInterns.reduce((s, i) => s + Math.max(0, i.requiredHours - i.renderedHours), 0).toFixed(2)}h</td>
                <td className="px-4 py-3 text-gray-600 text-xs" style={{ fontWeight: 600 }}>Avg: {avgProgress}%</td>
                <td className="px-4 py-3 text-gray-600 text-xs" style={{ fontWeight: 600 }}>{completed} done</td>
                <td className="px-4 py-3 text-gray-600 text-xs" style={{ fontWeight: 600 }}>{present} present</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredInterns.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No interns found</div>
          ) : (
            filteredInterns.map(intern => (
              <div key={intern.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-gray-800 text-sm truncate" style={{ fontWeight: 600 }}>{intern.name}</p>
                    <p className="text-gray-400 text-xs">{intern.studentId} · {intern.department}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      intern.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      intern.status === 'active' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`} style={{ fontWeight: 600 }}>
                      {intern.status}
                    </span>
                    {intern.presentToday
                      ? <span className="text-emerald-600 text-xs" style={{ fontWeight: 600 }}>✓ Present</span>
                      : <span className="text-red-400 text-xs">✗ Absent</span>
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${intern.progress >= 100 ? 'bg-emerald-500' : intern.progress >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${intern.progress}%` }}
                    />
                  </div>
                  <span className="text-gray-500 text-xs flex-shrink-0">{intern.progress}%</span>
                </div>
                <p className="text-gray-500 text-xs">{intern.renderedHours.toFixed(2)}h rendered · {intern.requiredHours.toFixed(2)}h required · {Math.max(0, intern.requiredHours - intern.renderedHours).toFixed(2)}h remaining</p>
              </div>
            ))
          )}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-gray-600 text-xs" style={{ fontWeight: 600 }}>
              Totals: {filteredInterns.reduce((s, i) => s + i.requiredHours, 0).toFixed(2)}h required · {totalHours.toFixed(2)}h rendered · Avg {avgProgress}% · {completed} completed
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
