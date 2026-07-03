import { useState } from "react";
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
  Input,
  Select,
  Tabs,
  useConfirm,
} from "../../../components/base";
import {
  FilterSelect,
  ListPageToolbar,
  PageShell,
  ProgressBar,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { SchoolAreaSchoolFilter } from "../../attendance/components/SchoolAreaSchoolFilter";
import { useSchoolAreaFilter } from "../../attendance/hooks/useSchoolAreaFilter";
import { useScopeCascade } from "../../attendance/hooks/useScopeCascade";
import { ImportDropZone } from "../components/ImportDropZone";
import { ImportQuarantinePanel } from "../components/ImportQuarantinePanel";
import {
  useExportImportQuarantine,
  useImportQuarantine,
  usePreviewImport,
  useSubmitImport,
} from "../hooks/useSubmitImport";
import {
  type ImportPreviewResult,
  type QuarantinePageSize,
  type QuarantineStatus,
  REASON_LABELS,
  STUDENT_TERM_IMPORT_LABEL,
} from "../types/import.types";

const IMPORT_MAPPING_FIELDS = [
  { column: "PersonID_Onec", label: "เลขประจำตัว/เลขบัตร", required: true },
  { column: "FirstName_Onec", label: "ชื่อ", required: false },
  { column: "LastName_Onec", label: "นามสกุล", required: false },
  { column: "AcademicYear_Onec", label: "ปีการศึกษา", required: true },
  { column: "Semester_Onec", label: "เทอม", required: true },
  { column: "SchoolID_Onec", label: "รหัสโรงเรียน", required: true },
  { column: "GradeLevelID_Onec", label: "ชั้นเรียน", required: false },
  { column: "RoomID_Onec", label: "ห้อง", required: false },
  { column: "VillageNumber_Onec", label: "หมู่", required: false },
  { column: "Street_Onec", label: "ถนน", required: false },
  { column: "Soi_Onec", label: "ซอย", required: false },
  { column: "Trok_Onec", label: "ตรอก", required: false },
] as const;

function effectiveMapping(
  localMapping: Record<string, string>,
  preview?: ImportPreviewResult,
): Record<string, string> {
  return Object.keys(localMapping).length > 0 ? localMapping : (preview?.mapping ?? {});
}

function ImportMappingPanel({
  mapping,
  onMappingChange,
  preview,
}: {
  mapping: Record<string, string>;
  onMappingChange: (column: string, header: string) => void;
  preview: ImportPreviewResult;
}) {
  const currentMapping = effectiveMapping(mapping, preview);

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">จับคู่คอลัมน์</div>
          <div className="mt-1 text-sm text-slate-500">
            ระบบจับคู่ให้อัตโนมัติเมื่อชื่อคอลัมน์ตรงเทมเพลต แก้ไขได้ก่อนตรวจสอบอีกครั้ง
          </div>
        </div>
        <Badge variant="secondary">{preview.headers.length} คอลัมน์ในไฟล์</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {IMPORT_MAPPING_FIELDS.map((field) => {
          const sourceHeader = currentMapping[field.column];
          const samples = preview.mappedColumnSamples[field.column] ?? [];
          const sampleIsStale = sourceHeader !== preview.mapping[field.column];
          return (
            <label
              className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3"
              key={field.column}
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <span>{field.label}</span>
                {field.required ? <Badge variant="warning">บังคับ</Badge> : null}
              </div>
              <Select
                value={currentMapping[field.column] ?? ""}
                onChange={(event) => onMappingChange(field.column, event.target.value)}
              >
                <option value="">ไม่ใช้คอลัมน์นี้</option>
                {preview.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </Select>
              <div className="min-h-9 text-xs leading-5 text-slate-500">
                {sourceHeader ? (
                  <>
                    <div>
                      ค่าจากคอลัมน์{" "}
                      <span className="font-semibold text-slate-700">“{sourceHeader}”</span>
                    </div>
                    <div>
                      ตัวอย่าง:{" "}
                      {sampleIsStale
                        ? "กดตรวจสอบไฟล์อีกครั้งเพื่ออัปเดตตัวอย่าง"
                        : samples.length > 0
                          ? samples.join(" · ")
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
  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-bold text-slate-900">ผลตรวจสอบไฟล์</div>
          <div className="mt-1 text-sm text-slate-500">{preview.targetLabel}</div>
        </div>
        <Badge variant={preview.canImport ? "success" : "warning"}>
          {preview.canImport ? "พร้อมนำเข้า" : "ต้องตรวจสอบ"}
        </Badge>
      </div>

      <SummaryMetrics
        columns={3}
        items={[
          { label: "ทั้งหมด", value: preview.rowsProcessed, tone: "default" },
          { label: "เพิ่มใหม่", value: preview.rowsToInsert, tone: "success" },
          { label: "อัปเดตข้อมูลเดิม", value: preview.rowsToUpdate, tone: "default" },
          { label: "รอตรวจสอบ", value: preview.rowsToQuarantine ?? 0, tone: "warning" },
          { label: "ข้าม", value: preview.rowsSkipped, tone: "warning" },
          { label: "ซ้ำในไฟล์", value: preview.duplicateRows, tone: "warning" },
          { label: "ไม่มีรหัส", value: preview.missingPersonIdRows, tone: "danger" },
          { label: "ข้อมูลภาคเรียนไม่ครบ", value: preview.missingNaturalKeyRows, tone: "danger" },
          { label: "ไม่พบโรงเรียน", value: preview.missingSchoolRows ?? 0, tone: "danger" },
          { label: "ชั้นไม่ถูกต้อง", value: preview.gradeIssueRows ?? 0, tone: "danger" },
          { label: "ห้องไม่ถูกต้อง", value: preview.roomIssueRows ?? 0, tone: "danger" },
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
          ค่าว่างจากไฟล์จะไม่ทับข้อมูลเดิม และระบบจะไม่เปลี่ยนบุคคล ปี เทอม หรือโรงเรียนของ enrollment เดิม
          หากโรงเรียนต่างกัน ระบบจะสร้าง snapshot ใหม่
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

      {preview.missingRecommendedColumns.length > 0 || preview.unmappedHeaders.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>มีข้อมูลที่ควรตรวจสอบ</AlertTitle>
          <AlertDescription>
            {preview.missingRecommendedColumns.length > 0
              ? `คอลัมน์แนะนำที่ยังไม่พบ: ${preview.missingRecommendedColumns.join(", ")}`
              : null}
            {preview.missingRecommendedColumns.length > 0 && preview.unmappedHeaders.length > 0
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
            <div className="font-semibold text-slate-800">ตัวอย่างข้อมูลจากไฟล์</div>
            <div className="text-sm text-slate-500">
              ชื่อใต้หัวตารางคือคอลัมน์ต้นทางที่ระบบจับคู่ ค่าโรงเรียน ชั้น และสถานะจะแสดงชื่อที่ระบบค้นพบควบคู่กับรหัสจากไฟล์
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <div className="grid min-w-[1120px] grid-cols-[64px_minmax(180px,1.2fr)_minmax(210px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_minmax(150px,1fr)_110px_minmax(180px,1.2fr)] bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
              <div>แถว</div>
              <div>
                ชื่อ
                <div className="font-normal text-slate-400">
                  {preview.mapping.FirstName_Onec ?? "ยังไม่จับคู่"} +{" "}
                  {preview.mapping.LastName_Onec ?? "ยังไม่จับคู่"}
                </div>
              </div>
              <div>
                โรงเรียน
                <div className="font-normal text-slate-400">
                  {preview.mapping.SchoolID_Onec ?? "ยังไม่จับคู่"}
                </div>
              </div>
              <div>
                ปี / เทอม
                <div className="font-normal text-slate-400">
                  {preview.mapping.AcademicYear_Onec ?? "-"} /{" "}
                  {preview.mapping.Semester_Onec ?? "-"}
                </div>
              </div>
              <div>
                ชั้น / ห้อง
                <div className="font-normal text-slate-400">
                  {preview.mapping.GradeLevelID_Onec ?? "-"} /{" "}
                  {preview.mapping.RoomID_Onec ?? "-"}
                </div>
              </div>
              <div>
                สถานะ
                <div className="font-normal text-slate-400">
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
                <div className="font-medium text-slate-500">{row.rowNumber}</div>
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-800">
                    {row.firstName} {row.lastName}
                  </div>
                  <div className="text-xs text-slate-400">{row.personIdMasked}</div>
                </div>
                <div className="text-slate-700">
                  <div className="font-medium">{row.schoolName}</div>
                  <div className="text-xs text-slate-500">รหัสจากไฟล์: {row.schoolId}</div>
                </div>
                <div className="text-slate-700">
                  ปี {row.academicYear} · เทอม {row.semester}
                </div>
                <div className="text-slate-700">
                  <div>{row.gradeLabel} · ห้อง {row.roomId}</div>
                  <div className="text-xs text-slate-500">รหัสชั้นจากไฟล์: {row.gradeLevelId}</div>
                </div>
                <div className="text-slate-700">
                  <div>{row.studentStatusLabel}</div>
                  <div className="text-xs text-slate-500">รหัสจากไฟล์: {row.studentStatusCode}</div>
                </div>
                <div>
                  <Badge variant={row.action === "insert" ? "success" : "warning"}>
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

export function ImportDataPage() {
  const { can } = usePermissions();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const previewImport = usePreviewImport();
  const submitImport = useSubmitImport();
  const [activeTab, setActiveTab] = useState<"import" | "quarantine" | "history">("import");
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingDirty, setMappingDirty] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [schoolNames, setSchoolNames] = useState<Record<number, string>>({});

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
  const exportQuarantine = useExportImportQuarantine();
  const quarantineTotalCount = quarantineQuery.data?.meta.totalCount ?? 0;

  function resetQuarantineList(): void {
    setQuarantinePage(1);
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
        status: quarantineStatus === "PENDING" ? "PENDING" : "REJECTED",
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
    if (!file) {
      return;
    }
    setPreviewProgress(0);
    submitImport.reset();
    const nextPreview = await previewImport.mutateAsync({
      file,
      mapping,
      onProgress: setPreviewProgress,
    });
    if (Object.keys(mapping).length === 0) {
      setMapping(nextPreview.mapping);
    }
    setSchoolNames(
      Object.fromEntries((nextPreview.missingSchools ?? []).map((school) => [school.id, ""])),
    );
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
    const schools = (preview?.missingSchools ?? []).map((school) => ({
      id: school.id,
      name: schoolNames[school.id]?.trim() ?? "",
    }));
    if (!file || !preview?.canImport || mappingDirty || schools.some((school) => !school.name)) {
      return;
    }
    const confirmed = await confirm({
      title: "ยืนยันการนำเข้าข้อมูล",
      description: (
        <span>
          ระบบจะเพิ่มใหม่ {preview.rowsToInsert.toLocaleString("en-US")} แถว อัปเดตข้อมูลเดิม{" "}
          {preview.rowsToUpdate.toLocaleString("en-US")} แถว ส่งรอตรวจสอบ{" "}
          {(preview.rowsToQuarantine ?? 0).toLocaleString("en-US")} แถว และข้าม{" "}
          {preview.rowsSkipped.toLocaleString("en-US")} แถว หลังยืนยันแล้วจะเริ่มบันทึกข้อมูลเข้าระบบ
        </span>
      ),
      confirmText: "นำเข้าข้อมูล",
    });
    if (!confirmed) {
      return;
    }
    setProgress(0);
    submitImport.mutate({ file, mapping, schools, onProgress: setProgress });
  }

  const result = submitImport.data;
  const preview = previewImport.data;
  const isBusy = previewImport.isPending || submitImport.isPending;
  const hasUnresolvedSchools = (preview?.missingSchools ?? []).some(
    (school) => !schoolNames[school.id]?.trim(),
  );

  return (
    <PageShell>
      <ListPageToolbar
        actions={
          <Tabs
            aria-label="โหมดนำเข้าข้อมูล"
            onChange={(value) =>
              setActiveTab(
                value === "quarantine" ? "quarantine" : value === "history" ? "history" : "import",
              )
            }
            options={[
              { value: "import", label: "นำเข้าข้อมูล" },
              { value: "quarantine", label: "รอตรวจสอบ" },
              ...(can("audit-log") ? [{ value: "history", label: "ประวัติ" }] : []),
            ]}
            value={activeTab}
          />
        }
        icon={FileSpreadsheet}
        title="นำเข้าข้อมูล"
        description={
          activeTab === "import"
            ? "อัปโหลดไฟล์ Excel / CSV เพื่อนำเข้าข้อมูลนักเรียน"
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
        count={
          activeTab === "quarantine"
            ? {
                value: quarantineQuery.isFetching
                  ? "กำลังอัปเดต"
                  : `${quarantineTotalCount.toLocaleString("en-US")} รายการ`,
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
              <FilterSelect
                ariaLabel="กรองตามสาเหตุ"
                className="sm:w-[320px]"
                onChange={(value) => {
                  setQuarantineReasonCode(value);
                  resetQuarantineList();
                }}
                value={quarantineReasonCode}
              >
                <option value="">ทุกสาเหตุ</option>
                {Object.entries(REASON_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                ariaLabel="กรองตามสถานะ"
                onChange={(value) => {
                  setQuarantineStatus(value as QuarantineStatus);
                  resetQuarantineList();
                }}
                value={quarantineStatus}
              >
                <option value="PENDING">รอตรวจสอบ</option>
                <option value="RESOLVED">แก้ไขแล้ว</option>
                <option value="REJECTED">ปฏิเสธแล้ว</option>
              </FilterSelect>
            </>
          ) : undefined
        }
        tableActions={
          activeTab === "quarantine" ? (
            <Button
              disabled={quarantineStatus === "RESOLVED"}
              icon={Download}
              isLoading={
                quarantineStatus !== "RESOLVED" && exportQuarantine.isPending
              }
              onClick={() => void downloadQuarantineReport()}
              variant="outline"
            >
              ดาวน์โหลดรายงาน
            </Button>
          ) : undefined
        }
      />

      {activeTab === "import" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>รายละเอียดการนำเข้า</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-medium text-slate-500">
                  ประเภทข้อมูล
                </div>
                <div className="mt-1 font-bold text-slate-900">
                  {STUDENT_TERM_IMPORT_LABEL}
                </div>
              </div>

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
                    mapping={mapping}
                    onMappingChange={handleMappingChange}
                    preview={preview}
                  />
                  {mappingDirty ? (
                    <Alert className="mt-4" variant="warning">
                      <AlertTitle>ต้องตรวจสอบไฟล์อีกครั้ง</AlertTitle>
                      <AlertDescription>
                        คุณเปลี่ยนการจับคู่คอลัมน์แล้ว กรุณากดตรวจสอบไฟล์อีกครั้งก่อนนำเข้า
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {(preview.missingSchools ?? []).length > 0 ? (
                    <div className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <div>
                        <div className="font-bold text-amber-950">เพิ่มข้อมูลโรงเรียนที่ยังไม่พบ</div>
                        <div className="mt-1 text-sm text-amber-800">
                          กรอกชื่อให้ครบทุกรหัสก่อนนำเข้า ระบบจะสร้างเฉพาะโรงเรียนที่ยังไม่มีในข้อมูลหลัก
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        {(preview.missingSchools ?? []).map((school) => (
                          <label
                            className="space-y-1.5"
                            htmlFor={`missing-school-${school.id}`}
                            key={school.id}
                          >
                            <span className="text-sm font-semibold text-amber-950">
                              รหัสโรงเรียน {school.id}
                            </span>
                            <Input
                              id={`missing-school-${school.id}`}
                              onChange={(event) =>
                                setSchoolNames((current) => ({
                                  ...current,
                                  [school.id]: event.target.value,
                                }))
                              }
                              placeholder="ชื่อโรงเรียน"
                              value={schoolNames[school.id] ?? ""}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <ImportPreviewPanel preview={preview} />
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

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <Button
                  disabled={!file || isBusy}
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
                    hasUnresolvedSchools ||
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

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>สถานะไฟล์</CardTitle>
                  <Badge
                    variant={
                      preview?.canImport && !mappingDirty && !hasUnresolvedSchools
                        ? "success"
                        : file
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {preview?.canImport && !mappingDirty && !hasUnresolvedSchools
                      ? "พร้อมนำเข้า"
                      : mappingDirty
                        ? "ต้องตรวจสอบใหม่"
                        : file
                          ? "รอตรวจสอบ"
                          : "รอไฟล์"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">
                    ประเภทข้อมูล
                  </div>
                  <div className="mt-1 font-bold text-slate-900">
                    {STUDENT_TERM_IMPORT_LABEL}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-500">
                    ไฟล์ที่เลือก
                  </div>
                  <div className="mt-1 truncate font-bold text-slate-900">
                    {file?.name ?? "-"}
                  </div>
                </div>

                {result ? (
                  <Alert variant="success">
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        className="mt-0.5 size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="w-full">
                        <AlertTitle>นำเข้าข้อมูลสำเร็จ</AlertTitle>
                        <SummaryMetrics
                          className="mt-3"
                          columns={1}
                          items={[
                            {
                              label: "ทั้งหมด",
                              value: result.rowsProcessed,
                              tone: "default",
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
              </CardContent>
            </Card>

            <Alert>
              <AlertDescription>
                หมายเหตุ:
                หน้านี้ตรวจสอบไฟล์ก่อนนำเข้าจริง และรองรับไฟล์ที่มีหัวคอลัมน์ตรงตามเทมเพลต
                หากชื่อคอลัมน์ไม่ตรง สามารถจับคู่คอลัมน์หลักก่อนตรวจสอบอีกครั้ง
              </AlertDescription>
            </Alert>
          </div>
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
            rowsPerPage={quarantineRowsPerPage}
          />
        </div>
      ) : (
        <AuditLogPanel
          domain="imports"
          description="ดูรายการนำเข้าข้อมูลย้อนหลังตามขอบเขตสิทธิ์ของบัญชี"
          showActionColumn={false}
          showReferenceColumn={false}
          title="ประวัติการนำเข้าข้อมูล"
        />
      )}
      {confirmDialog}
    </PageShell>
  );
}
