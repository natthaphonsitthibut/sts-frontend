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

function timeToMinutesOfDay(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesOfDayToTime(totalMinutes: number): string {
  const clamped = Math.min(Math.max(Math.round(totalMinutes), 0), 23 * 60 + 59);
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Shift a "HH:MM" time by a duration in hours (may be fractional, e.g. 1.5). */
export function addHoursToTime(time: string, hours: number): string {
  if (!Number.isFinite(hours)) return time;
  return minutesOfDayToTime(timeToMinutesOfDay(time) + hours * 60);
}

/** Duration in hours between two "HH:MM" times (negative if end is before start). */
export function hoursBetween(start: string, end: string): number {
  return (timeToMinutesOfDay(end) - timeToMinutesOfDay(start)) / 60;
}

/**
 * Duration input/display as decimal hours — 1.5 = 1 ชั่วโมง 30 นาที, 0.75 = 45
 * นาที (เศษเป็นเสี้ยวของ 60 นาที ไม่ใช่นาฬิกาแบบ 1.30 = 1 โมง 30). Rounds to the
 * nearest minute and trims trailing zeros (1.50 -> "1.5", 1.00 -> "1").
 */
export function formatDurationHours(hours: number): string {
  if (!Number.isFinite(hours)) return "";
  const roundedToMinute = Math.round(hours * 60) / 60;
  return String(Number(roundedToMinute.toFixed(2)));
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
