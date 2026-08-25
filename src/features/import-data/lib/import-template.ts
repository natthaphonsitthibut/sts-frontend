import type {
  ImportCatalogField,
  ImportCatalogTarget,
} from "../types/import.types";

const FIELD_EXAMPLES: Record<string, [string, string]> = {
  username: ["teacher.somchai", "teacher.suda"],
  startedOn: ["2026-05-01", "2026-05-16"],
  gradeLevelId: ["4", "4"],
  roomCode: ["1", "2"],
  roomName: ["ห้อง 4/1", "ห้อง 4/2"],
  student_number: ["10001", "10002"],
  PersonID_Onec: ["1103700123456", "1103700123457"],
  FullName_Onec: ["เด็กชายสมชาย ใจดี", ""],
  FirstName_Onec: ["", "สมหญิง"],
  MiddleName_Onec: ["", ""],
  LastName_Onec: ["", "ใจงาม"],
  DepartmentID_Onec: ["", ""],
  PassportNumber_Onec: ["", ""],
  PrefixID_Onec: ["1", "2"],
  GenderID_Onec: ["1", "2"],
  NationalityID_Onec: ["1", "1"],
  StudentStatusID_Onec: ["1", "1"],
  VillageNumber_Onec: ["3", ""],
  Street_Onec: ["", ""],
  Soi_Onec: ["", ""],
  Trok_Onec: ["", ""],
  SubDistrictID_Onec: ["", ""],
  SchoolAdmissionYear_Onec: ["2569", "2569"],
  GPAX_Onec: ["3.45", "3.80"],
  term_gpa: ["3.50", "3.75"],
};

export function exampleForField(
  fieldDef: ImportCatalogField,
  rowIndex: 0 | 1,
): string {
  const preset = FIELD_EXAMPLES[fieldDef.key];
  if (preset) {
    return preset[rowIndex];
  }
  if (fieldDef.allowedValues && fieldDef.allowedValues.length > 0) {
    return fieldDef.allowedValues[rowIndex % fieldDef.allowedValues.length];
  }
  switch (fieldDef.valueType) {
    case "date":
      return rowIndex === 0 ? "2026-05-01" : "2026-05-16";
    case "integer":
      return String(rowIndex + 1);
    default:
      return rowIndex === 0 ? "ตัวอย่างข้อมูล 1" : "ตัวอย่างข้อมูล 2";
  }
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function importTemplateFields(
  source: ImportCatalogTarget,
): ImportCatalogField[] {
  return source.fields.filter((field) => field.source === "file");
}

export function buildImportTemplateCsv(source: ImportCatalogTarget): string {
  const fields = importTemplateFields(source);
  const header = fields.map((field) => csvEscape(field.key)).join(",");
  const row1 = fields
    .map((field) => csvEscape(exampleForField(field, 0)))
    .join(",");
  const row2 = fields
    .map((field) => csvEscape(exampleForField(field, 1)))
    .join(",");
  const csvBom = String.fromCharCode(0xfeff);
  return csvBom + [header, row1, row2].join("\r\n");
}

export function importTemplateFileName(source: ImportCatalogTarget): string {
  return `ไฟล์ตัวอย่าง-${source.target}.csv`;
}

export function downloadImportTemplate(source: ImportCatalogTarget): void {
  const csv = buildImportTemplateCsv(source);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = importTemplateFileName(source);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
