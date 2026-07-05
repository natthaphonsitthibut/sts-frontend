import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Checkbox,
  Combobox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
  registerField,
} from "../../../components/base";
import {
  DataTable,
  DataTableCell,
  DataTableRow,
} from "../../../components/layout/data-table";
import { getApiErrorMessage } from "../../../lib/api-error";
import { formatThaiDateTime, formatThaiTimeRemaining } from "../../../lib/date-time";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { PII_REASON_OPTIONS, isPiiReasonCode } from "../pii.constants";
import {
  useApprovePiiExportRequest,
  useCreatePiiExportRequest,
  useDownloadPiiExportCsv,
  usePiiExportRequests,
  useRejectPiiExportRequest,
} from "../hooks/usePiiExportRequests";
import type {
  PiiExportRequest,
  PiiExportScope,
  PiiExportStatus,
} from "../types/students.types";

interface PiiExportPanelProps {
  district?: string;
  province?: string;
  schoolId?: string;
  subDistrict?: string;
  totalCount: number;
}

interface TokenState {
  requestId: string;
  token: string;
}

const piiExportSchema = z.object({
  include_full_national_id: z.boolean(),
  reason_code: z.enum([
    "HOME_VISIT",
    "CONTACT_PARENT",
    "VERIFY_DATA",
    "COORDINATE_AGENCY",
    "OTHER",
  ]),
  reason_note: z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500),
});

type PiiExportFormValues = z.infer<typeof piiExportSchema>;

const DEFAULT_FORM_VALUES: PiiExportFormValues = {
  include_full_national_id: false,
  reason_code: "VERIFY_DATA",
  reason_note: "",
};

const STATUS_LABELS: Record<PiiExportStatus, string> = {
  PENDING: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  DOWNLOADED: "ดาวน์โหลดแล้ว",
  EXPIRED: "หมดอายุ",
  CANCELLED: "ยกเลิก",
};

const STATUS_VARIANTS: Record<
  PiiExportStatus,
  "default" | "secondary" | "destructive" | "success" | "warning"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  DOWNLOADED: "secondary",
  EXPIRED: "secondary",
  CANCELLED: "secondary",
};

function toNumericId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function hasScopeValue(scope: PiiExportScope | null): scope is PiiExportScope {
  return Boolean(
    scope?.global ||
      scope?.provinces?.length ||
      scope?.districts?.length ||
      scope?.sub_districts?.length ||
      scope?.school_ids?.length ||
      scope?.grade_levels?.length ||
      scope?.room_ids?.length,
  );
}

function formatScopeLabel(scope: PiiExportScope | null): string {
  if (!scope) {
    return "ยังไม่กำหนดขอบเขต";
  }
  const parts: string[] = [];
  if (scope.global) parts.push("ทั้งประเทศ");
  if (scope.provinces?.length) parts.push(`จังหวัด: ${scope.provinces.join(", ")}`);
  if (scope.districts?.length) parts.push(`อำเภอ/เขต: ${scope.districts.join(", ")}`);
  if (scope.sub_districts?.length) parts.push(`ตำบล/แขวง: ${scope.sub_districts.join(", ")}`);
  if (scope.school_ids?.length) parts.push(`โรงเรียน: ${scope.school_ids.join(", ")}`);
  if (scope.grade_levels?.length) parts.push(`ระดับชั้น: ${scope.grade_levels.join(", ")}`);
  if (scope.room_ids?.length) parts.push(`ห้อง: ${scope.room_ids.join(", ")}`);
  return parts.length > 0 ? parts.join(" · ") : "ยังไม่กำหนดขอบเขต";
}

function buildPiiExportScope(
  props: PiiExportPanelProps,
  actorScope: PiiExportScope | undefined,
): PiiExportScope | null {
  const schoolId = toNumericId(props.schoolId);
  if (schoolId) {
    return { school_ids: [schoolId] };
  }
  if (props.subDistrict) {
    return {
      provinces: props.province ? [props.province] : undefined,
      districts: props.district ? [props.district] : undefined,
      sub_districts: [props.subDistrict],
    };
  }
  if (props.district) {
    return {
      provinces: props.province ? [props.province] : undefined,
      districts: [props.district],
    };
  }
  if (props.province) {
    return { provinces: [props.province] };
  }
  if (actorScope?.global) {
    return { global: true };
  }
  if (actorScope?.school_ids?.length) {
    return { school_ids: actorScope.school_ids };
  }
  if (actorScope?.sub_districts?.length) {
    return {
      provinces: actorScope.provinces,
      districts: actorScope.districts,
      sub_districts: actorScope.sub_districts,
    };
  }
  if (actorScope?.districts?.length) {
    return { provinces: actorScope.provinces, districts: actorScope.districts };
  }
  if (actorScope?.provinces?.length) {
    return { provinces: actorScope.provinces };
  }
  return null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function requestActorLabel(request: PiiExportRequest): string {
  return request.requester_name || request.requester_username || `#${request.requester_user_id}`;
}

export function PiiExportPanel(props: PiiExportPanelProps) {
  const user = useAuthSessionStore((state) => state.user);
  const form = useForm<PiiExportFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
    resolver: zodResolver(piiExportSchema),
  });
  const includeFullNationalId = useWatch({
    control: form.control,
    name: "include_full_national_id",
  });
  const reasonCode = useWatch({ control: form.control, name: "reason_code" });
  const [serverMessage, setServerMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [tokenState, setTokenState] = useState<TokenState | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PiiExportRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const actorScope = user?.data_scope as PiiExportScope | undefined;
  const exportScope = useMemo(() => buildPiiExportScope(props, actorScope), [props, actorScope]);
  const scopeReady = hasScopeValue(exportScope);
  const scopeLabel = scopeReady ? formatScopeLabel(exportScope) : "ยังไม่กำหนดขอบเขต";
  const isAdmin = user?.roles?.includes("ADMIN") ?? false;

  const listQuery = usePiiExportRequests({ limit: 20 });
  const createMutation = useCreatePiiExportRequest();
  const approveMutation = useApprovePiiExportRequest();
  const rejectMutation = useRejectPiiExportRequest();
  const downloadMutation = useDownloadPiiExportCsv();
  const requests = listQuery.data?.data ?? [];

  function handleReasonChange(value: string): void {
    if (isPiiReasonCode(value)) {
      form.setValue("reason_code", value, { shouldDirty: true, shouldValidate: true });
    }
  }

  async function handleCreate(values: PiiExportFormValues): Promise<void> {
    setServerMessage("");
    setSuccessMessage("");
    setTokenState(null);
    if (!scopeReady) {
      setServerMessage("ไม่พบขอบเขตข้อมูลสำหรับส่งออก");
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        scope: exportScope,
        include_full_national_id: values.include_full_national_id,
        reason_code: values.reason_code,
        reason_note: values.reason_note.trim(),
      });
      setSuccessMessage(`ส่งคำขอแล้ว (${result.data.row_estimate ?? 0} แถวโดยประมาณ)`);
      form.reset({ ...values, reason_note: "", include_full_national_id: false });
    } catch (error) {
      setServerMessage(getApiErrorMessage(error, "ส่งคำขอส่งออกไม่สำเร็จ"));
    }
  }

  async function handleApprove(request: PiiExportRequest): Promise<void> {
    setServerMessage("");
    setSuccessMessage("");
    try {
      const result = await approveMutation.mutateAsync(request.id);
      const token = result.data.download_token;
      if (token) {
        setTokenState({ requestId: request.id, token });
        setSuccessMessage("อนุมัติแล้ว ลิงก์ดาวน์โหลดแสดงได้ครั้งเดียว");
      }
    } catch (error) {
      setServerMessage(getApiErrorMessage(error, "อนุมัติคำขอไม่สำเร็จ"));
    }
  }

  async function handleReject(): Promise<void> {
    if (!rejectTarget) {
      return;
    }
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setServerMessage("กรุณาระบุเหตุผลปฏิเสธ");
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: rejectTarget.id, rejected_reason: trimmed });
      setRejectTarget(null);
      setRejectReason("");
      setSuccessMessage("ปฏิเสธคำขอแล้ว");
    } catch (error) {
      setServerMessage(getApiErrorMessage(error, "ปฏิเสธคำขอไม่สำเร็จ"));
    }
  }

  async function handleDownload(token: string): Promise<void> {
    setServerMessage("");
    try {
      const result = await downloadMutation.mutateAsync(token);
      downloadBlob(result.blob, result.filename);
      setTokenState(null);
    } catch (error) {
      setServerMessage(getApiErrorMessage(error, "ดาวน์โหลดไฟล์ไม่สำเร็จ"));
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent onClose={() => setRejectTarget(null)}>
          <DialogHeader>
            <DialogTitle>ปฏิเสธคำขอส่งออก</DialogTitle>
            <DialogDescription>{rejectTarget ? requestActorLabel(rejectTarget) : ""}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <FormItem>
              <FormLabel htmlFor="pii-export-reject-reason" required>
                เหตุผลปฏิเสธ
              </FormLabel>
              <Textarea
                id="pii-export-reject-reason"
                onChange={(event) => setRejectReason(event.target.value)}
                value={rejectReason}
              />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setRejectTarget(null)} variant="outline">
              ยกเลิก
            </Button>
            <Button
              isLoading={rejectMutation.isPending}
              loadingText="กำลังปฏิเสธ"
              onClick={() => void handleReject()}
              variant="destructive"
            >
              ปฏิเสธ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileDown className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">ส่งออกข้อมูลส่วนบุคคล</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            ขอบเขต: {scopeLabel} · รายชื่อตามตัวกรองปัจจุบัน {props.totalCount.toLocaleString("th-TH")} คน
          </p>
        </div>
        <Button
          icon={RefreshCw}
          loadingIconMotion="refresh"
          onClick={() => void listQuery.refetch()}
          variant="outline"
        >
          รีเฟรชคำขอ
        </Button>
      </div>

      {serverMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{serverMessage}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert variant="success">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
      {tokenState ? (
        <Alert variant="warning">
          <AlertTitle>ลิงก์ดาวน์โหลดแสดงครั้งเดียว</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>ดาวน์โหลดทันทีหลังอนุมัติ หากปิดหน้านี้ต้องให้ backend ออก token ใหม่</span>
            <Button
              icon={Download}
              isLoading={downloadMutation.isPending}
              loadingText="กำลังดาวน์โหลด"
              onClick={() => void handleDownload(tokenState.token)}
            >
              ดาวน์โหลด CSV
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Form form={form} onSubmit={handleCreate}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_auto] lg:items-start">
          <FormItem>
            <FormLabel htmlFor="pii-export-reason" required>
              เหตุผล
            </FormLabel>
            <Combobox
              id="pii-export-reason"
              onChange={handleReasonChange}
              options={PII_REASON_OPTIONS}
              searchable={false}
              value={reasonCode}
            />
            <FormMessage<PiiExportFormValues> name="reason_code" />
          </FormItem>
          <FormItem>
            <FormLabel htmlFor="pii-export-note" required>
              รายละเอียด
            </FormLabel>
            <Textarea
              id="pii-export-note"
              placeholder="ระบุวัตถุประสงค์และผู้ใช้ไฟล์"
              rows={2}
              {...registerField(form, "reason_note")}
            />
            <FormMessage<PiiExportFormValues> name="reason_note" />
          </FormItem>
          <div className="space-y-3 lg:min-w-52">
            <Checkbox
              checked={includeFullNationalId}
              label="ขอเลขบัตรเต็ม"
              onChange={(event) =>
                form.setValue("include_full_national_id", event.target.checked, {
                  shouldDirty: true,
                })
              }
            />
            <Button
              disabled={!scopeReady}
              fullWidth
              icon={ShieldCheck}
              isLoading={createMutation.isPending}
              loadingText="กำลังส่งคำขอ"
              type="submit"
            >
              ส่งคำขอ
            </Button>
          </div>
        </div>
      </Form>

      {(includeFullNationalId || exportScope?.global) ? (
        <Alert variant="warning">
          <AlertTriangle className="mr-2 inline size-4" aria-hidden="true" />
          คำขอนี้มีความเสี่ยงสูง ผู้อนุมัติจะเห็น flag เลขบัตรเต็ม/ขอบเขตกว้างก่อนอนุมัติ
        </Alert>
      ) : null}

      <DataTable
        headings={["เวลา", "ผู้ขอ", "สถานะ", "เหตุผล", "หมดอายุ/ดาวน์โหลด", ""]}
        minWidthClassName="min-w-[960px]"
        responsive={false}
      >
        {requests.length === 0 ? (
          <DataTableRow>
            <DataTableCell colSpan={6} className="text-center text-slate-500">
              ยังไม่มีคำขอส่งออก
            </DataTableCell>
          </DataTableRow>
        ) : (
          requests.map((request) => (
            <DataTableRow key={request.id}>
              <DataTableCell>
                <div className="font-medium text-slate-800">{formatThaiDateTime(request.created_at)}</div>
                <div className="text-xs text-slate-400">{request.id.slice(0, 8)}</div>
              </DataTableCell>
              <DataTableCell>{requestActorLabel(request)}</DataTableCell>
              <DataTableCell>
                <Badge variant={STATUS_VARIANTS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
                {request.include_full_national_id ? (
                  <div className="mt-1 text-xs font-medium text-warning-700">ขอเลขบัตรเต็ม</div>
                ) : null}
              </DataTableCell>
              <DataTableCell>
                <div>{PII_REASON_OPTIONS.find((option) => option.value === request.reason_code)?.label}</div>
                <div className="line-clamp-1 text-xs text-slate-400">{request.reason_note}</div>
              </DataTableCell>
              <DataTableCell>
                <div>{request.downloaded_at ? formatThaiDateTime(request.downloaded_at) : formatThaiTimeRemaining(request.download_expires_at)}</div>
              </DataTableCell>
              <DataTableCell className="text-right">
                {request.status === "PENDING" && isAdmin && request.requester_user_id !== user?.id ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      icon={CheckCircle2}
                      isLoading={approveMutation.isPending}
                      onClick={() => void handleApprove(request)}
                      size="sm"
                    >
                      อนุมัติ
                    </Button>
                    <Button
                      icon={XCircle}
                      onClick={() => {
                        setRejectReason("");
                        setRejectTarget(request);
                      }}
                      size="sm"
                      variant="outline"
                    >
                      ปฏิเสธ
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )}
              </DataTableCell>
            </DataTableRow>
          ))
        )}
      </DataTable>
    </section>
  );
}
