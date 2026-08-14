import { formatThaiDateTime } from "../../../lib/date-time";
import {
  CircleCheck,
  Clock3,
  FileCheck2,
  MapPin,
  UserRoundX,
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
    icon: Clock3,
    iconSurfaceClassName: "bg-brand-yellow-bg text-brand-yellow",
    label: "รอมอบหมาย",
    summaryTone: "orange",
    textClassName: "text-brand-yellow",
  },
  IN_PROGRESS: {
    badgeClassName: "text-brand-purple",
    icon: MapPin,
    iconSurfaceClassName: "bg-brand-purple-bg text-brand-purple",
    label: "รอติดตาม",
    summaryTone: "purple",
    textClassName: "text-brand-purple",
  },
  PENDING_REVIEW: {
    badgeClassName: "text-primary",
    icon: FileCheck2,
    iconSurfaceClassName: "bg-brand-soft text-primary",
    label: "รอพิจารณา",
    summaryTone: "info",
    textClassName: "text-primary",
  },
  STUDENT_NOT_FOUND: {
    badgeClassName: "text-danger",
    icon: UserRoundX,
    iconSurfaceClassName: "bg-danger-100 text-danger",
    label: "ไม่พบนักเรียน",
    summaryTone: "danger",
    textClassName: "text-danger",
  },
  RESOLVED: {
    badgeClassName: "text-success",
    icon: CircleCheck,
    iconSurfaceClassName: "bg-success-100 text-success-700",
    label: "เสร็จสิ้น - ปิดเคส",
    summaryTone: "success",
    textClassName: "text-success",
  },
};

const UNKNOWN_CASE_TRACKING_STATUS_PRESENTATION: CaseTrackingStatusPresentation = {
  badgeClassName: "text-slate-600",
  icon: Clock3,
  iconSurfaceClassName: "bg-slate-100 text-slate-600",
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
