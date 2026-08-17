import { FileSpreadsheet } from "lucide-react";
import { Button } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { EmptyState, ErrorState } from "../../../components/layout/page-primitives";
import { Pagination } from "../../../components/layout/pagination";
import { PAGE_SIZE_OPTIONS } from "../../../lib/pagination";
import { formatThaiDate } from "../../../lib/date-time";

export interface AttendanceImportHistoryEntry {
  id: string;
  attendanceDate: string;
  fileName: string;
  hasFile: boolean;
  sourceUrl: string | null;
  rowCount: number;
  appliedCount: number;
  importedByName: string;
  importedAt: string;
  subjectName: string | null;
  period: number | null;
}

interface AttendanceImportHistoryTableProps {
  isError: boolean;
  onOpenFile: (entry: AttendanceImportHistoryEntry) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onRowsPerPageChange: (rows: number) => void;
  onSortChange: (sort: DataTableSortState | undefined) => void;
  page: number;
  rows: readonly AttendanceImportHistoryEntry[];
  rowsPerPage: number;
  sort: DataTableSortState | undefined;
  totalCount: number;
}

function importedTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

/** ประวัติ → นำเข้าไฟล์, shared by the staff page and the teacher link. */
export function AttendanceImportHistoryTable({
  isError,
  onOpenFile,
  onPageChange,
  onRetry,
  onRowsPerPageChange,
  onSortChange,
  page,
  rows,
  rowsPerPage,
  sort,
  totalCount,
}: AttendanceImportHistoryTableProps) {
  if (isError) {
    return (
      <ErrorState
        description="กรุณาลองโหลดประวัติการนำเข้าอีกครั้ง"
        onRetry={onRetry}
        title="โหลดประวัติการนำเข้าไม่สำเร็จ"
      />
    );
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        description="ไฟล์ที่นำเข้าการเช็กชื่อของห้องนี้จะแสดงที่นี่"
        icon={FileSpreadsheet}
        title="ยังไม่มีประวัติการนำเข้าไฟล์"
      />
    );
  }

  return (
    <DataTable
      headings={[
        { label: "ลำดับ" },
        { label: "วันที่เช็กชื่อ", sortKey: "attendanceDate" },
        { label: "ผู้นำเข้าไฟล์", sortKey: "importedBy" },
        { label: "วันที่นำเข้า", sortKey: "importedAt" },
        { label: "เวลานำเข้า" },
        { label: "ไฟล์เช็กชื่อ", className: "text-center" },
      ]}
      minWidthClassName="min-w-[900px]"
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
      {rows.map((entry, index) => (
        <DataTableRow key={entry.id}>
          <DataTableCell className="tabular-nums">
            {(page - 1) * rowsPerPage + index + 1}
          </DataTableCell>
          <DataTableCell className="tabular-nums">
            {formatThaiDate(entry.attendanceDate)}
          </DataTableCell>
          <DataTableCell>{entry.importedByName}</DataTableCell>
          <DataTableCell className="tabular-nums">
            {formatThaiDate(entry.importedAt)}
          </DataTableCell>
          <DataTableCell className="tabular-nums">
            {importedTime(entry.importedAt)}
          </DataTableCell>
          <DataTableCell>
            <div className="flex justify-center">
              <Button
                disabled={!entry.hasFile && !entry.sourceUrl}
                icon={FileSpreadsheet}
                onClick={() => onOpenFile(entry)}
                variant="outline"
              >
                {entry.fileName}
              </Button>
            </div>
          </DataTableCell>
        </DataTableRow>
      ))}
    </DataTable>
  );
}
