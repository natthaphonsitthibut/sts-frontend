import { Check, Clock, HelpCircle, X, type LucideIcon } from "lucide-react";
import type {
  AttendanceSelectionStatus,
  SchoolTerm,
  SchoolTermStatus,
} from "../types/attendance.types";
import { findStatusCatalogItem } from "../../status-catalog/hooks/useStatusCatalog";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";

const ATTENDANCE_STATUS_CODE = {
  PRESENT: 1,
  ABSENT: 2,
  LATE: 3,
} as const;

export const SCHOOL_TERM_STATUSES: readonly SchoolTermStatus[] = [
  "DRAFT",
  "ACTIVE",
  "CLOSED",
];

const SCHOOL_TERM_STATUS_FALLBACK_LABELS: Record<SchoolTermStatus, string> = {
  DRAFT: "ร่าง",
  ACTIVE: "เปิดใช้งาน",
  CLOSED: "ปิดภาคเรียน",
};

export function getSchoolTermStatusLabel(
  status: SchoolTermStatus,
  catalog: readonly StatusCatalogItem[] = [],
): string {
  return (
    findStatusCatalogItem(catalog, status)?.label ??
    SCHOOL_TERM_STATUS_FALLBACK_LABELS[status]
  );
}

export function formatSchoolTermLabel(
  term: Pick<SchoolTerm, "academicYear" | "semester" | "status">,
  catalog: readonly StatusCatalogItem[] = [],
): string {
  return `${term.academicYear}/${term.semester} · ${getSchoolTermStatusLabel(term.status, catalog)}`;
}

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
    activeClass: "border-slate-300 bg-slate-100 text-slate-500",
    displayClass: "bg-slate-100 text-slate-500",
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



export function getTodayIso(reference: Date = new Date()): string {
  const year = reference.getFullYear();
  const month = String(reference.getMonth() + 1).padStart(2, "0");
  const day = String(reference.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** ISO weekday (1=Monday..7=Sunday) for a `YYYY-MM-DD` calendar date string. */
export function getIsoDayOfWeekFromDateString(dateString: string): number {
  const [year, month, day] = dateString.split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}
