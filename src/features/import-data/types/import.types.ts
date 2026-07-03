export const STUDENT_TERM_IMPORT_TARGET = "student_term";
export const STUDENT_TERM_IMPORT_LABEL = "ข้อมูลนักเรียนในระบบ (รายภาคเรียน)";

export interface ImportResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsSkipped: number;
  rowsQuarantined?: number;
}

export interface ImportPreviewRow {
  rowNumber: number;
  status: "ready" | "skipped" | "quarantine";
  action: "insert" | "update" | "skip" | "quarantine";
  issues: string[];
  personIdMasked: string;
  firstName: string;
  lastName: string;
  schoolId: string;
  schoolName: string;
  academicYear: string;
  semester: string;
  gradeLevelId: string;
  gradeLabel: string;
  roomId: string;
  changedFields: string[];
  hasDifferentSchoolSnapshot: boolean;
  studentStatusCode: string;
  studentStatusLabel: string;
  studentStatusCategory: string;
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
  missingNaturalKeyRows: number;
  missingSchoolRows: number;
  gradeIssueRows: number;
  roomIssueRows: number;
  differentSchoolRows: number;
  missingSchools: Array<{ id: number }>;
  rowsToInsert: number;
  rowsToUpdate: number;
  rowsToQuarantine: number;
  mappedColumns: string[];
  mappedColumnSamples: Record<string, string[]>;
  missingRequiredColumns: string[];
  missingRecommendedColumns: string[];
  unmappedHeaders: string[];
  sampleRows: ImportPreviewRow[];
}

export interface ImportQuarantineItem {
  id: string;
  schoolId: number | null;
  schoolName: string | null;
  sourceRowNumber: number;
  reasonCode: string;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  target: string;
  student: {
    personIdMasked: string;
    firstName: string;
    lastName: string;
    academicYear: string;
    semester: string;
  };
  createdAt: string;
  resolvedAt: string | null;
}

export interface ImportQuarantineResponse {
  items: ImportQuarantineItem[];
  meta: { page: number; limit: number; totalCount: number };
}

export type QuarantineStatus = "PENDING" | "RESOLVED" | "REJECTED";
export type QuarantinePageSize = 10 | 20 | 50;

export const REASON_LABELS: Record<string, string> = {
  IDENTIFIER_CONFLICT: "เลขนี้ตรงกับหลายโปรไฟล์ในระบบ",
  UNMAPPED_STUDENT_STATUS: "สถานะนักเรียนยังไม่จับคู่",
  MISSING_NATURAL_KEY_FIELD: "ข้อมูลภาคเรียนบังคับไม่ครบหรือไม่ถูกต้อง",
  BLANK_REQUIRED_IDENTITY: "ไม่มีรหัสประจำตัว",
  DUPLICATE_ROW_IN_FILE: "แถวซ้ำในไฟล์",
  MULTIPLE_ACTIVE_ENROLLMENTS: "พบการลงทะเบียนที่ยังใช้งานหลายรายการ",
  NAME_CONFLICT_FOR_IDENTIFIER: "ชื่อไม่ตรงกับรหัสประจำตัวเดิม",
  INVALID_NATIONAL_ID_CHECKSUM: "เลขประจำตัวประชาชนไม่ผ่านการตรวจสอบ",
  SCHOOL_NOT_FOUND: "ไม่พบโรงเรียนในข้อมูลหลัก",
  GRADE_NOT_FOUND: "ไม่พบชั้นเรียนในข้อมูลหลัก",
  ROOM_NOT_FOUND: "ไม่พบห้องเรียนในข้อมูลหลัก",
  STATUS_CAUSE_UNMAPPED: "สาเหตุสถานะนักเรียนยังไม่จับคู่",
};

export interface ImportQuarantineFilterParams {
  reasonCode?: string;
  search?: string;
  province?: string;
  district?: string;
  subDistrict?: string;
  schoolId?: number;
}

export interface ImportQuarantineListParams extends ImportQuarantineFilterParams {
  page: number;
  limit: 10 | 20 | 50;
  status?: "PENDING" | "RESOLVED" | "REJECTED";
}

export interface ImportQuarantineCandidate {
  candidateKey: string;
  firstName: string;
  lastName: string;
  personIdMasked: string;
}
