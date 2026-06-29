import { useMemo, useRef, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  WandSparkles,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  Combobox,
  Input,
  Label,
  Select,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonTable,
  SummaryMetrics,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDate } from "../../../lib/date-time";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { cn } from "../../../lib/utils";
import { hasPermission } from "../../auth/lib/permissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { attendanceService } from "../api/attendance.service";
import { SchoolAreaSchoolFilter } from "../components/SchoolAreaSchoolFilter";
import { SchoolTermDialog, type SchoolTermFormValues } from "../components/SchoolTermDialog";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import { getTodayIso } from "../lib/attendance-presentation";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";
import type {
  AttendanceReconciliationItem,
  CalendarDayType,
  SchoolCalendarDay,
  SchoolTerm,
} from "../types/attendance.types";

const STATUS_META: Record<
  AttendanceReconciliationItem["operationalStatus"],
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  COMPLETED: { label: "ครบ", variant: "success" },
  MISSING: { label: "ยังไม่เช็ค", variant: "destructive" },
  INCOMPLETE: { label: "ไม่ครบ", variant: "warning" },
};

const TERM_STATUS_META: Record<
  SchoolTerm["status"],
  { label: string; variant: "success" | "secondary" | "warning" }
> = {
  DRAFT: { label: "ร่าง", variant: "warning" },
  ACTIVE: { label: "เปิดใช้งาน", variant: "success" },
  CLOSED: { label: "ปิดภาคเรียน", variant: "secondary" },
};

const CALENDAR_DAY_META: Record<
  CalendarDayType,
  { label: string; variant: "success" | "secondary" | "warning" }
> = {
  SCHOOL_DAY: { label: "วันเรียน", variant: "success" },
  HOLIDAY: { label: "วันหยุด", variant: "secondary" },
  CANCELLED: { label: "ยกเลิกการเรียน", variant: "warning" },
};

const DATE_INPUT_CLASS_NAME = "text-slate-900 [color-scheme:light] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-day-field]:text-slate-900 [&::-webkit-datetime-edit-month-field]:text-slate-900 [&::-webkit-datetime-edit-year-field]:text-slate-900";
const CALENDAR_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTH_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
});

function formatTermOption(term: SchoolTerm): string {
  return `${term.academicYear}/${term.semester} · ${TERM_STATUS_META[term.status].label}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function getIsoMonth(value: string): { year: number; monthIndex: number } {
  const [year = "0", month = "1"] = value.split("-");
  return {
    year: Number(year),
    monthIndex: Math.max(0, Number(month) - 1),
  };
}

function getMonthLabel(year: number, monthIndex: number): string {
  return THAI_MONTH_FORMATTER.format(new Date(year, monthIndex, 1));
}

function getAdjacentMonthDate(
  selectedDate: string,
  offset: -1 | 1,
  minDate?: string | null,
  maxDate?: string | null,
): string {
  const { year, monthIndex } = getIsoMonth(selectedDate);
  const next = new Date(year, monthIndex + offset, 1);
  const nextIso = isoDate(next.getFullYear(), next.getMonth(), 1);
  if (minDate && nextIso < minDate) return minDate;
  if (maxDate && nextIso > maxDate) return maxDate;
  return nextIso;
}

function buildCalendarCells(year: number, monthIndex: number): Array<{
  date: string;
  day: number;
  inMonth: boolean;
}> {
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];
  for (let index = 0; index < firstDay; index += 1) {
    cells.push({ date: "", day: 0, inMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: isoDate(year, monthIndex, day), day, inMonth: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ date: "", day: 0, inMonth: false });
  }
  return cells;
}

function shiftIsoDate(value: string, offsetDays: number): string {
  const [rawYear, rawMonth, rawDay] = value.split("-").map(Number);
  const fallback = getIsoMonth(getTodayIso());
  const year = Number.isFinite(rawYear) ? rawYear : fallback.year;
  const month = Number.isFinite(rawMonth) ? rawMonth : fallback.monthIndex + 1;
  const day = Number.isFinite(rawDay) ? rawDay : 1;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offsetDays);
  return isoDate(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeMinDate(value: string, minDate?: string | null): boolean {
  return Boolean(minDate && value <= minDate);
}

function isAfterMaxDate(value: string, maxDate?: string | null): boolean {
  return Boolean(maxDate && value >= maxDate);
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function compareNumber(a: number | null | undefined, b: number | null | undefined): number {
  return (a ?? -1) - (b ?? -1);
}

function compareReconciliationRows(
  left: AttendanceReconciliationItem,
  right: AttendanceReconciliationItem,
  key: string,
): number {
  if (key === "class") {
    return compareText(`${left.grade}/${left.room}`, `${right.grade}/${right.room}`);
  }
  if (key === "expected") {
    return compareNumber(left.expectedRosterCount, right.expectedRosterCount);
  }
  if (key === "recorded") {
    return compareNumber(left.recordedCount, right.recordedCount);
  }
  if (key === "revision") {
    return compareNumber(left.revision, right.revision);
  }
  if (key === "status") {
    return compareText(
      STATUS_META[left.operationalStatus].label,
      STATUS_META[right.operationalStatus].label,
    );
  }
  return 0;
}

function ScopeField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function CalendarMonthGrid({
  days,
  maxDate,
  minDate,
  onMonthChange,
  onSelectDate,
  selectedDate,
}: {
  days: SchoolCalendarDay[];
  maxDate?: string | null;
  minDate?: string | null;
  onMonthChange: (date: string) => void;
  onSelectDate: (date: string) => void;
  selectedDate: string;
}) {
  const { year, monthIndex } = getIsoMonth(selectedDate);
  const cells = buildCalendarCells(year, monthIndex);
  const dayByDate = new Map(days.map((day) => [day.date, day]));
  const previousMonthDate = getAdjacentMonthDate(selectedDate, -1, minDate, maxDate);
  const nextMonthDate = getAdjacentMonthDate(selectedDate, 1, minDate, maxDate);
  const disablePrevious = previousMonthDate.slice(0, 7) === selectedDate.slice(0, 7);
  const disableNext = nextMonthDate.slice(0, 7) === selectedDate.slice(0, 7);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          aria-label="เดือนก่อนหน้า"
          className="size-9 px-0"
          disabled={disablePrevious}
          icon={ChevronLeft}
          onClick={() => onMonthChange(previousMonthDate)}
          size="sm"
          variant="outline"
        />
        <div className="min-w-0 text-center text-base font-extrabold text-slate-900">
          {getMonthLabel(year, monthIndex)}
        </div>
        <Button
          aria-label="เดือนถัดไป"
          className="size-9 px-0"
          disabled={disableNext}
          icon={ChevronRight}
          onClick={() => onMonthChange(nextMonthDate)}
          size="sm"
          variant="outline"
        />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-slate-500">
        {CALENDAR_WEEKDAYS.map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((cell, index) => {
          const calendarDay = cell.date ? dayByDate.get(cell.date) : null;
          const outsideTerm = Boolean(
            cell.date && ((minDate && cell.date < minDate) || (maxDate && cell.date > maxDate)),
          );
          const selected = cell.date === selectedDate;
          const dayType = calendarDay?.dayType;
          const disabled = !cell.inMonth || outsideTerm;
          return (
            <button
              key={cell.date || `empty-${index}`}
              aria-pressed={selected}
              className={cn(
                "relative flex min-h-[3.25rem] items-center justify-center overflow-hidden rounded-md border p-2 text-center transition-colors",
                disabled
                  ? "cursor-default border-transparent bg-transparent text-slate-300"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                !calendarDay && cell.inMonth && !outsideTerm && "border-dashed text-slate-500",
                selected && "border-primary bg-primary/5 ring-1 ring-primary",
              )}
              disabled={disabled}
              onClick={() => {
                if (cell.date) onSelectDate(cell.date);
              }}
              type="button"
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-sm font-extrabold",
                  selected && "bg-primary text-white",
                )}
              >
                {cell.day || ""}
              </span>
              {calendarDay || (cell.inMonth && !outsideTerm) ? (
                <span
                  className={cn(
                    "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                    dayType === "SCHOOL_DAY" && "bg-emerald-400",
                    dayType === "HOLIDAY" && "bg-sky-400",
                    dayType === "CANCELLED" && "bg-amber-400",
                    !calendarDay && "bg-slate-400",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" />วันเรียน</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sky-400" />วันหยุด</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-amber-400" />ยกเลิก</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-400" />ยังไม่มีข้อมูล</span>
      </div>
    </div>
  );
}

export function AttendanceOperationsPage() {
  const queryClient = useQueryClient();
  const reconciliationDateInputRef = useRef<HTMLInputElement | null>(null);
  const user = useAuthSessionStore((state) => state.user);
  const scope = useMemo(() => resolveAttendanceScopeLock(user?.data_scope), [user]);
  const canManageCalendar = hasPermission(user?.permissions ?? [], "settings");
  const schoolArea = useSchoolAreaFilter();
  const [schoolInput, setSchoolInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [calendarDate, setCalendarDate] = useState(getTodayIso());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termDialogTerm, setTermDialogTerm] = useState<SchoolTerm | null>(null);
  const [calendarEdit, setCalendarEdit] = useState<{
    calendarDayId: string;
    dayType: CalendarDayType;
    reason: string;
  } | null>(null);

  const schoolId = scope.isSchoolLocked
    ? String(scope.lockedSchoolId ?? "")
    : schoolInput;
  const termsQuery = useQuery({
    queryKey: ["attendance-terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId),
    enabled: Boolean(schoolId),
  });
  const terms = termsQuery.data ?? [];
  const selectedTerm = terms.find((term) => term.id === termInput) ?? terms[0] ?? null;
  const selectedTermId = selectedTerm?.id ?? "";
  const calendarQuery = useQuery({
    queryKey: ["attendance-calendar", selectedTermId],
    queryFn: () => attendanceService.getCalendar(selectedTermId),
    enabled: Boolean(selectedTermId),
  });
  const effectiveCalendarDate =
    selectedTerm?.startsOn && selectedTerm.endsOn &&
    (calendarDate < selectedTerm.startsOn || calendarDate > selectedTerm.endsOn)
      ? selectedTerm.startsOn
      : calendarDate;
  const selectedCalendarDay =
    calendarQuery.data?.find((day) => day.date === effectiveCalendarDate) ?? null;
  const reconciliationCalendarDay =
    calendarQuery.data?.find((day) => day.date === date) ?? null;
  const reconciliationDateOutOfRange = Boolean(
    selectedTerm?.startsOn &&
      selectedTerm.endsOn &&
      (date < selectedTerm.startsOn || date > selectedTerm.endsOn),
  );
  const reconciliationTermInactive = Boolean(selectedTerm && selectedTerm.status !== "ACTIVE");
  const waitingForReconciliationCalendar =
    !reconciliationTermInactive && calendarQuery.isLoading;
  const reconciliationCalendarMissing = Boolean(
    !reconciliationTermInactive && calendarQuery.isSuccess && !reconciliationCalendarDay,
  );
  const calendarDayType =
    calendarEdit && calendarEdit.calendarDayId === selectedCalendarDay?.id
      ? calendarEdit.dayType
      : selectedCalendarDay?.dayType ?? "SCHOOL_DAY";
  const calendarReason =
    calendarEdit && calendarEdit.calendarDayId === selectedCalendarDay?.id
      ? calendarEdit.reason
      : selectedCalendarDay?.reason ?? "";
  const reconciliationQuery = useQuery({
    queryKey: ["attendance-reconciliation", selectedTermId, date, page, rowsPerPage],
    queryFn: () =>
      attendanceService.getReconciliation({
        termId: selectedTermId,
        date,
        page,
        limit: rowsPerPage,
      }),
    enabled: Boolean(
      selectedTermId &&
        date &&
        !reconciliationTermInactive &&
        !reconciliationDateOutOfRange &&
        !waitingForReconciliationCalendar &&
        !reconciliationCalendarMissing,
    ),
    placeholderData: keepPreviousData,
  });

  const termMutation = useMutation({
    mutationFn: (values: SchoolTermFormValues) => {
      if (!schoolId) throw new Error("School is required");
      return attendanceService.upsertTerm({
        schoolId: Number(schoolId),
        ...values,
      });
    },
    onSuccess: async (term) => {
      setTermInput(term.id);
      setTermDialogOpen(false);
      setTermDialogTerm(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-terms", schoolId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });
  const generateMutation = useMutation({
    mutationFn: () => attendanceService.generateCalendar(selectedTermId, [1, 2, 3, 4, 5]),
    onSuccess: async () => {
      setCalendarEdit(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar", selectedTermId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-terms", schoolId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });
  const calendarDayMutation = useMutation({
    mutationFn: () => {
      if (!selectedCalendarDay) throw new Error("Calendar day is missing");
      return attendanceService.updateCalendarDay(selectedCalendarDay.id, {
        dayType: calendarDayType,
        reason: calendarReason.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setCalendarEdit(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar", selectedTermId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
      ]);
    },
  });

  const summary = reconciliationQuery.data?.summary ?? {
    completed: 0,
    missing: 0,
    incomplete: 0,
  };
  const rows = useMemo(
    () => reconciliationQuery.data?.rows ?? [],
    [reconciliationQuery.data?.rows],
  );
  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const result = compareReconciliationRows(a, b, sort.key);
      return sort.direction === "asc" ? result : -result;
    });
  }, [rows, sort]);
  const reconciliationNotice = reconciliationTermInactive
    ? {
        title: "ภาคเรียนยังไม่เปิดใช้งาน",
        description: "เปิดใช้งานภาคเรียนก่อนตรวจสถานะเช็คชื่อรายวันจริง",
        variant: "warning" as const,
      }
    : reconciliationDateOutOfRange
    ? {
        title: "วันที่ตรวจสอบอยู่นอกช่วงภาคเรียน",
        description: `เลือกวันที่ระหว่าง ${formatThaiDate(selectedTerm?.startsOn)} ถึง ${formatThaiDate(selectedTerm?.endsOn)}`,
        variant: "warning" as const,
      }
    : reconciliationCalendarMissing
      ? {
          title: "ยังไม่มีข้อมูลปฏิทินสำหรับวันที่ตรวจสอบ",
          description: "กด “สร้างปฏิทิน จ.-ศ.” หรือเลือกวันที่อื่นในช่วงภาคเรียน",
          variant: "warning" as const,
        }
      : reconciliationCalendarDay && reconciliationCalendarDay.dayType !== "SCHOOL_DAY"
        ? {
            title: `วันที่ตรวจสอบเป็น${CALENDAR_DAY_META[reconciliationCalendarDay.dayType].label}`,
            description:
              reconciliationCalendarDay.reason || "วันนี้ไม่มีห้องเรียนที่ต้องเช็คชื่อ",
            variant: "default" as const,
          }
        : null;

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setTermInput("");
    setPage(1);
  }

  function handleDateChange(value: string): void {
    setDate(value);
    setPage(1);
    setCalendarEdit(null);
  }

  function openReconciliationDatePicker(): void {
    const input = reconciliationDateInputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.click();
    }
  }

  return (
    <PageShell>
      <PageToolbar
        icon={CalendarDays}
        title="ตรวจสถานะเช็คชื่อรายวัน"
        description="ดูว่าห้องไหนเช็คชื่อครบ ยังไม่เช็ค หรือเช็คไม่ครบในวันที่เลือก"
        footerActions={
          canManageCalendar && schoolId ? (
            <Button
              icon={Plus}
              onClick={() => {
                setTermDialogTerm(null);
                setTermDialogOpen(true);
              }}
            >
              เพิ่มภาคเรียน
            </Button>
          ) : undefined
        }
      >
        <ToolbarControls className="sm:grid sm:grid-cols-2 sm:items-end lg:grid-cols-3 xl:grid-cols-5">
          <SchoolAreaSchoolFilter
            area={schoolArea}
            onSchoolChange={handleSchoolChange}
            schoolId={schoolId}
            schoolLocked={scope.isSchoolLocked}
          />
          <ScopeField label="ภาคเรียน">
            <Combobox
              disabled={!schoolId}
              onChange={(value) => {
                setTermInput(value);
                setPage(1);
                setCalendarEdit(null);
              }}
              options={terms.map((term) => ({
                value: term.id,
                label: formatTermOption(term),
              }))}
              placeholder="เลือกภาคเรียน"
              searchable={false}
              value={selectedTermId}
            />
          </ScopeField>
        </ToolbarControls>
      </PageToolbar>

      {!schoolId ? (
        <EmptyState icon={CalendarDays} title="เลือกโรงเรียน" />
      ) : termsQuery.isError ? (
        <ErrorState title="ไม่สามารถโหลดภาคเรียนได้" onRetry={() => void termsQuery.refetch()} />
      ) : termsQuery.isLoading ? (
        <SkeletonTable rows={3} />
      ) : !selectedTerm ? (
        <EmptyState icon={CalendarDays} title="ยังไม่มีภาคเรียน" />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="p-5">
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900">ภาคเรียนที่เลือก</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={TERM_STATUS_META[selectedTerm.status].variant}>
                        {TERM_STATUS_META[selectedTerm.status].label}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-600">
                        {formatThaiDate(selectedTerm.startsOn)} ถึง {formatThaiDate(selectedTerm.endsOn)}
                      </span>
                    </div>
                  </div>
                  {canManageCalendar ? (
                    <Button
                      icon={Pencil}
                      onClick={() => {
                        setTermDialogTerm(selectedTerm);
                        setTermDialogOpen(true);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      แก้ภาคเรียน
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500">ปฏิทิน</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {selectedTerm.calendarDayCount}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">วัน</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold text-slate-500">วันเรียน</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">
                      {selectedTerm.schoolDayCount}
                    </div>
                    <div className="text-xs font-semibold text-slate-500">วัน</div>
                  </div>
                </div>
                {canManageCalendar ? (
                  <Button
                    className="mt-auto w-full sm:w-fit"
                    icon={WandSparkles}
                    isLoading={generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                    variant="outline"
                  >
                    สร้างปฏิทิน จ.-ศ.
                  </Button>
                ) : null}
              </div>
            </Card>

            {canManageCalendar ? (
              <Card className="p-5">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <h2 className="text-base font-bold text-slate-900">วันที่ในปฏิทิน</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        {calendarQuery.isLoading ? (
                          <Badge variant="secondary">กำลังโหลดปฏิทิน</Badge>
                        ) : calendarQuery.isError ? (
                          <Badge variant="destructive">โหลดปฏิทินไม่สำเร็จ</Badge>
                        ) : selectedCalendarDay ? (
                          <Badge variant={CALENDAR_DAY_META[calendarDayType].variant}>
                            {CALENDAR_DAY_META[calendarDayType].label}
                          </Badge>
                        ) : (
                          <Badge variant="warning">ยังไม่มีข้อมูลวันที่นี้</Badge>
                        )}
                        <span className="text-sm font-semibold tabular-nums text-slate-600">
                          {formatThaiDate(effectiveCalendarDate)}
                        </span>
                      </div>
                    </div>
                    {calendarQuery.isError ? (
                      <Button
                        icon={RefreshCw}
                        onClick={() => void calendarQuery.refetch()}
                        size="sm"
                        variant="outline"
                      >
                        โหลดใหม่
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(240px,0.48fr)] xl:items-start">
                    <CalendarMonthGrid
                      days={calendarQuery.data ?? []}
                      maxDate={selectedTerm.endsOn}
                      minDate={selectedTerm.startsOn}
                      onMonthChange={(nextDate) => {
                        setCalendarDate(nextDate);
                        setCalendarEdit(null);
                      }}
                      onSelectDate={(nextDate) => {
                        setCalendarDate(nextDate);
                        setCalendarEdit(null);
                      }}
                      selectedDate={effectiveCalendarDate}
                    />
                    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="text-xs font-semibold text-slate-500">วันที่เลือก</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-extrabold tabular-nums text-slate-900">
                            {formatThaiDate(effectiveCalendarDate)}
                          </span>
                          {selectedCalendarDay ? (
                            <Badge variant={CALENDAR_DAY_META[calendarDayType].variant}>
                              {CALENDAR_DAY_META[calendarDayType].label}
                            </Badge>
                          ) : (
                            <Badge variant="warning">ยังไม่มีข้อมูล</Badge>
                          )}
                        </div>
                      </div>
                      <ScopeField label="ประเภทวัน">
                        <Select
                          disabled={calendarQuery.isLoading || calendarQuery.isError || !selectedCalendarDay}
                          value={calendarDayType}
                          onChange={(event) => {
                            if (!selectedCalendarDay) return;
                            setCalendarEdit({
                              calendarDayId: selectedCalendarDay.id,
                              dayType: event.target.value as CalendarDayType,
                              reason: calendarReason,
                            });
                          }}
                        >
                          <option value="SCHOOL_DAY">วันเรียน</option>
                          <option value="HOLIDAY">วันหยุด</option>
                          <option value="CANCELLED">ยกเลิกการเรียน</option>
                        </Select>
                      </ScopeField>
                      <ScopeField label="เหตุผล">
                        <Input
                          disabled={calendarQuery.isLoading || calendarQuery.isError || !selectedCalendarDay}
                          onChange={(event) => {
                            if (!selectedCalendarDay) return;
                            setCalendarEdit({
                              calendarDayId: selectedCalendarDay.id,
                              dayType: calendarDayType,
                              reason: event.target.value,
                            });
                          }}
                          placeholder="เช่น วันหยุดราชการ หรือประกาศปิดเรียน"
                          value={calendarReason}
                        />
                      </ScopeField>
                      <Button
                        className="w-full"
                        disabled={calendarQuery.isLoading || calendarQuery.isError || !selectedCalendarDay}
                        icon={Save}
                        isLoading={calendarDayMutation.isPending}
                        onClick={() => calendarDayMutation.mutate()}
                      >
                        บันทึกวัน
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}
          </div>

          {selectedTerm.status !== "ACTIVE" ? (
            <Alert variant="warning">
              <AlertTitle>ภาคเรียนยังไม่เปิดใช้งาน</AlertTitle>
              <AlertDescription>
                ตั้งช่วงวัน สร้างปฏิทิน แล้วเปลี่ยนสถานะเป็น “เปิดใช้งาน”
              </AlertDescription>
            </Alert>
          ) : null}

          {generateMutation.isError || calendarDayMutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>บันทึกปฏิทินไม่สำเร็จ</AlertTitle>
              <AlertDescription>
                {getApiErrorMessage(
                  generateMutation.error ?? calendarDayMutation.error,
                  "กรุณาลองอีกครั้ง",
                )}
              </AlertDescription>
            </Alert>
          ) : null}

          <Card className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-base font-bold text-slate-900">ตรวจความครบถ้วน</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {reconciliationTermInactive ? (
                    <Badge variant="warning">ยังไม่เปิดใช้งาน</Badge>
                  ) : reconciliationCalendarDay ? (
                    <Badge variant={CALENDAR_DAY_META[reconciliationCalendarDay.dayType].variant}>
                      {CALENDAR_DAY_META[reconciliationCalendarDay.dayType].label}
                    </Badge>
                  ) : reconciliationDateOutOfRange ? (
                    <Badge variant="warning">นอกช่วงภาคเรียน</Badge>
                  ) : reconciliationCalendarMissing ? (
                    <Badge variant="warning">ยังไม่มีปฏิทิน</Badge>
                  ) : (
                    <Badge variant="secondary">กำลังตรวจ</Badge>
                  )}
                  <span className="text-sm font-semibold tabular-nums text-slate-600">
                    {formatThaiDate(date)}
                  </span>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[auto_minmax(170px,1fr)_auto] lg:min-w-[460px]">
                <Button
                  disabled={isBeforeMinDate(date, selectedTerm.startsOn)}
                  icon={ChevronLeft}
                  onClick={() => handleDateChange(shiftIsoDate(date, -1))}
                  variant="outline"
                >
                  ย้อนกลับ
                </Button>
                <div className="relative">
                  <Input
                    ref={reconciliationDateInputRef}
                    aria-label="วันที่ตรวจสอบ"
                    className={cn("sr-only", DATE_INPUT_CLASS_NAME)}
                    max={selectedTerm.endsOn ?? undefined}
                    min={selectedTerm.startsOn ?? undefined}
                    onChange={(event) => handleDateChange(event.target.value)}
                    tabIndex={-1}
                    type="date"
                    value={date}
                  />
                  <Button
                    aria-label="เลือกวันที่ตรวจสอบ"
                    className="h-10 w-full justify-start px-3 text-left font-semibold tabular-nums text-slate-900"
                    onClick={openReconciliationDatePicker}
                    variant="outline"
                  >
                    {formatThaiDate(date)}
                  </Button>
                </div>
                <Button
                  disabled={isAfterMaxDate(date, selectedTerm.endsOn)}
                  icon={ChevronRight}
                  onClick={() => handleDateChange(shiftIsoDate(date, 1))}
                  variant="outline"
                >
                  ถัดไป
                </Button>
              </div>
            </div>
            {reconciliationDateOutOfRange ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedTerm.startsOn ? (
                  <Button onClick={() => handleDateChange(selectedTerm.startsOn || date)} size="sm" variant="outline">
                    ไปวันแรกของภาคเรียน
                  </Button>
                ) : null}
                {selectedTerm.endsOn ? (
                  <Button onClick={() => handleDateChange(selectedTerm.endsOn || date)} size="sm" variant="outline">
                    ไปวันสุดท้ายของภาคเรียน
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 min-h-[5.5rem]">
              {reconciliationNotice ? (
                <Alert className="p-3 shadow-none" variant={reconciliationNotice.variant}>
                  <AlertTitle>{reconciliationNotice.title}</AlertTitle>
                  <AlertDescription>{reconciliationNotice.description}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          </Card>

          <SummaryMetrics
            items={[
              { label: "ครบ", value: summary.completed, tone: "success", icon: CheckCircle2 },
              { label: "ยังไม่เช็ค", value: summary.missing, tone: "danger", icon: Clock3 },
              { label: "ไม่ครบ", value: summary.incomplete, tone: "warning", icon: CircleAlert },
            ]}
          />

          {reconciliationTermInactive ? (
            <EmptyState icon={CalendarDays} title="เปิดใช้งานภาคเรียนก่อนตรวจสถานะ" />
          ) : reconciliationDateOutOfRange || reconciliationCalendarMissing ? (
            <EmptyState icon={CalendarDays} title="ยังไม่มีข้อมูลให้ตรวจสำหรับวันที่นี้" />
          ) : waitingForReconciliationCalendar ? (
            <SkeletonTable />
          ) : reconciliationQuery.isError ? (
            <ErrorState
              title="ไม่สามารถตรวจความครบถ้วนได้"
              description={getApiErrorMessage(
                reconciliationQuery.error,
                "เกิดข้อผิดพลาดระหว่างโหลดข้อมูล กรุณาลองใหม่อีกครั้ง",
              )}
              onRetry={() => void reconciliationQuery.refetch()}
            />
          ) : reconciliationQuery.isLoading ? (
            <SkeletonTable />
          ) : rows.length === 0 ? (
            <EmptyState icon={CalendarDays} title="ไม่มีห้องเรียนที่ต้องเช็คในวันนี้" />
          ) : (
            <>
              <DataTable
                headings={[
                  { label: "ชั้น / ห้อง", sortKey: "class" },
                  { label: "รายชื่อ", sortKey: "expected" },
                  { label: "บันทึกแล้ว", sortKey: "recorded" },
                  { label: "รอบบันทึก", sortKey: "revision" },
                  { label: "สถานะ", sortKey: "status" },
                ]}
                onSortChange={setSort}
                responsive={false}
                sort={sort}
              >
                {sortedRows.map((row) => {
                  const meta = STATUS_META[row.operationalStatus];
                  return (
                    <DataTableRow key={`${row.gradeLevelId}-${row.room}`}>
                      <DataTableCell className="font-bold">{row.grade} / {row.room}</DataTableCell>
                      <DataTableCell>{row.expectedRosterCount}</DataTableCell>
                      <DataTableCell>{row.recordedCount}</DataTableCell>
                      <DataTableCell>{row.revision ?? "-"}</DataTableCell>
                      <DataTableCell><Badge variant={meta.variant}>{meta.label}</Badge></DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTable>
              <Pagination
                page={page}
                onPageChange={setPage}
                onRowsPerPageChange={(next) => {
                  setRowsPerPage(next);
                  setPage(1);
                }}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={reconciliationQuery.data?.totalCount ?? 0}
              />
            </>
          )}
        </div>
      )}

      <SchoolTermDialog
        error={termMutation.error}
        isPending={termMutation.isPending}
        onClose={() => {
          setTermDialogOpen(false);
          setTermDialogTerm(null);
        }}
        onSubmit={async (values) => { await termMutation.mutateAsync(values); }}
        open={termDialogOpen}
        term={termDialogTerm}
      />
    </PageShell>
  );
}
