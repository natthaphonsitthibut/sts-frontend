import type { AuditLogDetail, AuditLogEntry } from "../types/audit-log.types";

/**
 * What kind of record an event points at, as the history pages name it. Keyed
 * by the `target_type` each write path records (table names mostly, a few
 * older short forms), so every stored value reads as Thai rather than code.
 */
const TARGET_TYPE_LABELS: Record<string, string> = {
  absence_reason_categories: "หมวดสาเหตุการขาดเรียน",
  "absence-reason-categories": "หมวดสาเหตุการขาดเรียน",
  absence_reasons: "สาเหตุการขาดเรียน",
  araid_profile: "บัญชี AraID",
  araid_record: "ข้อมูล AraID",
  attendance_session: "รอบเช็กชื่อ",
  case: "เคสติดตาม",
  classroom_attendance_links: "ลิงก์เช็กชื่อ",
  classroom_homeroom_teachers: "ครูประจำชั้น",
  classroom_student_comment_watchlist: "กลุ่มเฝ้าระวังจากความคิดเห็นครู",
  classroom_student_comments: "ความคิดเห็นครูต่อนักเรียน",
  classroom_subject_teachers: "ครูประจำวิชา",
  classroom_teacher_assignments: "การมอบหมายครู",
  curriculum_subjects: "รายวิชาในหลักสูตร",
  field_follower: "ผู้ติดตามภาคสนาม",
  import: "การนำเข้าข้อมูล",
  "referral-agency-kinds": "ประเภทหน่วยงานส่งต่อ",
  role_group: "กลุ่มสิทธิ์",
  school_classrooms: "ห้องเรียน",
  school_period_times: "ตารางเวลาคาบเรียน",
  school_subject: "รายวิชาของโรงเรียน",
  school_teacher_memberships: "สังกัดครู",
  schools: "โรงเรียน",
  student: "นักเรียน",
  student_follow_up_requests: "คำขอติดตามนักเรียน",
  student_import_quarantine_row: "แถวนำเข้าที่รอตรวจ",
  student_observation_reports: "รายงานข้อสังเกตนักเรียน",
  student_observations: "ข้อสังเกตนักเรียน",
  student_risk_map: "แผนที่นักเรียนกลุ่มเสี่ยง",
  student_status: "สถานะนักเรียน",
  student_term: "นักเรียน",
  system_settings: "การตั้งค่าระบบ",
  task: "ภารกิจ",
  task_link: "ลิงก์ภารกิจ",
  task_links: "ลิงก์ภารกิจ",
  teacher_access_grants: "สิทธิ์เข้าถึงของครู",
  teacher_line_group_invitation: "คำเชิญกลุ่ม LINE ครู",
  teachers: "ครู",
  timetable_slot: "ตารางสอน",
  user: "ผู้ใช้งาน",
  visit_work_session: "รอบงานเยี่ยมบ้าน",
};

/** A short record number is worth showing (เคส #1001); a uuid never is. */
function isReadableId(id: string): boolean {
  return /^[0-9]{1,9}$/.test(id);
}

export function getAuditLogTargetLabel(entry: AuditLogEntry): string {
  const label = entry.targetLabel?.trim();
  // An account shows plainly like the actor column — its username already
  // reads as an account.
  if (label && entry.targetType === "user") return label;
  const typeLabel = entry.targetType
    ? (TARGET_TYPE_LABELS[entry.targetType] ?? null)
    : null;
  if (label) return typeLabel ? `${typeLabel}: ${label}` : label;
  const id = entry.targetId?.trim() ?? "";
  if (typeLabel) return isReadableId(id) ? `${typeLabel} #${id}` : typeLabel;
  return "-";
}

export function hasAuditLogTargetReference(entry: AuditLogEntry): boolean {
  return getAuditLogTargetLabel(entry) !== "-";
}

export function formatAuditLogDetails(details: AuditLogDetail[]): string {
  if (details.length === 0) return "-";
  return details
    .map((detail) => `${detail.label}: ${String(detail.value)}`)
    .join(" · ");
}
