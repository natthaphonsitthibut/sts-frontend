import { useMemo, useState } from "react";
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
  ATTENDANCE_RECORD_STATUSES,
  ATTENDANCE_STATUS_META,
  getAttendanceAvatarGradient,
} from "../lib/attendance-presentation";
import type {
  AttendanceSelectionStatus,
  AttendanceStudent,
} from "../types/attendance.types";

interface AttendanceStudentTableProps {
  students: AttendanceStudent[];
  selections: Record<string, AttendanceSelectionStatus>;
  onStatusChange: (studentId: string, status: AttendanceSelectionStatus) => void;
  onBulkStatusChange?: (status: AttendanceSelectionStatus) => void;
  onUndo?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
}

function StatusButton({
  status,
  isActive,
  onClick,
  disabled,
}: {
  status: AttendanceSelectionStatus;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const meta = ATTENDANCE_STATUS_META[status];
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

export function AttendanceStudentTable({
  students,
  selections,
  onStatusChange,
  onBulkStatusChange,
  onUndo,
  canUndo,
  disabled = false,
}: AttendanceStudentTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "roll-call">("list");
  const [activeRosterIndex, setActiveRosterIndex] = useState(0);
  const [reviewedStudentIds, setReviewedStudentIds] = useState<Set<string>>(
    () => new Set(),
  );
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

  function handleStatusChange(
    studentId: string,
    status: AttendanceSelectionStatus,
  ): void {
    onStatusChange(studentId, status);
    setReviewedStudentIds((current) => new Set(current).add(studentId));

    if (viewMode === "roll-call") {
      setActiveRosterIndex(
        Math.min(safeActiveRosterIndex + 1, Math.max(visibleStudents.length - 1, 0)),
      );
    }
  }

  function handleBulkStatusChange(status: AttendanceSelectionStatus): void {
    onBulkStatusChange?.(status);
    setReviewedStudentIds(new Set(students.map((student) => student.id)));
  }

  function handleUndo(): void {
    onUndo?.();
    setReviewedStudentIds(new Set());
  }

  function renderStudentCard(
    student: AttendanceStudent,
    rosterNumber: number,
    isRollCall = false,
  ) {
    const current = selections[student.id] ?? "P_PRESENT";
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
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
            style={getAttendanceAvatarGradient(student.name)}
          >
            {student.name?.[0] || "?"}
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="truncate text-base font-extrabold text-slate-800">
              {student.name}
            </h3>
            {hasAbsenceRisk ? (
              <Badge
                className="w-fit"
                variant={totalAbsent >= 2 ? "destructive" : "warning"}
              >
                ขาดสะสม {totalAbsent} วัน
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          {ATTENDANCE_RECORD_STATUSES.map((status) => (
            <StatusButton
              key={status}
              isActive={current === status}
              onClick={() => handleStatusChange(student.id, status)}
              status={status}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-1.5">
            <div className="relative">
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
            <p className="text-xs font-medium text-slate-500">
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
                const meta = ATTENDANCE_STATUS_META[status];
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
                disabled={safeActiveRosterIndex === 0}
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
                disabled={safeActiveRosterIndex >= visibleStudents.length - 1}
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

      {viewMode === "list" || !onBulkStatusChange
        ? visibleStudents.map(({ student, rosterNumber }) =>
            renderStudentCard(student, rosterNumber),
          )
        : null}
    </div>
  );
}
