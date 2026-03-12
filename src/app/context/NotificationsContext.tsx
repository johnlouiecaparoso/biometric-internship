import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllCorrectionRequests, fetchCorrectionRequests, fetchTodayAttendance, fetchUserSettings } from '../lib/supabaseApi';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'request' | 'attendance' | 'info';
  read: boolean;
  timestamp: Date;
}

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAllRead: () => void;
  markRead: (id: string) => void;
  requestBrowserPermission: () => Promise<NotificationPermission>;
  browserPermission: NotificationPermission | 'unsupported';
  pushBrowser: (title: string, body: string) => void;
  updateBrowserEnabled: (enabled: boolean) => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  markRead: () => {},
  requestBrowserPermission: async () => 'default',
  browserPermission: 'default',
  pushBrowser: () => {},
  updateBrowserEnabled: () => {},
});

let _notifId = 0;
const nextId = () => String(++_notifId);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const browserEnabledRef = useRef(false);
  const seenRequestIds = useRef<Set<string>>(new Set());

  // Reload browser permission state when window gets focus (user may have changed it in browser settings)
  useEffect(() => {
    const sync = () => {
      if (typeof Notification !== 'undefined') setBrowserPermission(Notification.permission);
    };
    window.addEventListener('focus', sync);
    return () => window.removeEventListener('focus', sync);
  }, []);

  // Load notification preference from user settings
  useEffect(() => {
    if (!user) return;
    fetchUserSettings(user.id)
      .then((s) => { browserEnabledRef.current = !!(s?.notifications as any)?.browser; })
      .catch(() => {});
  }, [user]);

  const pushBrowser = useCallback((title: string, body: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!browserEnabledRef.current) return;
    try {
      new Notification(title, { body, icon: '/favicon.ico' });
    } catch {
      // some browsers block Notification outside secure contexts
    }
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'read'>) => {
    setNotifications(prev => [{ ...n, id: nextId(), read: false }, ...prev]);
    pushBrowser(n.title, n.body);
  }, [pushBrowser]);

  // ── Poll for new events every 60 s ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        if (user.role === 'admin') {
          // Pending correction requests
          const all = await fetchAllCorrectionRequests();
          const newPending = all.filter(r => r.status === 'pending' && !seenRequestIds.current.has(r.id));
          newPending.forEach(r => {
            seenRequestIds.current.add(r.id);
            addNotification({
              title: 'New Correction Request',
              body: `${r.internName} submitted a ${r.type.replace(/-/g, ' ')} request for ${r.date}.`,
              type: 'request',
              timestamp: new Date(r.submittedAt),
            });
          });
        } else {
          // Intern: check own request status changes
          const mine = await fetchCorrectionRequests(user.id);
          mine.forEach(r => {
            if (r.status === 'pending') return;
            const key = `req-${r.id}-${r.status}`;
            if (seenRequestIds.current.has(key)) return;
            seenRequestIds.current.add(key);
            addNotification({
              title: `Request ${r.status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}`,
              body: `Your ${r.type.replace(/-/g, ' ')} request for ${r.date} was ${r.status}.`,
              type: 'request',
              timestamp: new Date(),
            });
          });

          // Remind about time-in
          const record = await fetchTodayAttendance(user.id).catch(() => null);
          const hour = new Date().getHours();
          if (!record?.timeIn && hour >= 7 && hour < 10) {
            const key = `time-in-reminder-${new Date().toDateString()}`;
            if (!seenRequestIds.current.has(key)) {
              seenRequestIds.current.add(key);
              addNotification({
                title: 'Time In Reminder',
                body: 'You have not timed in yet today.',
                type: 'attendance',
                timestamp: new Date(),
              });
            }
          }
        }
      } catch {
        // silent — network may be unavailable
      }
    };

    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [user, addNotification]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'default';
    if (Notification.permission === 'granted') return 'granted';
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
    if (result === 'granted') browserEnabledRef.current = true;
    return result;
  }, []);

  const updateBrowserEnabled = useCallback((enabled: boolean) => {
    browserEnabledRef.current = enabled;
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationsContext.Provider value={{
      notifications,
      unreadCount,
      markAllRead,
      markRead,
      requestBrowserPermission,
      browserPermission,
      pushBrowser,
      updateBrowserEnabled,
    }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
