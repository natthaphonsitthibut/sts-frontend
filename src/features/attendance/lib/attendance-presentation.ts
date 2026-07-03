import type { CSSProperties } from "react";
import { Check, Clock, HelpCircle, X, type LucideIcon } from "lucide-react";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

const ATTENDANCE_STATUS_CODE = {
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
} as const;

export function normalizeAttendanceSelectionStatus(
  status: unknown,
): AttendanceSelectionStatus {
  if (
    status === ATTENDANCE_STATUS_CODE.PRESENT ||
    status === String(ATTENDANCE_STATUS_CODE.PRESENT) ||
    status === "P_PRESENT" ||
    status === "PRESENT"
  ) {
    return "P_PRESENT";
  }
  if (
    status === ATTENDANCE_STATUS_CODE.ABSENT ||
    status === String(ATTENDANCE_STATUS_CODE.ABSENT) ||
    status === "P_ABSENT" ||
    status === "ABSENT"
  ) {
    return "P_ABSENT";
  }
  if (
    status === ATTENDANCE_STATUS_CODE.LATE ||
    status === String(ATTENDANCE_STATUS_CODE.LATE) ||
    status === "P_LATE" ||
    status === "LATE"
  ) {
    return "P_LATE";
  }
  return "NONE";
}

interface AttendanceStatusStyle {
  icon: LucideIcon;
  /** Idle (unselected) record-button classes. */
  idleClass: string;
  /** Active (selected) record-button classes — legacy gradient tokens. */
  activeClass: string;
  /** Read-only status chip classes. */
  displayClass: string;
}

// Color tokens copied verbatim from the legacy Quasar AttendancePage styles.
export const ATTENDANCE_STATUS_STYLE: Record<
  AttendanceSelectionStatus,
  AttendanceStatusStyle
> = {
  P_PRESENT: {
    icon: Check,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass:
      "border-success bg-gradient-to-br from-success-100 to-success-200 text-success-700 shadow-[0_4px_12px_rgba(34,197,94,0.25)]",
    displayClass: "bg-gradient-to-br from-success-100 to-success-200 text-success-700",
  },
  P_ABSENT: {
    icon: X,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass:
      "border-danger bg-gradient-to-br from-danger-100 to-danger-200 text-danger-700 shadow-[0_4px_12px_rgba(239,68,68,0.25)]",
    displayClass: "bg-gradient-to-br from-danger-100 to-danger-200 text-danger-700",
  },
  P_LATE: {
    icon: Clock,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass:
      "border-warning bg-gradient-to-br from-warning-100 to-warning-200 text-warning-700 shadow-[0_4px_12px_rgba(245,158,11,0.25)]",
    displayClass: "bg-gradient-to-br from-warning-100 to-warning-200 text-warning-700",
  },
  NONE: {
    icon: HelpCircle,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-slate-300 bg-slate-100 text-slate-400",
    displayClass: "bg-slate-100 text-slate-400",
  },
};

export function getAttendanceStatusPresentation(
  status: AttendanceSelectionStatus,
  catalog: readonly StatusCatalogItem[],
) {
  const style = ATTENDANCE_STATUS_STYLE[status];
  const item = findStatusCatalogItem(catalog, status);
  return {
    ...style,
    shortLabel: item?.shortLabel ?? item?.label ?? status,
    label: item?.label ?? status,
    badgeVariant: item?.badgeVariant ?? "secondary",
  };
}

/** Record-page status buttons in legacy display order: มา / ขาด / สาย. */
export const ATTENDANCE_RECORD_STATUSES: AttendanceSelectionStatus[] = [
  "P_PRESENT",
  "P_ABSENT",
  "P_LATE",
];

const AVATAR_COLOR_PAIRS = [
  ["#6366f1", "#8b5cf6"],
  ["#ec4899", "#f43f5e"],
  ["#14b8a6", "#06b6d4"],
  ["#f59e0b", "#f97316"],
  ["#10b981", "#22c55e"],
  ["#3b82f6", "#0ea5e9"],
  ["#8b5cf6", "#a855f7"],
  ["#ef4444", "#f97316"],
] as const;

export function getAttendanceAvatarGradient(name: string): CSSProperties {
  if (!name) {
    return { background: "#ccc", color: "#fff" };
  }

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }

  const colorPair =
    AVATAR_COLOR_PAIRS[Math.abs(hash) % AVATAR_COLOR_PAIRS.length] ??
    AVATAR_COLOR_PAIRS[0];

  return {
    background: `linear-gradient(135deg, ${colorPair[0]}, ${colorPair[1]})`,
    color: "white",
    textShadow: "0 1px 2px rgba(0,0,0,0.2)",
  };
}

export function getTodayIso(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
