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
export const VISIT_CAUSE_CATEGORY_OPTIONS = [
  { value: "ECONOMIC", label: "ปัญหาทางเศรษฐกิจ" },
  { value: "FAMILY", label: "ปัญหาครอบครัว" },
  { value: "HEALTH", label: "ปัญหาสุขภาพ" },
  { value: "MIGRATION", label: "ย้ายถิ่นฐาน" },
  { value: "DISABILITY", label: "ความพิการ" },
  { value: "BEHAVIOR", label: "ปัญหาพฤติกรรม" },
  { value: "OTHER", label: "อื่นๆ" },
] as const;
