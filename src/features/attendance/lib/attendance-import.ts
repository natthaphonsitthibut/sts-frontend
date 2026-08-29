import {
  downloadXlsx,
  type SpreadsheetColumn,
} from "../../../lib/spreadsheet-file";
import type { StatusCatalogItem } from "../../status-catalog/types/status-catalog.types";
import type { AttendanceSelectionStatus } from "../types/attendance.types";
import {
  ATTENDANCE_RECORD_STATUSES,
  getAttendanceStatusPresentation,
  normalizeAttendanceSelectionStatus,
} from "./attendance-presentation";

export type AttendanceImportRecordableStatus = Exclude<
  AttendanceSelectionStatus,
  "NONE"
>;

export type AttendanceImportColumnKey =
  | "order"
  | "studentNumber"
  | "name"
  | "status";

interface AttendanceImportColumnDefinition extends SpreadsheetColumn {
  key: AttendanceImportColumnKey;
  /** Extra header spellings accepted when reading a teacher's own file. */
  aliases: readonly string[];
  required: boolean;
}

/**
 * The import form's shape. Header matching is alias-based rather than
 * positional so a teacher can reorder columns or keep the wording their school
 * already uses.
 */
export const ATTENDANCE_IMPORT_COLUMNS: readonly AttendanceImportColumnDefinition[] =
  [
    {
      key: "order",
      label: "ลำดับ",
      aliases: ["ที่", "no", "order"],
      required: false,
    },
    {
      key: "studentNumber",
      label: "รหัสประจำตัว",
      aliases: [
        "รหัสนักเรียน",
        "เลขประจำตัว",
        "เลขประจำตัวนักเรียน",
        "studentnumber",
        "studentid",
      ],
      required: false,
    },
    {
      key: "name",
      label: "ชื่อ-นามสกุล",
      aliases: ["ชื่อนามสกุล", "ชื่อ - นามสกุล", "ชื่อ", "name", "fullname"],
      required: false,
    },
    {
      key: "status",
      label: "สถานะการเช็กชื่อ",
      aliases: ["สถานะ", "การเช็กชื่อ", "status", "attendance"],
      required: true,
    },
  ];

export interface AttendanceImportSheet {
  source: "FILE" | "URL";
  origin: string;
  headers: string[];
  rows: string[][];
  truncated: boolean;
}

/** The subset of a roster row the import needs to identify a student. */
export interface AttendanceImportRosterRow {
  id: string;
  name: string;
  studentNumber?: string | null;
}

export interface AttendanceImportMatch {
  rowNumber: number;
  studentId: string;
  name: string;
  studentNumber: string | null;
  status: AttendanceImportRecordableStatus;
  /** True when the roster already carries this status, so nothing changes. */
  unchanged: boolean;
}

export type AttendanceImportIssueReason =
  | "STUDENT_NOT_FOUND"
  | "AMBIGUOUS_STUDENT"
  | "DUPLICATE_ROW"
  | "MISSING_STATUS"
  | "UNKNOWN_STATUS";

export interface AttendanceImportIssue {
  rowNumber: number;
  reason: AttendanceImportIssueReason;
  label: string;
  detail: string;
}

export interface AttendanceImportResult {
  matches: AttendanceImportMatch[];
  issues: AttendanceImportIssue[];
  /** Required columns the sheet is missing; when set, nothing can be applied. */
  missingColumns: string[];
  changedCount: number;
}

const ISSUE_LABELS: Record<AttendanceImportIssueReason, string> = {
  STUDENT_NOT_FOUND: "ไม่พบนักเรียนในห้องนี้",
  AMBIGUOUS_STUDENT: "ชื่อซ้ำในห้อง",
  DUPLICATE_ROW: "นักเรียนซ้ำในไฟล์",
  MISSING_STATUS: "ไม่ได้กรอกสถานะ",
  UNKNOWN_STATUS: "สถานะไม่รู้จัก",
};

/** Folds spacing, punctuation and case so headers/names compare by meaning. */
function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("th-TH")
    .replace(/[\s_\-.()/]+/g, "");
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
}

function normalizeStudentNumber(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

/** Maps each canonical column to the sheet's column index, or -1 when absent. */
function resolveColumnIndexes(
  headers: readonly string[],
): Record<AttendanceImportColumnKey, number> {
  const normalizedHeaders = headers.map(normalizeText);
  const taken = new Set<number>();
  const indexes = {} as Record<AttendanceImportColumnKey, number>;

  for (const column of ATTENDANCE_IMPORT_COLUMNS) {
    const candidates = [column.label, ...column.aliases].map(normalizeText);
    const index = normalizedHeaders.findIndex(
      (header, position) =>
        !taken.has(position) &&
        header.length > 0 &&
        candidates.includes(header),
    );
    if (index >= 0) taken.add(index);
    indexes[column.key] = index;
  }
  return indexes;
}

/**
 * Accepted status spellings come from the status catalog, so a school that
 * renames a status in settings can still import files using that wording.
 */
function buildStatusLookup(
  catalog: readonly StatusCatalogItem[],
): Map<string, AttendanceImportRecordableStatus> {
  const lookup = new Map<string, AttendanceImportRecordableStatus>();
  for (const status of ATTENDANCE_RECORD_STATUSES) {
    const presentation = getAttendanceStatusPresentation(status, catalog);
    for (const text of [presentation.label, presentation.shortLabel, status]) {
      const key = normalizeText(text);
      if (key.length > 0 && !lookup.has(key)) lookup.set(key, status);
    }
  }
  return lookup;
}

function resolveStatus(
  raw: string,
  lookup: ReadonlyMap<string, AttendanceImportRecordableStatus>,
): AttendanceImportRecordableStatus | null {
  // Codes and numeric values are handled by the shared normalizer; anything else
  // is matched against the catalog wording.
  const normalized = normalizeAttendanceSelectionStatus(raw.trim());
  if (normalized !== "NONE") return normalized;
  return lookup.get(normalizeText(raw)) ?? null;
}

/**
 * Matches a parsed sheet against the roster on screen. Student number wins when
 * present because names repeat; a row that cannot be resolved becomes an issue
 * rather than being dropped silently.
 */
export function resolveAttendanceImport(
  sheet: AttendanceImportSheet,
  roster: readonly AttendanceImportRosterRow[],
  catalog: readonly StatusCatalogItem[],
  selections: Readonly<Record<string, AttendanceSelectionStatus>> = {},
): AttendanceImportResult {
  const indexes = resolveColumnIndexes(sheet.headers);
  const missingColumns = ATTENDANCE_IMPORT_COLUMNS.filter(
    (column) => column.required && indexes[column.key] < 0,
  ).map((column) => column.label);
  if (indexes.studentNumber < 0 && indexes.name < 0) {
    missingColumns.push(
      `${ATTENDANCE_IMPORT_COLUMNS[1].label} หรือ ${ATTENDANCE_IMPORT_COLUMNS[2].label}`,
    );
  }
  if (missingColumns.length > 0) {
    return { matches: [], issues: [], missingColumns, changedCount: 0 };
  }

  const statusLookup = buildStatusLookup(catalog);
  const byStudentNumber = new Map<string, AttendanceImportRosterRow[]>();
  const byName = new Map<string, AttendanceImportRosterRow[]>();
  for (const student of roster) {
    const number = normalizeStudentNumber(student.studentNumber ?? "");
    if (number) {
      byStudentNumber.set(number, [
        ...(byStudentNumber.get(number) ?? []),
        student,
      ]);
    }
    const name = normalizeName(student.name);
    if (name) byName.set(name, [...(byName.get(name) ?? []), student]);
  }

  const matches: AttendanceImportMatch[] = [];
  const issues: AttendanceImportIssue[] = [];
  const seen = new Set<string>();

  sheet.rows.forEach((row, position) => {
    // +2: the header occupies row 1 in the teacher's file.
    const rowNumber = position + 2;
    const cell = (index: number): string =>
      index >= 0 ? (row[index] ?? "").trim() : "";
    const studentNumber = cell(indexes.studentNumber);
    const name = cell(indexes.name);
    const rawStatus = cell(indexes.status);
    const rowLabel =
      [studentNumber, name].filter(Boolean).join(" · ") ||
      `แถวที่ ${rowNumber}`;

    const addIssue = (
      reason: AttendanceImportIssueReason,
      detail: string,
    ): void => {
      issues.push({ rowNumber, reason, label: ISSUE_LABELS[reason], detail });
    };

    const candidates = studentNumber
      ? (byStudentNumber.get(normalizeStudentNumber(studentNumber)) ?? [])
      : (byName.get(normalizeName(name)) ?? []);

    if (candidates.length === 0) {
      addIssue("STUDENT_NOT_FOUND", rowLabel);
      return;
    }
    if (candidates.length > 1) {
      addIssue("AMBIGUOUS_STUDENT", `${rowLabel} — กรุณาระบุรหัสประจำตัว`);
      return;
    }
    const student = candidates[0];
    if (seen.has(student.id)) {
      addIssue("DUPLICATE_ROW", rowLabel);
      return;
    }
    if (!rawStatus) {
      addIssue("MISSING_STATUS", rowLabel);
      return;
    }
    const status = resolveStatus(rawStatus, statusLookup);
    if (!status) {
      addIssue("UNKNOWN_STATUS", `${rowLabel} — "${rawStatus}"`);
      return;
    }

    seen.add(student.id);
    matches.push({
      rowNumber,
      studentId: student.id,
      name: student.name,
      studentNumber: student.studentNumber ?? null,
      status,
      unchanged: selections[student.id] === status,
    });
  });

  return {
    matches,
    issues,
    missingColumns: [],
    changedCount: matches.filter((match) => !match.unchanged).length,
  };
}

/** The status wording a teacher may type, shown as the form's legend. */
export function attendanceImportStatusLegend(
  catalog: readonly StatusCatalogItem[],
): string[] {
  return ATTENDANCE_RECORD_STATUSES.map(
    (status) => getAttendanceStatusPresentation(status, catalog).shortLabel,
  );
}

const TEMPLATE_COLUMNS: SpreadsheetColumn[] = ATTENDANCE_IMPORT_COLUMNS.map(
  ({ key, label }) => ({ key, label }),
);

/**
 * The blank form: the class roster with an empty status column, so a teacher
 * fills in statuses instead of retyping names that must match exactly.
 */
export function buildAttendanceImportTemplateRows(
  roster: readonly AttendanceImportRosterRow[],
): string[][] {
  return roster.map((student, index) => [
    String(index + 1),
    student.studentNumber ?? "",
    student.name,
    "",
  ]);
}

/**
 * The same rows shown in the dialog's preview, with example statuses cycled
 * through the catalog so every accepted value appears at least once.
 */
export function buildAttendanceImportPreviewRows(
  roster: readonly AttendanceImportRosterRow[],
  catalog: readonly StatusCatalogItem[],
): string[][] {
  return roster.map((student, index) => [
    String(index + 1),
    student.studentNumber ?? "",
    student.name,
    getAttendanceStatusPresentation(
      ATTENDANCE_RECORD_STATUSES[index % ATTENDANCE_RECORD_STATUSES.length],
      catalog,
    ).shortLabel,
  ]);
}

export const ATTENDANCE_IMPORT_PREVIEW_COLUMNS = TEMPLATE_COLUMNS;

const STATUS_COLUMN_INDEX = ATTENDANCE_IMPORT_COLUMNS.findIndex(
  (column) => column.key === "status",
);
/** Rows a teacher may add below the roster still get the status pick-list. */
const TEMPLATE_SPARE_ROWS = 20;
const TEMPLATE_COLUMN_WIDTHS = [8, 18, 34, 22];

/**
 * The form a teacher fills in. The status column is a spreadsheet pick-list so
 * the four statuses are chosen rather than typed — a typo guard at the source,
 * not a substitute for validation: a pasted value bypasses it, so the import
 * still resolves every cell against the catalog on the way back in.
 */
export function downloadAttendanceImportTemplate(
  roster: readonly AttendanceImportRosterRow[],
  catalog: readonly StatusCatalogItem[],
  filenameBase: string,
): void {
  downloadXlsx(filenameBase, {
    columns: TEMPLATE_COLUMNS,
    rows: buildAttendanceImportTemplateRows(roster),
    sheetName: "การเช็กชื่อ",
    columnWidths: TEMPLATE_COLUMN_WIDTHS,
    listValidations: [
      {
        column: STATUS_COLUMN_INDEX,
        values: attendanceImportStatusLegend(catalog),
        spareRows: TEMPLATE_SPARE_ROWS,
        errorTitle: "สถานะไม่ถูกต้อง",
        errorMessage: `เลือกได้เฉพาะ ${attendanceImportStatusLegend(catalog).join(" / ")}`,
      },
    ],
  });
}
