export type UserRole = 'intern' | 'admin';

export interface User {
  id: string;
  name: string;
  studentId: string;
  role: UserRole;
  department: string;
  email: string;
  requiredHours: number;
  renderedHours: number;
  company: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  course: string;
  yearLevel: string;
  avatarUrl?: string | null;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  timeIn: string | null;
  timeOut: string | null;
  hoursRendered: number;
  status: 'present' | 'late' | 'absent' | 'undertime';
}

export interface InternProfile {
  id: string;
  name: string;
  studentId: string;
  department: string;
  course: string;
  requiredHours: number;
  renderedHours: number;
  status: 'active' | 'completed' | 'inactive';
  email: string;
  company: string;
  supervisor: string;
  startDate: string;
  progress: number;
  presentToday: boolean;
}

export interface CorrectionRequest {
  id: string;
  internId: string;
  internName: string;
  type: 'missing-time-in' | 'missing-time-out' | 'correction';
  date: string;
  reason: string;
  requestedTimeIn?: string | null;
  requestedTimeOut?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}
