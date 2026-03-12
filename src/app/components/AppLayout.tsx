import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useDisplaySettings } from '../context/DisplaySettingsContext';
import {
  LayoutDashboard, Fingerprint, CalendarDays, FileEdit, BarChart3,
  User, Settings, LogOut, GraduationCap, Users, Menu, X, Bell, ChevronRight,
  CheckCircle2, Clock, AlertCircle
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const internNav: NavItem[] = [
  { label: 'Dashboard',  path: '/intern',            icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Attendance', path: '/intern/attendance',  icon: <Fingerprint className="w-5 h-5" /> },
  { label: 'History',    path: '/intern/history',     icon: <CalendarDays className="w-5 h-5" /> },
  { label: 'Requests',   path: '/intern/requests',    icon: <FileEdit className="w-5 h-5" /> },
  { label: 'Reports',    path: '/intern/reports',     icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Profile',    path: '/intern/profile',     icon: <User className="w-5 h-5" /> },
  { label: 'Settings',   path: '/intern/settings',    icon: <Settings className="w-5 h-5" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard',     path: '/admin',             icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Interns',       path: '/admin/interns',     icon: <Users className="w-5 h-5" /> },
  { label: 'Reports',       path: '/admin/reports',     icon: <BarChart3 className="w-5 h-5" /> },
  { label: 'Profile',       path: '/admin/profile',     icon: <User className="w-5 h-5" /> },
  { label: 'Settings',      path: '/admin/settings',    icon: <Settings className="w-5 h-5" /> },
];

interface AppLayoutProps {
  role: UserRole;
}

export function AppLayout({ role }: AppLayoutProps) {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const { formatShortTime: ctxShortTime } = useDisplaySettings();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const navItems = role === 'intern' ? internNav : adminNav;
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || (user && user.role !== role)) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, role, navigate, loading]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch { /* ensure navigation always happens */ }
    navigate('/login', { replace: true });
  };

  const formatTime = (d: Date) => ctxShortTime(d);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'U';

  if (loading || !isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-40 w-[240px] bg-[#0f2a4e] flex flex-col
          transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:z-auto lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 700 }}>UniTrack IMS</p>
              <p className="text-blue-300 text-xs capitalize">{role} Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>{initials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm truncate" style={{ fontWeight: 500 }}>{user?.name}</p>
              <p className="text-blue-300 text-xs truncate">{user?.role === 'admin' ? `Admin ID: ${user?.studentId}` : `Student ID: ${user?.studentId}`}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/intern' || item.path === '/admin'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-200 hover:bg-red-500/20 hover:text-red-300 transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span style={{ fontWeight: 500 }}>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Time display */}
          <div className="hidden sm:flex items-center gap-1.5 text-gray-500 text-sm bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <span style={{ fontWeight: 500 }} className="text-gray-800">{formatTime(time)}</span>
            <span className="text-gray-400">·</span>
            <span>{formatDate(time)}</span>
          </div>

          {/* Notification */}
          <div className="relative" ref={notifRef}>
            <button
              title="Notifications"
              className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              onClick={() => {
                setNotifOpen(v => !v);
                if (!notifOpen) markAllRead();
              }}
            >
              <Bell className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 text-sm">Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => markAllRead()}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 text-sm">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                        onClick={() => markRead(n.id)}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {n.type === 'request' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                          {n.type === 'attendance' && <Clock className="w-4 h-4 text-amber-500" />}
                          {n.type === 'info' && <AlertCircle className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {new Date(n.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>{initials}</span>
              )}
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
