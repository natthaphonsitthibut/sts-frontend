import { useState } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
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
  Tabs,
} from "../../../components/base";
import {
  PageShell,
  PageToolbar,
  ProgressBar,
  SummaryMetrics,
} from "../../../components/layout/page-primitives";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { AuditLogPanel } from "../../audit-log/components/AuditLogPanel";
import { ImportDropZone } from "../components/ImportDropZone";
import { useSubmitImport } from "../hooks/useSubmitImport";
import { STUDENT_TERM_IMPORT_LABEL } from "../types/import.types";

export function ImportDataPage() {
  const { can } = usePermissions();
  const submitImport = useSubmitImport();
  const [activeTab, setActiveTab] = useState<"import" | "history">("import");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  function handleSubmit(): void {
    if (!file) {
      return;
    }
    setProgress(0);
    submitImport.mutate({ file, onProgress: setProgress });
  }

  const result = submitImport.data;

  return (
    <PageShell>
      <PageToolbar
        actions={
          can("audit-log") ? (
            <Tabs
              aria-label="โหมดนำเข้าข้อมูล"
              onChange={(value) =>
                setActiveTab(value === "history" ? "history" : "import")
              }
              options={[
                { value: "import", label: "นำเข้าข้อมูล" },
                { value: "history", label: "ประวัติ" },
              ]}
              value={activeTab}
            />
          ) : undefined
        }
        icon={FileSpreadsheet}
        title="นำเข้าข้อมูล"
        description={
          activeTab === "import"
            ? "อัปโหลดไฟล์ Excel / CSV เพื่อนำเข้าข้อมูลนักเรียน"
            : "ตรวจสอบประวัติการนำเข้าข้อมูลตามขอบเขตสิทธิ์"
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
                  disabled={submitImport.isPending}
                  file={file}
                  onFileSelect={(next) => {
                    setFile(next);
                    submitImport.reset();
                  }}
                />
              </div>

              {submitImport.isPending ? (
                <ProgressBar
                  className="mt-4"
                  label="กำลังอัปโหลด..."
                  value={progress}
                />
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

              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!file}
                  icon={Upload}
                  isLoading={submitImport.isPending}
                  loadingText="กำลังนำเข้า"
                  onClick={handleSubmit}
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
                  <Badge variant={file ? "success" : "secondary"}>
                    {file ? "พร้อมนำเข้า" : "รอไฟล์"}
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
                              label: "ข้าม",
                              value: result.rowsSkipped,
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
                หน้านี้รองรับการอัปโหลดไฟล์ที่มีหัวคอลัมน์ตรงตามเทมเพลต
                ขั้นตอนจับคู่คอลัมน์
                และการตรวจ/เพิ่มสถานศึกษาที่ยังไม่มีอยู่ในงานพอร์ตถัดไป
              </AlertDescription>
            </Alert>
          </div>
        </div>
      ) : (
        <AuditLogPanel
          domain="imports"
          description="ดูรายการนำเข้าข้อมูลย้อนหลังตามขอบเขตสิทธิ์ของบัญชี"
          showActionColumn={false}
          title="ประวัติการนำเข้าข้อมูล"
        />
      )}
    </PageShell>
  );
}
