import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Combobox,
  Select,
  Tabs,
  useConfirm,
} from "../../../components/base";
import {
  FilterCombobox,
  FilterSelect,
  ListPageToolbar,
  PageShell,
  ProgressBar,
  SummaryMetrics,
  ToolbarFilterGrid,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { useRouteTab } from "../../../hooks/useRouteTab";
import { RefreshButton } from "../../../components/layout/refresh-button";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatRoomLabel } from "../../../lib/room-presentation";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { attendanceService } from "../../attendance/api/attendance.service";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import {
  useSchoolClassroomOptions,
  useScopedSchools,
} from "../../school-structure/hooks/useSchoolStructure";
import { ImportDropZone } from "../components/ImportDropZone";
import { ImportQuarantinePanel } from "../components/ImportQuarantinePanel";
import {
  useExportImportQuarantine,
  useImportQuarantine,
  useImportCatalog,
  useImportQuarantineLookups,
  usePreviewImport,
  useSubmitImport,
} from "../hooks/useSubmitImport";
import {
  type AnyImportPreviewResult,
  type CatalogImportPreviewResult,
  type ImportCatalogField,
  type ImportPreviewResult,
  type ImportTarget,
  type QuarantinePageSize,
  type QuarantineStatus,
} from "../types/import.types";

function isStudentPreview(
  preview: AnyImportPreviewResult,
): preview is ImportPreviewResult {
  return preview.target === "student_term";
}

function effectiveMapping(
  localMapping: Record<string, string>,
  preview?: AnyImportPreviewResult,
): Record<string, string> {
  return Object.keys(localMapping).length > 0
    ? localMapping
    : (preview?.mapping ?? {});
}

function ImportMappingPanel({
  mapping,
  onMappingChange,
  preview,
  fields,
}: {
  mapping: Record<string, string>;
  onMappingChange: (column: string, header: string) => void;
  preview: AnyImportPreviewResult;
  fields: ImportCatalogField[];
}) {
  const currentMapping = effectiveMapping(mapping, preview);

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">จับคู่คอลัมน์</div>
          <div className="mt-1 text-sm text-slate-500">
            ระบบรองรับหัวคอลัมน์มาตรฐาน ชื่อทั่วไป หรือ ID
            และรองรับชื่อ-นามสกุลทั้งแบบรวมและแยกคอลัมน์
          </div>
        </div>
        <Badge variant="secondary">
          {preview.headers.length} คอลัมน์ในไฟล์
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((field) => {
          const sourceHeader = currentMapping[field.key];
          const studentPreview = isStudentPreview(preview)
            ? preview
            : undefined;
          const samples = studentPreview?.mappedColumnSamples[field.key] ?? [];
          const sampleIsStale = sourceHeader !== preview.mapping[field.key];
          const usedByAnotherField = new Set(
            Object.entries(currentMapping)
              .filter(([column]) => column !== field.key)
              .map(([, header]) => header),
          );
          return (
            <label
              className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3"
              key={field.key}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>{field.label}</span>
                {field.required ? (
                  <Badge variant="warning">บังคับ</Badge>
                ) : null}
              </div>
              <Select
                value={currentMapping[field.key] ?? ""}
                onChange={(event) =>
                  onMappingChange(field.key, event.target.value)
                }
              >
                <option value="">ไม่ใช้คอลัมน์นี้</option>
                {preview.headers.map((header) => (
                  <option
                    disabled={usedByAnotherField.has(header)}
                    key={header}
                    value={header}
                  >
                    {header}
                  </option>
                ))}
              </Select>
              <div className="min-h-9 text-xs leading-5 text-slate-500">
                {sourceHeader ? (
                  <>
                    <div>
                      ค่าจากคอลัมน์{" "}
                      <span className="font-semibold text-slate-700">
                        “{sourceHeader}”
                      </span>
                    </div>
                    <div>
                      ตัวอย่าง:{" "}
                      {sampleIsStale
                        ? "กดตรวจสอบไฟล์อีกครั้งเพื่ออัปเดตตัวอย่าง"
                        : samples.length > 0
                          ? samples.join(" · ")
                          : field.key === "PersonID_Onec"
                            ? "ไม่พบค่าที่เป็นเลขประจำตัวในแถวตัวอย่าง"
                            : "ไม่มีค่าในแถวตัวอย่าง"}
                    </div>
                  </>
                ) : (
                  "ยังไม่ได้จับคู่กับคอลัมน์ในไฟล์"
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function ImportPreviewPanel({ preview }: { preview: ImportPreviewResult }) {
  const nameSource = preview.mapping.FullName_Onec
    ? preview.mapping.FullName_Onec
    : [preview.mapping.FirstName_Onec, preview.mapping.LastName_Onec]
        .filter(Boolean)
        .join(" + ") || "ยังไม่จับคู่";

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">ผลตรวจสอบไฟล์</div>
          <div className="mt-1 text-sm text-slate-500">
            {preview.targetLabel}
          </div>
        </div>
        <Badge variant={preview.canImport ? "success" : "warning"}>
          {preview.canImport ? "พร้อมนำเข้า" : "ต้องตรวจสอบ"}
        </Badge>
      </div>

      <SummaryMetrics
        columns={3}
        items={[
          {
            label: "ทั้งหมด",
            value: preview.rowsProcessed,
            tone: "default",
            emphasis: true,
          },
          { label: "เพิ่มใหม่", value: preview.rowsToInsert, tone: "success" },
          {
            label: "อัปเดตข้อมูลเดิม",
            value: preview.rowsToUpdate,
            tone: "default",
          },
          {
            label: "รอตรวจสอบ",
            value: preview.rowsToQuarantine ?? 0,
            tone: "warning",
          },
          { label: "ข้าม", value: preview.rowsSkipped, tone: "warning" },
          { label: "ซ้ำในไฟล์", value: preview.duplicateRows, tone: "warning" },
          {
            label: "ไม่มีรหัส",
            value: preview.missingPersonIdRows,
            tone: "danger",
          },
          {
            label: "ข้อมูลภาคเรียนไม่ครบ",
            value: preview.missingNaturalKeyRows,
            tone: "danger",
          },
          {
            label: "ไม่พบโรงเรียน",
            value: preview.missingSchoolRows ?? 0,
            tone: "danger",
          },
          {
            label: "ชั้นไม่ถูกต้อง",
            value: preview.gradeIssueRows ?? 0,
            tone: "danger",
          },
          {
            label: "ห้องไม่ถูกต้อง",
            value: preview.roomIssueRows ?? 0,
            tone: "danger",
          },
          {
            label: "มีภาคเรียนในโรงเรียนอื่น",
            value: preview.differentSchoolRows ?? 0,
            tone: "warning",
          },
        ]}
      />

      <Alert>
        <AlertTitle>กติกาการอัปเดต</AlertTitle>
        <AlertDescription>
          ค่าว่างจากไฟล์จะไม่ทับข้อมูลเดิม และระบบจะไม่เปลี่ยนบุคคล ปี เทอม
          หรือโรงเรียนของ enrollment เดิม หากโรงเรียนต่างกัน ระบบจะสร้าง
          snapshot ใหม่
        </AlertDescription>
      </Alert>

      {preview.missingRequiredColumns.length > 0 ? (
        <Alert variant="destructive">
          <AlertTitle>คอลัมน์บังคับไม่ครบ</AlertTitle>
          <AlertDescription>
            {preview.missingRequiredColumns.join(", ")}
          </AlertDescription>
        </Alert>
      ) : null}

      {preview.missingRecommendedColumns.length > 0 ||
      preview.unmappedHeaders.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>มีข้อมูลที่ควรตรวจสอบ</AlertTitle>
          <AlertDescription>
            {preview.missingRecommendedColumns.length > 0
              ? `คอลัมน์แนะนำที่ยังไม่พบ: ${preview.missingRecommendedColumns.join(", ")}`
              : null}
            {preview.missingRecommendedColumns.length > 0 &&
            preview.unmappedHeaders.length > 0
              ? " · "
              : null}
            {preview.unmappedHeaders.length > 0
              ? `คอลัมน์ที่ไม่ได้ใช้: ${preview.unmappedHeaders.slice(0, 8).join(", ")}`
              : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {preview.sampleRows.length > 0 ? (
        <div>
          <div className="mb-2">
            <div className="font-semibold text-slate-800">
              ตัวอย่างข้อมูลจากไฟล์
            </div>
            <div className="text-sm text-slate-500">
              ชื่อใต้หัวตารางคือคอลัมน์ต้นทางที่ระบบจับคู่ ค่าโรงเรียน ชั้น
              และสถานะจะแสดงชื่อที่ระบบค้นพบควบคู่กับรหัสจากไฟล์
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <div className="grid min-w-[1120px] grid-cols-[64px_minmax(180px,1.2fr)_minmax(210px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px_minmax(180px,1.2fr)] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <div>แถว</div>
              <div>
                ชื่อ
                <div className="font-normal text-slate-500">{nameSource}</div>
              </div>
              <div>
                โรงเรียน
                <div className="font-normal text-slate-500">
                  {preview.mapping.SchoolID_Onec ?? "ยังไม่จับคู่"}
                </div>
              </div>
              <div>
                ปี / เทอม
                <div className="font-normal text-slate-500">
                  {preview.mapping.AcademicYear_Onec ?? "-"} /{" "}
                  {preview.mapping.Semester_Onec ?? "-"}
                </div>
              </div>
              <div>
                ชั้น / ห้อง
                <div className="font-normal text-slate-500">
                  {preview.mapping.GradeLevelID_Onec ?? "-"} /{" "}
                  {preview.mapping.RoomID_Onec ?? "-"}
                </div>
              </div>
              <div>
                สถานะ
                <div className="font-normal text-slate-500">
                  {preview.mapping.StudentStatusID_Onec ?? "ยังไม่จับคู่"}
                </div>
              </div>
              <div>การทำงาน</div>
              <div>หมายเหตุ</div>
            </div>
            {preview.sampleRows.map((row) => (
              <div
                className="grid min-w-[1120px] grid-cols-[64px_minmax(180px,1.2fr)_minmax(210px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px_minmax(180px,1.2fr)] border-t border-slate-100 px-3 py-2 text-sm"
                key={row.rowNumber}
              >
                <div className="font-medium text-slate-500">
                  {row.rowNumber}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {row.firstName} {row.lastName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {row.personIdMasked}
                  </div>
                </div>
                <div className="text-slate-700">
                  <div className="font-medium">{row.schoolName}</div>
                  <div className="text-xs text-slate-500">
                    รหัสจากไฟล์: {row.schoolId}
                  </div>
                </div>
                <div className="text-slate-700">
                  ปี {row.academicYear} · เทอม {row.semester}
                </div>
                <div className="text-slate-700">
                  <div>
                    {row.gradeLabel} · {formatRoomLabel(row.roomId)}
                  </div>
                  <div className="text-xs text-slate-500">
                    รหัสชั้นจากไฟล์: {row.gradeLevelId}
                  </div>
                </div>
                <div className="text-slate-700">
                  <div>{row.studentStatusLabel}</div>
                  <div className="text-xs text-slate-500">
                    รหัสจากไฟล์: {row.studentStatusCode}
                  </div>
                </div>
                <div>
                  <Badge
                    variant={row.action === "insert" ? "success" : "warning"}
                  >
                    {row.action === "insert"
                      ? "เพิ่มใหม่"
                      : row.action === "update"
                        ? "อัปเดต"
                        : row.action === "quarantine"
                          ? "รอตรวจสอบ"
                          : "ข้าม"}
                  </Badge>
                </div>
                <div className="text-slate-500">
                  {row.issues.length > 0 ? row.issues.join(", ") : "-"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CatalogImportPreviewPanel({
  preview,
  fields,
}: {
  preview: CatalogImportPreviewResult;
  fields: ImportCatalogField[];
}) {
  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">ผลตรวจสอบไฟล์</div>
          <div className="mt-1 text-sm text-slate-500">
            {preview.targetLabel}
          </div>
        </div>
        <Badge variant={preview.canImport ? "success" : "warning"}>
          {preview.canImport ? "พร้อมนำเข้า" : "ต้องตรวจสอบ"}
        </Badge>
      </div>
      <SummaryMetrics
        columns={4}
        items={[
          {
            label: "ทั้งหมด",
            value: preview.rowsProcessed,
            tone: "default",
            emphasis: true,
          },
          { label: "เพิ่มใหม่", value: preview.rowsToInsert, tone: "success" },
          {
            label: "รอตรวจสอบ",
            value: preview.rowsToQuarantine,
            tone: "warning",
          },
          {
            label: "ข้ามรายการเดิม",
            value: preview.rowsSkipped,
            tone: "default",
          },
        ]}
      />
      {preview.sampleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-primary text-sm font-bold text-white">
              <tr>
                <th className="px-3 py-4">แถว</th>
                {fields.map((field) => (
                  <th className="px-3 py-4" key={field.key}>
                    {field.label}
                  </th>
                ))}
                <th className="px-3 py-4">ผลตรวจ</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row) => (
                <tr className="border-t border-slate-100" key={row.rowNumber}>
                  <td className="px-3 py-3 font-medium text-slate-500">
                    {row.rowNumber}
                  </td>
                  {fields.map((field) => (
                    <td
                      className="max-w-64 truncate px-3 py-3 text-slate-700"
                      key={field.key}
                    >
                      {row.values[field.key] || "-"}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <Badge
                      variant={
                        row.action === "insert"
                          ? "success"
                          : row.action === "quarantine"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {row.action === "insert"
                        ? "เพิ่มใหม่"
                        : row.action === "quarantine"
                          ? "รอตรวจสอบ"
                          : "ข้าม"}
                    </Badge>
                    {row.issues.length > 0 ? (
                      <div className="mt-1 max-w-72 text-xs text-slate-500">
                        {row.issues.join(", ")}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

export function ImportDataPage() {
  const [searchParams] = useSearchParams();
  const positiveSearchParam = (key: string): number | undefined => {
    const value = Number(searchParams.get(key));
    return Number.isInteger(value) && value > 0 ? value : undefined;
  };
  const [importSchoolId, setImportSchoolId] = useState(() =>
    String(positiveSearchParam("schoolId") ?? ""),
  );
  const [importSchoolTermId, setImportSchoolTermId] = useState(() =>
    String(positiveSearchParam("schoolTermId") ?? ""),
  );
  const [importClassroomId, setImportClassroomId] = useState(() =>
    String(positiveSearchParam("classroomId") ?? ""),
  );
  const [importGrade, setImportGrade] = useState("");
  const { can } = usePermissions();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const previewImport = usePreviewImport();
  const submitImport = useSubmitImport();
  const importCatalog = useImportCatalog();
  const importArea = useSchoolAreaFilter();
  const scopedSchoolsQuery = useScopedSchools();
  const importSchool = Number(importSchoolId) || undefined;
  const importTermsQuery = useQuery({
    queryKey: ["import-data", "terms", importSchool],
    queryFn: () => attendanceService.getTerms(importSchool!),
    enabled: Boolean(importSchool),
  });
  const importClassroomsQuery = useSchoolClassroomOptions(
    importSchool
      ? {
          schoolId: importSchool,
          termId: Number(importSchoolTermId) || undefined,
        }
      : null,
  );
  const importGrades = useMemo(
    () =>
      Array.from(
        new Set(
          (importClassroomsQuery.data ?? []).map(
            (classroom) => classroom.gradeLabel,
          ),
        ),
      ).sort((left, right) => left.localeCompare(right, "th")),
    [importClassroomsQuery.data],
  );
  const effectiveImportGrade =
    importGrade ||
    (importClassroomsQuery.data ?? []).find(
      (classroom) => classroom.id === importClassroomId,
    )?.gradeLabel ||
    "";
  const importClassrooms = useMemo(
    () =>
      (importClassroomsQuery.data ?? []).filter(
        (classroom) =>
          !effectiveImportGrade ||
          classroom.gradeLabel === effectiveImportGrade,
      ),
    [effectiveImportGrade, importClassroomsQuery.data],
  );
  const [activeTab, setActiveTab] = useRouteTab(
    {
      import: "/import-data",
      quarantine: "/import-data/quarantine",
      history: "/import-data/history",
    } as const,
    "import",
  );
  const [file, setFile] = useState<File | null>(null);
  const [requestedTarget, setRequestedTarget] =
    useState<ImportTarget>("student_term");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const allowedTargets = (importCatalog.data?.targets ?? [])
    .filter((target) => target.allowed)
    .sort((left, right) => left.dependencyOrder - right.dependencyOrder);
  const selectedTargetDefinition =
    allowedTargets.find((target) => target.target === requestedTarget) ??
    allowedTargets[0];
  const selectedTarget = selectedTargetDefinition?.target ?? requestedTarget;
  const requiresSchoolContext =
    selectedTargetDefinition?.canonicalContext.some(
      (requirement) => requirement.key === "schoolId",
    ) ?? false;
  const requiresTermContext =
    selectedTargetDefinition?.canonicalContext.some(
      (requirement) => requirement.key === "schoolTermId",
    ) ?? false;
  const requiresClassroomContext =
    selectedTargetDefinition?.canonicalContext.some(
      (requirement) => requirement.key === "classroomId",
    ) ?? false;
  const importContext = {
    schoolId: importSchool,
    schoolTermId: Number(importSchoolTermId) || undefined,
    classroomId: Number(importClassroomId) || undefined,
  };
  const missingContextLabels = (
    selectedTargetDefinition?.canonicalContext ?? []
  )
    .filter((requirement) => !importContext[requirement.key])
    .map((requirement) => requirement.label);
  const selectedImportSchool = scopedSchoolsQuery.data?.find(
    (school) => String(school.id) === importSchoolId,
  );

  function resetImportPreview(): void {
    setFile(null);
    setMapping({});
    setMappingDirty(false);
    previewImport.reset();
    submitImport.reset();
  }

  function selectImportSchool(value: string): void {
    setImportSchoolId(value);
    setImportSchoolTermId("");
    setImportGrade("");
    setImportClassroomId("");
    resetImportPreview();
  }

  function selectImportTerm(value: string): void {
    setImportSchoolTermId(value);
    setImportGrade("");
    setImportClassroomId("");
    resetImportPreview();
  }

  function selectImportClassroom(value: string): void {
    setImportClassroomId(value);
    resetImportPreview();
  }

  function selectImportGrade(value: string): void {
    setImportGrade(value);
    setImportClassroomId("");
    resetImportPreview();
  }

  const [quarantinePage, setQuarantinePage] = useState(1);
  const [quarantineRowsPerPage, setQuarantineRowsPerPage] =
    useState<QuarantinePageSize>(20);
  const [quarantineStatus, setQuarantineStatus] =
    useState<QuarantineStatus>("PENDING");
  const [quarantineReasonCode, setQuarantineReasonCode] = useState("");
  const [quarantineSearch, setQuarantineSearch] = useState("");
  const quarantineArea = useSchoolAreaFilter();
  const quarantineScope = useScopeCascade({ lockToActorScope: true });
  const debouncedQuarantineSearch = useDebouncedValue(
    quarantineSearch.trim(),
    350,
  );
  const quarantineSchoolId = quarantineScope.schoolId
    ? Number(quarantineScope.schoolId)
    : undefined;
  const quarantineQuery = useImportQuarantine(
    {
      page: quarantinePage,
      limit: quarantineRowsPerPage,
      status: quarantineStatus,
      reasonCode: quarantineReasonCode || undefined,
      search: debouncedQuarantineSearch || undefined,
      province: quarantineArea.province || undefined,
      district: quarantineArea.district || undefined,
      subDistrict: quarantineArea.subDistrict || undefined,
      schoolId: quarantineSchoolId,
    },
    activeTab === "quarantine",
  );
  const quarantineLookups = useImportQuarantineLookups();
  const exportQuarantine = useExportImportQuarantine();
  const retryEligibleLabel =
    quarantineLookups.data?.resolutionStates.find(
      (state) => state.code === "RETRY_ELIGIBLE",
    )?.label ?? "RETRY_ELIGIBLE";

  function resetQuarantineList(): void {
    setQuarantinePage(1);
  }

  function clearQuarantineFilters(): void {
    quarantineArea.reset();
    quarantineScope.reset();
    setQuarantineSearch("");
    setQuarantineReasonCode("");
    setQuarantineStatus("PENDING");
    resetQuarantineList();
  }

  async function downloadQuarantineReport(): Promise<void> {
    const accepted = await confirm({
      title: "ยืนยันการดาวน์โหลดรายงาน",
      description:
        "ระบบจะดาวน์โหลดรายการตาม filter ที่เลือกอยู่ และบันทึกการดาวน์โหลดไว้ในประวัติ",
      confirmText: "ดาวน์โหลด",
    });
    if (!accepted) {
      return;
    }
    try {
      const blob = await exportQuarantine.mutateAsync({
        status: quarantineStatus,
        reasonCode: quarantineReasonCode || undefined,
        search: debouncedQuarantineSearch || undefined,
        province: quarantineArea.province || undefined,
        district: quarantineArea.district || undefined,
        subDistrict: quarantineArea.subDistrict || undefined,
        schoolId: quarantineSchoolId,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `student-import-${quarantineStatus.toLowerCase()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // Mutation state renders the API error in the quarantine tab body.
    }
  }

  async function handlePreview(): Promise<void> {
    if (!file || !selectedTargetDefinition || missingContextLabels.length > 0) {
      return;
    }
    setPreviewProgress(0);
    submitImport.reset();
    const nextPreview = await previewImport.mutateAsync({
      file,
      target: selectedTarget,
      mapping,
      onProgress: setPreviewProgress,
      importContext,
    });
    if (Object.keys(mapping).length === 0) {
      setMapping(nextPreview.mapping);
    }
    setMappingDirty(false);
  }

  function handleMappingChange(column: string, header: string): void {
    const baseMapping = effectiveMapping(mapping, previewImport.data);
    const nextMapping = { ...baseMapping };
    if (header) {
      nextMapping[column] = header;
    } else {
      delete nextMapping[column];
    }
    setMapping(nextMapping);
    setMappingDirty(true);
    submitImport.reset();
  }

  async function handleSubmit(): Promise<void> {
    const preview = previewImport.data;
    if (
      !file ||
      !preview?.canImport ||
      mappingDirty ||
      missingContextLabels.length > 0 ||
      (isStudentPreview(preview) && (preview.missingSchools?.length ?? 0) > 0)
    ) {
      return;
    }
    const confirmed = await confirm({
      title: "ยืนยันการนำเข้าข้อมูล",
      description: (
        <span>
          ระบบจะเพิ่มใหม่ {preview.rowsToInsert.toLocaleString("en-US")} แถว
          อัปเดตข้อมูลเดิม{" "}
          {(isStudentPreview(preview)
            ? preview.rowsToUpdate
            : 0
          ).toLocaleString("en-US")}{" "}
          แถว ส่งรอตรวจสอบ{" "}
          {(preview.rowsToQuarantine ?? 0).toLocaleString("en-US")} แถว และข้าม{" "}
          {preview.rowsSkipped.toLocaleString("en-US")} แถว
          หลังยืนยันแล้วจะเริ่มบันทึกข้อมูลเข้าระบบ
        </span>
      ),
      confirmText: "นำเข้าข้อมูล",
    });
    if (!confirmed) {
      return;
    }
    setProgress(0);
    submitImport.mutate({
      file,
      target: selectedTarget,
      mapping,
      onProgress: setProgress,
      importContext,
    });
  }

  const result = submitImport.data;
  const preview = previewImport.data;
  const isBusy = previewImport.isPending || submitImport.isPending;
  const hasMissingSchools =
    preview && isStudentPreview(preview)
      ? (preview.missingSchools?.length ?? 0) > 0
      : false;

  return (
    <PageShell>
      <ListPageToolbar
        navigation={
          <Tabs
            aria-label="โหมดนำเข้าข้อมูล"
            onChange={setActiveTab}
            options={[
              { value: "import", label: "นำเข้าข้อมูล" },
              { value: "quarantine", label: "รอตรวจสอบ" },
              ...(can("audit-log")
                ? [{ value: "history", label: "ประวัติ" }]
                : []),
            ]}
            value={activeTab}
          />
        }
        icon={FileSpreadsheet}
        onClearFilters={clearQuarantineFilters}
        title="นำเข้าข้อมูล"
        description={
          activeTab === "import"
            ? "อัปโหลดไฟล์ Excel / CSV ตามลำดับข้อมูลหลักของโรงเรียน"
            : activeTab === "quarantine"
              ? "แก้ไขรายการที่ต้องตรวจสอบก่อนเข้าสู่ข้อมูลนักเรียน"
              : "ดูรายการนำเข้าข้อมูลย้อนหลังตามขอบเขตสิทธิ์ของบัญชี"
        }
        search={
          activeTab === "quarantine"
            ? {
                value: quarantineSearch,
                onChange: (value) => {
                  setQuarantineSearch(value);
                  resetQuarantineList();
                },
                placeholder: "ค้นหาชื่อนักเรียน หรือโรงเรียน...",
              }
            : undefined
        }
        filters={
          activeTab === "quarantine" ? (
            <>
              <SchoolAreaSchoolFilter
                area={quarantineArea}
                onSchoolChange={(nextSchoolId) => {
                  quarantineScope.setSchoolId(nextSchoolId);
                  resetQuarantineList();
                }}
                schoolId={quarantineScope.schoolId}
                schoolLocked={quarantineScope.schoolLocked}
              />
              <FilterCombobox
                ariaLabel="กรองตามสาเหตุ"
                className="sm:w-[320px]"
                onChange={(value) => {
                  setQuarantineReasonCode(value);
                  resetQuarantineList();
                }}
                options={[
                  { value: "", label: "ทุกสาเหตุ" },
                  ...(quarantineLookups.data?.reasons ?? []).map((reason) => ({
                    value: reason.code,
                    label: reason.label,
                  })),
                ]}
                placeholder="ค้นหาสาเหตุ"
                value={quarantineReasonCode}
              />
              <FilterSelect
                ariaLabel="กรองตามสถานะ"
                onChange={(value) => {
                  setQuarantineStatus(value as QuarantineStatus);
                  resetQuarantineList();
                }}
                value={quarantineStatus}
              >
                {!quarantineLookups.data ? (
                  <option value={quarantineStatus}>{quarantineStatus}</option>
                ) : null}
                {(quarantineLookups.data?.statuses ?? []).map((status) => (
                  <option key={status.code} value={status.code}>
                    {status.label}
                  </option>
                ))}
              </FilterSelect>
            </>
          ) : undefined
        }
        tableActions={
          activeTab === "quarantine" ? (
            <>
              <RefreshButton
                onRefresh={() => quarantineQuery.refetch()}
                updatedAt={quarantineQuery.dataUpdatedAt}
              />
              <Button
                icon={Download}
                isLoading={exportQuarantine.isPending}
                onClick={() => void downloadQuarantineReport()}
                variant="outline"
              >
                ดาวน์โหลดรายงาน
              </Button>
            </>
          ) : undefined
        }
      />
      {activeTab === "import" && selectedTargetDefinition ? (
        <Card className="mb-5">
          <CardHeader>
            <CardTitle>เลือกปลายทางสำหรับข้อมูลนำเข้า</CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              เลือกโรงเรียน ภาคเรียน ชั้น และห้องเรียนปลายทางก่อนอัปโหลดไฟล์
            </p>
          </CardHeader>
          <CardContent>
            <ToolbarFilterGrid>
              {requiresSchoolContext ? (
                <SchoolAreaSchoolFilter
                  area={importArea}
                  onSchoolChange={selectImportSchool}
                  schoolEmptyLabel="เลือกโรงเรียน"
                  schoolId={importSchoolId}
                  selectedSchoolFallback={selectedImportSchool}
                />
              ) : null}
              {requiresTermContext ? (
                <Combobox
                  ariaLabel="เลือกภาคเรียน"
                  disabled={!importSchool || importTermsQuery.isLoading}
                  onChange={selectImportTerm}
                  options={[
                    { value: "", label: "เลือกภาคเรียน" },
                    ...(importTermsQuery.data ?? []).map((term) => ({
                      value: String(term.id),
                      label: `ปี ${term.academicYear} / ภาค ${term.semester}`,
                    })),
                  ]}
                  placeholder="เลือกภาคเรียน"
                  searchable={false}
                  value={importSchoolTermId}
                />
              ) : null}
              {requiresClassroomContext ? (
                <Combobox
                  ariaLabel="เลือกชั้น"
                  disabled={
                    !importSchoolTermId || importClassroomsQuery.isLoading
                  }
                  onChange={selectImportGrade}
                  options={[
                    { value: "", label: "เลือกชั้น" },
                    ...importGrades.map((grade) => ({
                      value: grade,
                      label: grade,
                    })),
                  ]}
                  placeholder="เลือกชั้น"
                  searchable={false}
                  value={effectiveImportGrade}
                />
              ) : null}
              {requiresClassroomContext ? (
                <Combobox
                  ariaLabel="เลือกห้องเรียน"
                  disabled={
                    !effectiveImportGrade || importClassroomsQuery.isLoading
                  }
                  onChange={selectImportClassroom}
                  options={[
                    { value: "", label: "เลือกห้องเรียน" },
                    ...importClassrooms.map((classroom) => ({
                      value: classroom.id,
                      label: formatRoomLabel(classroom.roomCode),
                    })),
                  ]}
                  placeholder="เลือกห้องเรียน"
                  searchable={false}
                  value={importClassroomId}
                />
              ) : null}
            </ToolbarFilterGrid>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "import" ? (
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle>รายละเอียดการนำเข้า</CardTitle>
                <Badge
                  variant={
                    preview?.canImport && !mappingDirty && !hasMissingSchools
                      ? "success"
                      : file
                        ? "warning"
                        : "secondary"
                  }
                >
                  {preview?.canImport && !mappingDirty && !hasMissingSchools
                    ? "พร้อมนำเข้า"
                    : mappingDirty
                      ? "ต้องตรวจสอบใหม่"
                      : file
                        ? "รอตรวจสอบ"
                        : "รอไฟล์"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {importCatalog.isError ? (
                <Alert className="mb-4" variant="destructive">
                  <AlertTitle>โหลดรายการประเภทข้อมูลไม่สำเร็จ</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      importCatalog.error,
                      "กรุณาลองโหลดหน้าอีกครั้ง",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}
              {missingContextLabels.length > 0 ? (
                <Alert className="mb-4" variant="warning">
                  <AlertTitle>เลือกปลายทางให้ครบก่อนนำเข้า</AlertTitle>
                  <AlertDescription>
                    กรุณาเลือก {missingContextLabels.join(" / ")}{" "}
                    ด้านบนก่อนอัปโหลดไฟล์
                  </AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <label
                    className="text-sm font-medium text-slate-500"
                    htmlFor="import-target"
                  >
                    ประเภทข้อมูล
                  </label>
                  <Select
                    className="mt-1"
                    disabled={
                      importCatalog.isPending ||
                      allowedTargets.length === 0 ||
                      isBusy
                    }
                    id="import-target"
                    onChange={(event) => {
                      setRequestedTarget(event.target.value as ImportTarget);
                      setFile(null);
                      setMapping({});
                      setMappingDirty(false);
                      previewImport.reset();
                      submitImport.reset();
                    }}
                    value={selectedTarget}
                  >
                    {allowedTargets.map((target) => (
                      <option key={target.target} value={target.target}>
                        {target.label}
                      </option>
                    ))}
                  </Select>
                  {selectedTargetDefinition?.dependsOn.length ? (
                    <div className="mt-1 text-xs text-slate-500">
                      ต้องนำเข้าก่อน:{" "}
                      {selectedTargetDefinition.dependsOn
                        .map(
                          (dependency) =>
                            importCatalog.data?.targets.find(
                              (item) => item.target === dependency,
                            )?.label ?? dependency,
                        )
                        .join(" → ")}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-medium text-slate-500">
                    ไฟล์ที่เลือก
                  </div>
                  <div className="mt-1 truncate font-bold text-slate-900">
                    {file?.name ?? "-"}
                  </div>
                </div>
              </div>

              <Alert className="mt-4">
                <AlertDescription>
                  ระบบจะตรวจสอบไฟล์ก่อนนำเข้าจริง
                  รองรับหัวคอลัมน์มาตรฐานและชื่อทั่วไป
                  หากจับคู่ไม่ตรงสามารถเลือกคอลัมน์ใหม่แล้วตรวจสอบอีกครั้ง
                </AlertDescription>
              </Alert>

              <div className="mt-4">
                <ImportDropZone
                  disabled={isBusy}
                  file={file}
                  onFileSelect={(next) => {
                    setFile(next);
                    setMapping({});
                    setMappingDirty(false);
                    previewImport.reset();
                    submitImport.reset();
                    setPreviewProgress(0);
                    setProgress(0);
                  }}
                />
              </div>

              {previewImport.isPending ? (
                <ProgressBar
                  className="mt-4"
                  label="กำลังตรวจสอบไฟล์..."
                  value={previewProgress}
                />
              ) : null}

              {submitImport.isPending ? (
                <ProgressBar
                  className="mt-4"
                  label="กำลังอัปโหลด..."
                  value={progress}
                />
              ) : null}

              {previewImport.isError ? (
                <Alert className="mt-4" variant="destructive">
                  <AlertTitle>ตรวจสอบไฟล์ไม่สำเร็จ</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      previewImport.error,
                      "เกิดข้อผิดพลาดระหว่างตรวจสอบไฟล์ กรุณาตรวจสอบชนิดไฟล์และหัวคอลัมน์แล้วลองอีกครั้ง",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {preview ? (
                <>
                  <ImportMappingPanel
                    fields={
                      selectedTargetDefinition?.fields.filter(
                        (field) => field.source === "file",
                      ) ?? []
                    }
                    mapping={mapping}
                    onMappingChange={handleMappingChange}
                    preview={preview}
                  />
                  {mappingDirty ? (
                    <Alert className="mt-4" variant="warning">
                      <AlertTitle>ต้องตรวจสอบไฟล์อีกครั้ง</AlertTitle>
                      <AlertDescription>
                        คุณเปลี่ยนการจับคู่คอลัมน์แล้ว
                        กรุณากดตรวจสอบไฟล์อีกครั้งก่อนนำเข้า
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {isStudentPreview(preview) &&
                  (preview.missingSchools ?? []).length > 0 ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div>
                        <div className="font-bold text-amber-950">
                          พบโรงเรียนที่ยังไม่มีในข้อมูลหลัก
                        </div>
                        <div className="mt-1 text-sm text-amber-800">
                          การนำเข้านักเรียนจะไม่สร้างโรงเรียนให้อัตโนมัติ
                          กรุณาให้ผู้ดูแลเพิ่มโรงเรียนผ่านขั้นตอน onboarding
                          ก่อน แล้วตรวจสอบไฟล์อีกครั้ง
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(preview.missingSchools ?? []).map((school) => (
                          <Badge key={school.id} variant="warning">
                            รหัสโรงเรียน {school.id}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {isStudentPreview(preview) ? (
                    <ImportPreviewPanel preview={preview} />
                  ) : (
                    <CatalogImportPreviewPanel
                      fields={
                        selectedTargetDefinition?.fields.filter(
                          (field) => field.source === "file",
                        ) ?? []
                      }
                      preview={preview}
                    />
                  )}
                </>
              ) : null}

              {submitImport.isError ? (
                <Alert className="mt-4" variant="destructive">
                  <AlertTitle>นำเข้าไม่สำเร็จ</AlertTitle>
                  <AlertDescription>
                    {getApiErrorMessage(
                      submitImport.error,
                      "เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล กรุณาตรวจสอบไฟล์และคอลัมน์ให้ตรงกับเทมเพลตแล้วลองอีกครั้ง",
                    )}
                  </AlertDescription>
                </Alert>
              ) : null}

              {result ? (
                <Alert className="mt-4" variant="success">
                  <div className="flex items-start gap-2">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0"
                      aria-hidden="true"
                    />
                    <div className="w-full">
                      <AlertTitle>นำเข้าข้อมูลสำเร็จ</AlertTitle>
                      <SummaryMetrics
                        className="mt-3"
                        columns={5}
                        items={[
                          {
                            label: "ทั้งหมด",
                            value: result.rowsProcessed,
                            tone: "default",
                            emphasis: true,
                          },
                          {
                            label: "เพิ่มใหม่",
                            value: result.rowsInserted,
                            tone: "success",
                          },
                          {
                            label: "อัปเดต",
                            value: result.rowsUpdated,
                            tone: "default",
                          },
                          {
                            label: "ข้าม",
                            value: result.rowsSkipped,
                            tone: "warning",
                          },
                          {
                            label: "รอตรวจสอบ",
                            value: result.rowsQuarantined ?? 0,
                            tone: "warning",
                          },
                        ]}
                      />
                    </div>
                  </div>
                </Alert>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button
                  disabled={
                    !file ||
                    isBusy ||
                    !selectedTargetDefinition ||
                    missingContextLabels.length > 0
                  }
                  icon={FileSpreadsheet}
                  isLoading={previewImport.isPending}
                  loadingText="กำลังตรวจสอบ"
                  onClick={() => void handlePreview()}
                  size="lg"
                  variant="outline"
                >
                  ตรวจสอบไฟล์
                </Button>
                <Button
                  disabled={
                    !file ||
                    !preview?.canImport ||
                    mappingDirty ||
                    hasMissingSchools ||
                    missingContextLabels.length > 0 ||
                    !selectedTargetDefinition ||
                    previewImport.isPending
                  }
                  icon={Upload}
                  isLoading={submitImport.isPending}
                  loadingText="กำลังนำเข้า"
                  onClick={() => void handleSubmit()}
                  size="lg"
                >
                  นำเข้าข้อมูล
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "quarantine" ? (
        <div className="space-y-4">
          {exportQuarantine.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                {getApiErrorMessage(
                  exportQuarantine.error,
                  "ดาวน์โหลดรายงานไม่สำเร็จ",
                )}
              </AlertDescription>
            </Alert>
          ) : null}
          <ImportQuarantinePanel
            filters={{
              reasonCode: quarantineReasonCode || undefined,
              search: debouncedQuarantineSearch || undefined,
              province: quarantineArea.province || undefined,
              district: quarantineArea.district || undefined,
              subDistrict: quarantineArea.subDistrict || undefined,
              schoolId: quarantineSchoolId,
            }}
            key={[
              quarantineStatus,
              quarantineReasonCode,
              debouncedQuarantineSearch,
              quarantineArea.province,
              quarantineArea.district,
              quarantineArea.subDistrict,
              quarantineScope.schoolId,
            ].join("|")}
            onPageChange={setQuarantinePage}
            onRowsPerPageChange={(nextRowsPerPage) => {
              setQuarantineRowsPerPage(nextRowsPerPage);
              setQuarantinePage(1);
            }}
            page={quarantinePage}
            query={quarantineQuery}
            retryEligibleLabel={retryEligibleLabel}
            rowsPerPage={quarantineRowsPerPage}
            showRetryBanner={quarantineStatus === "PENDING"}
          />
        </div>
      ) : (
        <AuditLogPanel
          domain="imports"
          description="ดูรายการนำเข้าข้อมูลย้อนหลังตามขอบเขตสิทธิ์ของบัญชี"
          showReferenceColumn={false}
          title="ประวัติการนำเข้าข้อมูล"
        />
      )}
      {confirmDialog}
    </PageShell>
  );
}
