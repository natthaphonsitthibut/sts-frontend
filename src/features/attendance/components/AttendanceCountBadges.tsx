import { cn } from "../../../lib/utils";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import {
  ATTENDANCE_COUNT_KEY_BY_STATUS,
  getAttendanceStatusPresentation,
  type AttendanceCounts,
} from "../lib/attendance-presentation";

const COUNT_BY_INTERNAL_CODE = ATTENDANCE_COUNT_KEY_BY_STATUS;

export function AttendanceCountBadges({
  catalog,
  counts,
}: {
  catalog: readonly StatusCatalogItem[];
  counts: AttendanceCounts;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(COUNT_BY_INTERNAL_CODE).map(([code, countKey]) => {
        const status = code as AttendanceSelectionStatus;
        const meta = getAttendanceStatusPresentation(status, catalog);
        return (
          <span
            className={cn(
              "inline-flex min-w-[68px] items-center justify-center rounded-full px-3 py-1 text-xs font-bold tabular-nums transition-colors",
              meta.displayClass,
            )}
            key={code}
          >
            {meta.shortLabel} {counts[countKey]}
          </span>
        );
      })}
    </div>
  );
}
