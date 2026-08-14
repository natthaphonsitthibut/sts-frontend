import { formatThaiDateTime } from "../../../lib/date-time";
import type { KnownCaseStatus } from "../types/cases.types";

type CasePresentationTone =
  | "default"
  | "success"
  | "warning"
  | "orange"
  | "purple"
  | "danger"
  | "info";

interface CaseTrackingStatusPresentation {
  badgeClassName: string;
  label: string;
  summaryTone: CasePresentationTone;
  textClassName: string;
}

const CASE_TRACKING_STATUS_PRESENTATION: Record<
  KnownCaseStatus,
  CaseTrackingStatusPresentation
> = {
  OPEN: {
    badgeClassName: "text-brand-yellow",
    label: "รอมอบหมาย",
    summaryTone: "orange",
    textClassName: "text-brand-yellow",
  },
  IN_PROGRESS: {
    badgeClassName: "text-brand-purple",
    label: "รอติดตาม",
    summaryTone: "purple",
    textClassName: "text-brand-purple",
  },
  PENDING_REVIEW: {
    badgeClassName: "text-primary",
    label: "รอพิจารณา",
    summaryTone: "info",
    textClassName: "text-primary",
  },
  STUDENT_NOT_FOUND: {
    badgeClassName: "text-danger",
    label: "ไม่พบนักเรียน",
    summaryTone: "danger",
    textClassName: "text-danger",
  },
  RESOLVED: {
    badgeClassName: "text-success",
    label: "เสร็จสิ้น - ปิดเคส",
    summaryTone: "success",
    textClassName: "text-success",
  },
};

const UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION: CaseTrackingStatusPresentation = {
  badgeClassName: "text-slate-600",
  label: "ไม่ระบุสถานะ",
  summaryTone: "default",
  textClassName: "text-slate-500",
};

export function getCaseTrackingStatusPresentation(
  status?: string | null,
): CaseTrackingStatusPresentation {
  if (status && status in CASE_TRACKING_STATUS_PRESENTATION) {
    return CASE_TRACKING_STATUS_PRESENTATION[status as KnownCaseStatus];
  }
  return UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION;
}

export function getCaseReason(reason?: string | null, fallback?: string | null): string {
  return reason || fallback || "-";
}

export function formatCaseDate(value: string): string {
  return formatThaiDateTime(value);
}

export function isFollowUpLinkExpired(assignmentEndsAt?: string | null): boolean {
  if (!assignmentEndsAt) return false;
  const expiresAt = new Date(assignmentEndsAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}
