import type { SchoolPeriodTime, TimetableSlot } from "../types/timetable.types";

export const DAY_LABELS: Record<number, string> = {
  1: "จันทร์",
  2: "อังคาร",
  3: "พุธ",
  4: "พฤหัสบดี",
  5: "ศุกร์",
  6: "เสาร์",
  7: "อาทิตย์",
};

/** Postgres TIME comes back as "HH:MM:SS" — trim to "HH:MM" for display. */
function trimToHHMM(value: string): string {
  return value.slice(0, 5);
}

export function findPeriodTime(
  periodTimes: SchoolPeriodTime[],
  dayOfWeek: number,
  period: number,
): SchoolPeriodTime | undefined {
  return periodTimes.find((row) => row.day_of_week === dayOfWeek && row.period === period);
}

/**
 * School-configured period time. Times now come from `GET
 * /timetable/period-times` per school and day instead of being baked into the
 * frontend build. Falls back to "ยังไม่กำหนดเวลา" until the school generates
 * or sets its schedule.
 */
export function getPeriodTimeLabel(
  periodTimes: SchoolPeriodTime[],
  dayOfWeek: number,
  period: number,
): string {
  const row = findPeriodTime(periodTimes, dayOfWeek, period);
  if (!row) return "ยังไม่กำหนดเวลา";
  return `${trimToHHMM(row.starts_at)}-${trimToHHMM(row.ends_at)}`;
}

export function formatTimetableSlotLabel(
  slot: Pick<TimetableSlot, "day_of_week" | "period" | "teacher_name">,
  periodTimes: SchoolPeriodTime[],
): string {
  const teacher = slot.teacher_name ? ` · ${slot.teacher_name}` : "";
  const timeLabel = getPeriodTimeLabel(periodTimes, slot.day_of_week, slot.period);
  return `วัน${DAY_LABELS[slot.day_of_week] ?? slot.day_of_week} · คาบ ${slot.period} (${timeLabel})${teacher}`;
}
