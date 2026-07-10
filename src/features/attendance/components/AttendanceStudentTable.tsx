import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Search,
  Undo2,
  UserCheck,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { Badge, Button, Input } from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
  type DataTableSortState,
} from "../../../components/layout/data-table";
import {
  ATTENDANCE_RECORD_STATUSES,
  getAttendanceStatusPresentation,
  getAttendanceAvatarGradient,
} from "../lib/attendance-presentation";
import type {
  AttendanceSelectionStatus,
  AttendanceStudent,
} from "../types/attendance.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

interface AttendanceStudentTableProps {
  students: AttendanceStudent[];
  selections: Record<string, AttendanceSelectionStatus>;
  onStatusChange: (studentId: string, status: AttendanceSelectionStatus) => void;
  onBulkStatusChange?: (status: AttendanceSelectionStatus) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
}

interface AttendanceRosterItem {
  student: AttendanceStudent;
  rosterNumber: number;
}

const ROLL_CALL_ADVANCE_DELAY_MS = 700;

function StatusButton({
  status,
  isActive,
  onClick,
  disabled,
  catalog,
}: {
  status: AttendanceSelectionStatus;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  catalog: readonly StatusCatalogItem[];
}) {
  const meta = getAttendanceStatusPresentation(status, catalog);
  const Icon = meta.icon;

  return (
    <button
      aria-pressed={isActive}
      className={cn(
        "flex min-w-20 items-center justify-center gap-1.5 rounded-full border-[1.5px] px-4 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 active:scale-95",
        isActive ? meta.activeClass : meta.idleClass,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" aria-hidden="true" />
      {meta.shortLabel}
    </button>
  );
}

function toCount(value: number | string | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a || "").localeCompare(b || "", "th");
}

function getCurrentStatusLabel(
  studentId: string,
  selections: Record<string, AttendanceSelectionStatus>,
  catalog: readonly StatusCatalogItem[],
): string {
  const status = selections[studentId] ?? "P_PRESENT";
  return getAttendanceStatusPresentation(status, catalog).label;
}

function compareRosterItems(
  left: AttendanceRosterItem,
  right: AttendanceRosterItem,
  key: string,
  selections: Record<string, AttendanceSelectionStatus>,
  catalog: readonly StatusCatalogItem[],
): number {
  if (key === "roster") return left.rosterNumber - right.rosterNumber;
  if (key === "name") return compareText(left.student.name, right.student.name);
  if (key === "absence") {
    return toCount(left.student.total_absent) - toCount(right.student.total_absent);
  }
  if (key === "status") {
    return compareText(
      getCurrentStatusLabel(left.student.id, selections, catalog),
      getCurrentStatusLabel(right.student.id, selections, catalog),
    );
  }
  return 0;
}

export function AttendanceStudentTable({
  students,
  selections,
  onStatusChange,
  onBulkStatusChange,
  onUndo,
  canUndo,
  disabled = false,
}: AttendanceStudentTableProps) {
  const attendanceStatusCatalog = useStatusCatalog("ATTENDANCE_RECORD").items;
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "roll-call">("list");
  const [activeRosterIndex, setActiveRosterIndex] = useState(0);
  const [sort, setSort] = useState<DataTableSortState | undefined>();
  const advanceTimerRef = useRef<number | null>(null);
  const [reviewedStudentIds, setReviewedStudentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingAdvance, setPendingAdvance] = useState<{
    studentId: string;
    status: AttendanceSelectionStatus;
  } | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    studentId: string | null;
    reviewedStudentIds: Set<string>;
  } | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleStudents = useMemo(
    () =>
      students
        .map((student, index) => ({ student, rosterNumber: index + 1 }))
        .filter(({ student, rosterNumber }) => {
          if (!normalizedSearch) return true;
          return (
            student.name.toLowerCase().includes(normalizedSearch) ||
            String(rosterNumber).includes(normalizedSearch)
          );
        }),
    [normalizedSearch, students],
  );
  const sortedVisibleStudents = useMemo(() => {
    if (!sort) return visibleStudents;
    return [...visibleStudents].sort((left, right) => {
      const result = compareRosterItems(
        left,
        right,
        sort.key,
        selections,
        attendanceStatusCatalog,
      );
      return sort.direction === "asc" ? result : -result;
    });
  }, [attendanceStatusCatalog, selections, sort, visibleStudents]);
  const safeActiveRosterIndex = Math.min(
    activeRosterIndex,
    Math.max(visibleStudents.length - 1, 0),
  );
  const activeRosterItem = visibleStudents[safeActiveRosterIndex] ?? null;
  const reviewedVisibleCount = visibleStudents.filter(({ student }) =>
    reviewedStudentIds.has(student.id),
  ).length;
  const remainingVisibleCount = Math.max(
    visibleStudents.length - reviewedVisibleCount,
    0,
  );
  const pendingStatusMeta = pendingAdvance
    ? getAttendanceStatusPresentation(pendingAdvance.status, attendanceStatusCatalog)
    : null;
  const PendingStatusIcon = pendingStatusMeta?.icon;

  useEffect(
    () => () => {
      if (advanceTimerRef.current) {
        window.clearTimeout(advanceTimerRef.current);
      }
    },
    [],
  );

  function handleStatusChange(
    studentId: string,
    status: AttendanceSelectionStatus,
  ): void {
    if (pendingAdvance) return;
    setUndoSnapshot({
      studentId,
      reviewedStudentIds: new Set(reviewedStudentIds),
    });
    onStatusChange(studentId, status);
    setReviewedStudentIds((current) => new Set(current).add(studentId));

    if (viewMode === "roll-call") {
      setPendingAdvance({ studentId, status });
      advanceTimerRef.current = window.setTimeout(() => {
        setActiveRosterIndex(
          Math.min(safeActiveRosterIndex + 1, Math.max(visibleStudents.length - 1, 0)),
        );
        setPendingAdvance(null);
        advanceTimerRef.current = null;
      }, ROLL_CALL_ADVANCE_DELAY_MS);
    }
  }

  function handleBulkStatusChange(status: AttendanceSelectionStatus): void {
    setUndoSnapshot({
      studentId: activeRosterItem?.student.id ?? null,
      reviewedStudentIds: new Set(reviewedStudentIds),
    });
    onBulkStatusChange?.(status);
    setReviewedStudentIds(new Set(students.map((student) => student.id)));
  }

  function handleUndo(): void {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setPendingAdvance(null);
    onUndo?.();
    if (undoSnapshot) {
      setReviewedStudentIds(new Set(undoSnapshot.reviewedStudentIds));
      if (viewMode === "roll-call" && undoSnapshot.studentId) {
        const previousIndex = visibleStudents.findIndex(
          ({ student }) => student.id === undoSnapshot.studentId,
        );
        if (previousIndex >= 0) {
          setActiveRosterIndex(previousIndex);
        }
      }
    } else {
      setReviewedStudentIds(new Set());
    }
    setUndoSnapshot(null);
  }

  function renderStudentIdentity(student: AttendanceStudent, trailing?: ReactNode) {
    return (
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
          style={getAttendanceAvatarGradient(student.name)}
        >
          {student.name?.[0] || "?"}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <div className="min-w-0 truncate font-bold text-slate-800">
            {student.name}
          </div>
          {trailing}
        </div>
      </div>
    );
  }

  function renderAbsenceRisk(student: AttendanceStudent) {
    const totalAbsent = toCount(student.total_absent);
    if (totalAbsent <= 0) {
      return <span className="text-slate-400">-</span>;
    }
    return (
      <Badge
        className="w-fit"
        variant={totalAbsent >= 2 ? "destructive" : "warning"}
      >
        ขาดสะสม {totalAbsent} วัน
      </Badge>
    );
  }

  function renderStatusControls(student: AttendanceStudent, showDefaultStatus = true) {
    const current = selections[student.id] ?? (showDefaultStatus ? "P_PRESENT" : undefined);
    const controlsDisabled =
      disabled || Boolean(pendingAdvance && pendingAdvance.studentId === student.id);
    return (
      <div className="flex flex-wrap gap-2 lg:justify-end">
        {ATTENDANCE_RECORD_STATUSES.map((status) => (
          <StatusButton
            catalog={attendanceStatusCatalog}
            key={status}
            isActive={current === status}
            onClick={() => handleStatusChange(student.id, status)}
            status={status}
            disabled={controlsDisabled}
          />
        ))}
      </div>
    );
  }

  function renderStudentCard(
    student: AttendanceStudent,
    rosterNumber: number,
    isRollCall = false,
  ) {
    const totalAbsent = toCount(student.total_absent);
    const hasAbsenceRisk = totalAbsent > 0;

    return (
      <div
        key={student.id}
        className={cn(
          "flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between",
          isRollCall && "sm:flex-col sm:items-stretch",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="flex w-6 shrink-0 justify-center text-sm font-semibold text-slate-400">
            {rosterNumber}
          </div>
          <div className="min-w-0 flex-1">
            {renderStudentIdentity(
              student,
              hasAbsenceRisk ? (
                <Badge
                  className="w-fit"
                  variant={totalAbsent >= 2 ? "destructive" : "warning"}
                >
                  ขาดสะสม {totalAbsent} วัน
                </Badge>
              ) : null,
            )}
          </div>
        </div>

        {renderStatusControls(student, !isRollCall)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                aria-label="ค้นหานักเรียนหรือเลขที่"
                className="pl-9"
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setActiveRosterIndex(0);
                }}
                placeholder="ค้นหาชื่อหรือเลขที่"
                value={searchTerm}
              />
            </div>
            <p className="shrink-0 rounded-full bg-slate-50 px-3 py-2 text-xs font-bold tabular-nums text-slate-500">
              แสดง {visibleStudents.length} จาก {students.length} คน
            </p>
          </div>

          {onBulkStatusChange ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                icon={ListChecks}
                onClick={() => setViewMode("list")}
                size="sm"
                variant={viewMode === "list" ? "default" : "outline"}
              >
                รายการ
              </Button>
              <Button
                icon={UserCheck}
                onClick={() => {
                  setViewMode("roll-call");
                  setActiveRosterIndex(0);
                }}
                size="sm"
                variant={viewMode === "roll-call" ? "default" : "outline"}
              >
                ไล่ทีละคน
              </Button>
              {ATTENDANCE_RECORD_STATUSES.map((status) => {
                const meta = getAttendanceStatusPresentation(status, attendanceStatusCatalog);
                return (
                  <Button
                    key={status}
                    disabled={disabled}
                    icon={meta.icon}
                    onClick={() => handleBulkStatusChange(status)}
                    size="sm"
                    variant={status === "P_ABSENT" ? "destructive" : "outline"}
                  >
                    {meta.shortLabel}ทั้งหมด
                  </Button>
                );
              })}
              <Button
                disabled={disabled || !canUndo || !onUndo}
                icon={Undo2}
                onClick={handleUndo}
                size="sm"
                variant="ghost"
              >
                ย้อนกลับ
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {viewMode === "roll-call" && onBulkStatusChange && activeRosterItem ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-extrabold text-slate-800">
                คนที่ {safeActiveRosterIndex + 1} จาก {visibleStudents.length}
              </p>
              <p className="text-xs font-medium text-slate-500">
                เหลือ {remainingVisibleCount} คน
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={Boolean(pendingAdvance) || safeActiveRosterIndex === 0}
                icon={ChevronLeft}
                onClick={() =>
                  setActiveRosterIndex(Math.max(safeActiveRosterIndex - 1, 0))
                }
                size="sm"
                variant="outline"
              >
                ก่อนหน้า
              </Button>
              <Button
                disabled={
                  Boolean(pendingAdvance) ||
                  safeActiveRosterIndex >= visibleStudents.length - 1
                }
                icon={ChevronRight}
                onClick={() =>
                  setActiveRosterIndex(
                    Math.min(safeActiveRosterIndex + 1, visibleStudents.length - 1),
                  )
                }
                size="sm"
                variant="outline"
              >
                ถัดไป
              </Button>
            </div>
          </div>
          <div className="mb-3 min-h-9" aria-live="polite">
            {pendingStatusMeta ? (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold",
                  pendingStatusMeta.displayClass,
                )}
              >
                {PendingStatusIcon ? (
                  <PendingStatusIcon className="size-4" aria-hidden="true" />
                ) : null}
                บันทึก {pendingStatusMeta.label}
              </div>
            ) : (
              <div className="h-9" />
            )}
          </div>
          {renderStudentCard(
            activeRosterItem.student,
            activeRosterItem.rosterNumber,
            true,
          )}
        </div>
      ) : null}

      {visibleStudents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
          ไม่พบนักเรียนที่ตรงกับคำค้นหา
        </div>
      ) : null}

      {(viewMode === "list" || !onBulkStatusChange) && visibleStudents.length > 0 ? (
        <DataTable
          columnWidths={["w-[10%]", "w-[34%]", "w-[18%]", "w-[38%]"]}
          headings={[
            { label: "เลขที่", sortKey: "roster" },
            { label: "นักเรียน", sortKey: "name" },
            { label: "ขาดสะสม", sortKey: "absence" },
            { label: "สถานะ", sortKey: "status" },
          ]}
          minWidthClassName="min-w-[760px]"
          onSortChange={setSort}
          responsive={false}
          sort={sort}
        >
          {sortedVisibleStudents.map(({ student, rosterNumber }) => (
            <DataTableRow key={student.id}>
              <DataTableCell className="font-semibold text-slate-400">
                {rosterNumber}
              </DataTableCell>
              <DataTableCell>{renderStudentIdentity(student)}</DataTableCell>
              <DataTableCell>{renderAbsenceRisk(student)}</DataTableCell>
              <DataTableCell>{renderStatusControls(student)}</DataTableCell>
            </DataTableRow>
          ))}
        </DataTable>
      ) : null}
    </div>
  );
}
