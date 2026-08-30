export type ClassroomLinkStatus = "ACTIVE" | "INACTIVE" | "NOT_CREATED";
export type ClassroomLinkSessionStatus =
  | "OPEN"
  | "SUBMITTED"
  | "REOPENED"
  | "VOIDED";
export type ClassroomLinkDeliveryStatus =
  | "NOT_READY"
  | "SENDING"
  | "SENT"
  | "FAILED"
  | "NEEDS_RESEND";

export type ClassroomLinkDeliveryFailureCode =
  | "HOMEROOM_UNAVAILABLE"
  | "MESSAGING_DISABLED"
  | "ACCOUNT_NOT_VERIFIED"
  | "ACCOUNT_NOT_REACHABLE"
  | "PROVIDER_REJECTED"
  | "PROVIDER_UNAVAILABLE";

export interface ClassroomLinkDelivery {
  status: ClassroomLinkDeliveryStatus;
  failureCode: ClassroomLinkDeliveryFailureCode | null;
  recipientTeacherMembershipId: string | null;
  recipientTeacherName: string | null;
  accountState:
    | "NOT_VERIFIED"
    | "FRIEND"
    | "NOT_FRIEND"
    | "BLOCKED"
    | "UNKNOWN";
  attemptCount: number;
  lastAttemptedAt: string | null;
  deliveredAt: string | null;
  canRetry: boolean;
}

export interface ClassroomLinkListItem {
  id: string | null;
  schoolId: number;
  schoolName: string;
  schoolTermId: number;
  academicYear: number;
  semester: number;
  /** Null on an assignment: it belongs to a classroom, not to a teacher. */
  teacherMembershipId: number | null;
  teacherId: string | null;
  teacherName: string | null;
  assignedClassroomId: number | null;
  assignedClassroomSubjectId: number | null;
  assignedClassroomLabel: string | null;
  assignedSubjectName: string | null;
  opensAt: string | null;
  expiresAt: string | null;
  assignmentNote: string | null;
  /** Guarded app route; production redirects to a short-lived signed URL. */
  teacherPhotoUrl: string | null;
  /** The rooms this teacher's subjects reach — what the link opens onto. */
  classroomCount: number;
  classrooms: Array<{ classroomId: string; label: string }>;
  lineDelivery: ClassroomLinkDelivery | null;
  status: ClassroomLinkStatus;
  issuedAt: string | null;
  rotatedAt: string | null;
  lastUsedAt: string | null;
}

export interface ClassroomLinkListParams {
  schoolId: number;
  schoolTermId: number;
  search?: string;
  gradeLevelId?: number;
  linkStatus?: ClassroomLinkStatus;
  homeroomStatus?: "ASSIGNED" | "UNASSIGNED";
  page: number;
  limit: number;
}

export interface ClassroomLinkListResponse {
  success: true;
  data: ClassroomLinkListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ClassroomLinkActionResult {
  id: string;
  accessUrl: string;
  lineDelivery?: ClassroomLinkDelivery | null;
}

export interface BulkCreateClassroomLinksResult {
  success: true;
  data: Array<
    Omit<ClassroomLinkActionResult, "accessUrl"> & {
      accessUrl?: string;
      created: boolean;
    }
  >;
}

export interface ClassroomLineGroupInvitation {
  id: string;
  schoolId: number;
  schoolName: string;
  url: string;
  startsAt: string;
  expiresAt: string;
  status: "PENDING" | "ACTIVE";
}

export interface ClassroomLineGroupInvitationInput {
  schoolId: number;
  startsAt: string;
  expiresAt: string;
}

export interface AttendanceAssignmentPayload {
  schoolId: number;
  schoolTermId: number;
  classroomId: number;
  /** An assignment covers one lesson, not the whole room. */
  classroomSubjectId: number;
  /** Omitted means it works from now. */
  opensAt?: string;
  expiresAt: string;
  note?: string;
}

/** What a teacher hands on from inside their own link. */
export interface LinkAttendanceAssignmentPayload {
  classroomSubjectId: number;
  opensAt?: string;
  expiresAt: string;
}

/** One row of the register of links a school has issued this term. */
export interface IssuedClassroomLink {
  id: string;
  kind: "TEACHER" | "ASSIGNMENT";
  linkStatus: string;
  issuedAt: string;
  lastUsedAt: string | null;
  opensAt: string | null;
  expiresAt: string | null;
  teacherName: string | null;
  classroomLabel: string | null;
  subjectName: string | null;
  openCount: number;
  sessionCount: number;
}

/**
 * One assignment the person looking issued, for the tab inside check-in.
 *
 * Both doors return this shape — the admin screen reading its account's links
 * and a teacher reading their own — so the panel does not branch on which one
 * it is showing.
 */
export interface MyAssignmentLink {
  id: string;
  linkStatus: "ACTIVE" | "INACTIVE";
  issuedAt: string;
  opensAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  classroomId: number;
  classroomLabel: string;
  classroomSubjectId: number;
  subjectName: string;
  subjectCode: string;
  openCount: number;
  sessionCount: number;
}

export interface MyAssignmentLinkParams {
  schoolTermId: number;
  /** Left off to ask for every lesson this term instead of just this one. */
  classroomSubjectId?: number;
}

export interface IssuedClassroomLinkParams {
  schoolId: number;
  schoolTermId: number;
  kind?: "TEACHER" | "ASSIGNMENT";
  search?: string;
  page: number;
  limit: number;
}

/** Someone opening a link, and proving who they were on the way in. */
export interface ClassroomLinkOpen {
  openedAt: string;
  teacherName: string;
  authMethod: string | null;
}

/** One register taken through a link. */
export interface ClassroomLinkSession {
  id: string;
  attendanceDate: string;
  startedAt: string;
  submittedAt: string | null;
  status: string;
  classroomLabel: string;
  subjectName: string;
  startedByName: string | null;
  submittedByName: string | null;
  expectedRosterCount: number;
  exceptionCount: number;
}

export interface ClassroomLinkUsage {
  opens: ClassroomLinkOpen[];
  sessions: ClassroomLinkSession[];
}
