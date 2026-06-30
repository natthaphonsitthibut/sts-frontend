import type {
  CaseReviewAction,
  CaseResolutionOutcome,
  CaseStatus,
  KnownCaseStatus,
} from "../types/cases.types";
import { formatThaiDateTime } from "../../../lib/date-time";

interface CaseStatusMeta {
  label: string;
  /** Semantic badge classes (from the centralized @theme palette). */
  badgeClass: string;
  summaryTone: "default" | "success" | "warning" | "danger" | "info";
}

// Status order used for the filter dropdown.
export const CASE_STATUS_ORDER: KnownCaseStatus[] = [
  "OPEN",
  "PENDING_REVIEW",
  "IN_PROGRESS",
  "AWAITING_HELP",
  "RESOLVED",
];

export const CASE_STATUS_META: Record<KnownCaseStatus, CaseStatusMeta> = {
  OPEN: {
    label: "รอสร้างลิงก์",
    badgeClass: "bg-slate-100 text-slate-600",
    summaryTone: "default",
  },
  PENDING_REVIEW: {
    label: "รอตรวจผล",
    badgeClass: "bg-primary/10 text-primary",
    summaryTone: "info",
  },
  IN_PROGRESS: {
    label: "กำลังติดตาม",
    badgeClass: "bg-warning-100 text-warning-700",
    summaryTone: "warning",
  },
  AWAITING_HELP: {
    label: "รอช่วยเหลือ",
    badgeClass: "bg-danger-100 text-danger-700",
    summaryTone: "danger",
  },
  RESOLVED: {
    label: "ปิดเคสแล้ว",
    badgeClass: "bg-success-100 text-success-700",
    summaryTone: "success",
  },
};

export function getCaseStatusMeta(status: CaseStatus): CaseStatusMeta {
  return (
    CASE_STATUS_META[status as KnownCaseStatus] ?? {
      label: status || "-",
      badgeClass: "bg-slate-100 text-slate-600",
      summaryTone: "default",
    }
  );
}

interface ReviewActionOption {
  value: CaseReviewAction;
  label: string;
}

export const CASE_REVIEW_ACTIONS: ReviewActionOption[] = [
  { value: "ASSIST", label: "ให้ความช่วยเหลือ" },
  { value: "FORWARD", label: "ส่งต่อหน่วยงาน/ผู้เกี่ยวข้อง" },
  { value: "CLOSE", label: "ปิดเคส" },
];

interface ResolutionOutcomeOption {
  value: CaseResolutionOutcome;
  label: string;
}

export const CASE_RESOLUTION_OUTCOMES: ResolutionOutcomeOption[] = [
  { value: "RETURNED_TO_SCHOOL", label: "กลับมาเรียนแล้ว" },
  { value: "TRANSFERRED_SCHOOL", label: "ย้ายสถานศึกษา" },
  { value: "ILLNESS", label: "เจ็บป่วย/รักษาตัว" },
  { value: "WORKING", label: "ทำงานหรือมีภาระครอบครัว" },
  { value: "UNREACHABLE", label: "ติดต่อไม่ได้" },
  { value: "REFERRED_EXTERNAL", label: "ส่งต่อหน่วยงานภายนอก" },
  { value: "OTHER", label: "อื่น ๆ" },
];

export function getCaseReviewActionPermission(action: CaseReviewAction): string {
  if (action === "CLOSE") {
    return "close-case";
  }
  if (action === "FORWARD") {
    return "forward-case";
  }
  return "review-cases";
}

export function getCaseReason(reason?: string | null, fallback?: string | null): string {
  return reason || fallback || "-";
}

export function formatCaseDate(value: string): string {
  return formatThaiDateTime(value);
}
