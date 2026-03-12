import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { updateProfileInfo } from '../../lib/supabaseApi';
import { User, Mail, Building2, ShieldCheck, Lock, CheckCircle2, Pencil, Camera, X, Save } from 'lucide-react';

export function AdminProfile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({ name: user?.name ?? '', department: user?.department ?? '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);

  const [pwForm, setPwForm] = useState({ newPw: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  if (!user) return null;

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatarPreview(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await updateProfileInfo(user.id, {
        name: form.name,
        department: form.department,
        course: user.course,
        yearLevel: user.yearLevel,
      });
      if (avatarPreview) {
        localStorage.setItem(`admin_avatar_${user.id}`, avatarPreview);
      } else {
        localStorage.removeItem(`admin_avatar_${user.id}`);
      }
      updateUser({ name: form.name, department: form.department, avatarUrl: avatarPreview });
      setSaveMsg('success:Profile updated successfully!');
      setEditing(false);
    } catch (err: any) {
      setSaveMsg(`error:${err?.message ?? 'Failed to save profile.'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const handleCancelEdit = () => {
    setForm({ name: user.name, department: user.department });
    setAvatarPreview(user.avatarUrl ?? null);
    setEditing(false);
  };

  const handlePwChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPw !== pwForm.confirm) { setPwMsg('error:Passwords do not match.'); return; }
    if (pwForm.newPw.length < 6) { setPwMsg('error:Password must be at least 6 characters.'); return; }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setPwSaving(false);
    if (error) { setPwMsg(`error:${error.message}`); return; }
    setPwMsg('success:Password changed successfully!');
    setPwForm({ newPw: '', confirm: '' });
    setTimeout(() => setPwMsg(''), 3000);
  };

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: '1.375rem' }}>My Profile</h1>
          <p className="text-gray-500 text-sm">View and manage your admin account</p>
        </div>
        {!editing ? (
          <button
            onClick={() => { setForm({ name: user.name, department: user.department }); setEditing(true); }}
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
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0f2a4e] hover:bg-[#1a3f6f] disabled:opacity-60 text-white px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Changes'}
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

      {/* Profile Banner */}
      <div className="bg-gradient-to-r from-[#0f2a4e] to-[#1a4a80] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-5">
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
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </>
          )}
        </div>

        <div className="text-center sm:text-left">
          <h2 className="text-white" style={{ fontWeight: 700, fontSize: '1.25rem' }}>
            {editing ? form.name : user.name}
          </h2>
          <p className="text-blue-200 text-sm">{editing ? form.department || 'No Department' : user.department || 'No Department'}</p>
          <p className="text-blue-300 text-xs mt-1">Admin ID: {user.studentId}</p>
          <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
            <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-full border border-amber-500/30" style={{ fontWeight: 600 }}>
              Administrator
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Account Info */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-800 mb-4" style={{ fontWeight: 600 }}>Account Information</h3>
          <div className="space-y-3">

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

            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Email Address</p>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2 border-b border-gray-50">
              <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-400 text-xs">Admin ID</p>
                <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.studentId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 py-2">
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
                  <p className="text-gray-800 text-sm" style={{ fontWeight: 500 }}>{user.department || '—'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-gray-800" style={{ fontWeight: 600 }}>Change Password</h3>
          </div>
          <form onSubmit={handlePwChange} className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs mb-1 block">New Password</label>
              <input
                type="password"
                value={pwForm.newPw}
                onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                placeholder="Min. 6 characters"
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-gray-400 text-xs mb-1 block">Confirm New Password</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Repeat new password"
                className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            {pwMsg && (
              <div className={`p-2.5 rounded-lg flex items-center gap-2 text-xs ${pwMsg.startsWith('error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                {pwMsg.replace(/^(error|success):/, '')}
              </div>
            )}
            <button
              type="submit"
              disabled={pwSaving || !pwForm.newPw || !pwForm.confirm}
              className="w-full bg-[#0f2a4e] hover:bg-[#1a3f6f] disabled:opacity-50 text-white py-2 rounded-xl text-sm transition-colors"
              style={{ fontWeight: 600 }}
            >
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
