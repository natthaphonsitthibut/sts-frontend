import type {
  CaseWorkflowAction,
  CaseResolutionOutcome,
} from "../types/cases.types";
import { formatThaiDateTime } from "../../../lib/date-time";

interface ReviewActionOption {
  value: CaseWorkflowAction;
  label: string;
}

export const CASE_REVIEW_ACTIONS: ReviewActionOption[] = [
  { value: "ASSIST", label: "ให้ความช่วยเหลือ" },
  { value: "REPORT_UP", label: "รายงานขึ้นส่วนกลาง" },
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
  { value: "OTHER", label: "อื่น ๆ" },
];

export function getCaseReviewActionPermission(action: CaseWorkflowAction): string {
  if (action === "CLOSE") {
    return "close-case";
  }
  if (action === "REPORT_UP") {
    return "report-up-cases";
  }
  return "review-cases";
}

export function getCaseReason(reason?: string | null, fallback?: string | null): string {
  return reason || fallback || "-";
}

export function formatCaseDate(value: string): string {
  return formatThaiDateTime(value);
}
