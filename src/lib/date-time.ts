const THAI_TIME_ZONE = "Asia/Bangkok";

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
  calendar: "buddhist",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: THAI_TIME_ZONE,
});

const thaiTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: THAI_TIME_ZONE,
});

const thaiTimeWithSecondsFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: THAI_TIME_ZONE,
});

const thaiDateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: THAI_TIME_ZONE,
});

/** Calendar date (`YYYY-MM-DD`) in the application's canonical Thailand timezone. */
export function getThaiDateKey(value: Date = new Date()): string {
  const parts = thaiDateKeyFormatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${year}-${month}-${day}` : "";
}

/**
 * Normalizes a database calendar date for date controls and route state.
 * PostgreSQL drivers may return a DATE as `YYYY-MM-DD` or an ISO timestamp;
 * both represent the same school calendar key and must not fall back to today.
 */
export function normalizeCalendarDateKey(value?: string | Date | null): string {
  if (!value) return "";
  if (value instanceof Date) return getThaiDateKey(value);
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? "" : getThaiDateKey(timestamp);
}

export function formatThaiDateTime(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${thaiDateFormatter.format(date)} ${thaiTimeFormatter.format(date)}`;
}

/**
 * The one timestamp wording for record lists (comments, follow-ups, timeline):
 * Thai date then clock time with seconds. Every surface that shows "when this
 * happened" reads from here so the three tabs cannot drift apart.
 */
export function formatThaiDateTimeWithSeconds(
  value?: string | Date | null,
): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${thaiDateFormatter.format(date)} ${thaiTimeWithSecondsFormatter.format(date)} น.`;
}

export function formatThaiTimeWithSeconds(
  value?: string | Date | null,
): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${thaiTimeWithSecondsFormatter.format(date)} น.`;
}

export function formatThaiTimeRange(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
): string {
  if (!startsAt || !endsAt) return "-";
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${thaiTimeWithSecondsFormatter.format(start)}–${thaiTimeWithSecondsFormatter.format(end)} น.`;
}

/** Clock time only (`HH:mm`) in the canonical Thailand timezone. */
export function formatThaiTime(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return thaiTimeFormatter.format(date);
}

export function formatThaiDate(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return thaiDateFormatter.format(date);
}

export function formatThaiTimeRemaining(value?: string | Date | null): string {
  if (!value) return "-";
  const end = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(end.getTime())) return "-";
  const totalMinutes = Math.ceil((end.getTime() - Date.now()) / 60_000);
  if (totalMinutes <= 0) return "หมดอายุแล้ว";
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0 && hours > 0) return `${days} วัน ${hours} ชม.`;
  if (days > 0) return `${days} วัน`;
  if (hours > 0 && minutes > 0) return `${hours} ชม. ${minutes} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${minutes} นาที`;
}

export function formatThaiRelativeTime(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const totalMinutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (totalMinutes < 1) return "เมื่อสักครู่";
  if (totalMinutes < 60) return `${totalMinutes} นาทีที่แล้ว`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "เมื่อวาน";
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatThaiDate(date);
}
