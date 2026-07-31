import { useRef, useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Select } from "./select";

export interface TimePickerProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

function parseTime(value: string): { hour: string; minute: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return {
    hour: match?.[1] ?? "00",
    minute: match?.[2] ?? "00",
  };
}

export function TimePicker({
  ariaLabel,
  className,
  disabled = false,
  id,
  onChange,
  placeholder = "--:--",
  value,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { hour, minute } = parseTime(value);

  useDismissable(open, containerRef, () => setOpen(false));

  return (
    <div className={cn("relative sm:flex-1", open && "z-50", className)} ref={containerRef}>
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="w-full justify-start px-3 font-medium"
        disabled={disabled}
        icon={Clock}
        id={id}
        onClick={() => setOpen((current) => !current)}
        variant="outline"
      >
        <span className="min-w-0 flex-1 text-left tabular-nums">{value || placeholder}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 text-primary transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div
          aria-label="เลือกเวลา"
          className="absolute left-0 top-11 z-50 w-full min-w-64 rounded-lg border border-slate-200 bg-white p-3 shadow-lg"
          role="dialog"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              ชั่วโมง
              <Select
                aria-label="ชั่วโมง"
                onChange={(event) => onChange(`${event.target.value}:${minute}`)}
                value={hour}
              >
                {HOURS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>
            <span className="pb-2 text-lg font-bold text-slate-500">:</span>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              นาที
              <Select
                aria-label="นาที"
                onChange={(event) => onChange(`${hour}:${event.target.value}`)}
                value={minute}
              >
                {MINUTES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => setOpen(false)} size="sm">เสร็จสิ้น</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
