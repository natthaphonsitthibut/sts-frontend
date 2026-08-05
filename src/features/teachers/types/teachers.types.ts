import type { PaginatedSearchQuery } from "../../../lib/pagination";

export type TeacherStatus = "ACTIVE" | "INACTIVE";

/** One row of จัดการข้อมูลคุณครู — the person plus their membership in the school in view. */
export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  citizenId: string | null;
  phone: string | null;
  email: string | null;
  lineId: string | null;
  /** App-served photo URL; the backend redirects to a short-lived signed URL. */
  photoUrl: string | null;
  teacherStatus: TeacherStatus;
  linkedUserId: number | null;
  membershipId: string;
  schoolId: number;
  membershipStatus: TeacherStatus;
  startedOn: string;
  endedOn: string | null;
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
