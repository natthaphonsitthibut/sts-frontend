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
