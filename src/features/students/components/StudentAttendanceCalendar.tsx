import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Badge,
  Card,
  IconButton,
  type BadgeProps,
} from "../../../components/base";
import {
  EmptyState,
  ErrorState,
  SkeletonStack,
} from "../../../components/layout/page-primitives";
import {
  formatThaiTimeRange,
  formatThaiTimeWithSeconds,
} from "../../../lib/date-time";
import { cn } from "../../../lib/utils";
import {
  ATTENDANCE_STATUS_STYLE,
  normalizeAttendanceSelectionStatus,
} from "../../attendance/lib/attendance-presentation";
import { useStudentSubjectAttendance } from "../hooks/useStudentProfileSummary";
import type {
  StudentProfileAttendanceDay,
  StudentProfileSummary,
} from "../types/students.types";

const WEEKDAY_LABELS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return new Date();
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function normalizeIsoDate(value: string | null | undefined): string {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match
    ? `${match[1]}-${match[2]}-${match[3]}`
    : toLocalIsoDate(new Date());
}

function parseIsoDate(value: string | null | undefined): string | null {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function statusDayClass(
  category: StudentProfileAttendanceDay["attendanceCategory"] | undefined,
): string {
  switch (category) {
    case "ALL_PERIODS":
      return "bg-success-100 text-success hover:bg-success-100";
    case "SOME_PERIODS":
      return "bg-brand-orange-bg text-brand-orange hover:bg-brand-orange-bg";
    case "NO_PERIODS":
      return "bg-danger-100 text-danger hover:bg-danger-100";
    default:
      return "text-slate-800 hover:bg-slate-100";
  }
}

const ATTENDANCE_LEGEND: Array<{
  badgeVariant: BadgeProps["variant"];
  category: StudentProfileAttendanceDay["attendanceCategory"];
  className: string;
  label: string;
}> = [
  {
    badgeVariant: "success",
    category: "ALL_PERIODS",
    className: "bg-success-100 text-success",
    label: "เข้าทุกคาบ",
  },
  {
    badgeVariant: "warning",
    category: "SOME_PERIODS",
    className: "bg-brand-orange-bg text-brand-orange",
    label: "เข้าบางคาบ",
  },
  {
    badgeVariant: "destructive",
    category: "NO_PERIODS",
    className: "bg-danger-100 text-danger",
    label: "ไม่เข้าเรียน",
  },
];

interface StudentAttendanceCalendarProps {
  studentId: string;
  summary: StudentProfileSummary;
  /**
   * Reports the rendered height of the title + calendar grid (excluding the
   * day's subject list below it), so a caller can match another column's
   * height to the calendar only, not the whole card.
   */
  onCalendarBoxHeightChange?: (height: number) => void;
}

export function StudentAttendanceCalendar({
  studentId,
  summary,
  onCalendarBoxHeightChange,
}: StudentAttendanceCalendarProps) {
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const calendarBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapperNode = cardWrapperRef.current;
    const boxNode = calendarBoxRef.current;
    if (!wrapperNode || !boxNode || !onCalendarBoxHeightChange) return;
    // Measure from the card's own top edge (not the content div's height) so the
    // card's padding is included — otherwise the reported height is short by
    // exactly the top padding.
    const measure = () => {
      const top = wrapperNode.getBoundingClientRect().top;
      const bottom = boxNode.getBoundingClientRect().bottom;
      onCalendarBoxHeightChange(bottom - top);
    };
    measure();
    // Only watch the calendar box itself — it's a fixed 6-row grid so this only
    // fires on mount/viewport resize, not on every day-subjects content change
    // (which would otherwise re-measure and re-render the page on every click).
    const observer = new ResizeObserver(measure);
    observer.observe(boxNode);
    return () => observer.disconnect();
  }, [onCalendarBoxHeightChange]);
  const termStartsOn = parseIsoDate(summary.term.startsOn);
  const termEndsOn = parseIsoDate(summary.term.endsOn);
  const hasTermBounds = Boolean(termStartsOn && termEndsOn);
  const attendanceByDate = useMemo(
    () =>
      new Map(
        summary.attendance.days.map((day) => [normalizeIsoDate(day.date), day]),
      ),
    [summary.attendance.days],
  );
  const initialDate = normalizeIsoDate(
    summary.attendance.days.at(-1)?.date ?? summary.term.startsOn,
  );
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = fromIsoDate(initialDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const subjectQuery = useStudentSubjectAttendance(
    studentId,
    hasTermBounds ? selectedDate : undefined,
  );
  const calendarCells = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from(
        { length: daysInMonth },
        (_, index) => new Date(year, month, index + 1),
      ),
    ];
    // Always reserve 6 rows (42 cells) so switching to a 5-row month doesn't shrink the card.
    return [
      ...cells,
      ...Array.from({ length: Math.max(0, 42 - cells.length) }, () => null),
    ];
  }, [visibleMonth]);
  const monthLabel = new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const selectedLabel = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
  }).format(fromIsoDate(selectedDate));

  if (!termStartsOn || !termEndsOn) {
    return (
      <Card className="h-full p-5" data-student-attendance-calendar>
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
          <CalendarDays className="size-5 text-ink" aria-hidden="true" />
          ประวัติการเข้าเรียน
        </h2>
        <EmptyState
          className="mt-4 py-8"
          description="ยังไม่สามารถแสดงปฏิทินได้ เนื่องจากภาคเรียนนี้ยังไม่ได้กำหนดวันเริ่มต้นและวันสิ้นสุด"
          icon={CalendarDays}
          title="ยังไม่มีขอบเขตภาคเรียน"
        />
      </Card>
    );
  }
  const boundedTermStartsOn = termStartsOn;
  const boundedTermEndsOn = termEndsOn;

  function isInsideTerm(date: string): boolean {
    return date >= boundedTermStartsOn && date <= boundedTermEndsOn;
  }

  function shiftMonth(delta: number): void {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  }

  return (
    <div ref={cardWrapperRef}>
      <Card className="h-full p-5" data-student-attendance-calendar>
        <div ref={calendarBoxRef}>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
            <CalendarDays className="size-5 text-ink" aria-hidden="true" />
            ประวัติการเข้าเรียน
          </h2>

          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <IconButton
                aria-label="เดือนก่อนหน้า"
                icon={ChevronLeft}
                onClick={() => shiftMonth(-1)}
                size="sm"
                variant="ghost"
              />
              <div className="text-center">
                <div className="font-bold text-slate-900">{monthLabel}</div>
                <div className="text-xs text-slate-500">
                  ภาคเรียนที่ {summary.term.semester}/
                  {summary.term.academicYear}
                </div>
              </div>
              <IconButton
                aria-label="เดือนถัดไป"
                icon={ChevronRight}
                onClick={() => shiftMonth(1)}
                size="sm"
                variant="ghost"
              />
            </div>

            <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-slate-600">
              {WEEKDAY_LABELS.map((label) => (
                <div className="py-1" key={label}>
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
              {calendarCells.map((date, index) => {
                if (!date)
                  return (
                    <div
                      aria-hidden="true"
                      className="size-9"
                      key={`empty-${index}`}
                    />
                  );
                const isoDate = toLocalIsoDate(date);
                const dayAttendance = attendanceByDate.get(isoDate);
                const selected = selectedDate === isoDate;
                const enabled = isInsideTerm(isoDate);
                return (
                  <button
                    aria-label={`${date.getDate()} ${monthLabel}${dayAttendance ? ` ${dayAttendance.attendanceCategoryLabel}` : " ไม่มีข้อมูลการเข้าเรียน"}`}
                    aria-pressed={selected}
                    className={cn(
                      "group mx-auto flex size-9 items-center justify-center rounded-md border-2 font-semibold transition duration-150 ease-out active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                      statusDayClass(dayAttendance?.attendanceCategory),
                      selected ? "border-primary" : "border-transparent",
                      !enabled &&
                        "cursor-not-allowed text-slate-300 hover:bg-transparent",
                    )}
                    disabled={!enabled}
                    key={isoDate}
                    onClick={() => setSelectedDate(isoDate)}
                    type="button"
                  >
                    <span
                      className={cn(
                        "inline-flex",
                        enabled &&
                          "transition-transform duration-150 ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100",
                      )}
                    >
                      {date.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {summary.attendance.days.length > 0 ? (
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {ATTENDANCE_LEGEND.map((item) => (
                  <Badge
                    className={item.className}
                    key={item.category}
                    variant={item.badgeVariant}
                  >
                    <span
                      className="mr-1.5 size-2 rounded-full bg-current"
                      aria-hidden="true"
                    />
                    {item.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {selectedLabel}
          </h3>
          {/*
          Fixed height + internal scroll: the period count varies wildly by day
          (0 to 8+), and letting the card grow/shrink with it changes the page's
          total scroll height on every click — if the user was scrolled near the
          bottom, the browser clamps scrollY to the new (shorter) max, which
          looks like the page jumping. A stable height avoids that entirely.
        */}
          <div className="mt-2 h-[300px] overflow-y-auto">
            {subjectQuery.isLoading ? (
              <SkeletonStack lines={2} />
            ) : subjectQuery.isError ? (
              <ErrorState
                description="กรุณาลองโหลดข้อมูลรายวิชาของวันนี้อีกครั้ง"
                onRetry={() => void subjectQuery.refetch()}
                title="โหลดข้อมูลรายวิชาไม่สำเร็จ"
              />
            ) : !subjectQuery.data?.length ? (
              <EmptyState
                className="border-none py-5 shadow-none"
                description="วันที่เลือกยังไม่มีการเช็กชื่อรายวิชา"
                icon={CalendarDays}
                title="ไม่มีข้อมูลรายวิชา"
              />
            ) : (
              <ul className="divide-y divide-slate-200">
                {subjectQuery.data.map((record, index) => {
                  const status = normalizeAttendanceSelectionStatus(
                    record.statusInternalCode || record.statusCode,
                  );
                  return (
                    <li
                      className="flex items-center justify-between gap-4 py-3 text-sm"
                      key={`${record.date}-${record.subjectCode ?? index}`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">
                          {record.subjectName ??
                            record.subjectCode ??
                            "ไม่ระบุรายวิชา"}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {record.checkingStartedAt && record.submittedAt
                            ? formatThaiTimeRange(
                                record.checkingStartedAt,
                                record.submittedAt,
                              )
                            : record.recordedAt
                              ? formatThaiTimeWithSeconds(record.recordedAt)
                              : "ไม่พบเวลาบันทึก"}{" "}
                          · ผู้เช็กชื่อ{" "}
                          {record.recordedBy ?? "ไม่พบข้อมูลผู้เช็กชื่อ"}
                        </div>
                      </div>
                      <Badge
                        className={ATTENDANCE_STATUS_STYLE[status].displayClass}
                        variant={
                          record.statusBadgeVariant as BadgeProps["variant"]
                        }
                      >
                        {record.statusLabel}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
