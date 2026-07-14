export type TeacherAccessCapability = "HOMEROOM_ATTENDANCE" | "TEACHER_OBSERVATION";
export type TeacherAccessGrantStatus = "ACTIVE" | "REVOKED" | "EXPIRED" | "SUSPENDED";

export interface TeacherAccessAssignment {
  id: string;
  classroomId: string;
  gradeLevelId: number;
  gradeLabel: string;
  roomCode: string;
  roomName: string | null;
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
  firstName: string | null;
  lastName: string | null;
  studentStatusCode: number | null;
  studentStatusLabel: string | null;
}

export interface IssueTeacherAccessGrantInput {
  teacherMembershipId: number;
  schoolTermId: number;
  capabilities: TeacherAccessCapability[];
  assignmentIds: number[];
  expiresAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
