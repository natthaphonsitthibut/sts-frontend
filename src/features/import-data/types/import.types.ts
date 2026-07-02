export const STUDENT_TERM_IMPORT_TARGET = "student_term";
export const STUDENT_TERM_IMPORT_LABEL = "ข้อมูลนักเรียนในระบบ (รายภาคเรียน)";

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  rowsSkipped: number;
}

export interface ImportPreviewRow {
  rowNumber: number;
  status: "ready" | "skipped";
  issues: string[];
  personIdMasked: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  academicYear: string;
  semester: string;
  gradeLevelId: string;
  roomId: string;
}

export interface ImportPreviewResult {
  target: string;
  targetLabel: string;
  canImport: boolean;
  headers: string[];
  mapping: Record<string, string>;
  rowsProcessed: number;
  rowsReady: number;
  rowsSkipped: number;
  duplicateRows: number;
  existingRows: number;
  missingPersonIdRows: number;
  mappedColumns: string[];
  missingRequiredColumns: string[];
  missingRecommendedColumns: string[];
  unmappedHeaders: string[];
  sampleRows: ImportPreviewRow[];
}
