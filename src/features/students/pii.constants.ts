import type {
  StudentPiiField,
  StudentPiiFieldGroup,
  StudentPiiReasonCode,
} from "./types/students.types";

/** Sensitive fields that the student detail can mask + reveal on demand. */
export const PII_FIELDS: StudentPiiField[] = [
  "PersonID_Onec",
  "PassportNumber_Onec",
];

/** Thai display label per PII field. */
export const PII_FIELD_LABELS: Record<StudentPiiField, string> = {
  PersonID_Onec: "เลขบัตรประชาชน",
  PassportNumber_Onec: "เลขหนังสือเดินทาง",
};

/** Maps a field to the reveal group the backend expects. */
export const PII_FIELD_GROUPS: Record<StudentPiiField, StudentPiiFieldGroup> = {
  PersonID_Onec: "NATIONAL_ID",
  PassportNumber_Onec: "PASSPORT",
};

/** Reveal reason options (mirror of the backend reason codes). */
export const PII_REASON_OPTIONS: {
  value: StudentPiiReasonCode;
  label: string;
}[] = [
  { value: "HOME_VISIT", label: "เยี่ยมบ้าน/ติดตาม" },
  { value: "CONTACT_PARENT", label: "ติดต่อผู้ปกครอง" },
  { value: "VERIFY_DATA", label: "ตรวจสอบ/แก้ไขข้อมูล" },
  { value: "COORDINATE_AGENCY", label: "ประสานหน่วยงาน" },
  { value: "OTHER", label: "อื่นๆ (ระบุ)" },
];

export function isPiiReasonCode(value: string): value is StudentPiiReasonCode {
  return PII_REASON_OPTIONS.some((option) => option.value === value);
}
