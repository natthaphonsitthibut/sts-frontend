import type { BadgeProps } from "../../../components/base";

export type StatusCatalogDomain =
  | "CASE_WORKFLOW"
  | "STUDENT_RISK_TIER"
  | "USER_ACCOUNT_STATUS"
  | "USER_ACCOUNT_LIFECYCLE"
  | "TASK_WORKFLOW"
  | "TASK_LINK_STATUS"
  | "TASK_LINK_STATE"
  | "LOGIN_LINK_USAGE"
  | "ATTENDANCE_RECORD"
  | "ATTENDANCE_DELEGATION"
  | "SCHOOL_TERM"
  | "SCHOOL_CALENDAR_DAY"
  | "ATTENDANCE_SESSION"
  | "ATTENDANCE_RECONCILIATION"
  | "STUDENT_IMPORT_BATCH"
  | "IMPORT_QUARANTINE_STATUS"
  | "IMPORT_QUARANTINE_RESOLUTION"
  | "RECORD_ACTIVITY"
  | "STUDENT_STATUS_FLAG"
  | "STUDENT_STATUS_CATEGORY"
  | "ROLE_ORIGIN"
  | "ATTENDANCE_ANOMALY"
  | "STUDENT_FOLLOW_UP_REQUEST";

export interface StatusCatalogItem {
  code: string;
  internalCode: string | null;
  shortLabel: string | null;
  label: string;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  summaryTone: "default" | "success" | "warning" | "danger" | "info" | null;
  sortOrder: number;
}

export type StatusCatalogs = Partial<Record<StatusCatalogDomain, StatusCatalogItem[]>>;
