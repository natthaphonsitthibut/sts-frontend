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
        // No default on purpose: an untouched student has no status, so
        // "ยังไม่เช็ค" stays visibly different from "มา" and submit can be
        // blocked until the class is actually complete.
        const current = selections[student.id] ?? "NONE";
        const isUnmarked = current === "NONE";
        return (
          // Exposes the mark as data rather than leaving it inferable only from
          // pill styling — the badge text is always in the DOM (hidden when
          // marked) so it cannot be used to detect state.
          <DataTableRow data-attendance-mark={current} key={student.id}>
            <DataTableCell className="tabular-nums">{index + 1}</DataTableCell>
            <DataTableCell>
              <div className="flex justify-center">{student.avatar}</div>
            </DataTableCell>
            <DataTableCell className="font-medium tabular-nums">
              {student.studentNumber ?? "-"}
            </DataTableCell>
            <DataTableCell className="font-medium text-slate-900">
              {/* justify-between pins the badge to the cell's right edge so it
                  lines up down the column instead of drifting with each name's
                  length. It is always rendered and only hidden, because removing
                  it on every tap would resize the column and shift the table. */}
              <span className="flex items-center justify-between gap-3">
                {student.name}
                <span
                  aria-hidden={!isUnmarked}
                  className={cn(
                    "shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500",
                    isUnmarked ? "" : "invisible",
                  )}
                >
                  ยังไม่เช็ค
                </span>
              </span>
            </DataTableCell>
            <DataTableCell>
              <div
                aria-label={`สถานะของ ${student.name}${isUnmarked ? " — ยังไม่เช็ค" : ""}`}
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
