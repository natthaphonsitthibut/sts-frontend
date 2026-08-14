import { formatClassLabel } from "../../../lib/room-presentation";
import type {
  TeacherAccessAssignment,
  TeacherAccessRosterStudent,
  TeacherLineStatus,
  TeacherLinkStatus,
} from "../types/teacher-access.types";

export const TEACHER_LINK_STATUS_META: Record<
  TeacherLinkStatus,
  {
    label: string;
    variant: "success" | "destructive" | "warning" | "secondary";
  }
> = {
  NOT_CREATED: { label: "ยังไม่ได้สร้าง", variant: "secondary" },
  ACTIVE: { label: "ใช้งานอยู่", variant: "success" },
  EXPIRED: { label: "หมดอายุ", variant: "warning" },
  REVOKED: { label: "เพิกถอนแล้ว", variant: "destructive" },
  SUSPENDED: { label: "ระงับชั่วคราว", variant: "secondary" },
};

export const TEACHER_LINE_STATUS_META: Record<
  TeacherLineStatus,
  {
    label: string;
    variant: "success" | "destructive" | "warning" | "secondary";
  }
> = {
  NOT_VERIFIED: { label: "ยังไม่ยืนยัน", variant: "secondary" },
  VERIFIED: { label: "ยืนยันแล้ว", variant: "success" },
  // Verified but the teacher removed or blocked the official account, so a send
  // would silently fail — worth its own colour rather than reading as ready.
  VERIFIED_NOT_REACHABLE: { label: "ยังไม่เพิ่มเพื่อน", variant: "warning" },
};

/**
 * "ข้าม 4 คน — มีลิงก์ที่ใช้งานได้อยู่แล้ว 3 คน · ยังไม่มีห้องหรือรายวิชาในภาคเรียนนี้ 1 คน"
 * The API returns one reason per teacher; the screen only has room for the tally.
 */
export function summarizeSkipReasons(
  skipped: readonly { teacherMembershipId: number; reason: string }[],
): string {
  const countByReason = new Map<string, number>();
  for (const entry of skipped) {
    countByReason.set(entry.reason, (countByReason.get(entry.reason) ?? 0) + 1);
  }
  const breakdown = [...countByReason.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} ${count} คน`)
    .join(" · ");
  return `ข้าม ${skipped.length} คน — ${breakdown}`;
}

/** "ม.3/2" — the class a teaching assignment belongs to. */
export function assignmentClassLabel(
  assignment: TeacherAccessAssignment,
): string {
  return formatClassLabel(
    assignment.gradeLabel,
    assignment.roomName || assignment.roomCode,
  );
}

/** Homeroom assignments have no subject row, so they read as วิชาโฮมรูม. */
export function assignmentSubjectLabel(
  assignment: TeacherAccessAssignment,
): string {
  return assignment.assignmentKind === "HOMEROOM"
    ? "วิชาโฮมรูม"
    : assignment.subjectName || "รายวิชา";
}

/** Roster rows carry the ONEC name parts; screens always show them joined. */
export function studentDisplayName(
  student: TeacherAccessRosterStudent,
): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || "-";
}
