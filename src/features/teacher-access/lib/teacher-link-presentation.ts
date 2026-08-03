import { formatRoomLabel } from "../../../lib/room-presentation";
import type {
  TeacherAccessAssignment,
  TeacherAccessRosterStudent,
  TeacherLinkStatus,
} from "../types/teacher-access.types";

export const TEACHER_LINK_STATUS_META: Record<
  TeacherLinkStatus,
  { label: string; variant: "success" | "destructive" | "warning" | "secondary" }
> = {
  NOT_CREATED: { label: "ยังไม่ได้สร้าง", variant: "secondary" },
  ACTIVE: { label: "ใช้งานอยู่", variant: "success" },
  EXPIRED: { label: "หมดอายุ", variant: "warning" },
  REVOKED: { label: "เพิกถอนแล้ว", variant: "destructive" },
  SUSPENDED: { label: "ระงับชั่วคราว", variant: "secondary" },
};

/** "ม.3/2" — the class a teaching assignment belongs to. */
export function assignmentClassLabel(assignment: TeacherAccessAssignment): string {
  return `${assignment.gradeLabel}/${assignment.roomName || formatRoomLabel(assignment.roomCode)}`;
}

/** Homeroom assignments have no subject row, so they read as วิชาโฮมรูม. */
export function assignmentSubjectLabel(assignment: TeacherAccessAssignment): string {
  return assignment.assignmentKind === "HOMEROOM"
    ? "วิชาโฮมรูม"
    : assignment.subjectName || "รายวิชา";
}

/** Roster rows carry the ONEC name parts; screens always show them joined. */
export function studentDisplayName(student: TeacherAccessRosterStudent): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ") || "-";
}
