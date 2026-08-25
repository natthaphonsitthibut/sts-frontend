import type { ReactNode } from "react";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  TableCard,
  TableCardList,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import { cn } from "../../../lib/utils";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import { getAttendanceStatusPresentation } from "../lib/attendance-presentation";
import type { AttendanceSelectionStatus } from "../types/attendance.types";

export type RecordableAttendanceStatus = Exclude<
  AttendanceSelectionStatus,
  "NONE"
>;

const ATTENDANCE_STATUSES: readonly RecordableAttendanceStatus[] = [
  "P_PRESENT",
  "P_LATE",
  "P_ABSENT",
  "P_LEAVE",
];

export interface AttendanceRosterTableRow {
  id: string;
  name: string;
  order?: number;
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

/**
 * The four status buttons for one student. Desktop keeps a fixed pill width
 * so the row doesn't reflow; mobile splits the row evenly (`flex-1`) so the
 * group stays reachable without horizontal scroll.
 */
export function AttendanceStatusButtons({
  buttonClassName,
  catalog,
  current,
  disabled,
  isUnmarked,
  onStatusChange,
  studentId,
  studentName,
}: {
  buttonClassName: string;
  catalog: readonly StatusCatalogItem[];
  current: AttendanceSelectionStatus;
  disabled: boolean;
  isUnmarked: boolean;
  onStatusChange: (
    studentId: string,
    status: RecordableAttendanceStatus,
  ) => void;
  studentId: string;
  studentName: string;
}) {
  return (
    <div
      aria-label={`สถานะของ ${studentName}${isUnmarked ? " — ยังไม่เช็ก" : ""}`}
      className="flex gap-1.5"
      role="group"
    >
      {ATTENDANCE_STATUSES.map((status) => {
        const presentation = getAttendanceStatusPresentation(status, catalog);
        const selected = current === status;
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60",
              selected
                ? presentation.pillActiveClass
                : `bg-white ${presentation.pillIdleClass}`,
              buttonClassName,
            )}
            disabled={disabled}
            data-default-mark={status === "P_PRESENT" ? "true" : undefined}
            key={status}
            onClick={() => onStatusChange(studentId, status)}
            type="button"
          >
            {presentation.shortLabel}
          </button>
        );
      })}
    </div>
  );
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
    <>
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
        sort={sort}
      >
        {rows.map((student, index) => {
          // No default on purpose: an untouched student has no status, so
          // submit can be blocked until the class is actually complete.
          // "Unmarked" reads from the pills themselves (all idle/outline vs.
          // one filled) — no separate badge or row tint needed.
          const current = selections[student.id] ?? "NONE";
          const isUnmarked = current === "NONE";
          return (
            <DataTableRow
              className="scroll-mt-24"
              data-attendance-mark={current}
              data-check-in-row={student.id}
              key={student.id}
            >
              <DataTableCell className="tabular-nums">
                {student.order ?? index + 1}
              </DataTableCell>
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
                <div className="flex justify-center">
                  <AttendanceStatusButtons
                    buttonClassName="w-20"
                    catalog={catalog}
                    current={current}
                    disabled={disabled}
                    isUnmarked={isUnmarked}
                    onStatusChange={onStatusChange}
                    studentId={student.id}
                    studentName={student.name}
                  />
                </div>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTable>

      <TableCardList>
        {rows.map((student, index) => {
          const current = selections[student.id] ?? "NONE";
          const isUnmarked = current === "NONE";
          return (
            <TableCard
              className="scroll-mt-24"
              data-attendance-mark={current}
              data-check-in-row={student.id}
              key={student.id}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-center text-sm font-medium tabular-nums text-slate-500">
                  {student.order ?? index + 1}
                </span>
                {student.avatar}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-slate-900">
                    {student.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    รหัสประจำตัว{" "}
                    <span className="tabular-nums text-sm">
                      {student.studentNumber ?? "-"}
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-2.5">
                <AttendanceStatusButtons
                  buttonClassName="flex-1"
                  catalog={catalog}
                  current={current}
                  disabled={disabled}
                  isUnmarked={isUnmarked}
                  onStatusChange={onStatusChange}
                  studentId={student.id}
                  studentName={student.name}
                />
              </div>
            </TableCard>
          );
        })}
      </TableCardList>
    </>
  );
}
