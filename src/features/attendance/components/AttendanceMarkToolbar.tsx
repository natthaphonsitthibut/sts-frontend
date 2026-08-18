import { Check, Undo2 } from "lucide-react";
import { Button } from "../../../components/base";
import { formatThaiTime } from "../../../lib/date-time";
import type { AutosaveState } from "../hooks/useAttendanceMarks";

interface AttendanceMarkToolbarProps {
  markedCount: number;
  unmarkedCount: number;
  totalCount: number;
  autosaveState: AutosaveState;
  /** Real reason from the server, shown instead of a generic failure line. */
  failureMessage: string | null;
  lastSavedAt: string | null;
  canUndo: boolean;
  disabled?: boolean;
  onMarkRemainingPresent: () => void;
  onUndo: () => void;
  onRetrySave: () => void;
}

function autosaveLabel(
  state: AutosaveState,
  failureMessage: string | null,
  lastSavedAt: string | null,
): string {
  if (state === "saving") return "กำลังบันทึกอัตโนมัติ…";
  if (state === "pending") return "รอบันทึกอัตโนมัติ…";
  if (state === "retrying") {
    return `${failureMessage ?? "บันทึกอัตโนมัติไม่สำเร็จ"} · กำลังลองใหม่อัตโนมัติ`;
  }
  if (state === "blocked") {
    // The server reason is already the actionable part (round closed, calendar
    // not opened for this date, …) and each needs a different fix, so state that
    // autosave stopped rather than prescribing one remedy that may not apply.
    return `${failureMessage ?? "บันทึกอัตโนมัติไม่สำเร็จ"} · หยุดบันทึกอัตโนมัติแล้ว`;
  }
  if (state === "error") {
    return `${failureMessage ?? "บันทึกอัตโนมัติไม่สำเร็จ"} · กรุณากดลองใหม่`;
  }
  if (state === "saved" && lastSavedAt) {
    return `บันทึกอัตโนมัติ ${formatThaiTime(lastSavedAt)} น. · ยังไม่ส่ง`;
  }
  return "ยังไม่มีการเปลี่ยนแปลงที่ต้องบันทึก";
}

/**
 * Progress and bulk actions for a check-in in progress. The autosave line is
 * the part that earns the missing save button: without it a teacher has no way
 * to tell that tapping alone already persisted the marks.
 */
export function AttendanceMarkToolbar({
  markedCount,
  unmarkedCount,
  totalCount,
  autosaveState,
  failureMessage,
  lastSavedAt,
  canUndo,
  disabled = false,
  onMarkRemainingPresent,
  onUndo,
  onRetrySave,
}: AttendanceMarkToolbarProps) {
  return (
    // Sticky so progress and the bulk/undo actions stay reachable while
    // scrolling a long roster — this is the state a teacher checks
    // continuously while marking, not just once at the end.
    <div className="sticky top-0 z-10 mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 sm:flex-none">
        {/* flex-1 on both keeps the pair equal width and stable — the count
            growing from a 1-digit to a 2-digit class size must not resize
            the button, only the row split decides its width. */}
        <Button
          className="flex-1 sm:flex-none"
          disabled={disabled || unmarkedCount === 0}
          icon={Check}
          onClick={onMarkRemainingPresent}
          size="sm"
        >
          มาทั้งหมด{unmarkedCount > 0 ? ` (${unmarkedCount})` : ""}
        </Button>
        <Button
          className="flex-1 sm:flex-none"
          disabled={disabled || !canUndo}
          icon={Undo2}
          onClick={onUndo}
          size="sm"
          variant="outline"
        >
          ย้อนกลับ
        </Button>
      </div>

      <div className="flex flex-col gap-1 text-sm sm:items-end">
        <p className="tabular-nums text-content-secondary">
          เช็กแล้ว {markedCount}/{totalCount} คน
          {unmarkedCount > 0 ? ` · เหลือ ${unmarkedCount} คน` : " · ครบแล้ว"}
        </p>
        <div className="flex items-center gap-2">
          <p
            aria-live="polite"
            className={
              autosaveState === "error" ||
              autosaveState === "retrying" ||
              autosaveState === "blocked"
                ? "text-xs font-medium text-danger"
                : "text-xs text-content-secondary"
            }
          >
            {autosaveLabel(autosaveState, failureMessage, lastSavedAt)}
          </p>
          {/* Retry is only offered while it can still work; a blocked round
              needs a reload, not another attempt. */}
          {autosaveState === "error" ? (
            <Button onClick={onRetrySave} size="sm" variant="outline">
              ลองใหม่
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
