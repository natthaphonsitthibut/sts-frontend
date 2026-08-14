import { ArrowLeft, Download, History, School } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, DatePicker, IconButton, Skeleton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  FilterSelect,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { useContextualNavigate } from "../../../components/layout/navigation-context";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { StudentAvatar } from "../../students/components/StudentAvatar";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { schoolStructureService } from "../api/school-structure.service";
import { getAttendanceStatusPresentation } from "../../attendance/lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../../attendance/types/attendance.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import {
  useClassroomDailyAttendance,
  useClassroomStudentAttendance,
  useStudentAttendanceDays,
} from "../hooks/useSchoolStructure";
import type { RosterExportColumn } from "../lib/classroom-roster-export";
import type { ClassroomStudentAttendanceSummary } from "../types/school-structure.types";
import {
  ClassroomTableExportDialog,
  type ExportDateRange,
} from "./ClassroomTableExportDialog";

type HistoryView = "DAILY" | "STUDENT";

function defaultSummarySort(view: HistoryView): DataTableSortState {
  return view === "DAILY"
    ? { key: "date", direction: "desc" }
    : { key: "name", direction: "asc" };
}

const DAILY_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "date", label: "วันที่" },
  { key: "recordedBy", label: "ผู้เช็คชื่อ" },
  { key: "present", label: "จำนวนที่มา (คน)" },
  { key: "late", label: "จำนวนที่สาย (คน)" },
  { key: "leave", label: "จำนวนที่ลา (คน)" },
  { key: "absent", label: "จำนวนที่ขาด (คน)" },
] as const satisfies readonly RosterExportColumn[];

const STUDENT_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "studentNumber", label: "รหัสประจำตัว" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "present", label: "จำนวนที่มา (ครั้ง)" },
  { key: "late", label: "จำนวนที่สาย (ครั้ง)" },
  { key: "leave", label: "จำนวนที่ลา (ครั้ง)" },
  { key: "absent", label: "จำนวนที่ขาด (ครั้ง)" },
] as const satisfies readonly RosterExportColumn[];

const STUDENT_DAY_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "date", label: "วันที่" },
  { key: "time", label: "เวลา" },
  { key: "recordedBy", label: "ผู้เช็คชื่อ" },
  { key: "status", label: "สถานะการเข้าเรียน" },
] as const satisfies readonly RosterExportColumn[];

const DAILY_DETAIL_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "studentNumber", label: "รหัสประจำตัว" },
  { key: "name", label: "ชื่อ-นามสกุล" },
  { key: "status", label: "สถานะการเข้าเรียน" },
] as const satisfies readonly RosterExportColumn[];

function formatNumericThaiDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || "-";
  return `${match[3]}/${match[2]}/${Number(match[1]) + 543}`;
}

function studentName(student: ClassroomStudentAttendanceSummary): string {
  return `${student.firstName ?? ""} ${student.lastName ?? ""}`.trim() || "-";
}

function summaryStatus(student: ClassroomStudentAttendanceSummary): AttendanceSelectionStatus {
  if (student.presentCount > 0) return "P_PRESENT";
  if (student.lateCount > 0) return "P_LATE";
  if (student.leaveCount > 0) return "P_LEAVE";
  if (student.absentCount > 0) return "P_ABSENT";
  return "NONE";
}

/** Display order for the pill row: มา / สาย / ลา / ขาด. */
const PILL_STATUSES: AttendanceSelectionStatus[] = ["P_PRESENT", "P_LATE", "P_LEAVE", "P_ABSENT"];

function AttendanceStatusPills({
  catalog,
  status,
}: {
  catalog: readonly StatusCatalogItem[];
  status: AttendanceSelectionStatus;
}) {
  return (
    <div className="flex min-w-[340px] justify-center gap-1.5">
      {PILL_STATUSES.map((value) => {
        const presentation = getAttendanceStatusPresentation(value, catalog);
        return (
          <span
            className={`inline-flex h-9 w-20 items-center justify-center rounded-full border text-sm font-medium ${
              status === value ? presentation.pillActiveClass : `bg-white ${presentation.pillIdleClass}`
            }`}
            key={value}
          >
            {presentation.shortLabel}
          </span>
        );
      })}
    </div>
  );
}

interface ClassroomAttendanceHistoryProps {
  classroomId: number;
  classroomLabel: string;
}

export function ClassroomAttendanceHistory({
  classroomId,
  classroomLabel,
}: ClassroomAttendanceHistoryProps) {
  const contextualNavigate = useContextualNavigate();
  const { can } = usePermissions();
  const [view, setView] = useState<HistoryView>("DAILY");
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const [selectedStudent, setSelectedStudent] = useState<ClassroomStudentAttendanceSummary | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>(() => defaultSummarySort("DAILY"));
  const [exportOpen, setExportOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const baseParams = {
    classroomId,
    view,
    date: date || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearch || undefined,
    sortBy: sort?.key as
      | "date"
      | "time"
      | "recordedBy"
      | "studentNumber"
      | "name"
      | "status"
      | "present"
      | "late"
      | "leave"
      | "absent",
    sortDirection: sort?.direction,
    page,
    limit: rowsPerPage,
  };
  const dailyQuery = useClassroomDailyAttendance(
    !selectedStudent && !selectedDay && view === "DAILY" ? baseParams : null,
  );
  const studentQuery = useClassroomStudentAttendance(
    !selectedStudent && (selectedDay || view === "STUDENT")
      ? { ...baseParams, view: "STUDENT", date: selectedDay ?? undefined }
      : null,
  );
  const studentDaysQuery = useStudentAttendanceDays(
    selectedStudent ? { ...baseParams, view: "STUDENT", studentUuid: selectedStudent.studentUuid } : null,
  );
  const activeQuery = selectedStudent
    ? studentDaysQuery
    : selectedDay
      ? studentQuery
      : view === "DAILY"
      ? dailyQuery
      : studentQuery;
  const totalCount = activeQuery.data?.meta.totalCount ?? 0;

  function resetFilters(): void {
    setSearch("");
    setDate("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function changeView(nextView: HistoryView): void {
    setView(nextView);
    setSelectedStudent(null);
    setSelectedDay(null);
    setSort(defaultSummarySort(nextView));
    resetFilters();
  }

  function returnToSummary(): void {
    setSelectedStudent(null);
    setSelectedDay(null);
    setSort(defaultSummarySort(view));
    resetFilters();
  }

  function handleSortChange(nextSort: DataTableSortState | undefined): void {
    setSort(nextSort);
    setPage(1);
  }

  const exportColumns = selectedStudent
    ? STUDENT_DAY_COLUMNS
    : selectedDay
      ? DAILY_DETAIL_COLUMNS
    : view === "DAILY"
      ? DAILY_COLUMNS
      : STUDENT_COLUMNS;

  async function loadExportRows(exportDateRange?: ExportDateRange): Promise<Record<string, string>[]> {
    const exportParams = {
      ...baseParams,
      date: selectedDay ?? undefined,
      dateFrom: exportDateRange?.dateFrom,
      dateTo: exportDateRange?.dateTo,
    };
    if (selectedStudent) {
      const first = await schoolStructureService.listStudentAttendanceDays({
        ...exportParams,
        view: "STUDENT",
        studentUuid: selectedStudent.studentUuid,
        page: 1,
        limit: 50,
      });
      const rows = [...first.data];
      for (let nextPage = 2; nextPage <= first.meta.totalPages; nextPage += 1) {
        const next = await schoolStructureService.listStudentAttendanceDays({
          ...exportParams,
          view: "STUDENT",
          studentUuid: selectedStudent.studentUuid,
          page: nextPage,
          limit: 50,
        });
        rows.push(...next.data);
      }
      return rows.map((row, index) => ({
        order: String(index + 1),
        date: formatNumericThaiDate(row.date),
        time: row.time ?? "-",
        recordedBy: row.recordedBy,
        status: getAttendanceStatusPresentation(row.status, attendanceStatusCatalog).shortLabel,
      }));
    }
    if (selectedDay) {
      const first = await schoolStructureService.listClassroomStudentAttendance({
        ...exportParams,
        view: "STUDENT",
        date: selectedDay,
        page: 1,
        limit: 50,
      });
      const rows = [...first.data];
      for (let nextPage = 2; nextPage <= first.meta.totalPages; nextPage += 1) {
        const next = await schoolStructureService.listClassroomStudentAttendance({
          ...exportParams,
          view: "STUDENT",
          date: selectedDay,
          page: nextPage,
          limit: 50,
        });
        rows.push(...next.data);
      }
      return rows.map((row, index) => ({
        order: String(index + 1),
        studentNumber: row.studentNumber ?? "-",
        name: studentName(row),
        status: getAttendanceStatusPresentation(summaryStatus(row), attendanceStatusCatalog)
          .shortLabel,
      }));
    }
    if (view === "DAILY") {
      const first = await schoolStructureService.listClassroomDailyAttendance({
        ...exportParams,
        view: "DAILY",
        page: 1,
        limit: 50,
      });
      const rows = [...first.data];
      for (let nextPage = 2; nextPage <= first.meta.totalPages; nextPage += 1) {
        const next = await schoolStructureService.listClassroomDailyAttendance({
          ...exportParams,
          view: "DAILY",
          page: nextPage,
          limit: 50,
        });
        rows.push(...next.data);
      }
      return rows.map((row, index) => ({
        order: String(index + 1),
        date: formatNumericThaiDate(row.date),
        recordedBy: row.recordedBy,
        present: String(row.presentCount),
        late: String(row.lateCount),
        leave: String(row.leaveCount),
        absent: String(row.absentCount),
      }));
    }
    const first = await schoolStructureService.listClassroomStudentAttendance({
      ...exportParams,
      view: "STUDENT",
      page: 1,
      limit: 50,
    });
    const rows = [...first.data];
    for (let nextPage = 2; nextPage <= first.meta.totalPages; nextPage += 1) {
      const next = await schoolStructureService.listClassroomStudentAttendance({
        ...exportParams,
        view: "STUDENT",
        page: nextPage,
        limit: 50,
      });
      rows.push(...next.data);
    }
    return rows.map((row, index) => ({
      order: String(index + 1),
      studentNumber: row.studentNumber ?? "-",
      name: studentName(row),
      present: String(row.presentCount),
      late: String(row.lateCount),
      leave: String(row.leaveCount),
      absent: String(row.absentCount),
    }));
  }

  const title = selectedStudent
    ? "ประวัติการเช็คชื่อรายคน"
    : selectedDay
      ? "ประวัติการเช็คชื่อรายวัน"
      : undefined;
  const rows = useMemo(() => activeQuery.data?.data ?? [], [activeQuery.data?.data]);

  return (
    <div>
      {title ? (
        <div className="mb-5 flex items-center gap-3">
          <IconButton aria-label="กลับไปหน้าสรุป" icon={ArrowLeft} onClick={returnToSummary} variant="outline" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600">
              {selectedStudent ? studentName(selectedStudent) : formatNumericThaiDate(selectedDay!)}
            </p>
          </div>
        </div>
      ) : null}

      <ToolbarControls className="mb-5">
        {view === "STUDENT" || selectedStudent || selectedDay ? (
          <SearchInput
            className="sm:max-w-[560px]"
            onChange={(value) => { setSearch(value); setPage(1); }}
            placeholder={selectedStudent ? "ค้นหาผู้เช็คชื่อ" : "ค้นหา"}
            value={search}
          />
        ) : null}
        {selectedStudent ? (
          <>
            <div className="w-[270px] max-w-full">
              <DatePicker
                ariaLabel="วันเริ่ม"
                max={dateTo || undefined}
                onChange={(value) => { setDateFrom(value); setPage(1); }}
                placeholder="วันเริ่ม"
                value={dateFrom}
              />
            </div>
            <div className="w-[270px] max-w-full">
              <DatePicker
                ariaLabel="วันจบ"
                min={dateFrom || undefined}
                onChange={(value) => { setDateTo(value); setPage(1); }}
                placeholder="วันจบ"
                value={dateTo}
              />
            </div>
          </>
        ) : selectedDay ? (
          <div className="w-[270px] max-w-full">
            <DatePicker
              ariaLabel="วันที่เช็คชื่อ"
              onChange={(value) => { setSelectedDay(value); setPage(1); }}
              placeholder="วันที่"
              value={selectedDay}
            />
          </div>
        ) : !selectedDay && view === "DAILY" ? (
          <div className="w-[270px] max-w-full">
            <DatePicker
              ariaLabel="กรองวันที่เช็คชื่อ"
              onChange={(value) => { setDate(value); setPage(1); }}
              placeholder="วันที่"
              value={date}
            />
          </div>
        ) : null}
        {!selectedStudent && !selectedDay ? (
          <FilterSelect
            ariaLabel="รูปแบบประวัติเช็คชื่อ"
            onChange={(value) => changeView(value as HistoryView)}
            value={view}
          >
            <option value="DAILY">รูปแบบรายวัน</option>
            <option value="STUDENT">รูปแบบรายคน</option>
          </FilterSelect>
        ) : null}
        {can("export-data") ? (
          <Button
            className="sm:ml-auto"
            disabled={rows.length === 0}
            icon={Download}
            onClick={() => setExportOpen(true)}
          >
            ดาวน์โหลดข้อมูล
          </Button>
        ) : null}
      </ToolbarControls>

      {activeQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : activeQuery.isError ? (
        <ErrorState description="ไม่สามารถโหลดประวัติการเช็คชื่อได้" onRetry={() => void activeQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState description="ลองเปลี่ยนวันที่หรือคำค้นหา" icon={School} title="ไม่มีประวัติการเช็คชื่อ" />
      ) : selectedStudent ? (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "วันที่", sortKey: "date" },
            { label: "เวลา", sortKey: "time" },
            { label: "ผู้เช็คชื่อ", sortKey: "recordedBy" },
            { label: "สถานะการเข้าเรียน", sortKey: "status", className: "text-center" },
          ]}
          minWidthClassName="min-w-[900px]"
          onSortChange={handleSortChange}
          responsive={false}
          sort={sort}
          footer={<HistoryPagination page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalCount={totalCount} />}
        >
          {studentDaysQuery.data!.data.map((row, index) => (
            <DataTableRow key={row.id}>
              <DataTableCell>{(page - 1) * rowsPerPage + index + 1}</DataTableCell>
              <DataTableCell className="tabular-nums">{formatNumericThaiDate(row.date)}</DataTableCell>
              <DataTableCell className="tabular-nums">{row.time ?? "-"}</DataTableCell>
              <DataTableCell>{row.recordedBy}</DataTableCell>
              <DataTableCell><AttendanceStatusPills catalog={attendanceStatusCatalog} status={row.status} /></DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      ) : selectedDay ? (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "รูปประจำตัว", className: "text-center" },
            { label: "รหัสประจำตัว", sortKey: "studentNumber" },
            { label: "ชื่อ-นามสกุล", sortKey: "name" },
            { label: "สถานะการเข้าเรียน", sortKey: "status", className: "text-center" },
          ]}
          minWidthClassName="min-w-[900px]"
          onSortChange={handleSortChange}
          responsive={false}
          sort={sort}
          footer={<HistoryPagination page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalCount={totalCount} />}
        >
          {studentQuery.data!.data.map((row, index) => (
            <DataTableRow key={row.studentUuid}>
              <DataTableCell>{(page - 1) * rowsPerPage + index + 1}</DataTableCell>
              <DataTableCell><div className="flex justify-center"><button aria-label={`เปิดข้อมูลนักเรียน ${studentName(row)}`} className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => contextualNavigate(`/students/${row.studentUuid}`)} type="button"><StudentAvatar name={studentName(row)} photoUrl={row.photoUrl} /></button></div></DataTableCell>
              <DataTableCell className="tabular-nums">{row.studentNumber ?? "-"}</DataTableCell>
              <DataTableCell className="font-medium text-slate-900">{studentName(row)}</DataTableCell>
              <DataTableCell><AttendanceStatusPills catalog={attendanceStatusCatalog} status={summaryStatus(row)} /></DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      ) : view === "DAILY" ? (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "วันที่", sortKey: "date" },
            { label: "ผู้เช็คชื่อ", sortKey: "recordedBy" },
            { label: "จำนวนที่มา (คน)", sortKey: "present" },
            { label: "จำนวนที่สาย (คน)", sortKey: "late" },
            { label: "จำนวนที่ลา (คน)", sortKey: "leave" },
            { label: "จำนวนที่ขาด (คน)", sortKey: "absent" },
            { label: "เครื่องมือ", className: "text-center" },
          ]}
          minWidthClassName="min-w-[950px]"
          onSortChange={handleSortChange}
          responsive={false}
          sort={sort}
          footer={<HistoryPagination page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalCount={totalCount} />}
        >
          {dailyQuery.data!.data.map((row, index) => (
            <DataTableRow key={row.date}>
              <DataTableCell>{(page - 1) * rowsPerPage + index + 1}</DataTableCell>
              <DataTableCell className="tabular-nums">{formatNumericThaiDate(row.date)}</DataTableCell>
              <DataTableCell>{row.recordedBy}</DataTableCell>
              <DataTableCell>{row.presentCount}</DataTableCell>
              <DataTableCell>{row.lateCount}</DataTableCell>
              <DataTableCell>{row.leaveCount}</DataTableCell>
              <DataTableCell>{row.absentCount}</DataTableCell>
              <DataTableCell><div className="flex justify-center"><IconButton aria-label={`ดูรายละเอียดวันที่ ${formatNumericThaiDate(row.date)}`} icon={History} onClick={() => { setSelectedDay(row.date); setSearch(""); setDate(""); setSort({ key: "name", direction: "asc" }); setPage(1); }} variant="edit" /></div></DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      ) : (
        <DataTable
          headings={[
            { label: "ลำดับ" },
            { label: "รูปประจำตัว", className: "text-center" },
            { label: "รหัสประจำตัว", sortKey: "studentNumber" },
            { label: "ชื่อ-นามสกุล", sortKey: "name" },
            { label: "จำนวนที่มา (ครั้ง)", sortKey: "present" },
            { label: "จำนวนที่สาย (ครั้ง)", sortKey: "late" },
            { label: "จำนวนที่ลา (ครั้ง)", sortKey: "leave" },
            { label: "จำนวนที่ขาด (ครั้ง)", sortKey: "absent" },
            { label: "เครื่องมือ", className: "text-center" },
          ]}
          minWidthClassName="min-w-[1100px]"
          onSortChange={handleSortChange}
          responsive={false}
          sort={sort}
          footer={<HistoryPagination page={page} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} totalCount={totalCount} />}
        >
          {studentQuery.data!.data.map((row, index) => (
            <DataTableRow key={row.studentUuid}>
              <DataTableCell>{(page - 1) * rowsPerPage + index + 1}</DataTableCell>
              <DataTableCell><div className="flex justify-center"><button aria-label={`เปิดข้อมูลนักเรียน ${studentName(row)}`} className="rounded-full transition-shadow hover:ring-2 hover:ring-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => contextualNavigate(`/students/${row.studentUuid}`)} type="button"><StudentAvatar name={studentName(row)} photoUrl={row.photoUrl} /></button></div></DataTableCell>
              <DataTableCell className="tabular-nums">{row.studentNumber ?? "-"}</DataTableCell>
              <DataTableCell className="font-medium text-slate-900">{studentName(row)}</DataTableCell>
              <DataTableCell>{row.presentCount}</DataTableCell>
              <DataTableCell>{row.lateCount}</DataTableCell>
              <DataTableCell>{row.leaveCount}</DataTableCell>
              <DataTableCell>{row.absentCount}</DataTableCell>
              <DataTableCell><div className="flex justify-center"><IconButton aria-label={`ดูประวัติของ ${studentName(row)}`} icon={History} onClick={() => { setSelectedStudent(row); setSort({ key: "date", direction: "desc" }); resetFilters(); }} variant="edit" /></div></DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}

      <ClassroomTableExportDialog
        authorizeExport={(format, columns, dateRange) =>
          schoolStructureService.authorizeClassroomExport({
            classroomId,
            exportScope: "ATTENDANCE",
            format,
            columns,
            dateFrom: dateRange?.dateFrom,
            dateTo: dateRange?.dateTo,
          })
        }
        columns={exportColumns}
        enableDateRange={!selectedDay}
        fileName={`attendance-${classroomLabel.replace("/", "-")}`}
        loadRows={loadExportRows}
        onOpenChange={setExportOpen}
        open={exportOpen}
        title={selectedStudent ? `ประวัติการเช็คชื่อ ${studentName(selectedStudent)}` : selectedDay ? `ประวัติการเช็คชื่อ ${formatNumericThaiDate(selectedDay)}` : `ประวัติการเช็คชื่อ ห้อง ${classroomLabel}`}
      />
    </div>
  );
}

function HistoryPagination({
  page,
  rowsPerPage,
  setPage,
  setRowsPerPage,
  totalCount,
}: {
  page: number;
  rowsPerPage: number;
  setPage: (page: number) => void;
  setRowsPerPage: (rows: number) => void;
  totalCount: number;
}) {
  return (
    <div className="px-4 pb-4">
      <Pagination
        onPageChange={setPage}
        onRowsPerPageChange={(value) => { setRowsPerPage(value); setPage(1); }}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={PAGE_SIZE_OPTIONS}
        totalCount={totalCount}
        unitLabel="รายการ"
      />
    </div>
  );
}
