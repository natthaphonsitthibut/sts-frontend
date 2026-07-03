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
  schoolDistrict: string | null;
  schoolSubDistrict: string | null;
  sourceRowNumber: number;
  reasonCode: string;
  reasonLabel: string;
  status: "PENDING" | "RESOLVED" | "REJECTED";
  statusLabel: string;
  statusBadgeVariant: BadgeVariant;
  target: string;
  student: {
    personIdMasked: string;
    firstName: string;
    lastName: string;
    academicYear: string;
    semester: string;
    province: string | null;
    gradeLevelId: string | null;
    gradeLabel: string | null;
    roomId: string | null;
    studentStatusCode: string | null;
    studentStatusLabel: string | null;
  };
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  resolvedByName: string | null;
  changedFieldLabels: string[];
  changedFieldDetails: Array<{
    label: string;
    oldValue: string;
    newValue: string;
  }>;
  resolution: {
    state: "ACTION_REQUIRED" | "DECISION_REQUIRED" | "RETRY_ELIGIBLE" | "BLOCKED";
    action: "EDIT_FIELDS" | "SELECT_CANDIDATE" | "RETRY" | "OPEN_REVIEW" | "NONE";
    code: string;
    label: string;
    message: string;
    variant: BadgeVariant;
    editableFields: string[];
  };
  editableValues: Record<string, string>;
}

export type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning";

export interface ImportQuarantineResponse {
  items: ImportQuarantineItem[];
  meta: { page: number; limit: number; totalCount: number };
}

export type QuarantineStatus = "PENDING" | "RESOLVED" | "REJECTED";
export type QuarantinePageSize = 10 | 20 | 50;

export interface ImportQuarantineLookupOption {
  code: string;
  label: string;
  variant?: BadgeVariant;
}

export interface ImportQuarantineLookupResponse {
  reasons: ImportQuarantineLookupOption[];
  resolutionStates: ImportQuarantineLookupOption[];
  statuses: ImportQuarantineLookupOption[];
}

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

export interface ImportQuarantinePersonContext {
  firstName: string;
  lastName: string;
  personIdMasked: string;
  schoolName: string | null;
  province: string | null;
  gradeLevelId: number | null;
  gradeLevelLabel: string | null;
  roomId: string | null;
  academicYear: string | null;
  semester: string | null;
  studentStatusCode: number | null;
  studentStatusLabel: string | null;
}

export interface ImportQuarantineCandidate extends ImportQuarantinePersonContext {
  candidateKey: string;
}

export interface ImportQuarantineCandidateResponse {
  items: ImportQuarantineCandidate[];
  meta: { totalCount: number; visibleCount: number };
  importRow: ImportQuarantinePersonContext | null;
}

export interface ImportQuarantineRetrySummary {
  readyCount: number;
  batchLimit: number;
}

export interface ImportQuarantineRetryResult {
  selectedCount: number;
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  remainingReadyCount: number;
  batchLimit: number;
  items: Array<{
    id: string;
    sourceRowNumber: number;
    studentName: string;
    outcome: "IMPORTED" | "NEEDS_ACTION" | "FAILED";
    code: string;
    message: string;
  }>;
}

export type ImportQuarantineEditableValues = Partial<
  Record<
    | "AcademicYear_Onec"
    | "Semester_Onec"
    | "SchoolID_Onec"
    | "GradeLevelID_Onec"
    | "RoomID_Onec"
    | "StudentStatusID_Onec",
    string
  >
>;
