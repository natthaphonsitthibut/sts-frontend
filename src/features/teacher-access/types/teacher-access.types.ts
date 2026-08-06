import type { StudentObservation } from "../../student-observations/types/student-observation.types";
import type {
  SchoolPeriodTime,
  TimetableSlot,
} from "../../timetable/types/timetable.types";
import type {
  StudentCase,
  StudentDetail,
  StudentProfileSummary,
} from "../../students/types/students.types";

export type TeacherAccessCapability =
  | "HOMEROOM_ATTENDANCE"
  | "SUBJECT_ATTENDANCE"
  | "TEACHER_OBSERVATION";
export type TeacherAccessGrantStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "SUSPENDED";
/** Roster rows also cover teachers who have no link yet. */
export type TeacherLinkStatus = TeacherAccessGrantStatus | "NOT_CREATED";

export interface TeacherAccessAssignment {
  id: string;
  classroomId: string;
  gradeLevelId: number;
  gradeLabel: string;
  roomCode: string;
  roomName: string | null;
  cardCoverColor: string;
  hasCoverImage: boolean;
  coverImagePositionX: number;
  coverImagePositionY: number;
  coverImageScale: number;
  assignmentKind: "HOMEROOM" | "SUBJECT";
  subjectId: number | null;
  subjectCode: string | null;
  subjectName: string | null;
  effectiveOn: string | null;
  effectiveUntil: string | null;
  allowedActions: TeacherAccessCapability[];
}

export interface TeacherAccessGrant {
  id: string;
  teacherMembershipId: string;
  teacherUserId: number;
  teacherUsername: string;
  teacherDisplayName: string;
  schoolId: number;
  schoolName: string;
  schoolTermId: string;
  academicYear: number;
  semester: number;
  status: TeacherAccessGrantStatus;
  capabilities: TeacherAccessCapability[];
  assignmentCount: number;
  stepUpPolicy: "NONE" | "EMAIL_OTP" | "THAID";
  issuerName: string;
  issuedAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  rotatedAt: string | null;
  rotationCount: number;
  assignments?: TeacherAccessAssignment[];
  accessUrl?: string;
}

/** One teacher row of the จัดการลิงก์เช็คชื่อ screen. */
/** VERIFIED_NOT_REACHABLE = ยืนยันแล้วแต่ลบ/บล็อก OA จึงส่งข้อความไม่ถึง */
export type TeacherLineStatus = "NOT_VERIFIED" | "VERIFIED" | "VERIFIED_NOT_REACHABLE";

export type TeacherLineFilter = "VERIFIED" | "NOT_VERIFIED" | "REACHABLE";

export interface TeacherLinkRosterEntry {
  teacherMembershipId: string;
  teacherId: string;
  teacherDisplayName: string;
  hasEmail: boolean;
  assignmentCount: number;
  grantId: string | null;
  linkStatus: TeacherLinkStatus;
  canCopyLink: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lineStatus: TeacherLineStatus;
}

export interface TeacherAccessContext {
  grantId: string;
  teacherDisplayName: string;
  schoolId: number;
  schoolName: string;
  schoolTermId: string;
  academicYear: number;
  semester: number;
  capabilities: TeacherAccessCapability[];
  assignments: TeacherAccessAssignment[];
}

export interface TeacherAccessRosterStudent {
  studentUuid: string;
  /** Canonical UUID of this student_term enrollment snapshot. */
  studentTermId: string;
  /** School-owned roster number; null until the school imports one. */
  studentNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  studentStatusCode: number | null;
  studentStatusLabel: string | null;
  riskTier: string | null;
  /** Latest homeroom note about this student, shown as หมายเหตุ. */
  teacherComment: string | null;
}

/** One recorded attendance round, as shown in ประวัติการเช็คชื่อ. */
export interface TeacherAttendanceHistoryEntry {
  sessionId: string;
  attendanceDate: string;
  period: number;
  status: string;
  recordedBy: string | null;
  submittedAt: string | null;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

export interface TeacherAccessOtpChallenge {
  method: "EMAIL";
  maskedEmail: string;
  expiresAt: string;
}

export interface IssueTeacherAccessGrantInput {
  teacherMembershipId: number;
  schoolTermId: number;
  expiresAt?: string;
}

/** Omit `teacherMembershipIds` to issue for every teacher of the term that still needs a link. */
export interface IssueTeacherAccessGrantsForTermInput {
  schoolTermId: number;
  teacherMembershipIds?: number[];
}

export interface SendTeacherAccessGrantsInput {
  schoolTermId: number;
  deliveryRequestId: string;
  teacherMembershipIds?: number[];
}

export interface SendTeacherAccessGrantsResult {
  sent: number;
  skipped: Array<{ teacherMembershipId: number; reason: string }>;
}

export interface BulkIssueTeacherAccessResult {
  issued: number;
  skipped: Array<{ teacherMembershipId: number; reason: string }>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

/** ตารางสอนของฉัน through a link: the teacher's own periods plus the bell schedule. */
export interface TeacherScheduleResponse {
  slots: TimetableSlot[];
  periodTimes: SchoolPeriodTime[];
}

export interface TeacherAccessAttendanceSlot {
  id: number;
  period: number;
}

/** Everything the teacher-link student profile screen renders, in one payload. */
export interface TeacherStudentProfile {
  student: StudentDetail;
  summary: StudentProfileSummary;
  cases: StudentCase[];
  attendance: unknown;
  observations: { data: StudentObservation[] };
}
