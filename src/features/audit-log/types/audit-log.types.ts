import type { PaginationMeta } from "../../../lib/pagination";

export type AuditLogDomain =
  | "student_accounts"
  | "imports"
  | "users"
  | "login_links"
  | "students"
  | "cases"
  | "tasks"
  | "attendance";

export interface AuditLogDetail {
  label: string;
  value: string | number | boolean | null;
}

export interface AuditLogEntry {
  id: string;
  domain: AuditLogDomain;
  action: string;
  actionLabel: string;
  actorLabel: string;
  targetType?: string | null;
  targetId?: string | null;
  /** Human-readable target (e.g. the affected account's username) when known. */
  targetLabel?: string | null;
  createdAt: string;
  details: AuditLogDetail[];
}

export interface AuditLogQuery {
  domain: AuditLogDomain;
  action?: string;
  searchTerm?: string;
  dateFrom?: string;
  dateTo?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: number;
  page?: number;
  limit?: number;
}

export interface AuditLogResult {
  items: AuditLogEntry[];
  meta: PaginationMeta;
}
