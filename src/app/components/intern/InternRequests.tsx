import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createCorrectionRequest, fetchCorrectionRequests } from '../../lib/supabaseApi';
import { CorrectionRequest } from '../../types/models';
import { FileEdit, Clock, CheckCircle2, XCircle, Plus, Send, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type RequestType = 'missing-time-in' | 'missing-time-out' | 'correction';

const statusConfig = {
  pending:  { label: 'Pending',  badge: 'bg-amber-100 text-amber-700',   icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: 'Approved', badge: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', badge: 'bg-red-100 text-red-700',        icon: <XCircle className="w-3.5 h-3.5" /> },
};

const typeLabels: Record<RequestType, string> = {
  'missing-time-in':  'Missing Time In',
  'missing-time-out': 'Missing Time Out',
  'correction':       'Attendance Correction',
};

export function InternRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'missing-time-in' as RequestType,
    date: '',
    timeIn: '',
    timeOut: '',
    reason: '',
  });
  const needsTimeIn = form.type === 'missing-time-in' || form.type === 'correction';
  const needsTimeOut = form.type === 'missing-time-out' || form.type === 'correction';

  useEffect(() => {
    if (!user) return;
    fetchCorrectionRequests(user.id)
      .then(setRequests)
      .catch(() => setRequests([]));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await createCorrectionRequest(user.id, {
        type: form.type,
        date: form.date,
        reason: form.reason,
        timeIn: needsTimeIn ? form.timeIn : '',
        timeOut: needsTimeOut ? form.timeOut : '',
      });
      const updated = await fetchCorrectionRequests(user.id);
      setRequests(updated);
      setForm({ type: 'missing-time-in', date: '', timeIn: '', timeOut: '', reason: '' });
      setSubmitted(true);
      setShowForm(false);
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5 dark:[&_*]:text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.375rem' }}>Correction Requests</h1>
          <p className="text-muted-foreground text-sm">Submit requests for attendance corrections</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-blue-200"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Success Alert */}
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-emerald-800 text-sm" style={{ fontWeight: 600 }}>Request Submitted Successfully</p>
              <p className="text-emerald-600 text-xs">Your request is pending admin review. You'll be notified once processed.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileEdit className="w-5 h-5 text-white" />
                  <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Submit Correction Request</h3>
                </div>
                <button onClick={() => setShowForm(false)} className="text-blue-200 hover:text-white transition-colors">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Request Type</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as RequestType }))}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-gray-700"
                      required
                    >
                      <option value="missing-time-in">Missing Time In</option>
                      <option value="missing-time-out">Missing Time Out</option>
                      <option value="correction">Attendance Correction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>Date of Absence/Issue</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-gray-700"
                      required
                    />
                  </div>
                </div>

                {(needsTimeIn || needsTimeOut) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {needsTimeIn && (
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                          {form.type === 'correction' ? 'Correct Time In' : 'Missing Time In'}
                        </label>
                        <input
                          type="time"
                          value={form.timeIn}
                          onChange={e => setForm(f => ({ ...f, timeIn: e.target.value }))}
                          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-gray-700"
                          required={needsTimeIn}
                        />
                      </div>
                    )}
                    {needsTimeOut && (
                      <div>
                        <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                          {form.type === 'correction' ? 'Correct Time Out' : 'Missing Time Out'}
                        </label>
                        <input
                          type="time"
                          value={form.timeOut}
                          onChange={e => setForm(f => ({ ...f, timeOut: e.target.value }))}
                          className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-gray-700"
                          required={needsTimeOut}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 text-sm mb-1.5" style={{ fontWeight: 500 }}>
                    Reason / Explanation <span className="text-gray-400" style={{ fontWeight: 400 }}>(minimum 20 characters)</span>
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    rows={4}
                    placeholder="Provide a detailed reason for this correction request..."
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-gray-700 resize-none"
                    required
                    minLength={20}
                  />
                  <p className="text-muted-foreground text-xs mt-1">{form.reason.length} characters</p>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <p className="text-amber-700 text-xs">
                    <span style={{ fontWeight: 600 }}>Note:</span> Your request will be reviewed by your assigned supervisor or the OJT coordinator. Falsification of records is a serious academic offense.
                  </p>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                    <XCircle className="w-4 h-4 flex-shrink-0" />
                    {submitError}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 border border-gray-200 hover:bg-gray-50 text-gray-600 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-200"
                    style={{ fontWeight: 600 }}
                  >
                    <Send className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-800" style={{ fontWeight: 600 }}>My Requests</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{requests.length} total</span>
        </div>
        <div className="divide-y divide-gray-50">
          {requests.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileEdit className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No requests submitted yet</p>
            </div>
          ) : (
            requests.map((req) => {
              const s = statusConfig[req.status];
              return (
                <div key={req.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-gray-800 text-sm" style={{ fontWeight: 600 }}>
                          {typeLabels[req.type]}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${s.badge}`} style={{ fontWeight: 600 }}>
                          {s.icon} {s.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mb-1.5">
                        Date: <span style={{ fontWeight: 500 }} className="text-gray-700">
                          {new Date(req.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="mx-1.5 text-gray-300">·</span>
                        Submitted: <span style={{ fontWeight: 500 }} className="text-gray-700">
                          {new Date(req.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </p>
                      {(req.requestedTimeIn || req.requestedTimeOut) && (
                        <p className="text-gray-500 text-xs mb-1.5">
                          {req.requestedTimeIn && (
                            <span>
                              Requested In: <span style={{ fontWeight: 500 }} className="text-gray-700">{req.requestedTimeIn}</span>
                            </span>
                          )}
                          {req.requestedTimeIn && req.requestedTimeOut && (
                            <span className="mx-1.5 text-gray-300">·</span>
                          )}
                          {req.requestedTimeOut && (
                            <span>
                              Requested Out: <span style={{ fontWeight: 500 }} className="text-gray-700">{req.requestedTimeOut}</span>
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs line-clamp-2">{req.reason}</p>
                      {req.status === 'rejected' && (
                        <p className="text-red-500 text-xs mt-1.5" style={{ fontWeight: 500 }}>
                          ✕ Request was not approved. Please contact your coordinator.
                        </p>
                      )}
                      {req.status === 'approved' && (
                        <p className="text-emerald-600 text-xs mt-1.5" style={{ fontWeight: 500 }}>
                          ✓ Attendance record has been updated.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
