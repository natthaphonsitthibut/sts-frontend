export type NotificationSeverity = "danger" | "warning" | "success" | "info";

const SEVERITY_BY_TYPE_CODE: Record<string, NotificationSeverity> = {
  CASE_SLA_BREACHED: "danger",
  CASE_RISK_ESCALATED: "danger",
  STUDENT_RISK_WATCH: "danger",
  IMPORT_FAILED: "danger",
  STUDENT_ACCOUNT_BATCH_FAILED: "danger",
  ACCOUNT_DEACTIVATED: "danger",
  TASK_OVERDUE: "danger",
  ATTENDANCE_INCOMPLETE: "danger",
  CASE_SLA_WARNING: "warning",
  IMPORT_COMPLETED: "success",
  STUDENT_ACCOUNT_BATCH_COMPLETED: "success",
  ACCOUNT_REACTIVATED: "success",
};

const SEVERITY_CLASSNAME: Record<NotificationSeverity, string> = {
  danger: "bg-danger-100 text-danger",
  warning: "bg-warning-100 text-warning-700",
  success: "bg-success-100 text-success-700",
  info: "bg-slate-100 text-slate-500",
};

export function getNotificationSeverity(typeCode: string): NotificationSeverity {
  return SEVERITY_BY_TYPE_CODE[typeCode] ?? "info";
}

export function getNotificationSeverityClassName(typeCode: string): string {
  return SEVERITY_CLASSNAME[getNotificationSeverity(typeCode)];
}
