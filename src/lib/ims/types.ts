export interface Notice {
  id: string; // Synthetic 16-char SHA-256 hash
  title: string;
  publishedDate: string;
  publisher: string;
  department: string;
  attachmentUrl: string | null;
  isExternalLink: boolean;
  isNew?: boolean;
  scrapedAt: string;
}

export interface AttendanceSubject {
  subjectCode: string;
  subjectName: string;
  group?: string;
  credits?: string;
  totalHeld: number;
  attended: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  bunkableClasses: number;
  requiredClasses: number;
  /** Per-day attendance data: { "01-Aug-2025": "P", "02-Aug-2025": "A", ... } */
  dailyAttendance?: Record<string, string>;
}

export interface StudentProfile {
  name: string;
  rollNumber: string;
  program: string;
  semester: string;
  profileImage?: string;
}

export interface AttendanceResponse {
  success: boolean;
  profile?: StudentProfile;
  subjects?: AttendanceSubject[];
  overallPercentage?: number;
  totalHeld?: number;
  totalAttended?: number;
  lastUpdated?: string;
  error?: string;
  status?: 'AUTHENTICATED' | 'WRONG_CAPTCHA' | 'INVALID_CREDENTIALS' | 'NEED_MANUAL_CAPTCHA' | 'SERVER_ERROR' | 'RATE_LIMITED';
  captchaBase64?: string;
  sessionToken?: string;
}

export interface CaptchaSessionState {
  cookies: string[];
  hrandNum: string;
  encFy?: string;
  comp?: string;
  createdAt: number;
}
