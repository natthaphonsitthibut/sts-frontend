import type { TimetableSlot } from "../types/timetable.types";

export const PERIOD_TIME_LABELS: Record<number, string> = {
  1: "08:30-09:20",
  2: "09:20-10:10",
  3: "10:10-11:00",
  4: "11:00-11:50",
  5: "13:00-13:50",
  6: "13:50-14:40",
  7: "14:40-15:30",
  8: "15:30-16:20",
};

export const DAY_LABELS: Record<number, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

export function getPeriodTimeLabel(period: number): string {
  return PERIOD_TIME_LABELS[period] ?? "ยังไม่กำหนดเวลา";
}

export function formatTimetableSlotLabel(
  slot: Pick<TimetableSlot, "day_of_week" | "period" | "teacher_name">,
): string {
  const teacher = slot.teacher_name ? ` · ${slot.teacher_name}` : "";
  return `วัน${DAY_LABELS[slot.day_of_week] ?? slot.day_of_week} · คาบ ${slot.period} (${getPeriodTimeLabel(slot.period)})${teacher}`;
}
