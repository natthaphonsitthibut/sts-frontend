import type { TaskType } from "../types/task.types";

export interface TaskTypeOption {
  label: string;
  value: TaskType;
  description: string;
}

export const TASK_TYPE_OPTIONS: TaskTypeOption[] = [
  {
    value: "VISIT",
    label: "ภารกิจลงพื้นที่",
    description: "ส่งผู้รับผิดชอบไปเยี่ยมบ้านและรายงานผล",
  },
  {
    value: "ATTENDANCE",
    label: "ภารกิจเช็คชื่อ",
    description: "สร้างลิงก์เช็คชื่อนักเรียนรายชั้นเรียน",
  },
  {
    value: "LOGIN",
    label: "ลิงก์เข้าสู่ระบบ",
    description: "ให้ผู้รับสิทธิ์เข้าสู่ระบบผ่าน magic link",
  },
];

export const TASK_DURATION_UNIT_OPTIONS = [
  { value: "hours", label: "ชั่วโมง" },
  { value: "days", label: "วัน" },
  { value: "weeks", label: "สัปดาห์" },
] as const;

// Single source of truth for the case-dashboard filter dropdown AND the stat cards,
// so the two never drift apart. `tone` drives the SummaryMetrics card color.
export const DASHBOARD_CASE_STATUS_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด", tone: "default" },
  { value: "OPEN", label: "เปิดเคส", tone: "danger" },
  { value: "IN_PROGRESS", label: "กำลังติดตาม", tone: "warning" },
  { value: "PENDING_REVIEW", label: "รอตรวจ", tone: "info" },
  { value: "AWAITING_HELP", label: "รอช่วยเหลือ", tone: "warning" },
  { value: "RESOLVED", label: "ปิดเคส", tone: "success" },
] as const;

export const LINK_STATE_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด" },
  { value: "ACTIVE", label: "ใช้งานได้" },
  { value: "LOCKED", label: "ถูกล็อก" },
  { value: "EXPIRED", label: "ไม่มีลิงก์" },
] as const;

export const VISIT_CAUSE_CATEGORY_OPTIONS = [
  { value: "ECONOMIC", label: "ปัญหาทางเศรษฐกิจ" },
  { value: "FAMILY", label: "ปัญหาครอบครัว" },
  { value: "HEALTH", label: "ปัญหาสุขภาพ" },
  { value: "MIGRATION", label: "ย้ายถิ่นฐาน" },
  { value: "DISABILITY", label: "ความพิการ" },
  { value: "BEHAVIOR", label: "ปัญหาพฤติกรรม" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: "P_PRESENT", label: "มา" },
  { value: "P_LATE", label: "สาย" },
  { value: "P_ABSENT", label: "ขาด" },
] as const;
