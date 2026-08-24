import type { PaginationMeta } from "../../../lib/pagination";

export const STUDENT_STATUS_CATEGORIES = [
  "STUDYING",
  "SUSPENDED",
  "GRADUATED",
  "TRANSFERRED",
  "WITHDRAWN",
  "DISCHARGED",
  "DECEASED",
  "UNMATCHED",
] as const;

export type StudentStatusCategory = (typeof STUDENT_STATUS_CATEGORIES)[number];
export const STUDENT_STATUS_BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "success",
  "warning",
] as const;
export type StudentStatusBadgeVariant =
  (typeof STUDENT_STATUS_BADGE_VARIANTS)[number];

export interface StudentStatus {
  code: number;
  labelTh: string;
  category: StudentStatusCategory;
  badgeVariant: StudentStatusBadgeVariant;
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
  badgeVariant: StudentStatusBadgeVariant;
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
  includeInactive?: boolean;
  searchTerm?: string;
  sortBy?: "code" | "labelTh" | "category" | "sortOrder";
  sortDirection?: "asc" | "desc";
}

export interface StudentStatusListResult {
  items: StudentStatus[];
  meta: PaginationMeta;
}
