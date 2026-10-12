import { formatThaiDateTime } from "../../../lib/date-time";
import {
  CalendarClock,
  CircleCheck,
  CircleX,
  ContactRound,
  Clock3,
  Hourglass,
  ListChecks,
  Send,
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
  // รอส่งต่อ is the referral's รอมอบหมาย, so it reads the same.
  AWAITING_REFERRAL: {
    badgeClassName: "text-brand-yellow",
    icon: Send,
    iconSurfaceClassName: "bg-brand-yellow text-white",
    label: "รอส่งต่อ",
    summaryTone: "orange",
    textClassName: "text-brand-yellow",
  },
  AWAITING_REFERRAL_OUTCOME: {
    badgeClassName: "text-warning-700",
    icon: Hourglass,
    iconSurfaceClassName: "bg-warning-600 text-white",
    label: "รอผลการส่งต่อ",
    summaryTone: "warning",
    textClassName: "text-warning-700",
  },
  // ส่งต่อไม่สำเร็จ is the referral's ไม่พบนักเรียน, so it reads the same.
  REFERRAL_NOT_SUCCEEDED: {
    badgeClassName: "text-danger",
    icon: CircleX,
    iconSurfaceClassName: "bg-danger text-white",
    label: "ส่งต่อไม่สำเร็จ",
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

const UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION: CaseTrackingStatusPresentation =
  {
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

export function getCaseReason(
  reason?: string | null,
  fallback?: string | null,
): string {
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
  // The forms let a reporter answer "ไม่ระบุ"; an empty multi-select means the
  // same thing, so the read-only views say it with the same word.
  if (!options || options.length === 0) return "ไม่ระบุ";
  return options.map((option) => option.label).join(", ");
}

export function formatFollowUpProblemCategory(category: {
  code?: string | null;
  label?: string | null;
  guidance?: string | null;
}): string {
  const label = category.label || category.code;
  if (!label) return "ไม่ระบุ";
  return category.guidance ? `${label} (${category.guidance})` : label;
}

export function isFollowUpLinkExpired(
  assignmentEndsAt?: string | null,
): boolean {
  if (!assignmentEndsAt) return false;
  const expiresAt = new Date(assignmentEndsAt);
  return (
    !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()
  );
}
