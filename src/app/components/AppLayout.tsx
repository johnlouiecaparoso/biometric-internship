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

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
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
  const [sidebarOpen, setSidebarOpen] = useState(true); // Always open on desktop
  const [notifOpen, setNotifOpen] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
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

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || ((window.navigator as any).standalone === true);
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch { /* ensure navigation always happens */ }
    navigate('/login', { replace: true });
  };

  const handleInstallApp = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
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
          fixed top-0 left-0 h-full z-40 w-[240px] bg-[#112D4E] flex flex-col
          transition-transform duration-300 ease-in-out
          lg:fixed lg:translate-x-0 lg:z-40 lg:flex-shrink-0 lg:top-0 lg:h-full
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo and System Name */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#3F72AF] rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">InternTrack</p>
              <p className="text-[#DBE2EF] text-xs">Biometric Internship Attendance System</p>
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
                    ? 'bg-[#3F72AF] text-white shadow-lg'
                    : 'text-[#DBE2EF] hover:bg-[#F9F7F7]/20 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#6AC1B8]/20">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#DBE2EF] hover:bg-red-500/20 hover:text-red-300 transition-all text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 lg:ml-60`}>
        {/* Top Header */}
        <header className="h-14 bg-gradient-to-r from-[#3F72AF] to-[#112D4E] border-b border-[#DBE2EF]/30 flex items-center gap-3 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            title="Open menu"
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/20 text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* Time display */}
          <div className="hidden sm:flex items-center gap-1.5 text-sm bg-white/20 dark:bg-slate-700/50 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/30 dark:border-slate-600">
            <span className="text-white font-medium">{formatTime(time)}</span>
            <span className="text-[#DBE2EF] dark:text-slate-400">·</span>
            <span className="text-white">{formatDate(time)}</span>
          </div>

          {/* Notification */}
          <div className="relative" ref={notifRef}>
            <button
              title="Notifications"
              className="relative p-2 rounded-lg hover:bg-white/20 text-white"
              onClick={() => {
                setNotifOpen(v => !v);
                if (!notifOpen) markAllRead();
              }}
            >
              <Bell className="w-4.5 h-4.5" style={{ width: '18px', height: '18px' }} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#3F72AF] rounded-full flex items-center justify-center text-white text-[10px] font-bold px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-xl border border-[#DBE2EF]/30 dark:border-slate-600 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DBE2EF]/30 dark:border-slate-600 flex items-center justify-between">
                  <span className="font-semibold text-[#112D4E] dark:text-white text-sm">Notifications</span>
                  {notifications.length > 0 && (
                    <button
                      className="text-xs text-[#3F72AF] hover:text-[#112D4E] dark:text-slate-400 dark:hover:text-white"
                      onClick={() => markAllRead()}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[#DBE2EF]/60 dark:text-slate-400 text-sm">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 flex gap-3 items-start cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                        onClick={() => markRead(n.id)}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {n.type === 'request' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                          {n.type === 'attendance' && <Clock className="w-4 h-4 text-amber-500" />}
                          {n.type === 'info' && <AlertCircle className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{n.title}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                          <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">
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

          {!isStandalone && deferredInstallPrompt && (
            <button
              onClick={handleInstallApp}
              className="sm:hidden mr-2 px-2.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-white text-xs border border-white/30 dark:border-slate-600 font-semibold"
            >
              Install App
            </button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
