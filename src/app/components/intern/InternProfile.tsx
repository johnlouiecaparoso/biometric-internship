import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { updateProfileInfo, updateOjtDetails } from '../../lib/supabaseApi';
import { User, Mail, Building2, Calendar, GraduationCap, CheckCircle2, Pencil, Camera, X, Save } from 'lucide-react';

export function InternProfile() {
  const { user, updateUser } = useAuth();

  // Editable personal info state
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({
    name: user?.name ?? '',
    course: user?.course ?? '',
    yearLevel: user?.yearLevel ?? '',
    department: user?.department ?? '',
  });

  // OJT Details edit state
  const [ojtEditing, setOjtEditing] = useState(false);
  const [ojtSaving, setOjtSaving] = useState(false);
  const [ojtSaveMsg, setOjtSaveMsg] = useState('');
  const [ojtForm, setOjtForm] = useState({
    company: '',
    supervisor: '',
    requiredHours: 0,
    renderedHours: 0,
    startDate: '',
    endDate: '',
  });

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);

  if (!user) return null;

  const pct = user.requiredHours > 0 ? Math.round((user.renderedHours / user.requiredHours) * 100) : 0;
  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Resize via canvas to keep it small (max 256px)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setAvatarPreview(dataUrl);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 15000)
      );
      await Promise.race([updateProfileInfo(user.id, form), timeout]);
      // Persist avatar to localStorage
      if (avatarPreview) {
        localStorage.setItem(`intern_avatar_${user.id}`, avatarPreview);
      } else {
        localStorage.removeItem(`intern_avatar_${user.id}`);
      }
      updateUser({ ...form, avatarUrl: avatarPreview });
      setSaveMsg('success:Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      setSaveMsg(`error:${err.message ?? 'Failed to save profile.'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleCancelEdit = () => {
    setForm({
      name: user.name,
      course: user.course,
      yearLevel: user.yearLevel,
      department: user.department,
    });
    setAvatarPreview(user.avatarUrl ?? null);
    setEditing(false);
  };

  const handleSaveOjt = async () => {
    setOjtSaving(true);
    setOjtSaveMsg('');
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please check your internet connection.')), 15000)
      );
      await Promise.race([updateOjtDetails(user.id, ojtForm), timeout]);
      updateUser({
        company: ojtForm.company,
        supervisor: ojtForm.supervisor,
        requiredHours: ojtForm.requiredHours,
        renderedHours: ojtForm.renderedHours,
        startDate: ojtForm.startDate,
        endDate: ojtForm.endDate,
      });
      setOjtSaveMsg('success:OJT details updated successfully!');
      setOjtEditing(false);
    } catch (err: any) {
      setOjtSaveMsg(`error:${err.message ?? 'Failed to save OJT details.'}`);
    } finally {
      setOjtSaving(false);
      setTimeout(() => setOjtSaveMsg(''), 3000);
    }
  };

  const handleCancelOjtEdit = () => {
    setOjtForm({
      company: user.company,
      supervisor: user.supervisor,
      requiredHours: user.requiredHours,
      renderedHours: user.renderedHours,
      startDate: user.startDate,
      endDate: user.endDate,
    });
    setOjtEditing(false);
  };

  const displayName  = editing ? form.name       : user.name;
  const displayCourse = editing ? form.course     : user.course;
  const displayYear  = editing ? form.yearLevel   : user.yearLevel;
  const displayDept  = editing ? form.department  : user.department;



  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>My Profile</h1>
          <p className="text-gray-500 text-sm">View and manage your intern profile</p>
        </div>
        {!editing ? (
          <button
            onClick={() => {
              setForm({
                name: user.name,
                course: user.course,
                yearLevel: user.yearLevel,
                department: user.department,
              });
              setEditing(true);
            }}
            className="flex items-center gap-2 bg-[#0f2a4e] hover:bg-[#1a3f6f] text-white px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancelEdit}
              className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ fontWeight: 500 }}
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f2a4e] hover:bg-[#1a3f6f] disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {saveMsg && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${saveMsg.startsWith('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {saveMsg.replace(/^(error|success):/, '')}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-[#0f2a4e] to-[#1a4a80] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-blue-500 flex items-center justify-center">
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white" style={{ fontWeight: 700, fontSize: '1.75rem' }}>{initials}</span>
            )}
          </div>
          {editing && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-500 hover:bg-blue-400 rounded-full flex items-center justify-center shadow-md transition-colors"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              {avatarPreview && (
                <button
                  onClick={() => setAvatarPreview(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Remove photo"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-white" style={{ fontWeight: 700, fontSize: '1.25rem' }}>{displayName}</h2>
          <p className="text-blue-200 text-sm">{displayCourse} · {displayYear}</p>
          <p className="text-blue-300 text-xs mt-1">{user.studentId} · {displayDept}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30" style={{ fontWeight: 600 }}>
              Active Intern
            </span>
          </div>
        </div>
        <div className="sm:ml-auto text-center sm:text-right">
          <p className="text-blue-200 text-xs mb-1">Internship Progress</p>
          <p className="text-white" style={{ fontWeight: 700, fontSize: '2rem' }}>{pct}%</p>
          <p className="text-blue-200 text-xs">{user.renderedHours.toFixed(2)}/{user.requiredHours.toFixed(2)} hrs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Personal Information</h3>
          <div className="space-y-3">

            {/* Full Name */}
            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Full Name</p>
                {editing ? (
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 mt-0.5"
                  />
                ) : (
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.name}</p>
                )}
              </div>
            </div>

            {/* Email – read-only */}
            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Email Address</p>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.email}</p>
              </div>
            </div>

            {/* Student ID – read-only */}
            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Student ID</p>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.studentId}</p>
              </div>
            </div>

            {/* Course */}
            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Course</p>
                {editing ? (
                  <input
                    value={form.course}
                    onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 mt-0.5"
                  />
                ) : (
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.course}</p>
                )}
              </div>
            </div>

            {/* Department */}
            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Department</p>
                {editing ? (
                  <input
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 mt-0.5"
                  />
                ) : (
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.department}</p>
                )}
              </div>
            </div>

            {/* Year Level */}
            <div className="flex items-start gap-3 py-2">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Year Level</p>
                {editing ? (
                  <input
                    value={form.yearLevel}
                    onChange={e => setForm(f => ({ ...f, yearLevel: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-2.5 py-1 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 mt-0.5"
                  />
                ) : (
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.yearLevel}</p>
                )}
              </div>
            </div>

          </div>
        </div>

        <div className="space-y-4">
          {/* OJT Details */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-800" style={{ fontWeight: 600 }}>OJT Details</h3>
              {!ojtEditing ? (
                <button
                  onClick={() => {
                    setOjtForm({
                      company: user.company,
                      supervisor: user.supervisor,
                      requiredHours: user.requiredHours,
                      renderedHours: user.renderedHours,
                      startDate: user.startDate,
                      endDate: user.endDate,
                    });
                    setOjtEditing(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#0f2a4e] hover:text-[#1a3f6f] border border-[#0f2a4e]/20 hover:border-[#0f2a4e]/40 px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={handleCancelOjtEdit}
                    className="flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                  <button
                    onClick={handleSaveOjt}
                    disabled={ojtSaving}
                    className="flex items-center gap-1 text-xs text-white bg-[#0f2a4e] hover:bg-[#1a3f6f] disabled:opacity-60 px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{ fontWeight: 500 }}
                  >
                    <Save className="w-3 h-3" /> {ojtSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            {ojtSaveMsg && (
              <div className={`mb-3 p-2.5 rounded-xl flex items-center gap-2 text-xs ${ojtSaveMsg.startsWith('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                {ojtSaveMsg.replace(/^(error|success):/, '')}
              </div>
            )}
            <div className="space-y-2.5">
              {/* Company */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Company</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="Company"
                    value={ojtForm.company}
                    onChange={e => setOjtForm(f => ({ ...f, company: e.target.value }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 text-right w-40"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.company || '—'}</span>
                )}
              </div>
              {/* Supervisor */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Supervisor</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="Supervisor"
                    value={ojtForm.supervisor}
                    onChange={e => setOjtForm(f => ({ ...f, supervisor: e.target.value }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 text-right w-40"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.supervisor || '—'}</span>
                )}
              </div>
              {/* Required Hours */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Required Hours</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="Required Hours"
                    type="number"
                    min="0"
                    value={ojtForm.requiredHours}
                    onChange={e => setOjtForm(f => ({ ...f, requiredHours: Number(e.target.value) }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 text-right w-24"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.requiredHours} hours</span>
                )}
              </div>
              {/* Hours Rendered */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Hours Rendered</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="Hours Rendered"
                    type="number"
                    min="0"
                    step="0.01"
                    value={ojtForm.renderedHours}
                    onChange={e => setOjtForm(f => ({ ...f, renderedHours: Number(e.target.value) }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 text-right w-24"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.renderedHours.toFixed(2)} hours</span>
                )}
              </div>
              {/* Remaining Hours (derived, always read-only) */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Remaining Hours</span>
                </div>
                <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>
                  {Math.max(0, ojtEditing ? ojtForm.requiredHours - ojtForm.renderedHours : user.requiredHours - user.renderedHours).toFixed(2)} hours
                </span>
              </div>
              {/* Start Date */}
              <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">Start Date</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="Start Date"
                    type="date"
                    value={ojtForm.startDate}
                    onChange={e => setOjtForm(f => ({ ...f, startDate: e.target.value }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.startDate || '—'}</span>
                )}
              </div>
              {/* End Date */}
              <div className="flex items-center justify-between gap-2 py-1.5">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">End Date</span>
                </div>
                {ojtEditing ? (
                  <input
                    aria-label="End Date"
                    type="date"
                    value={ojtForm.endDate}
                    onChange={e => setOjtForm(f => ({ ...f, endDate: e.target.value }))}
                    className="border border-gray-200 bg-gray-50 rounded-lg px-2 py-0.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                  />
                ) : (
                  <span className="text-gray-800 text-xs text-right" style={{ fontWeight: 500 }}>{user.endDate || '—'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-gray-800 mb-3" style={{ fontWeight: 600 }}>Hours Progress</h3>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{user.renderedHours.toFixed(2)} hrs rendered</span>
              <span>{Math.max(0, user.requiredHours - user.renderedHours).toFixed(2)} hrs remaining</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
