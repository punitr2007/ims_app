export interface Notice {
  id: string; // Synthetic 16-char SHA-256 hash
  title: string;
  publishedDate: string; // ISO format or DD-MM-YYYY format
  publisher: string;
  department: string;
  attachmentUrl: string | null;
  isExternalLink: boolean;
  isNew?: boolean;
  scrapedAt: string; // ISO date
}

export interface AttendanceSubject {
  subjectCode: string;
  subjectName: string;
  group?: string;
  credits?: string;
  totalHeld: number;
  attended: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger'; // safe >= 75%, warning 70-74%, danger < 70%
  bunkableClasses: number; // How many classes can be missed while staying >= 75%
  requiredClasses: number; // How many consecutive classes must be attended to reach 75%
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
  status?: 'AUTHENTICATED' | 'WRONG_CAPTCHA' | 'INVALID_CREDENTIALS' | 'NEED_MANUAL_CAPTCHA' | 'SERVER_ERROR';
  captchaBase64?: string;
  sessionToken?: string;
}

export interface CaptchaSessionState {
  phpsessid: string;
  hrandNum: string;
  captchaBase64: string;
  timestamp: number;
}
