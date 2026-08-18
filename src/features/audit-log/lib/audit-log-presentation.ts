import type { AuditLogDetail, AuditLogEntry } from "../types/audit-log.types";

const TARGET_TYPE_LABELS: Record<string, string> = {
  case: "เคสติดตามนักเรียน",
  import: "การนำเข้าข้อมูล",
  role_group: "กลุ่มสิทธิ์",
  task: "ภารกิจ",
  task_link: "ลิงก์ภารกิจ",
  user: "ผู้ใช้งาน",
};

export function getAuditLogTargetLabel(entry: AuditLogEntry): string {
  // When we resolved a readable name (e.g. the affected account's username),
  // show it plainly like the actor column — no "ผู้ใช้งาน:" prefix.
  const label = entry.targetLabel?.trim();
  if (label) {
    return label;
  }
  // Otherwise fall back to the raw target (task/case/import id): keep the type
  // prefix so the bare id still says what kind of record it points at.
  const targetType = entry.targetType
    ? TARGET_TYPE_LABELS[entry.targetType] || entry.targetType
    : null;
  if (!entry.targetType && !entry.targetId) return "-";
  if (!entry.targetId) return "-";
  if (!entry.targetType) return entry.targetId;
  return `${targetType}: ${entry.targetId}`;
}

export function hasAuditLogTargetReference(entry: AuditLogEntry): boolean {
  return Boolean(entry.targetLabel?.trim() || entry.targetId?.trim());
}

export function formatAuditLogDetails(details: AuditLogDetail[]): string {
  if (details.length === 0) return "-";
  return details
    .map((detail) => `${detail.label}: ${String(detail.value)}`)
    .join(" · ");
}
