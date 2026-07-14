const THAI_TIME_ZONE = "Asia/Bangkok";

const thaiDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
  timeZone: THAI_TIME_ZONE,
});

const thaiTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
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

export function formatThaiDateTime(value?: string | Date | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${thaiDateFormatter.format(date)} ${thaiTimeFormatter.format(date)}`;
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
