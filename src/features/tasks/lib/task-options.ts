import type { TaskType } from "../types/task.types";
import { CASE_STATUS_META } from "../../cases/lib/case-presentation";

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
  { value: "OPEN", label: CASE_STATUS_META.OPEN.label, tone: CASE_STATUS_META.OPEN.summaryTone },
  {
    value: "IN_PROGRESS",
    label: CASE_STATUS_META.IN_PROGRESS.label,
    tone: CASE_STATUS_META.IN_PROGRESS.summaryTone,
  },
  {
    value: "PENDING_REVIEW",
    label: CASE_STATUS_META.PENDING_REVIEW.label,
    tone: CASE_STATUS_META.PENDING_REVIEW.summaryTone,
  },
  {
    value: "AWAITING_HELP",
    label: CASE_STATUS_META.AWAITING_HELP.label,
    tone: CASE_STATUS_META.AWAITING_HELP.summaryTone,
  },
  {
    value: "RESOLVED",
    label: CASE_STATUS_META.RESOLVED.label,
    tone: CASE_STATUS_META.RESOLVED.summaryTone,
  },
] as const;

export const LINK_STATE_OPTIONS = [
  { value: "ALL", label: "ทั้งหมด", tone: "default" },
  { value: "ACTIVE", label: "ใช้งาน", tone: "success" },
  { value: "LOCKED", label: "ปิดใช้งาน", tone: "danger" },
  { value: "EXPIRED", label: "หมดอายุ", tone: "warning" },
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
