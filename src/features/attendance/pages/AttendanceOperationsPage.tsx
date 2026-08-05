import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  FileDown,
  Pencil,
  Plus,
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
  DatePicker,
  InfoTooltip,
  Input,
  Label,
  Select,
} from "../../../components/base";
import { formatRoomLabel, toRoomOption } from "../../../lib/room-presentation";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { Pagination } from "../../../components/layout/pagination";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { ClearFiltersButton } from "../../../components/layout/clear-filters-button";
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageToolbar,
  SkeletonTable,
  SummaryMetrics,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDate } from "../../../lib/date-time";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { cn } from "../../../lib/utils";
import { hasPermission } from "../../auth/lib/permissions";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { buildDataExportContextUrl } from "../../data-exports/lib/data-export-context";
import { attendanceLookupService } from "../../tasks/api/attendance-lookup.service";
import { attendanceService } from "../api/attendance.service";
import { AttendanceSessionDetailDialog } from "../components/AttendanceSessionDetailDialog";
import { CalendarDayEditDialog } from "../components/CalendarDayEditDialog";
import { SchoolAreaSchoolFilter } from "../components/SchoolAreaSchoolFilter";
import { SchoolTermDialog, type SchoolTermFormValues } from "../components/SchoolTermDialog";
import { resolveAttendanceScopeLock } from "../lib/attendance-scope";
import {
  formatSchoolTermLabel,
  getTodayIso,
} from "../lib/attendance-presentation";
import { useSchoolAreaFilter } from "../hooks/useSchoolAreaFilter";
import type {
  AttendanceSessionAnomalyItem,
  AttendanceSessionAnomalyType,
  AttendanceReconciliationItem,
  CalendarDayType,
  SchoolCalendarDay,
  SchoolTerm,
} from "../types/attendance.types";
import type { BadgeProps } from "../../../components/base";
import {
  findStatusCatalogItem,
  useStatusCatalog,
} from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

function getCatalogMeta(items: readonly StatusCatalogItem[], code: string) {
  const item = findStatusCatalogItem(items, code);
  return {
    label: item?.label ?? code,
    variant: item?.badgeVariant ?? "secondary",
  };
}

const ANOMALY_DESCRIPTIONS: Record<
  AttendanceSessionAnomalyType,
  string
> = {
  HOLIDAY_ATTENDANCE: "ตรวจวันหยุดในปฏิทิน หรือเปิด session ไปแก้/ยกเลิกการเช็คชื่อ",
  CANCELLED_ATTENDANCE: "ตรวจเหตุผลยกเลิกเรียนในปฏิทิน หรือเปิด session ไปแก้/ยกเลิกการเช็คชื่อ",
  OUT_OF_TERM: "ตรวจวันเริ่ม/สิ้นสุดภาคเรียน หรือเปิด session ไปแก้/ยกเลิกการเช็คชื่อ",
  MISSING_CALENDAR_DAY: "เพิ่มวันในปฏิทินภาคเรียน หรือเปิด session ไปแก้/ยกเลิกการเช็คชื่อ",
};

function getSummaryToneFromBadgeVariant(
  variant: NonNullable<BadgeProps["variant"]>,
): "default" | "success" | "warning" | "danger" {
  if (variant === "success") return "success";
  if (variant === "warning") return "warning";
  if (variant === "destructive") return "danger";
  return "default";
}

const CALENDAR_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const THAI_MONTH_FORMATTER = new Intl.DateTimeFormat("th-TH", {
  month: "long",
  year: "numeric",
});

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
  catalog: readonly StatusCatalogItem[],
): number {
  if (key === "grade") return compareText(left.grade, right.grade);
  if (key === "room") return compareNumber(left.room, right.room);
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
      getCatalogMeta(catalog, left.operationalStatus).label,
      getCatalogMeta(catalog, right.operationalStatus).label,
    );
  }
  return 0;
}

function compareAnomalyRows(
  left: AttendanceSessionAnomalyItem,
  right: AttendanceSessionAnomalyItem,
  key: string,
  catalog: readonly StatusCatalogItem[],
): number {
  if (key === "date") {
    return compareText(left.date, right.date);
  }
  if (key === "grade") return compareText(left.grade, right.grade);
  if (key === "room") return compareNumber(left.room, right.room);
  if (key === "type") {
    return compareText(
      getCatalogMeta(catalog, left.anomalyType).label,
      getCatalogMeta(catalog, right.anomalyType).label,
    );
  }
  if (key === "recorded") {
    return compareNumber(left.recordedCount, right.recordedCount);
  }
  if (key === "revision") {
    return compareNumber(left.revision, right.revision);
  }
  return 0;
}

function ScopeField({
  children,
  label,
  labelHidden = false,
}: {
  children: React.ReactNode;
  label: string;
  labelHidden?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={labelHidden ? "sr-only" : undefined}>{label}</Label>
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
                selected && "border-primary bg-slate-50 ring-1 ring-primary",
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
                    !calendarDay && "bg-slate-500",
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
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-slate-500" />ยังไม่มีข้อมูล</span>
      </div>
    </div>
  );
}

export function AttendanceOperationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get("date") ?? "")
    ? (searchParams.get("date") as string)
    : getTodayIso();
  const reconciliationStatusCatalog = useStatusCatalog("ATTENDANCE_RECONCILIATION");
  const termStatusCatalog = useStatusCatalog("SCHOOL_TERM");
  const calendarDayCatalog = useStatusCatalog("SCHOOL_CALENDAR_DAY");
  const anomalyCatalog = useStatusCatalog("ATTENDANCE_ANOMALY");
  const queryClient = useQueryClient();
  const user = useAuthSessionStore((state) => state.user);
  const scope = useMemo(() => resolveAttendanceScopeLock(user?.data_scope), [user]);
  const canManageCalendar = hasPermission(user?.permissions ?? [], "manage-attendance-calendar");
  const schoolArea = useSchoolAreaFilter({
    province: searchParams.get("province") || undefined,
    district: searchParams.get("district") || undefined,
    subDistrict: searchParams.get("subDistrict") || undefined,
  });
  const [schoolInput, setSchoolInput] = useState(() => searchParams.get("schoolId") || "");
  const [termInput, setTermInput] = useState("");
  const [gradeFilter, setGradeFilter] = useState(() => searchParams.get("grade") || "");
  const [roomFilter, setRoomFilter] = useState(() => searchParams.get("room") || "");
  const [date, setDate] = useState(initialDate);
  const [calendarDate, setCalendarDate] = useState(initialDate);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [anomalyPage, setAnomalyPage] = useState(1);
  const [anomalyRowsPerPage, setAnomalyRowsPerPage] = useState(10);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const [anomalySort, setAnomalySort] = useState<DataTableSortState | undefined>();
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [termDialogTerm, setTermDialogTerm] = useState<SchoolTerm | null>(null);
  const [calendarEdit, setCalendarEdit] = useState<{
    calendarDayId: string;
    dayType: CalendarDayType;
    reason: string;
  } | null>(null);
  const [calendarDialogRow, setCalendarDialogRow] =
    useState<AttendanceSessionAnomalyItem | null>(null);
  const [sessionDialogRow, setSessionDialogRow] =
    useState<AttendanceSessionAnomalyItem | null>(null);

  const schoolId = scope.isSchoolLocked
    ? String(scope.lockedSchoolId ?? "")
    : schoolInput;
  const filteredAttendanceExportUrl = buildDataExportContextUrl("attendance_summary", {
    province: schoolArea.province,
    district: schoolArea.district,
    subDistrict: schoolArea.subDistrict,
    schoolId,
    grade: gradeFilter,
    room: roomFilter,
    dateFrom: date,
    dateTo: date,
  });
  const termsQuery = useQuery({
    queryKey: ["attendance-terms", schoolId],
    queryFn: () => attendanceService.getTerms(schoolId),
    enabled: Boolean(schoolId),
  });
  const gradeLevelsQuery = useQuery({
    queryKey: ["attendance-ops-grade-levels"],
    queryFn: attendanceLookupService.getGradeLevels,
  });
  const roomsQuery = useQuery({
    queryKey: ["attendance-ops-rooms", gradeFilter, schoolId],
    queryFn: () => attendanceLookupService.getRooms(gradeFilter, schoolId),
    enabled: Boolean(gradeFilter && schoolId),
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
  const gradeLevelIdFilter =
    gradeFilter && gradeLevelsQuery.data
      ? gradeLevelsQuery.data.find((level) => level.label === gradeFilter)?.id
      : undefined;
  const roomIdFilter = roomFilter ? Number(roomFilter) || undefined : undefined;
  const reconciliationQuery = useQuery({
    queryKey: [
      "attendance-reconciliation",
      selectedTermId,
      date,
      page,
      rowsPerPage,
      gradeLevelIdFilter,
      roomIdFilter,
    ],
    queryFn: () =>
      attendanceService.getReconciliation({
        termId: selectedTermId,
        date,
        page,
        limit: rowsPerPage,
        gradeLevelId: gradeLevelIdFilter,
        room: roomIdFilter,
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
  const anomalyQuery = useQuery({
    queryKey: [
      "attendance-reconciliation-anomalies",
      selectedTermId,
      anomalyPage,
      anomalyRowsPerPage,
      gradeLevelIdFilter,
      roomIdFilter,
    ],
    queryFn: () =>
      attendanceService.getReconciliationAnomalies({
        termId: selectedTermId,
        page: anomalyPage,
        limit: anomalyRowsPerPage,
        gradeLevelId: gradeLevelIdFilter,
        room: roomIdFilter,
      }),
    enabled: Boolean(selectedTermId && !reconciliationTermInactive),
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
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation-anomalies"] }),
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
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation-anomalies"] }),
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
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation-anomalies"] }),
      ]);
    },
  });
  const anomalyCalendarDayMutation = useMutation({
    mutationFn: (input: { calendarDayId: string; dayType: CalendarDayType; reason: string }) =>
      attendanceService.updateCalendarDay(input.calendarDayId, {
        dayType: input.dayType,
        reason: input.reason || undefined,
      }),
    onSuccess: async () => {
      setCalendarDialogRow(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["attendance-calendar", selectedTermId] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-reconciliation-anomalies"] }),
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
      const result = compareReconciliationRows(
        a,
        b,
        sort.key,
        reconciliationStatusCatalog.items,
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [reconciliationStatusCatalog.items, rows, sort]);
  const anomalySummary = anomalyQuery.data?.summary ?? {
    holidayAttendance: 0,
    cancelledAttendance: 0,
    outOfTerm: 0,
    missingCalendarDay: 0,
  };
  const anomalyRows = useMemo(
    () => anomalyQuery.data?.rows ?? [],
    [anomalyQuery.data?.rows],
  );
  const sortedAnomalyRows = useMemo(() => {
    if (!anomalySort) return anomalyRows;
    return [...anomalyRows].sort((a, b) => {
      const result = compareAnomalyRows(a, b, anomalySort.key, anomalyCatalog.items);
      return anomalySort.direction === "asc" ? result : -result;
    });
  }, [anomalyCatalog.items, anomalyRows, anomalySort]);
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
            title: `วันที่ตรวจสอบเป็น${getCatalogMeta(calendarDayCatalog.items, reconciliationCalendarDay.dayType).label}`,
            description:
              reconciliationCalendarDay.reason || "วันนี้ไม่มีห้องเรียนที่ต้องเช็คชื่อ",
            variant: "default" as const,
          }
        : null;

  function handleSchoolChange(value: string): void {
    setSchoolInput(value);
    setTermInput("");
    setGradeFilter("");
    setRoomFilter("");
    setPage(1);
    setAnomalyPage(1);
  }

  function handleGradeFilterChange(value: string): void {
    setGradeFilter(value);
    setRoomFilter("");
    setPage(1);
    setAnomalyPage(1);
  }

  function handleRoomFilterChange(value: string): void {
    setRoomFilter(value);
    setPage(1);
    setAnomalyPage(1);
  }

  function handleDateChange(value: string): void {
    setDate(value);
    setPage(1);
    setCalendarEdit(null);
  }

  function clearFilters(): void {
    const today = getTodayIso();
    schoolArea.reset();
    setSchoolInput("");
    setTermInput("");
    setGradeFilter("");
    setRoomFilter("");
    setDate(today);
    setCalendarDate(today);
    setCalendarEdit(null);
    setPage(1);
    setAnomalyPage(1);
  }

  function refreshOperations(): Promise<unknown[]> {
    const requests: Promise<unknown>[] = [
      schoolArea.refetch(),
      gradeLevelsQuery.refetch(),
    ];
    if (schoolId) requests.push(termsQuery.refetch());
    if (schoolId && gradeFilter) requests.push(roomsQuery.refetch());
    if (selectedTermId) {
      requests.push(calendarQuery.refetch());
      if (!reconciliationTermInactive) requests.push(anomalyQuery.refetch());
      if (
        !reconciliationTermInactive &&
        !reconciliationDateOutOfRange &&
        !waitingForReconciliationCalendar &&
        !reconciliationCalendarMissing
      ) {
        requests.push(reconciliationQuery.refetch());
      }
    }
    return Promise.all(requests);
  }

  const operationsUpdatedAt = Math.max(
    schoolArea.dataUpdatedAt,
    termsQuery.dataUpdatedAt,
    gradeLevelsQuery.dataUpdatedAt,
    roomsQuery.dataUpdatedAt,
    calendarQuery.dataUpdatedAt,
    reconciliationQuery.dataUpdatedAt,
    anomalyQuery.dataUpdatedAt,
  );

  return (
    <PageShell>
      <PageToolbar
        icon={CalendarDays}
        title="ตรวจสถานะเช็คชื่อรายวัน"
        description="ดูว่าห้องไหนเช็คชื่อครบ ยังไม่เช็ค หรือเช็คไม่ครบในวันที่เลือก"
        actions={
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
        footerActions={
          <>
            <RefreshButton
              onRefresh={refreshOperations}
              updatedAt={operationsUpdatedAt}
            />
            <ClearFiltersButton onClear={clearFilters} />
            {can("export-data") ? (
              <Button
                icon={FileDown}
                onClick={() => navigate(filteredAttendanceExportUrl)}
                variant="outline"
              >
                ส่งออกตามตัวกรองนี้
              </Button>
            ) : null}
          </>
        }
      >
        <ToolbarFilterGrid>
          <SchoolAreaSchoolFilter
            area={schoolArea}
            onSchoolChange={handleSchoolChange}
            schoolEmptyLabel="เลือกโรงเรียน"
            schoolId={schoolId}
            schoolLocked={scope.isSchoolLocked}
          />
          <ScopeField label="ภาคเรียน" labelHidden>
            <Combobox
              disabled={!schoolId}
              onChange={(value) => {
                setTermInput(value);
                setPage(1);
                setCalendarEdit(null);
              }}
              options={terms.map((term) => ({
                value: term.id,
                label: formatSchoolTermLabel(term, termStatusCatalog.items),
              }))}
              placeholder="เลือกภาคเรียน"
              searchable={false}
              value={selectedTermId}
            />
          </ScopeField>
          <ScopeField label="ชั้น" labelHidden>
            <Combobox
              disabled={!schoolId}
              onChange={handleGradeFilterChange}
              options={[
                { value: "", label: "ทุกชั้น" },
                ...(gradeLevelsQuery.data ?? []).map((grade) => ({
                  value: grade.label,
                  label: grade.label,
                })),
              ]}
              placeholder="ค้นหาชั้น"
              value={gradeFilter}
            />
          </ScopeField>
          <ScopeField label="ห้อง" labelHidden>
            <Combobox
              disabled={!gradeFilter}
              onChange={handleRoomFilterChange}
              options={[
                { value: "", label: "ทุกห้อง" },
                ...(roomsQuery.data ?? []).map(toRoomOption),
              ]}
              placeholder="ค้นหาห้อง"
              value={roomFilter}
            />
          </ScopeField>
        </ToolbarFilterGrid>
      </PageToolbar>

      {!schoolId ? (
        <EmptyState
          description="เลือกโรงเรียนด้านบนเพื่อดูหรือตรวจสอบข้อมูลการเช็คชื่อ"
          icon={CalendarDays}
          title="เลือกโรงเรียน"
        />
      ) : termsQuery.isError ? (
        <ErrorState title="ไม่สามารถโหลดภาคเรียนได้" onRetry={() => void termsQuery.refetch()} />
      ) : termsQuery.isLoading ? (
        <SkeletonTable rows={3} />
      ) : !selectedTerm ? (
        <EmptyState
          description="โรงเรียนนี้ยังไม่มีภาคเรียนในระบบ — เพิ่มได้ที่หน้าตั้งค่าภาคเรียน"
          icon={CalendarDays}
          title="ยังไม่มีภาคเรียน"
        />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <Card className="p-5">
              <div className="flex h-full flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <h2 className="text-base font-bold text-slate-900">ภาคเรียนที่เลือก</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={getCatalogMeta(termStatusCatalog.items, selectedTerm.status).variant}
                      >
                        {getCatalogMeta(termStatusCatalog.items, selectedTerm.status).label}
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
                          <Badge variant={getCatalogMeta(calendarDayCatalog.items, calendarDayType).variant}>
                            {getCatalogMeta(calendarDayCatalog.items, calendarDayType).label}
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
                      <RefreshButton onRefresh={() => calendarQuery.refetch()} updatedAt={calendarQuery.dataUpdatedAt} />
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
                            <Badge variant={getCatalogMeta(calendarDayCatalog.items, calendarDayType).variant}>
                              {getCatalogMeta(calendarDayCatalog.items, calendarDayType).label}
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
                    <Badge variant={getCatalogMeta(calendarDayCatalog.items, reconciliationCalendarDay.dayType).variant}>
                      {getCatalogMeta(calendarDayCatalog.items, reconciliationCalendarDay.dayType).label}
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
                <DatePicker
                  ariaLabel="วันที่ตรวจสอบ"
                  max={selectedTerm.endsOn ?? undefined}
                  min={selectedTerm.startsOn ?? undefined}
                  onChange={handleDateChange}
                  value={date}
                />
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
              {
                label: getCatalogMeta(reconciliationStatusCatalog.items, "COMPLETED").label,
                value: summary.completed,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(reconciliationStatusCatalog.items, "COMPLETED").variant,
                ),
                icon: CheckCircle2,
              },
              {
                label: getCatalogMeta(reconciliationStatusCatalog.items, "MISSING").label,
                value: summary.missing,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(reconciliationStatusCatalog.items, "MISSING").variant,
                ),
                icon: Clock3,
              },
              {
                label: getCatalogMeta(reconciliationStatusCatalog.items, "INCOMPLETE").label,
                value: summary.incomplete,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(reconciliationStatusCatalog.items, "INCOMPLETE").variant,
                ),
                icon: CircleAlert,
              },
            ]}
          />

          {reconciliationTermInactive ? (
            <EmptyState
              description="ไปที่หน้าตั้งค่าภาคเรียนเพื่อเปิดใช้งานก่อน จึงจะตรวจความครบถ้วนได้"
              icon={CalendarDays}
              title="เปิดใช้งานภาคเรียนก่อนตรวจสถานะ"
            />
          ) : reconciliationDateOutOfRange || reconciliationCalendarMissing ? (
            <EmptyState
              description="ลองเลือกวันที่อยู่ในช่วงภาคเรียน หรือกำหนดปฏิทินวันเรียนก่อน"
              icon={CalendarDays}
              title="ยังไม่มีข้อมูลให้ตรวจสำหรับวันที่นี้"
            />
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
            <EmptyState
              description="วันนี้อาจเป็นวันหยุด หรือยังไม่มีห้องเรียนที่ต้องเช็คชื่อ"
              icon={CalendarDays}
              title="ไม่มีห้องเรียนที่ต้องเช็คในวันนี้"
            />
          ) : (
            <>
              <DataTable
                headings={[
                  { label: "ชั้น", sortKey: "grade" },
                  { label: "ห้อง", sortKey: "room" },
                  { label: "รายชื่อ", sortKey: "expected" },
                  { label: "บันทึกแล้ว", sortKey: "recorded" },
                  { label: "รอบบันทึก", sortKey: "revision" },
                  { label: "สถานะ", sortKey: "status" },
                ]}
                onSortChange={setSort}
                sort={sort}
              >
                {sortedRows.map((row) => {
                  const meta = getCatalogMeta(
                    reconciliationStatusCatalog.items,
                    row.operationalStatus,
                  );
                  return (
                    <DataTableRow key={`${row.gradeLevelId}-${row.room}`}>
                      <DataTableCell className="font-bold">{row.grade}</DataTableCell>
                      <DataTableCell>{formatRoomLabel(row.room)}</DataTableCell>
                      <DataTableCell>{row.expectedRosterCount}</DataTableCell>
                      <DataTableCell>{row.recordedCount}</DataTableCell>
                      <DataTableCell>{row.revision ?? "-"}</DataTableCell>
                      <DataTableCell><Badge variant={meta.variant}>{meta.label}</Badge></DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTable>
              <TableCardList>
                {sortedRows.map((row) => {
                  const meta = getCatalogMeta(
                    reconciliationStatusCatalog.items,
                    row.operationalStatus,
                  );
                  return (
                    <TableCard key={`${row.gradeLevelId}-${row.room}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-slate-900">
                            {row.grade} / {formatRoomLabel(row.room)}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
                            <span>รายชื่อ {row.expectedRosterCount}</span>
                            <span>บันทึกแล้ว {row.recordedCount}</span>
                            <span>รอบ {row.revision ?? "-"}</span>
                          </div>
                        </div>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </div>
                    </TableCard>
                  );
                })}
              </TableCardList>
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

          <Card className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">รายการผิดปกติ</h2>
                <p className="mt-1 text-sm text-slate-500">
                  ตรวจ session ที่มีการเช็คชื่อแต่ไม่ตรงกับปฏิทินภาคเรียนที่เปิดใช้งาน
                </p>
              </div>
              <Badge variant={anomalyQuery.data?.totalCount ? "warning" : "secondary"}>
                {anomalyQuery.data?.totalCount ?? 0} รายการ
              </Badge>
            </div>
          </Card>

          <SummaryMetrics
            items={[
              {
                label: getCatalogMeta(anomalyCatalog.items, "HOLIDAY_ATTENDANCE").label,
                value: anomalySummary.holidayAttendance,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(anomalyCatalog.items, "HOLIDAY_ATTENDANCE").variant,
                ),
                icon: CalendarDays,
              },
              {
                label: getCatalogMeta(anomalyCatalog.items, "CANCELLED_ATTENDANCE").label,
                value: anomalySummary.cancelledAttendance,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(anomalyCatalog.items, "CANCELLED_ATTENDANCE").variant,
                ),
                icon: CircleAlert,
              },
              {
                label: getCatalogMeta(anomalyCatalog.items, "OUT_OF_TERM").label,
                value: anomalySummary.outOfTerm,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(anomalyCatalog.items, "OUT_OF_TERM").variant,
                ),
                icon: Clock3,
              },
              {
                label: getCatalogMeta(anomalyCatalog.items, "MISSING_CALENDAR_DAY").label,
                value: anomalySummary.missingCalendarDay,
                tone: getSummaryToneFromBadgeVariant(
                  getCatalogMeta(anomalyCatalog.items, "MISSING_CALENDAR_DAY").variant,
                ),
                icon: CalendarDays,
              },
            ]}
          />

          {reconciliationTermInactive ? (
            <EmptyState
              description="ไปที่หน้าตั้งค่าภาคเรียนเพื่อเปิดใช้งานก่อน จึงจะตรวจรายการผิดปกติได้"
              icon={CalendarDays}
              title="เปิดใช้งานภาคเรียนก่อนตรวจรายการผิดปกติ"
            />
          ) : anomalyQuery.isError ? (
            <ErrorState
              title="ไม่สามารถโหลดรายการผิดปกติได้"
              description={getApiErrorMessage(
                anomalyQuery.error,
                "เกิดข้อผิดพลาดระหว่างโหลดข้อมูล กรุณาลองใหม่อีกครั้ง",
              )}
              onRetry={() => void anomalyQuery.refetch()}
            />
          ) : anomalyQuery.isLoading ? (
            <SkeletonTable />
          ) : sortedAnomalyRows.length === 0 ? (
            <EmptyState
              description="ไม่พบความผิดปกติของข้อมูลการเช็คชื่อในภาคเรียนนี้"
              icon={CheckCircle2}
              title="ไม่พบรายการผิดปกติในภาคเรียนนี้"
            />
          ) : (
            <>
              <DataTable
                columnWidths={["w-[9%]", "w-[8%]", "w-[9%]", "w-[12%]", "w-[9%]", "w-[8%]", "w-[22%]", "w-[23%]"]}
                headings={[
                  { label: "วันที่", sortKey: "date" },
                  { label: "ชั้น", sortKey: "grade" },
                  { label: "ห้อง", sortKey: "room" },
                  {
                    label: (
                      <span className="inline-flex items-center gap-1">
                        ประเภท
                        <InfoTooltip label="ประเภทความผิดปกติ">
                          <ul className="list-disc space-y-1 pl-4">
                            <li>เช็คชื่อในวันหยุด</li>
                            <li>เช็คชื่อในวันที่ยกเลิกเรียน</li>
                            <li>เช็คชื่อนอกช่วงภาคเรียน</li>
                            <li>ไม่มีวันนั้นในปฏิทิน</li>
                          </ul>
                        </InfoTooltip>
                      </span>
                    ),
                    sortKey: "type",
                  },
                  { label: "บันทึกแล้ว", sortKey: "recorded" },
                  { label: "รอบบันทึก", sortKey: "revision" },
                  { label: "หมายเหตุ / แนวทางแก้" },
                  { label: "" },
                ]}
                minWidthClassName="min-w-[1080px]"
                onSortChange={setAnomalySort}
                sort={anomalySort}
              >
                {sortedAnomalyRows.map((row) => {
                  const meta = getCatalogMeta(anomalyCatalog.items, row.anomalyType);
                  return (
                    <DataTableRow key={row.sessionId}>
                      <DataTableCell className="font-semibold tabular-nums text-slate-800">
                        {formatThaiDate(row.date)}
                      </DataTableCell>
                      <DataTableCell className="font-bold">{row.grade}</DataTableCell>
                      <DataTableCell>{formatRoomLabel(row.room)}</DataTableCell>
                      <DataTableCell>
                        <Badge className="whitespace-nowrap" variant={meta.variant}>{meta.label}</Badge>
                      </DataTableCell>
                      <DataTableCell>{row.recordedCount} / {row.expectedRosterCount}</DataTableCell>
                      <DataTableCell>{row.revision}</DataTableCell>
                      <DataTableCell className="text-slate-500">
                        <div>{row.calendarReason || "-"}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {ANOMALY_DESCRIPTIONS[row.anomalyType]}
                        </div>
                      </DataTableCell>
                      <DataTableCell>
                        <div className="flex flex-nowrap items-center gap-2">
                          {canManageCalendar ? (
                            <Button
                              icon={CalendarDays}
                              onClick={() => setCalendarDialogRow(row)}
                              size="sm"
                              variant="outline"
                            >
                              แก้ปฏิทิน
                            </Button>
                          ) : null}
                          <Button
                            icon={CheckCircle2}
                            onClick={() => setSessionDialogRow(row)}
                            size="sm"
                            variant="outline"
                          >
                            ตรวจวันนั้น
                          </Button>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTable>
              <TableCardList>
                {sortedAnomalyRows.map((row) => {
                  const meta = getCatalogMeta(anomalyCatalog.items, row.anomalyType);
                  return (
                    <TableCard key={row.sessionId}>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold tabular-nums text-slate-800">
                              {formatThaiDate(row.date)}
                            </div>
                            <div className="mt-1 text-sm font-bold text-slate-900">
                              {row.grade} / {formatRoomLabel(row.room)}
                            </div>
                          </div>
                          <Badge className="whitespace-nowrap" variant={meta.variant}>{meta.label}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span>บันทึกแล้ว {row.recordedCount} / {row.expectedRosterCount}</span>
                          <span>รอบ {row.revision}</span>
                        </div>
                        <div className="space-y-1 text-sm text-slate-500">
                          <div>{row.calendarReason || "-"}</div>
                          <div className="text-xs text-slate-500">
                            {ANOMALY_DESCRIPTIONS[row.anomalyType]}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {canManageCalendar ? (
                            <Button
                              icon={CalendarDays}
                              onClick={() => setCalendarDialogRow(row)}
                              size="sm"
                              variant="outline"
                            >
                              แก้ปฏิทิน
                            </Button>
                          ) : null}
                          <Button
                            icon={CheckCircle2}
                            onClick={() => setSessionDialogRow(row)}
                            size="sm"
                            variant="outline"
                          >
                            ตรวจวันนั้น
                          </Button>
                        </div>
                      </div>
                    </TableCard>
                  );
                })}
              </TableCardList>
              <Pagination
                page={anomalyPage}
                onPageChange={setAnomalyPage}
                onRowsPerPageChange={(next) => {
                  setAnomalyRowsPerPage(next);
                  setAnomalyPage(1);
                }}
                rowsPerPage={anomalyRowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={anomalyQuery.data?.totalCount ?? 0}
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
      <CalendarDayEditDialog
        date={calendarDialogRow?.date ?? ""}
        day={
          calendarDialogRow
            ? calendarQuery.data?.find((day) => day.date === calendarDialogRow.date) ?? null
            : null
        }
        error={anomalyCalendarDayMutation.error}
        isGenerating={generateMutation.isPending}
        isPending={anomalyCalendarDayMutation.isPending}
        onClose={() => setCalendarDialogRow(null)}
        onGenerateCalendar={() => generateMutation.mutate()}
        onSave={(input) => {
          const day = calendarQuery.data?.find((item) => item.date === calendarDialogRow?.date);
          if (!day) return;
          anomalyCalendarDayMutation.mutate({ calendarDayId: day.id, ...input });
        }}
        open={Boolean(calendarDialogRow)}
      />
      <AttendanceSessionDetailDialog
        date={sessionDialogRow?.date ?? ""}
        grade={sessionDialogRow?.grade ?? ""}
        onClose={() => setSessionDialogRow(null)}
        open={Boolean(sessionDialogRow)}
        room={String(sessionDialogRow?.room ?? "")}
        schoolId={schoolId}
      />
    </PageShell>
  );
}
