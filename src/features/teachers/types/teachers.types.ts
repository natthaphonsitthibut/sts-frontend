import type { PaginatedSearchQuery } from "../../../lib/pagination";

export type TeacherStatus = "ACTIVE" | "INACTIVE";

/** Contact-safe fields shared by the read-only directory and management list. */
export interface TeacherDirectoryItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  citizenId: string | null;
  maskedFields: string[];
  phone: string | null;
  email: string | null;
  lineId: string | null;
  /** App-served photo URL; the backend redirects to a short-lived signed URL. */
  photoUrl: string | null;
  teacherStatus: TeacherStatus;
  schoolId: number;
  membershipStatus: TeacherStatus;
}

/** One row of จัดการข้อมูลครู — includes fields used only by management. */
export interface Teacher extends TeacherDirectoryItem {
  linkedUserId: number | null;
  membershipId: string;
  startedOn: string;
  endedOn: string | null;
}

/** Read-only teacher profile shared by teacher management and classroom links. */
export type TeacherProfile = TeacherDirectoryItem;

export interface TeacherNationalIdRevealResponse {
  field_group: "NATIONAL_ID";
  values: { citizenId: string };
}

export interface TeacherListQuery extends PaginatedSearchQuery {
  schoolId: number;
  teacherStatus?: TeacherStatus;
  sortBy?: "name" | "citizenId" | "phone" | "lineId" | "email";
  sortOrder?: "asc" | "desc";
}

export interface TeacherSavePayload {
  firstName: string;
  lastName: string;
  citizenId?: string;
  phone?: string;
  email?: string;
  lineId?: string;
}

export interface TeacherCreatePayload extends TeacherSavePayload {
  schoolId: number;
}
