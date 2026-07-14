import { useState } from "react";
import { ArrowRight, Download, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  Textarea,
} from "../../../components/base";
import { buttonVariants } from "../../../components/base";
import { PageShell, PageToolbar, SkeletonStack } from "../../../components/layout/page-primitives";
import { cn } from "../../../lib/utils";
import {
  useCreateDataExportJob,
  useDataExportCatalog,
  useDataExportJobs,
  useDownloadDataExportJob,
} from "../hooks/useDataExportCatalog";
import { parseDataExportContext } from "../lib/data-export-context";
import type {
  DataExportCatalogItem,
  DataExportFilterDefinition,
  DataExportJob,
  DataExportSensitivityClass,
} from "../types/data-export.types";

interface DataExportFormValues {
  filters: Record<string, string>;
  purposeCode: string;
  purposeNote: string;
}

const sensitivityLabels: Record<DataExportSensitivityClass, string> = {
  LOW: "ต่ำ",
  AGGREGATE: "ข้อมูลสรุป",
  OPERATIONAL: "ปฏิบัติการ",
  SENSITIVE_OPERATIONAL: "อ่อนไหวเชิงปฏิบัติการ",
  SENSITIVE_PII: "PII",
  PRIVILEGED: "สิทธิ์สูง",
};

const sensitivityTone: Record<DataExportSensitivityClass, string> = {
  LOW: "bg-slate-100 text-slate-700",
  AGGREGATE: "bg-sky-50 text-sky-700",
  OPERATIONAL: "bg-indigo-50 text-indigo-700",
  SENSITIVE_OPERATIONAL: "bg-amber-50 text-amber-700",
  SENSITIVE_PII: "bg-rose-50 text-rose-700",
  PRIVILEGED: "bg-purple-50 text-purple-700",
};

function DatasetCard({
  creatingCode,
  initialFilters,
  item,
  onCreateJob,
}: {
  creatingCode: string | null;
  initialFilters: Record<string, string>;
  item: DataExportCatalogItem;
  onCreateJob: (item: DataExportCatalogItem, values: DataExportFormValues) => void;
}) {
  const isExistingWorkflow = item.deliveryMode === "EXISTING_WORKFLOW";
  const requiresPurpose = item.purposePolicy === "REQUIRED_CODE_AND_NOTE";
  const [filters, setFilters] = useState<Record<string, string>>(
    () => initialFilters,
  );
  const [purposeCode, setPurposeCode] = useState("");
  const [purposeNote, setPurposeNote] = useState("");
  const purposeComplete =
    !requiresPurpose || Boolean(purposeCode.trim() && purposeNote.trim());

  const updateFilter = (definition: DataExportFilterDefinition, value: string) => {
    setFilters((current) => {
      const next = { ...current, [definition.key]: value };
      if (!value) {
        const clearedKeys = new Set([definition.key]);
        let clearedAnother = true;
        while (clearedAnother) {
          clearedAnother = false;
          for (const child of item.filterDefinitions) {
            if (child.dependsOn && clearedKeys.has(child.dependsOn) && child.key in next) {
              delete next[child.key];
              clearedKeys.add(child.key);
              clearedAnother = true;
            }
          }
        }
      }
      return next;
    });
  };

  return (
    <Card
      className="h-full border-slate-200 bg-white shadow-sm"
      data-export-dataset-code={item.code}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{item.label}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
          </div>
          <Badge className={sensitivityTone[item.sensitivityClass]}>
            {sensitivityLabels[item.sensitivityClass]}
          </Badge>
        </div>

        <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-800">รูปแบบ</dt>
            <dd>{item.formats.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-800">การจัดส่ง</dt>
            <dd>{isExistingWorkflow ? "Workflow เดิม" : "Queued job"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-medium text-slate-800">ชุดข้อมูล</dt>
            <dd className="mt-1 space-y-1">
              {item.fieldBundles.map((bundle) => (
                <span key={bundle.code} className="block">
                  {bundle.label}: {bundle.description}
                </span>
              ))}
            </dd>
          </div>
        </dl>

        {!isExistingWorkflow && item.filterDefinitions.length > 0 ? (
          <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            {item.filterDefinitions.map((definition) => {
              const inputId = `export-${item.code}-${definition.key}`;
              const dependencyMissing = Boolean(
                definition.dependsOn && !filters[definition.dependsOn],
              );
              return (
                <div key={definition.key}>
                  <Label htmlFor={inputId}>{definition.label}</Label>
                  {definition.control === "SELECT" ? (
                    <Select
                      id={inputId}
                      value={filters[definition.key] ?? ""}
                      disabled={dependencyMissing}
                      onChange={(event) => updateFilter(definition, event.target.value)}
                    >
                      <option value="">ทั้งหมด</option>
                      {definition.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={inputId}
                      type={
                        definition.control === "DATE"
                          ? "date"
                          : definition.control === "INTEGER"
                            ? "number"
                            : "text"
                      }
                      min={definition.control === "INTEGER" ? 1 : undefined}
                      max={definition.control === "INTEGER" ? 2_147_483_647 : undefined}
                      step={definition.control === "INTEGER" ? 1 : undefined}
                      maxLength={definition.control === "TEXT" ? 100 : undefined}
                      placeholder={definition.placeholder}
                      value={filters[definition.key] ?? ""}
                      disabled={dependencyMissing}
                      onChange={(event) => updateFilter(definition, event.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {requiresPurpose ? (
          <div className="grid gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
            <div>
              <Label htmlFor={`export-${item.code}-purpose-code`}>รหัสวัตถุประสงค์</Label>
              <Input
                id={`export-${item.code}-purpose-code`}
                required
                maxLength={64}
                value={purposeCode}
                onChange={(event) => setPurposeCode(event.target.value)}
                placeholder="เช่น CASE_REVIEW"
              />
            </div>
            <div>
              <Label htmlFor={`export-${item.code}-purpose-note`}>รายละเอียดการใช้งาน</Label>
              <Textarea
                id={`export-${item.code}-purpose-note`}
                required
                maxLength={500}
                value={purposeNote}
                onChange={(event) => setPurposeNote(event.target.value)}
                placeholder="ระบุเหตุผลและขอบเขตการนำข้อมูลไปใช้"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="size-4" aria-hidden="true" />
            ตรวจสิทธิ์และ scope ฝั่ง backend
          </span>
          {isExistingWorkflow && item.workflowPath ? (
            <Link className={cn(buttonVariants({ size: "sm" }))} to={item.workflowPath}>
              เปิด workflow
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <Button
              size="sm"
              disabled={!purposeComplete}
              isLoading={creatingCode === item.code}
              loadingText="กำลังสร้างงาน"
              onClick={() => onCreateJob(item, { filters, purposeCode, purposeNote })}
            >
              สร้างงานส่งออก
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function statusLabel(status: DataExportJob["status"]) {
  const labels: Record<DataExportJob["status"], string> = {
    PENDING: "รอคิว",
    RUNNING: "กำลังทำงาน",
    COMPLETED: "เสร็จแล้ว",
    FAILED: "ล้มเหลว",
    CANCELED: "ยกเลิกแล้ว",
    EXPIRED: "หมดอายุ",
  };
  return labels[status];
}

function JobHistory({
  downloadingId,
  jobs,
  onDownload,
}: {
  downloadingId: string | null;
  jobs: DataExportJob[];
  onDownload: (job: DataExportJob) => void;
}) {
  if (jobs.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">งานส่งออกล่าสุด</h2>
        <p className="text-sm text-slate-600">
          ติดตามสถานะไฟล์ที่กำลังจัดเตรียมและดาวน์โหลดเมื่อพร้อม
        </p>
      </div>
      <div className="mt-4 divide-y divide-slate-100">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs text-slate-500">{job.id}</p>
                <Badge className="bg-slate-100 text-slate-700">{statusLabel(job.status)}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-700">
                {job.datasetCode} · {job.exportedRowCount ?? 0} แถว
                {job.failureSummary ? ` · ${job.failureSummary}` : ""}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={job.status !== "COMPLETED"}
              isLoading={downloadingId === job.id}
              loadingText="กำลังดาวน์โหลด"
              onClick={() => onDownload(job)}
            >
              ดาวน์โหลด CSV
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DataExportsPage() {
  const [searchParams] = useSearchParams();
  const { data: catalog = [], isLoading, isError, refetch, isFetching } = useDataExportCatalog();
  const { data: jobs = [], isError: isJobsError, refetch: refetchJobs } = useDataExportJobs();
  const createJob = useCreateDataExportJob();
  const downloadJob = useDownloadDataExportJob();
  const creatingCode = createJob.variables?.datasetCode ?? null;
  const downloadingId = downloadJob.variables ?? null;
  const requestedDatasetCode = searchParams.get("dataset")?.trim() ?? "";
  const exportContext = parseDataExportContext(searchParams, catalog);
  const contextSignature = exportContext
    ? JSON.stringify(exportContext.filters)
    : "none";

  const handleCreateJob = (item: DataExportCatalogItem, values: DataExportFormValues) => {
    const bundle = item.fieldBundles[0];
    if (!bundle) return;
    const filters = Object.fromEntries(
      item.filterDefinitions.flatMap((definition) => {
        const value = values.filters[definition.key]?.trim();
        if (!value) return [];
        return [[definition.key, definition.control === "INTEGER" ? Number(value) : value]];
      }),
    );
    createJob.mutate({
      datasetCode: item.code,
      fieldBundleCode: bundle.code,
      filters,
      ...(values.purposeCode.trim() ? { purposeCode: values.purposeCode.trim() } : {}),
      ...(values.purposeNote.trim() ? { purposeNote: values.purposeNote.trim() } : {}),
    });
  };

  const handleDownload = (job: DataExportJob) => {
    downloadJob.mutate(job.id, {
      onSuccess: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${job.datasetCode}-${job.id}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
    });
  };

  return (
    <PageShell>
      <PageToolbar
        icon={Download}
        title="ส่งออกข้อมูล"
        description="เลือกชุดข้อมูลที่ได้รับอนุญาตและติดตามไฟล์ส่งออกของคุณ"
      />

      {isLoading ? <SkeletonStack lines={6} /> : null}

      {!isLoading && !isError && exportContext ? (
        <Alert className="mb-4" variant="success">
          <AlertTitle>นำตัวกรองจากหน้าต้นทางมาแล้ว</AlertTitle>
          <AlertDescription>
            เลือกชุดข้อมูล {catalog.find((item) => item.code === exportContext.datasetCode)?.label}
            และเติมเฉพาะตัวกรองที่ catalog รองรับ กรุณาตรวจสอบก่อนสร้างงาน
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && requestedDatasetCode && !exportContext ? (
        <Alert className="mb-4" variant="warning">
          <AlertTitle>ไม่สามารถนำบริบทการส่งออกมาใช้ได้</AlertTitle>
          <AlertDescription>
            ชุดข้อมูลนี้อาจไม่อยู่ใน catalog ที่บัญชีปัจจุบันใช้ได้ หรือตัวกรองไม่ตรงกับข้อกำหนด
          </AlertDescription>
        </Alert>
      ) : null}

      {isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>โหลด catalog ไม่สำเร็จ</AlertTitle>
          <AlertDescription>
            ไม่สามารถโหลดรายการส่งออกที่บัญชีนี้ใช้งานได้ กรุณาลองใหม่
          </AlertDescription>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>
            โหลดใหม่
          </Button>
        </Alert>
      ) : null}

      {createJob.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>สร้างงานส่งออกไม่สำเร็จ</AlertTitle>
          <AlertDescription>ระบบยังไม่สามารถรับงานนี้ได้ กรุณาลองใหม่ภายหลัง</AlertDescription>
        </Alert>
      ) : null}

      {isJobsError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>โหลดประวัติงานส่งออกไม่สำเร็จ</AlertTitle>
          <AlertDescription>รายการชุดข้อมูลยังใช้งานได้ แต่สถานะงานล่าสุดอาจไม่ครบ</AlertDescription>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void refetchJobs()}>
            โหลดประวัติใหม่
          </Button>
        </Alert>
      ) : null}

      {downloadJob.isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>ดาวน์โหลดไฟล์ไม่สำเร็จ</AlertTitle>
          <AlertDescription>ไฟล์อาจหมดอายุหรือสิทธิ์ถูกเปลี่ยน กรุณาสร้างงานใหม่หากจำเป็น</AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && !isError && catalog.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white">
          <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <FileSpreadsheet className="size-10 text-slate-400" aria-hidden="true" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">ยังไม่มี dataset ที่ส่งออกได้</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">
                บัญชีนี้ยังไม่มีชุดข้อมูลที่ได้รับอนุญาตให้ส่งออก
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {catalog.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy={isFetching}>
          {catalog.map((item) => (
            <DatasetCard
              key={`${item.code}:${item.code === exportContext?.datasetCode ? contextSignature : "default"}`}
              creatingCode={creatingCode}
              initialFilters={
                item.code === exportContext?.datasetCode
                  ? exportContext.filters
                  : {}
              }
              item={item}
              onCreateJob={handleCreateJob}
            />
          ))}
        </div>
      ) : null}

      <JobHistory jobs={jobs} downloadingId={downloadingId} onDownload={handleDownload} />
    </PageShell>
  );
}
