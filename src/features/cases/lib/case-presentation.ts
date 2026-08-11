import { formatThaiDateTime } from "../../../lib/date-time";
import type { KnownCaseStatus } from "../types/cases.types";

interface CaseTrackingStatusPresentation {
  label: string;
  textClassName: string;
}

const CASE_TRACKING_STATUS_PRESENTATION: Record<
  KnownCaseStatus,
  CaseTrackingStatusPresentation
> = {
  OPEN: {
    label: "รอมอบหมาย",
    textClassName: "text-brand-yellow",
  },
  IN_PROGRESS: {
    label: "รอติดตาม",
    textClassName: "text-brand-purple",
  },
  PENDING_REVIEW: {
    label: "รอพิจารณา",
    textClassName: "text-primary",
  },
  STUDENT_NOT_FOUND: {
    label: "ไม่พบนักเรียน",
    textClassName: "text-danger",
  },
  RESOLVED: {
    label: "เสร็จสิ้น - ปิดเคส",
    textClassName: "text-success",
  },
};

const UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION: CaseTrackingStatusPresentation = {
  label: "ไม่ระบุสถานะ",
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
