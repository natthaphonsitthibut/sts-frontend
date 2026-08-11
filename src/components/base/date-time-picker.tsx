import { cn } from "../../lib/utils";
import { DatePicker } from "./date-picker";
import { TimePicker } from "./time-picker";

export interface DateTimePickerProps {
  ariaLabel: string;
  /** `""` (unset) or a native `datetime-local` value: `YYYY-MM-DDTHH:mm`. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

function splitValue(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: (time ?? "").slice(0, 5) };
}

function joinValue(date: string, time: string): string {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}

function getTodayDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Composes `DatePicker` + `TimePicker` for the one `datetime-local` field in
 * the app (task-link scheduled open time) — no separate calendar/time logic
 * to maintain, both halves are the same primitives used everywhere else.
 */
export function DateTimePicker({
  ariaLabel,
  className,
  disabled = false,
  id,
  max,
  min,
  onChange,
  value,
}: DateTimePickerProps) {
  const { date, time } = splitValue(value);
  const { date: minDate } = splitValue(min ?? "");
  const { date: maxDate } = splitValue(max ?? "");

  function handleDateChange(nextDate: string): void {
    onChange(joinValue(nextDate, time));
  }

  function handleTimeChange(nextTime: string): void {
    onChange(joinValue(date || getTodayDateOnly(), nextTime));
  }

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 items-center gap-2",
        className,
      )}
    >
      <DatePicker
        ariaLabel={`${ariaLabel} — วันที่`}
        className="min-w-0"
        disabled={disabled}
        id={id}
        max={maxDate || undefined}
        min={minDate || undefined}
        onChange={handleDateChange}
        value={date}
      />
      <TimePicker
        ariaLabel={`${ariaLabel} — เวลา`}
        className="min-w-0"
        onChange={handleTimeChange}
        value={time || "00:00"}
      />
    </div>
  );
}
