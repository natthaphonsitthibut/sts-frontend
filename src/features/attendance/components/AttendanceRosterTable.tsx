import type { ReactNode } from "react";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { cn } from "../../../lib/utils";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import { getAttendanceStatusPresentation } from "../lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../types/attendance.types";

type RecordableAttendanceStatus = Exclude<AttendanceSelectionStatus, "NONE">;

const ATTENDANCE_STATUSES: readonly RecordableAttendanceStatus[] = [
  "P_PRESENT",
  "P_LATE",
  "P_LEAVE",
  "P_ABSENT",
];

export interface AttendanceRosterTableRow {
  id: string;
  name: string;
  studentNumber?: string | null;
  avatar: ReactNode;
}

interface AttendanceRosterTableProps {
  catalog: readonly StatusCatalogItem[];
  disabled?: boolean;
  onSortChange?: (sort: DataTableSortState | undefined) => void;
  onStatusChange: (
    studentId: string,
    status: RecordableAttendanceStatus,
  ) => void;
  rows: readonly AttendanceRosterTableRow[];
  selections: Readonly<Record<string, AttendanceSelectionStatus>>;
  sort?: DataTableSortState;
}

/** Shared attendance grid used by account and teacher-link check-in surfaces. */
export function AttendanceRosterTable({
  catalog,
  disabled = false,
  onSortChange,
  onStatusChange,
  rows,
  selections,
  sort,
}: AttendanceRosterTableProps) {
  return (
    <DataTable
      headings={[
        { label: "ลำดับ" },
        { label: "รูปประจำตัว", className: "text-center" },
        { label: "รหัสประจำตัว", sortKey: "studentNumber" },
        { label: "ชื่อ-นามสกุล", sortKey: "name" },
        { label: "สถานะการเข้าเรียน", className: "text-center" },
      ]}
      minWidthClassName="min-w-[1040px]"
      onSortChange={onSortChange}
      responsive={false}
      sort={sort}
    >
      {rows.map((student, index) => {
        const current = selections[student.id] ?? "P_PRESENT";
        return (
          <DataTableRow key={student.id}>
            <DataTableCell className="tabular-nums">{index + 1}</DataTableCell>
            <DataTableCell>
              <div className="flex justify-center">{student.avatar}</div>
            </DataTableCell>
            <DataTableCell className="font-medium tabular-nums">
              {student.studentNumber ?? "-"}
            </DataTableCell>
            <DataTableCell className="font-medium text-slate-900">
              {student.name}
            </DataTableCell>
            <DataTableCell>
              <div
                aria-label={`สถานะของ ${student.name}`}
                className="flex min-w-[340px] justify-center gap-1.5"
                role="group"
              >
                {ATTENDANCE_STATUSES.map((status) => {
                  const presentation = getAttendanceStatusPresentation(
                    status,
                    catalog,
                  );
                  const selected = current === status;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        "inline-flex h-11 w-20 items-center justify-center rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? presentation.pillActiveClass
                          : `bg-white ${presentation.pillIdleClass}`,
                      )}
                      disabled={disabled}
                      key={status}
                      onClick={() => onStatusChange(student.id, status)}
                      type="button"
                    >
                      {presentation.shortLabel}
                    </button>
                  );
                })}
              </div>
            </DataTableCell>
          </DataTableRow>
        );
      })}
    </DataTable>
  );
}
