import type {
  CaseReviewAction,
  CaseStatus,
  KnownCaseStatus,
} from "../types/cases.types";

interface CaseStatusMeta {
  label: string;
  /** Semantic badge classes (from the centralized @theme palette). */
  badgeClass: string;
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
  },
  PENDING_REVIEW: {
    label: "รอผอ.ประเมิน",
    badgeClass: "bg-warning-100 text-warning-700",
  },
  IN_PROGRESS: {
    label: "กำลังติดตาม",
    badgeClass: "bg-primary/10 text-primary",
  },
  AWAITING_HELP: {
    label: "รอรับความช่วยเหลือจากหน่วยงาน",
    badgeClass: "bg-warning-100 text-warning-700",
  },
  RESOLVED: {
    label: "ปิดเคสสำเร็จ",
    badgeClass: "bg-success-100 text-success-700",
  },
};

export function getCaseStatusMeta(status: CaseStatus): CaseStatusMeta {
  return (
    CASE_STATUS_META[status as KnownCaseStatus] ?? {
      label: status || "-",
      badgeClass: "bg-slate-100 text-slate-600",
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
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}
