import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDismissable } from "../../hooks/useDismissable";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { IconButton } from "./icon-button";

export interface DatePickerProps {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean;
  popoverPlacement?: "auto" | "bottom" | "top";
}

const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const WEEKDAY_LABELS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const BUDDHIST_ERA_OFFSET = 543;
type CalendarView = "day" | "month" | "year";

const CALENDAR_POPOVER_HEIGHT = 340;
const CALENDAR_POPOVER_WIDTH = 288;
const VIEWPORT_GUTTER = 8;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function toIso({ year, month, day }: DateParts): string {
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

function getTodayParts(): DateParts {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Bangkok",
      year: "numeric",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month - 1, day: parts.day };
}

/** Display Thai Buddhist Era while keeping the transport value as Gregorian YYYY-MM-DD. */
function formatDisplayDate(parts: DateParts): string {
  return `${parts.day} ${THAI_MONTH_NAMES[parts.month]} ${parts.year + BUDDHIST_ERA_OFFSET}`;
}

function formatBuddhistYear(gregorianYear: number): string {
  return String(gregorianYear + BUDDHIST_ERA_OFFSET);
}

/** Days in a month, accounting for leap years without a Date-object round-trip per cell. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 (Sun) .. 6 (Sat) for the 1st of the month. */
function firstWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isoOf(year: number, month: number, day: number): string {
  return toIso({ year, month, day });
}

function yearRangeStart(year: number): number {
  return year - (year % 12);
}

function isMonthOutOfRange(
  year: number,
  month: number,
  min?: string,
  max?: string,
): boolean {
  const firstDay = isoOf(year, month, 1);
  const lastDay = isoOf(year, month, daysInMonth(year, month));
  return Boolean((min && lastDay < min) || (max && firstDay > max));
}

function isYearOutOfRange(year: number, min?: string, max?: string): boolean {
  const minYear = min ? parseIso(min)?.year : undefined;
  const maxYear = max ? parseIso(max)?.year : undefined;
  return Boolean((minYear && year < minYear) || (maxYear && year > maxYear));
}

/**
 * Custom calendar popover — replaces the native `<input type="date">` browser
 * chrome (inconsistent across OS/browser, can't be restyled) with the same
 * trigger-button + panel shell already established by `TimePicker`.
 */
export function DatePicker({
  ariaLabel,
  "aria-invalid": ariaInvalid,
  className,
  disabled = false,
  id,
  max,
  min,
  onChange,
  placeholder = "เลือกวันที่",
  popoverPlacement = "auto",
  value,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<CalendarView>("day");
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selected = parseIso(value);
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const base = selected ?? getTodayParts();
    return { year: base.year, month: base.month };
  });

  useDismissable(open, containerRef, () => setOpen(false));

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  function shiftMonth(delta: number): void {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function shiftCalendar(delta: number): void {
    if (calendarView === "day") {
      shiftMonth(delta);
      return;
    }

    setView((current) => ({
      ...current,
      year: current.year + (calendarView === "month" ? delta : delta * 12),
    }));
  }

  function selectDay(day: number): void {
    onChange(isoOf(view.year, view.month, day));
    setOpen(false);
  }

  function selectMonth(month: number): void {
    setView((current) => ({ ...current, month }));
    setCalendarView("day");
  }

  function selectYear(year: number): void {
    setView((current) => ({ ...current, year }));
    setCalendarView("month");
  }

  function selectToday(): void {
    const today = getTodayParts();
    setView({ year: today.year, month: today.month });
    setCalendarView("day");
    onChange(toIso(today));
    setOpen(false);
  }

  function openCalendar(): void {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      setOpen(true);
      return;
    }

    const roomBelow = window.innerHeight - rect.bottom;
    const roomAbove = rect.top;
    const opensAbove =
      popoverPlacement === "top" ||
      (popoverPlacement === "auto" &&
        roomBelow < CALENDAR_POPOVER_HEIGHT &&
        roomAbove > roomBelow);
    const idealTop = opensAbove
      ? rect.top - CALENDAR_POPOVER_HEIGHT - 4
      : rect.bottom + 4;
    setPopoverStyle({
      left: Math.min(
        Math.max(VIEWPORT_GUTTER, rect.left),
        Math.max(
          VIEWPORT_GUTTER,
          window.innerWidth - CALENDAR_POPOVER_WIDTH - VIEWPORT_GUTTER,
        ),
      ),
      top: Math.min(
        Math.max(VIEWPORT_GUTTER, idealTop),
        Math.max(
          VIEWPORT_GUTTER,
          window.innerHeight - CALENDAR_POPOVER_HEIGHT - VIEWPORT_GUTTER,
        ),
      ),
    });
    setOpen(true);
  }

  const leadingBlanks = firstWeekday(view.year, view.month);
  const totalDays = daysInMonth(view.year, view.month);
  const todayIso = toIso(getTodayParts());
  const cells: Array<{ day: number; iso: string } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      return { day, iso: isoOf(view.year, view.month, day) };
    }),
  ];
  const rangeStart = yearRangeStart(view.year);
  const yearCells = Array.from(
    { length: 12 },
    (_, index) => rangeStart + index,
  );
  const headerLabel =
    calendarView === "day"
      ? `${THAI_MONTH_NAMES[view.month]} ${formatBuddhistYear(view.year)}`
      : calendarView === "month"
        ? formatBuddhistYear(view.year)
        : `${formatBuddhistYear(rangeStart)} - ${formatBuddhistYear(rangeStart + 11)}`;

  return (
    <div
      className={cn("relative", open && "z-50", className)}
      ref={containerRef}
    >
      <Button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className="h-10 w-full justify-start rounded-lg border-slate-300 px-3 font-medium shadow-none hover:border-slate-300 hover:bg-white hover:text-slate-800 hover:shadow-none focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:border-red-400 aria-[invalid=true]:focus:ring-red-400/20 [&>span]:w-full [&>span>span]:w-full"
        disabled={disabled}
        icon={CalendarDays}
        id={id}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          const base = selected ?? getTodayParts();
          setView({ year: base.year, month: base.month });
          setCalendarView("day");
          openCalendar();
        }}
        type="button"
        variant="outline"
      >
        <span className="min-w-0 flex-1 truncate text-left tabular-nums">
          {selected ? formatDisplayDate(selected) : placeholder}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-4 text-primary transition-transform",
            open && "rotate-180",
          )}
        />
      </Button>

      {open ? (
        <div
          aria-label="เลือกวันที่"
          className={cn(
            "fixed z-50 max-h-[calc(100vh-1rem)] w-[min(18rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-lg",
          )}
          role="dialog"
          style={popoverStyle}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <IconButton
              aria-label="ก่อนหน้า"
              icon={ChevronLeft}
              onClick={() => shiftCalendar(-1)}
              size="sm"
              variant="ghost"
            />
            <button
              className="rounded-lg px-3 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100"
              onClick={() => {
                if (calendarView === "day") {
                  setCalendarView("month");
                } else if (calendarView === "month") {
                  setCalendarView("year");
                }
              }}
              type="button"
            >
              {headerLabel}
            </button>
            <IconButton
              aria-label="ถัดไป"
              icon={ChevronRight}
              onClick={() => shiftCalendar(1)}
              size="sm"
              variant="ghost"
            />
          </div>

          {calendarView === "day" ? (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <div
                  className="flex h-8 items-center justify-center text-xs font-semibold text-slate-500"
                  key={index}
                >
                  {label}
                </div>
              ))}
              {cells.map((cell, index) => {
                if (!cell) return <div key={`blank-${index}`} />;
                const isOutOfRange =
                  (min && cell.iso < min) || (max && cell.iso > max);
                const isSelected = cell.iso === value;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    aria-label={cell.iso}
                    className={cn(
                      "flex h-8 items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors",
                      isSelected
                        ? "bg-primary text-white"
                        : isToday
                          ? "text-primary ring-1 ring-inset ring-primary/40"
                          : "text-slate-700 hover:bg-slate-100",
                      isOutOfRange && "pointer-events-none opacity-30",
                    )}
                    disabled={Boolean(isOutOfRange)}
                    key={cell.iso}
                    onClick={() => selectDay(cell.day)}
                    type="button"
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          ) : null}

          {calendarView === "month" ? (
            <div className="grid grid-cols-3 gap-2 py-1">
              {THAI_MONTH_NAMES.map((monthName, month) => {
                const isSelected =
                  selected?.year === view.year && selected.month === month;
                const isOutOfRange = isMonthOutOfRange(
                  view.year,
                  month,
                  min,
                  max,
                );
                return (
                  <button
                    className={cn(
                      "h-10 rounded-lg px-2 text-sm font-semibold transition-colors",
                      isSelected
                        ? "bg-primary text-white"
                        : "text-slate-700 hover:bg-slate-100",
                      isOutOfRange && "pointer-events-none opacity-30",
                    )}
                    disabled={isOutOfRange}
                    key={monthName}
                    onClick={() => selectMonth(month)}
                    type="button"
                  >
                    {monthName}
                  </button>
                );
              })}
            </div>
          ) : null}

          {calendarView === "year" ? (
            <div className="grid grid-cols-3 gap-2 py-1">
              {yearCells.map((year) => {
                const isSelected = selected?.year === year;
                const isOutOfRange = isYearOutOfRange(year, min, max);
                return (
                  <button
                    className={cn(
                      "h-10 rounded-lg text-sm font-semibold tabular-nums transition-colors",
                      isSelected
                        ? "bg-primary text-white"
                        : "text-slate-700 hover:bg-slate-100",
                      isOutOfRange && "pointer-events-none opacity-30",
                    )}
                    disabled={isOutOfRange}
                    key={year}
                    onClick={() => selectYear(year)}
                    type="button"
                  >
                    {formatBuddhistYear(year)}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
            <Button
              disabled={Boolean(
                (min && todayIso < min) || (max && todayIso > max),
              )}
              onClick={selectToday}
              size="sm"
              variant="ghost"
            >
              วันนี้
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
