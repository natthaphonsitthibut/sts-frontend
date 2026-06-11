import { cn } from "../../../lib/utils";
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
}

function StatusButton({
  status,
  isActive,
  onClick,
}: {
  status: AttendanceSelectionStatus;
  isActive: boolean;
  onClick: () => void;
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
      onClick={onClick}
      type="button"
    >
      <Icon className="size-4" aria-hidden="true" />
      {meta.shortLabel}
    </button>
  );
}

export function AttendanceStudentTable({
  students,
  selections,
  onStatusChange,
}: AttendanceStudentTableProps) {
  return (
    <div className="flex flex-col gap-3">
      {students.map((student, index) => {
        const current = selections[student.id] ?? "P_PRESENT";

        return (
          <div
            key={student.id}
            className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex w-6 shrink-0 justify-center text-sm font-semibold text-slate-400">
                {index + 1}
              </div>
              <div
                className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                style={getAttendanceAvatarGradient(student.name)}
              >
                {student.name?.[0] || "?"}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold text-slate-800">
                  {student.name}
                </h3>
                <div className="mt-0.5 text-xs font-semibold text-slate-400">
                  รหัส: {student.id}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {ATTENDANCE_RECORD_STATUSES.map((status) => (
                <StatusButton
                  key={status}
                  isActive={current === status}
                  onClick={() => onStatusChange(student.id, status)}
                  status={status}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
