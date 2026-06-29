export const STUDENT_TERM_IMPORT_TARGET = "student_term";
export const STUDENT_TERM_IMPORT_LABEL = "ข้อมูลนักเรียนในระบบ (รายภาคเรียน)";

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  rowsSkipped: number;
}
