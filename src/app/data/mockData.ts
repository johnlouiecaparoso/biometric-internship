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
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export const attendanceHistory: AttendanceRecord[] = [
  { id: '1',  date: '2026-03-10', timeIn: '08:02', timeOut: null,  hoursRendered: 0,   status: 'present' },
  { id: '2',  date: '2026-03-09', timeIn: '08:45', timeOut: '17:30', hoursRendered: 8.75, status: 'late' },
  { id: '3',  date: '2026-03-08', timeIn: '07:58', timeOut: '17:05', hoursRendered: 9.1,  status: 'present' },
  { id: '4',  date: '2026-03-07', timeIn: '08:01', timeOut: '16:45', hoursRendered: 8.7,  status: 'undertime' },
  { id: '5',  date: '2026-03-06', timeIn: null,    timeOut: null,    hoursRendered: 0,    status: 'absent' },
  { id: '6',  date: '2026-03-05', timeIn: '08:00', timeOut: '17:00', hoursRendered: 9.0,  status: 'present' },
  { id: '7',  date: '2026-03-04', timeIn: '08:10', timeOut: '17:20', hoursRendered: 9.2,  status: 'present' },
  { id: '8',  date: '2026-03-03', timeIn: '09:05', timeOut: '17:00', hoursRendered: 7.9,  status: 'late' },
  { id: '9',  date: '2026-03-02', timeIn: '08:00', timeOut: '17:00', hoursRendered: 9.0,  status: 'present' },
  { id: '10', date: '2026-03-01', timeIn: '08:00', timeOut: '17:00', hoursRendered: 9.0,  status: 'present' },
  { id: '11', date: '2026-02-28', timeIn: '08:15', timeOut: '17:00', hoursRendered: 8.75, status: 'late' },
  { id: '12', date: '2026-02-27', timeIn: '08:00', timeOut: '17:00', hoursRendered: 9.0,  status: 'present' },
  { id: '13', date: '2026-02-26', timeIn: null,    timeOut: null,    hoursRendered: 0,    status: 'absent' },
  { id: '14', date: '2026-02-25', timeIn: '08:00', timeOut: '17:00', hoursRendered: 9.0,  status: 'present' },
  { id: '15', date: '2026-02-24', timeIn: '08:00', timeOut: '16:00', hoursRendered: 8.0,  status: 'undertime' },
];

export const internProfiles: InternProfile[] = [
  { id: '1', name: 'Juan dela Cruz',   studentId: '2021-00123', department: 'Information Technology', course: 'BSIT', requiredHours: 600, renderedHours: 342, status: 'active',    email: 'juan@university.edu.ph',    company: 'TechCorp Philippines', supervisor: 'Mr. Roberto Lim',  startDate: '2025-06-01', progress: 57,  presentToday: true  },
  { id: '2', name: 'Maria Santos',     studentId: '2021-00124', department: 'Computer Science',       course: 'BSCS', requiredHours: 600, renderedHours: 580, status: 'active',    email: 'maria@university.edu.ph',   company: 'DataSoft Inc.',        supervisor: 'Ms. Anna Cruz',    startDate: '2025-06-01', progress: 97,  presentToday: true  },
  { id: '3', name: 'Pedro Reyes',      studentId: '2021-00125', department: 'Business Admin',         course: 'BSBA', requiredHours: 400, renderedHours: 400, status: 'completed', email: 'pedro@university.edu.ph',   company: 'BizHub Corp.',         supervisor: 'Mr. Felix Santos', startDate: '2025-06-01', progress: 100, presentToday: false },
  { id: '4', name: 'Ana Garcia',       studentId: '2021-00126', department: 'Information Technology', course: 'BSIT', requiredHours: 600, renderedHours: 210, status: 'active',    email: 'ana@university.edu.ph',     company: 'WebDev Studio',        supervisor: 'Ms. Liza Tan',     startDate: '2025-07-01', progress: 35,  presentToday: true  },
  { id: '5', name: 'Carlos Mendoza',   studentId: '2021-00127', department: 'Accounting',             course: 'BSA',  requiredHours: 500, renderedHours: 500, status: 'completed', email: 'carlos@university.edu.ph',  company: 'AuditPro Firm',        supervisor: 'Mr. Jose Reyes',   startDate: '2025-06-01', progress: 100, presentToday: false },
  { id: '6', name: 'Sofia Lim',        studentId: '2021-00128', department: 'Computer Science',       course: 'BSCS', requiredHours: 600, renderedHours: 156, status: 'active',    email: 'sofia@university.edu.ph',   company: 'AI Solutions PH',      supervisor: 'Dr. Kevin Yu',     startDate: '2025-08-01', progress: 26,  presentToday: true  },
  { id: '7', name: 'Miguel Torres',    studentId: '2021-00129', department: 'Information Technology', course: 'BSIT', requiredHours: 600, renderedHours: 445, status: 'active',    email: 'miguel@university.edu.ph',  company: 'CloudTech Inc.',       supervisor: 'Mr. Dan Flores',   startDate: '2025-06-01', progress: 74,  presentToday: true  },
  { id: '8', name: 'Isabel Cruz',      studentId: '2021-00130', department: 'Business Admin',         course: 'BSBA', requiredHours: 400, renderedHours: 388, status: 'active',    email: 'isabel@university.edu.ph',  company: 'Marketing Hub',        supervisor: 'Ms. Ria Marcos',   startDate: '2025-07-01', progress: 97,  presentToday: false },
  { id: '9', name: 'Rico Bautista',    studentId: '2021-00131', department: 'Computer Engineering',   course: 'BSCpE',requiredHours: 600, renderedHours: 290, status: 'active',    email: 'rico@university.edu.ph',    company: 'EngiTech Corp.',       supervisor: 'Engr. Sam Aguilar',startDate: '2025-06-15', progress: 48,  presentToday: true  },
  { id: '10',name: 'Leah Villanueva',  studentId: '2021-00132', department: 'Information Technology', course: 'BSIT', requiredHours: 600, renderedHours: 12,  status: 'inactive',  email: 'leah@university.edu.ph',    company: 'StartupPH',            supervisor: 'Mr. Paul Gomez',   startDate: '2025-09-01', progress: 2,   presentToday: false },
];

export const correctionRequests: CorrectionRequest[] = [
  { id: '1', internId: '1', internName: 'Juan dela Cruz', type: 'missing-time-out', date: '2026-02-15', reason: 'Biometric device malfunction during time out. Verified by supervisor on duty.',                   status: 'approved', submittedAt: '2026-02-16T09:00:00' },
  { id: '2', internId: '1', internName: 'Juan dela Cruz', type: 'missing-time-in',  date: '2026-02-08', reason: 'Was working remotely with supervisor approval. Forgot to log in via web portal.',                  status: 'pending',  submittedAt: '2026-02-09T10:30:00' },
  { id: '3', internId: '1', internName: 'Juan dela Cruz', type: 'correction',        date: '2026-02-01', reason: 'Time recorded incorrectly due to system error. Actual time in was 08:00, system recorded 10:00.', status: 'rejected', submittedAt: '2026-02-02T08:00:00' },
];

export const weeklyAttendanceData = [
  { day: 'Mon', present: 7, late: 1, absent: 2 },
  { day: 'Tue', present: 8, late: 0, absent: 2 },
  { day: 'Wed', present: 6, late: 2, absent: 2 },
  { day: 'Thu', present: 8, late: 1, absent: 1 },
  { day: 'Fri', present: 7, late: 1, absent: 2 },
];

export const monthlyHoursData = [
  { month: 'Jun', hours: 45 },
  { month: 'Jul', hours: 52 },
  { month: 'Aug', hours: 48 },
  { month: 'Sep', hours: 55 },
  { month: 'Oct', hours: 60 },
  { month: 'Nov', hours: 50 },
  { month: 'Dec', hours: 35 },
  { month: 'Jan', hours: 58 },
  { month: 'Feb', hours: 54 },
  { month: 'Mar', hours: 42 },
];

export const departmentData = [
  { name: 'BSIT',   value: 4, color: '#3b82f6' },
  { name: 'BSCS',   value: 2, color: '#8b5cf6' },
  { name: 'BSBA',   value: 2, color: '#10b981' },
  { name: 'BSA',    value: 1, color: '#f59e0b' },
  { name: 'BSCpE',  value: 1, color: '#ef4444' },
];
