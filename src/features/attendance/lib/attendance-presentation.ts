import { CalendarOff, Check, Clock, HelpCircle, X, type LucideIcon } from "lucide-react";
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
  LEAVE: 4,
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
  if (
    status === ATTENDANCE_STATUS_CODE.LEAVE ||
    status === String(ATTENDANCE_STATUS_CODE.LEAVE) ||
    status === "P_LEAVE" ||
    status === "LEAVE"
  ) {
    return "P_LEAVE";
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
  /** Outlined pill shown when the status is NOT the one a row landed on. */
  pillIdleClass: string;
  /** Filled pill marking the status a row actually landed on. */
  pillActiveClass: string;
}

// Attendance colors are composed only from the shared Figma palette tokens.
export const ATTENDANCE_STATUS_STYLE: Record<
  AttendanceSelectionStatus,
  AttendanceStatusStyle
> = {
  P_PRESENT: {
    icon: Check,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-success bg-success-100 text-success shadow-sm",
    displayClass: "bg-success-100 text-success",
    pillIdleClass: "border-success text-success",
    pillActiveClass: "border-success bg-success text-white",
  },
  P_ABSENT: {
    icon: X,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-danger bg-danger-100 text-danger shadow-sm",
    displayClass: "bg-danger-100 text-danger",
    pillIdleClass: "border-danger text-danger",
    pillActiveClass: "border-danger bg-danger text-white",
  },
  P_LATE: {
    icon: Clock,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-brand-yellow bg-brand-yellow-bg text-brand-yellow shadow-sm",
    displayClass: "bg-brand-yellow-bg text-brand-yellow",
    pillIdleClass: "border-brand-yellow text-brand-yellow",
    pillActiveClass: "border-brand-yellow bg-brand-yellow text-white",
  },
  P_LEAVE: {
    icon: CalendarOff,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-attendance-leave bg-brand-orange-bg text-brand-orange shadow-sm",
    displayClass: "bg-brand-orange-bg text-brand-orange",
    pillIdleClass: "border-attendance-leave text-brand-orange",
    pillActiveClass: "border-attendance-leave bg-attendance-leave text-white",
  },
  NONE: {
    icon: HelpCircle,
    idleClass: "border-slate-200 bg-white text-slate-500",
    activeClass: "border-slate-300 bg-slate-100 text-slate-500",
    displayClass: "bg-slate-100 text-slate-500",
    pillIdleClass: "border-slate-200 text-slate-500",
    pillActiveClass: "border-slate-300 bg-slate-300 text-slate-700",
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

/** Record-page status buttons in legacy display order: มา / ขาด / สาย / ลา. */
export const ATTENDANCE_RECORD_STATUSES: AttendanceSelectionStatus[] = [
  "P_PRESENT",
  "P_ABSENT",
  "P_LATE",
  "P_LEAVE",
];

export interface AttendanceCounts {
  present: number;
  absent: number;
  late: number;
  leave: number;
}

/** Which tally each recordable status feeds; `NONE` is deliberately absent. */
export const ATTENDANCE_COUNT_KEY_BY_STATUS: Record<string, keyof AttendanceCounts> = {
  P_PRESENT: "present",
  P_ABSENT: "absent",
  P_LATE: "late",
  P_LEAVE: "leave",
};

/** Tallies selections so every check-in surface reports the same status set. */
export function countAttendanceStatuses(
  statuses: readonly AttendanceSelectionStatus[],
): AttendanceCounts {
  const counts: AttendanceCounts = { present: 0, absent: 0, late: 0, leave: 0 };
  for (const status of statuses) {
    const key = ATTENDANCE_COUNT_KEY_BY_STATUS[status];
    if (key) counts[key] += 1;
  }
  return counts;
}



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
