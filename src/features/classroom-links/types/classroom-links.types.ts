export type ClassroomLinkStatus = "ACTIVE" | "INACTIVE" | "NOT_CREATED";
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
  classroomId: number;
  gradeLevelId: number;
  gradeLabel: string;
  roomNumber: string;
  roomName: string;
  homeroomTeacherName: string | null;
  lineDelivery: ClassroomLinkDelivery | null;
  status: ClassroomLinkStatus;
  issuedAt: string | null;
  rotatedAt: string | null;
  lastUsedAt: string | null;
  latestSession: {
    id: string;
    attendanceDate: string;
    status: string;
    submittedAt: string | null;
  } | null;
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
