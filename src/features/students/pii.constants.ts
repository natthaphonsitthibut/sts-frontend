import type {
  StudentPiiField,
  StudentPiiFieldGroup,
  StudentPiiReasonCode,
} from "./types/students.types";
import type { PiiRevealReasonOption } from "../privacy/types/privacy.types";

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

export function isPiiReasonCode(
  value: string,
  options: PiiRevealReasonOption[],
): value is StudentPiiReasonCode {
  return options.some((option) => option.value === value);
}
