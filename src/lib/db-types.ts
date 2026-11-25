export type Role =
  | "PSYCHOLOGIST"
  | "SUPER_ADMIN"
  | "SECRETARY"
  | "ADMIN"
  | "INSTRUCTOR"
  | "STUDENT";

export type EnrollmentRole = "STUDENT" | "TA";
export type ContentType = "PAGE" | "LINK" | "FILE";
export type LiveSessionStatus = "SCHEDULED" | "LIVE" | "ENDED";
export type RecordingStatus = "PROCESSING" | "READY" | "FAILED";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type SchoolLevel = "INITIAL" | "PRIMARY" | "SECONDARY";
export type PsychologyCategory = "LEARNING" | "COEXISTENCE" | "EMOTIONAL" | "FAMILY" | "OTHER";
export type PsychologyCaseStatus = "OPEN" | "FOLLOW_UP" | "CLOSED";
export type PsychologyAppointmentStatus = "SCHEDULED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  isActive: boolean;
  passwordHash: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface Session {
  id: string;
  sessionToken: string;
  userId: string;
  expires: Date;
}

export interface VerificationToken {
  identifier: string;
  token: string;
  expires: Date;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  term: string;
  instructorId: string;
  sectionId: string | null;
  academicPeriodId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  role: EnrollmentRole;
  createdAt: Date;
}

export interface Announcement {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItem {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  type: ContentType;
  body: string | null;
  url: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueAt: Date | null;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  text: string | null;
  fileUrl: string | null;
  submittedAt: Date;
  grade: number | null;
  feedback: string | null;
  gradedAt: Date | null;
}

export interface LiveSession {
  id: string;
  courseId: string;
  title: string;
  roomName: string;
  status: LiveSessionStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  createdById: string;
  createdAt: Date;
}

export interface Recording {
  id: string;
  liveSessionId: string;
  egressId: string;
  url: string | null;
  status: RecordingStatus;
  startedAt: Date;
  endedAt: Date | null;
}

export interface Attendance {
  id: string;
  courseId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  note: string;
  recordedById: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicYear {
  id: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
  isClosed: boolean;
}

export interface AcademicPeriod {
  id: string;
  yearId: string;
  name: string;
  startsOn: Date;
  endsOn: Date;
}

export interface SchoolGrade {
  id: string;
  level: SchoolLevel;
  name: string;
  position: number;
}

export interface SchoolSection {
  id: string;
  yearId: string;
  gradeId: string;
  name: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  documentNumber: string;
  studentCode: string;
  schoolSectionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentGuardian {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  position: number;
  createdAt: Date;
}

export interface GradingScale {
  id: string;
  yearId: string;
  level: SchoolLevel;
  config: unknown;
  version: number;
}

export interface PeriodGrade {
  id: string;
  courseId: string;
  periodId: string;
  studentId: string;
  value: string;
  scaleSnapshot: unknown;
  comment: string;
  recordedById: string;
  version: number;
  updatedAt: Date;
}

export interface PsychologyCase {
  id: string;
  studentId: string;
  psychologistId: string;
  openedById: string;
  category: PsychologyCategory;
  status: PsychologyCaseStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PsychologyNote {
  id: string;
  caseId: string;
  authorId: string;
  attendedOn: Date;
  body: string;
  createdAt: Date;
}

export interface PsychologyAppointment {
  id: string;
  caseId: string;
  startsAt: Date;
  endsAt: Date;
  status: PsychologyAppointmentStatus;
  version: number;
}

export interface PsychologyMaterial {
  id: string;
  title: string;
  url: string;
  createdById: string;
  createdAt: Date;
}
