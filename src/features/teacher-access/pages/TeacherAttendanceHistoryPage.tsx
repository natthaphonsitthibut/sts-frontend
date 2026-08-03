import { useState } from "react";
import { useParams } from "react-router-dom";
import { CalendarCheck, Download, FileSpreadsheet, UserRoundCheck } from "lucide-react";
import { Button, DatePicker, Skeleton, Tabs } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  EmptyState,
  ErrorState,
  SearchInput,
  ToolbarControls,
} from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { ClassroomTableExportDialog } from "../../school-structure/components/ClassroomTableExportDialog";
import { TeacherLinkShell } from "../components/TeacherLinkShell";
import {
  useRecordTeacherClassroomExport,
  useTeacherAttendanceHistory,
} from "../hooks/useTeacherAccess";
import { useTeacherLink } from "../hooks/useTeacherLink";
import { assignmentClassLabel } from "../lib/teacher-link-presentation";
import type { TeacherAttendanceHistoryEntry } from "../types/teacher-access.types";
import { teacherAccessService } from "../api/teacher-access.service";

type HistoryTab = "attendance" | "imports" | "delegations";

const HISTORY_COLUMNS = [
  { key: "order", label: "ลำดับ" },
  { key: "date", label: "วันที่" },
  { key: "recordedBy", label: "ผู้เช็คชื่อ" },
  { key: "present", label: "จำนวนที่มา (คน)" },
  { key: "late", label: "จำนวนที่สาย (คน)" },
  { key: "leave", label: "จำนวนที่ลา (คน)" },
  { key: "absent", label: "จำนวนที่ขาด (คน)" },
] as const;

function formatNumericThaiDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || "-";
  return `${match[3]}/${match[2]}/${Number(match[1]) + 543}`;
}

/**
 * History behind ประวัติการเช็คชื่อ. The เช็คชื่อ tab is live; นำเข้าไฟล์ and
 * มอบหมาย are laid out with their real columns and stay empty until those two
 * features ship, so the shape of the page does not change when they do.
 */
export function TeacherAttendanceHistoryPage() {
  const { assignmentId = "" } = useParams();
  const { credential, context } = useTeacherLink();
  const [tab, setTab] = useState<HistoryTab>("attendance");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<DataTableSortState | undefined>({
    key: "date",
    direction: "desc",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const recordExport = useRecordTeacherClassroomExport();

  const assignment = context.assignments.find((item) => item.id === assignmentId);
  const classroomLabel = assignment ? assignmentClassLabel(assignment) : "";
  const historyQuery = useTeacherAttendanceHistory(
    credential,
    Number(assignmentId) || undefined,
    page,
    rowsPerPage,
    {
      search: debouncedSearch || undefined,
      attendanceDate: date || undefined,
      sortBy: sort?.key as
        | "date"
        | "recordedBy"
        | "present"
        | "late"
        | "leave"
        | "absent"
        | undefined,
      sortOrder: sort?.direction,
    },
  );
  const entries: TeacherAttendanceHistoryEntry[] = historyQuery.data?.data ?? [];

  return (
    <TeacherLinkShell
      breadcrumb={[
        { label: "หน้าหลัก", to: "/teacher-access" },
        { label: `ห้อง ${classroomLabel}`, to: `/teacher-access/classes/${assignmentId}` },
      ]}
      title="ประวัติการเช็คชื่อ"
    >
      <div className="mb-6">
        <Tabs
          aria-label="ประเภทประวัติ"
          className="flex w-full"
          onChange={(value) => {
            setTab(value as HistoryTab);
            setPage(1);
          }}
          options={[
            { value: "attendance", label: "เช็คชื่อ" },
            { value: "imports", label: "นำเข้าไฟล์" },
            { value: "delegations", label: "มอบหมาย" },
          ]}
          value={tab}
        />
      </div>

      <ToolbarControls className="mb-5">
        <SearchInput
          className="sm:max-w-[560px]"
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="ค้นหา"
          value={search}
        />
        <div className="w-[270px] max-w-full">
          <DatePicker
            ariaLabel="กรองวันที่เช็คชื่อ"
            onChange={(value) => {
              setDate(value);
              setPage(1);
            }}
            placeholder="วันที่"
            value={date}
          />
        </div>
        {tab === "attendance" ? (
          <Button
            className="sm:ml-auto"
            disabled={entries.length === 0}
            icon={Download}
            onClick={() => setExportOpen(true)}
          >
            ดาวน์โหลดข้อมูล
          </Button>
        ) : null}
      </ToolbarControls>

      {tab === "imports" ? (
        <EmptyState
          description="ยังไม่เปิดใช้งานการนำเข้าไฟล์การเช็คชื่อ เมื่อเปิดใช้แล้วไฟล์ที่อัปโหลดจะแสดงที่นี่"
          icon={FileSpreadsheet}
          title="ยังไม่มีประวัติการนำเข้าไฟล์"
        />
      ) : tab === "delegations" ? (
        <EmptyState
          description="ยังไม่เปิดใช้งานการมอบหมายการเช็คชื่อ เมื่อเปิดใช้แล้วรายการที่มอบหมายจะแสดงที่นี่"
          icon={UserRoundCheck}
          title="ยังไม่มีประวัติการมอบหมาย"
        />
      ) : historyQuery.isError ? (
        <ErrorState
          description="กรุณาลองโหลดประวัติการเช็คชื่ออีกครั้ง"
          onRetry={() => void historyQuery.refetch()}
          title="โหลดประวัติไม่สำเร็จ"
        />
      ) : historyQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : entries.length === 0 ? (
        <EmptyState
          description={date || search ? "ลองเปลี่ยนวันที่หรือคำค้นหา" : "เมื่อบันทึกการเช็คชื่อแล้ว รายการจะแสดงที่นี่"}
          icon={CalendarCheck}
          title="ยังไม่มีประวัติการเช็คชื่อ"
        />
      ) : (
        <DataTable
          headings={[
            { label: "ลำดับ", className: "text-center" },
            { label: "วันที่", sortKey: "date", className: "text-center" },
            { label: "ผู้เช็คชื่อ", sortKey: "recordedBy", className: "text-center" },
            { label: "จำนวนที่มา (คน)", sortKey: "present", className: "text-center" },
            { label: "จำนวนที่สาย (คน)", sortKey: "late", className: "text-center" },
            { label: "จำนวนที่ลา (คน)", sortKey: "leave", className: "text-center" },
            { label: "จำนวนที่ขาด (คน)", sortKey: "absent", className: "text-center" },
          ]}
          minWidthClassName="min-w-[950px]"
          onSortChange={(nextSort) => {
            setSort(nextSort);
            setPage(1);
          }}
          responsive={false}
          sort={sort}
          footer={
            <div className="px-4 pb-4">
              <Pagination
                onPageChange={setPage}
                onRowsPerPageChange={(value) => {
                  setRowsPerPage(value);
                  setPage(1);
                }}
                page={page}
                rowsPerPage={rowsPerPage}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                totalCount={historyQuery.data?.meta.totalCount ?? 0}
                unitLabel="รายการ"
              />
            </div>
          }
        >
          {entries.map((entry, index) => (
            <DataTableRow key={entry.sessionId}>
              <DataTableCell className="text-center tabular-nums">
                {(page - 1) * rowsPerPage + index + 1}
              </DataTableCell>
              <DataTableCell className="text-center tabular-nums">
                {formatNumericThaiDate(entry.attendanceDate)}
              </DataTableCell>
              <DataTableCell className="text-center">{entry.recordedBy || "-"}</DataTableCell>
              <DataTableCell className="text-center">{entry.presentCount}</DataTableCell>
              <DataTableCell className="text-center">{entry.lateCount}</DataTableCell>
              <DataTableCell className="text-center">{entry.leaveCount}</DataTableCell>
              <DataTableCell className="text-center">{entry.absentCount}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      )}

      <ClassroomTableExportDialog
        authorizeExport={async (format, columns) => {
          await recordExport.mutateAsync({
            assignmentId: Number(assignmentId),
            exportScope: "ATTENDANCE",
            format,
            columns,
          });
        }}
        columns={HISTORY_COLUMNS}
        fileName={`attendance-${classroomLabel.replace("/", "-")}`}
        loadRows={async () => {
          const allEntries = await teacherAccessService.listCompleteAttendanceHistory(credential, {
            assignmentId: Number(assignmentId),
            search: debouncedSearch || undefined,
            attendanceDate: date || undefined,
            sortBy: sort?.key as
              | "date"
              | "recordedBy"
              | "present"
              | "late"
              | "leave"
              | "absent"
              | undefined,
            sortOrder: sort?.direction,
          });
          return allEntries.map((entry, index) => ({
              order: String(index + 1),
              date: formatNumericThaiDate(entry.attendanceDate),
              recordedBy: entry.recordedBy || "-",
              present: String(entry.presentCount),
              late: String(entry.lateCount),
              leave: String(entry.leaveCount),
              absent: String(entry.absentCount),
            }));
        }}
        onOpenChange={setExportOpen}
        open={exportOpen}
        title={`ประวัติการเช็คชื่อ ห้อง ${classroomLabel}`}
      />
    </TeacherLinkShell>
  );
}
