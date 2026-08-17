import { formatThaiDateTime } from "../../../lib/date-time";
import {
  CalendarClock,
  CircleCheck,
  ContactRound,
  Clock3,
  ListChecks,
  MapPin,
  type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
  iconSurfaceClassName: string;
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
    icon: ContactRound,
    iconSurfaceClassName: "bg-brand-yellow text-white",
    label: "รอมอบหมาย",
    summaryTone: "orange",
    textClassName: "text-brand-yellow",
  },
  IN_PROGRESS: {
    badgeClassName: "text-brand-purple",
    icon: CalendarClock,
    iconSurfaceClassName: "bg-brand-purple text-white",
    label: "รอติดตาม",
    summaryTone: "purple",
    textClassName: "text-brand-purple",
  },
  PENDING_REVIEW: {
    badgeClassName: "text-primary",
    icon: ListChecks,
    iconSurfaceClassName: "bg-primary text-white",
    label: "รอพิจารณา",
    summaryTone: "info",
    textClassName: "text-primary",
  },
  STUDENT_NOT_FOUND: {
    badgeClassName: "text-danger",
    icon: MapPin,
    iconSurfaceClassName: "bg-danger text-white",
    label: "ไม่พบนักเรียน",
    summaryTone: "danger",
    textClassName: "text-danger",
  },
  RESOLVED: {
    badgeClassName: "text-success",
    icon: CircleCheck,
    iconSurfaceClassName: "bg-success text-white",
    label: "เสร็จสิ้น",
    summaryTone: "success",
    textClassName: "text-success",
  },
};

const UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION: CaseTrackingStatusPresentation = {
  badgeClassName: "text-slate-600",
  icon: Clock3,
  iconSurfaceClassName: "bg-slate-600 text-white",
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

/**
 * Multi-choice answers on a round (residence environments, assistance measures)
 * arrive already ordered and labelled from the API, so every read-only surface
 * renders them as the same one-line list.
 */
export function formatOptionLabels(
  options?: Array<{ code: string; label: string }> | null,
): string {
  if (!options || options.length === 0) return "-";
  return options.map((option) => option.label).join(", ");
}

export function formatFollowUpProblemCategory(category: {
  code?: string | null;
  label?: string | null;
  guidance?: string | null;
}): string {
  const label = category.label || category.code;
  if (!label) return "-";
  return category.guidance ? `${label} (${category.guidance})` : label;
}

export function isFollowUpLinkExpired(assignmentEndsAt?: string | null): boolean {
  if (!assignmentEndsAt) return false;
  const expiresAt = new Date(assignmentEndsAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
}
