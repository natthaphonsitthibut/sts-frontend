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
import type {
  ClassroomStudentProblemCategory,
  ClassroomStudentProblemCategoryOption,
} from "../../school-structure/types/school-structure.types";

export type TeacherAccessCapability =
  | "SUBJECT_ATTENDANCE"
  | "TEACHER_OBSERVATION";
export type TeacherAccessGrantStatus =
  | "ACTIVE"
  | "REVOKED"
  | "EXPIRED"
  | "SUSPENDED";
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
  teacherId: string;
  teacherDisplayName: string;
  schoolId: number;
  schoolName: string;
  schoolTermId: string;
  academicYear: number;
  semester: number;
  status: TeacherAccessGrantStatus;
  capabilities: TeacherAccessCapability[];
  assignmentCount: number;
  stepUpPolicy: "NONE" | "EMAIL_OTP" | "ARAID";
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

/** One teacher row of the จัดการลิงก์เช็กชื่อ screen. */
/** VERIFIED_NOT_REACHABLE = ยืนยันแล้วแต่ลบ/บล็อก OA จึงส่งข้อความไม่ถึง */
export type TeacherLineStatus =
  | "NOT_VERIFIED"
  | "VERIFIED"
  | "VERIFIED_NOT_REACHABLE";

export type TeacherLineFilter = "VERIFIED" | "NOT_VERIFIED" | "REACHABLE";
export type TeacherLineInvitationStatus =
  | "NOT_ISSUED"
  | "ACTIVE"
  | "CONSUMED"
  | "EXPIRED"
  | "REVOKED";

export interface TeacherLinkRosterEntry {
  teacherMembershipId: string;
  teacherId: string;
  teacherDisplayName: string;
  photoUrl: string | null;
  hasEmail: boolean;
  assignmentCount: number;
  grantId: string | null;
  linkStatus: TeacherLinkStatus;
  canCopyLink: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lineStatus: TeacherLineStatus;
  lineInvitationId: string | null;
  lineInvitationStatus: TeacherLineInvitationStatus;
  lineInvitationExpiresAt: string | null;
}

export interface TeacherLineGroupInvitationSummary {
  id: string;
  schoolId: number;
  schoolName: string;
  url: string;
  startsAt: string;
  expiresAt: string;
  status: "PENDING" | "ACTIVE";
}

export type TeacherLineGroupInvitationIssueResult =
  TeacherLineGroupInvitationSummary;

export interface TeacherAccessContext {
  grantId: string;
  teacherDisplayName: string;
  teacherHasPhoto: boolean;
  schoolId: number;
  schoolName: string;
  schoolTermId: string;
  academicYear: number;
  semester: number;
  capabilities: TeacherAccessCapability[];
  accessScope: "FULL" | "ATTENDANCE_ONLY";
  /** The round's own date for an ATTENDANCE_ONLY delegation link — null for FULL access. */
  attendanceDate: string | null;
  problemCategories: ClassroomStudentProblemCategoryOption[];
  assignments: TeacherAccessAssignment[];
}

export interface TeacherAccessRosterStudent {
  studentUuid: string;
  /** Canonical UUID of this student_term enrollment snapshot. */
  studentTermId: string;
  /** School-owned roster number; null until the school imports one. */
  studentNumber: string | null;
  hasPhoto: boolean;
  firstName: string | null;
  lastName: string | null;
  studentStatusCode: number | null;
  studentStatusLabel: string | null;
  riskTier: string | null;
  /** Latest homeroom note about this student, shown as หมายเหตุ. */
  teacherComment: string | null;
}

/** One recorded attendance round, as shown in ประวัติการเช็กชื่อ. */
/** One day of the class the link opens, same shape the staff history returns. */
export interface TeacherAttendanceHistoryEntry {
  attendanceDate: string;
  recordedBy: string | null;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

/** The per-student view of the same history. */
export interface TeacherAttendanceHistoryStudent {
  studentUuid: string;
  studentNumber: string | null;
  hasPhoto: boolean;
  firstName: string | null;
  lastName: string | null;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
}

/** One student's days, opened from either view. */
export interface TeacherAttendanceHistoryStudentDay {
  id: string;
  date: string;
  time: string | null;
  recordedBy: string | null;
  status: string;
}

export interface TeacherAccessOtpChallenge {
  method: "EMAIL";
  maskedEmail: string;
  expiresAt: string;
}

export interface TeacherAccessAraIdChallenge {
  challengeToken: string;
  verificationUrl: string;
  qrDataUrl: string;
  referenceCode: string;
  expiresAt: string;
}

export type TeacherAccessAraIdChallengeStatus =
  | { status: "PENDING"; sessionToken?: never }
  | { status: "IN_PROGRESS"; expiresAt: string; sessionToken?: never }
  | { status: "APPROVED"; sessionToken: string };

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
  /** Comments written from the roster's comment button, same section, same list. */
  comments?: {
    id: string;
    problemCategory: ClassroomStudentProblemCategory;
    problemCategoryLabel: string;
    problemCategoryGuidance: string | null;
    problemDescription: string;
    authorName: string;
    createdAt: string;
  }[];
}

/** Round state plus the marks already stored, for prefill and submit locking. */
export interface TeacherAccessAttendanceSession {
  calendar: {
    calendarConfigured: boolean;
    canRecord: boolean;
    dayType: string | null;
  };
  expectedRosterCount: number;
  session: {
    id: string;
    status: "OPEN" | "SUBMITTED" | "REOPENED" | "VOIDED";
    revision: number;
    expectedRosterCount: number;
    recordedCount: number;
    submittedAt: string | null;
    correctionReason: string | null;
  } | null;
  marks: Array<{
    studentUuid: string;
    status: import("../../attendance/types/attendance.types").AttendanceSelectionStatus;
    markedAt: string | null;
  }>;
}

export interface TeacherAccessAttendanceCalendar {
  calendar: TeacherAccessAttendanceSession["calendar"];
}
