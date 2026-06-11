export type ImportMode = "student_term" | "student_dropouts";

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  rowsSkipped: number;
}

export const IMPORT_MODE_OPTIONS: Array<{ value: ImportMode; label: string }> = [
  { value: "student_term", label: "ข้อมูลนักเรียน (รายภาคเรียน)" },
  { value: "student_dropouts", label: "ข้อมูลนักเรียนหลุดจากระบบ" },
];
