import type { AuditLogDetail, AuditLogEntry } from "../types/audit-log.types";

const TARGET_TYPE_LABELS: Record<string, string> = {
  case: "เคสช่วยเหลือ",
  case_referral: "การส่งต่อเคส",
  import: "การนำเข้าข้อมูล",
  role_group: "กลุ่มสิทธิ์",
  student_accounts: "บัญชีนักเรียน",
  task: "ภารกิจ",
  task_link: "ลิงก์ภารกิจ",
  user: "ผู้ใช้งาน",
};

export function getAuditLogTargetLabel(entry: AuditLogEntry): string {
  const targetType = entry.targetType
    ? TARGET_TYPE_LABELS[entry.targetType] || entry.targetType
    : null;
  if (!entry.targetType && !entry.targetId) return "-";
  if (!entry.targetId) return targetType || "-";
  if (!entry.targetType) return entry.targetId;
  return `${targetType}: ${entry.targetId}`;
}

export function formatAuditLogDetails(details: AuditLogDetail[]): string {
  if (details.length === 0) return "-";
  return details.map((detail) => `${detail.label}: ${String(detail.value)}`).join(" · ");
}
