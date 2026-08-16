import { ClipboardCheck, Link2Off, Share2 } from "lucide-react";
import { Badge, IconButton } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { EmptyState, ErrorState } from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDate, formatThaiTime } from "../../../lib/date-time";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { TeacherAttendanceDelegationHistoryEntry } from "../../teacher-access/types/teacher-access.types";

interface AttendanceDelegationHistoryTableProps {
  isError: boolean;
  /** ATTENDANCE_DELEGATION display states — labels and colours live in the catalog. */
  statuses: readonly StatusCatalogItem[];
  onEdit?: (entry: TeacherAttendanceDelegationHistoryEntry) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  /** Closing a live link from the history, the same action the active list has. */
  onRevoke?: (entry: TeacherAttendanceDelegationHistoryEntry) => void;
  onRowsPerPageChange: (rows: number) => void;
  onShare?: (entry: TeacherAttendanceDelegationHistoryEntry) => void;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  page: number;
  rows: readonly TeacherAttendanceDelegationHistoryEntry[];
  rowsPerPage: number;
  sort: DataTableSortState | undefined;
  totalCount: number;
}

/**
 * ประวัติการมอบหมาย, rendered the same way wherever it appears — the staff
 * check-in page and the teacher link read the same endpoint shape, so the table
 * lives here instead of once per screen.
 */
export function AttendanceDelegationHistoryTable({
  isError,
  onEdit,
  onPageChange,
  onRetry,
  onRevoke,
  onRowsPerPageChange,
  onShare,
  onSortChange,
  page,
  rows,
  rowsPerPage,
  sort,
  statuses,
  totalCount,
}: AttendanceDelegationHistoryTableProps) {
  if (isError) {
    return (
      <ErrorState
        description="กรุณาลองโหลดประวัติการมอบหมายอีกครั้ง"
        onRetry={onRetry}
        title="โหลดประวัติการมอบหมายไม่สำเร็จ"
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        description="เมื่อมอบหมายการเช็กชื่อแล้ว รายการจะแสดงที่นี่"
        icon={ClipboardCheck}
        title="ยังไม่มีประวัติการมอบหมาย"
      />
    );
  }

  return (
    <DataTable
      headings={[
        { label: "ลำดับ" },
        { label: "ผู้มอบหมาย", sortKey: "issuedBy" },
        { label: "ผู้ได้รับมอบหมาย", sortKey: "teacher" },
        { label: "วันที่เช็กชื่อ", sortKey: "date" },
        { label: "เวลาเริ่มต้น" },
        { label: "เวลาสิ้นสุด" },
        { label: "สถานะ", className: "text-center", sortKey: "status" },
        { label: "เครื่องมือ", className: "text-center" },
      ]}
      minWidthClassName="min-w-[1000px]"
      onSortChange={onSortChange}
      responsive={false}
      sort={sort}
      footer={
        <div className="px-4 pb-4">
          <Pagination
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={PAGE_SIZE_OPTIONS}
            totalCount={totalCount}
            unitLabel="รายการ"
          />
        </div>
      }
    >
      {rows.map((entry, index) => {
        const status = findStatusCatalogItem(statuses, entry.status);
        return (
          <DataTableRow key={entry.grantId}>
            <DataTableCell className="tabular-nums">
              {(page - 1) * rowsPerPage + index + 1}
            </DataTableCell>
            <DataTableCell>{entry.issuedByName}</DataTableCell>
            <DataTableCell>{entry.teacherDisplayName}</DataTableCell>
            <DataTableCell className="tabular-nums">
              {formatThaiDate(entry.attendanceDate)}
            </DataTableCell>
            <DataTableCell className="tabular-nums">
              {formatThaiTime(entry.startsAt)}
            </DataTableCell>
            <DataTableCell className="tabular-nums">
              {formatThaiTime(entry.endsAt)}
            </DataTableCell>
            <DataTableCell className="text-center">
              <Badge variant={status?.badgeVariant}>{status?.label ?? entry.status}</Badge>
            </DataTableCell>
            <DataTableCell>
              <div className="flex items-center justify-center gap-1">
                <IconButton
                  aria-label={`แก้ไขการมอบหมายของ ${entry.teacherDisplayName}`}
                  disabled={!onEdit || entry.status !== "PENDING"}
                  icon={ClipboardCheck}
                  iconClassName="size-5"
                  onClick={() => onEdit?.(entry)}
                  variant="edit"
                />
                <IconButton
                  aria-label={`แชร์ลิงก์มอบหมายของ ${entry.teacherDisplayName}`}
                  disabled={!onShare || !entry.accessUrl}
                  icon={Share2}
                  iconClassName="size-5"
                  onClick={() => onShare?.(entry)}
                  variant="share"
                />
                <IconButton
                  aria-label={`ยกเลิกลิงก์มอบหมายของ ${entry.teacherDisplayName}`}
                  disabled={!onRevoke || entry.status !== "PENDING"}
                  icon={Link2Off}
                  iconClassName="size-5"
                  onClick={() => onRevoke?.(entry)}
                  variant="lock"
                />
              </div>
            </DataTableCell>
          </DataTableRow>
        );
      })}
    </DataTable>
  );
}
