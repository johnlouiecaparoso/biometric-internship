import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { AppLayout } from './components/AppLayout';
import { InternDashboard } from './components/intern/InternDashboard';
import { InternAttendance } from './components/intern/InternAttendance';
import { InternHistory } from './components/intern/InternHistory';
import { InternRequests } from './components/intern/InternRequests';
import { InternReports } from './components/intern/InternReports';
import { InternProfile } from './components/intern/InternProfile';
import { InternSettings } from './components/intern/InternSettings';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminInterns } from './components/admin/AdminInterns';
import { AdminReports } from './components/admin/AdminReports';
import { AdminSettings } from './components/admin/AdminSettings';
import { AdminProfile } from './components/admin/AdminProfile';
import { AdminAuditLogs } from './components/admin/AdminAuditLogs';

function InternLayout() {
  return <AppLayout role="intern" />;
}

function AdminLayout() {
  return <AppLayout role="admin" />;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', Component: LoginPage },
  { path: '/register', Component: RegisterPage },
  {
    path: '/intern',
    Component: InternLayout,
    children: [
      { index: true, Component: InternDashboard },
      { path: 'attendance', Component: InternAttendance },
      { path: 'history', Component: InternHistory },
      { path: 'requests', Component: InternRequests },
      { path: 'reports', Component: InternReports },
      { path: 'profile', Component: InternProfile },
      { path: 'settings', Component: InternSettings },
    ],
  },
  {
    path: '/admin',
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: 'interns', Component: AdminInterns },
      { path: 'reports', Component: AdminReports },
      { path: 'settings', Component: AdminSettings },
      { path: 'profile', Component: AdminProfile },
      { path: 'audit-logs', Component: AdminAuditLogs },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
