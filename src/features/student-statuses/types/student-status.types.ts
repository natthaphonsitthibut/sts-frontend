import type { PaginationMeta } from "../../../lib/pagination";

export const STUDENT_STATUS_CATEGORIES = [
  "ACTIVE",
  "GRADUATED",
  "WITHDRAWN",
  "TRANSFERRED",
  "DECEASED",
  "UNMAPPED",
] as const;

export type StudentStatusCategory = (typeof STUDENT_STATUS_CATEGORIES)[number];

export interface StudentStatus {
  code: number;
  labelTh: string;
  category: StudentStatusCategory;
  isActiveForLogin: boolean;
  isTerminal: boolean;
  requiresFollowup: boolean;
  isEnabled: boolean;
  sortOrder: number;
  sourceSystem: string;
  usageCount: number;
}

export interface StudentStatusPayload {
  code: number;
  labelTh: string;
  category: StudentStatusCategory;
  isActiveForLogin: boolean;
  isTerminal: boolean;
  requiresFollowup: boolean;
  isEnabled: boolean;
  sortOrder: number;
  sourceSystem: string;
}

export interface StudentStatusListQuery {
  page: number;
  limit: number;
  searchTerm?: string;
  sortBy?: "code" | "labelTh" | "category" | "sortOrder";
  sortDirection?: "asc" | "desc";
}

export interface StudentStatusListResult {
  items: StudentStatus[];
  meta: PaginationMeta;
}
