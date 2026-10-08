import { useState } from "react";
import {
  Button,
  Combobox,
  DatePicker,
  FormErrorAlert,
  Textarea,
  TimePicker,
  useConfirm,
} from "../../../components/base";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { formatThaiDateTime } from "../../../lib/date-time";
import { useReferralAgencies } from "../hooks/useReferralAgencies";
import { useSendReferral } from "../hooks/useReferralLink";
import type { SendReferralResponse } from "../types/cases.types";

interface ReferralFormValues {
  startsOn: string;
  startsAt: string;
  endsOn: string;
  endsAt: string;
  agencyId: string;
  note: string;
}
type ReferralField =
  | "startsOn"
  | "startsAt"
  | "endsOn"
  | "endsAt"
  | "agencyId"
  | "note";

/** Opens now like a round's assignment; the end date is left for the school to pick. */
function createReferralDefaults(): ReferralFormValues {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Bangkok",
      year: "numeric",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const time = `${parts.hour}:${parts.minute}`;
  return {
    startsOn: `${parts.year}-${parts.month}-${parts.day}`,
    startsAt: time,
    endsOn: "",
    endsAt: time,
    agencyId: "",
    note: "",
  };
}

function toIsoDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString();
}

const FIELD_CLASS = "flex flex-col gap-1 text-sm font-medium text-slate-700";

/**
 * ส่งต่อ: the referral's มอบหมาย, laid out like the assignment form — the
 * window, who it goes to (an agency instead of a teacher), why. Sending issues
 * the agency's link and shows its access code once (`CredentialDialog`).
 */
export function ReferralForm({
  caseId,
  onSent,
}: {
  caseId: number;
  onSent: () => void;
}) {
  const [values, setValues] = useState<ReferralFormValues>(
    createReferralDefaults,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<ReferralField, true>>
  >({});
  const [sent, setSent] = useState<SendReferralResponse["data"] | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const agenciesQuery = useReferralAgencies();
  const agencies = agenciesQuery.data ?? [];
  const send = useSendReferral();

  function updateField(key: ReferralField, value: string): void {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in fieldErrors) {
      setFieldErrors((current) => ({ ...current, [key]: undefined }));
    }
    setFormError(null);
  }

  function validate(): string | null {
    const missing: Array<{ field: ReferralField; label: string }> = [
      !values.startsOn
        ? { field: "startsOn" as const, label: "วันที่เริ่ม" }
        : null,
      !values.startsAt
        ? { field: "startsAt" as const, label: "เวลาเริ่ม" }
        : null,
      !values.endsOn
        ? { field: "endsOn" as const, label: "วันที่สิ้นสุด" }
        : null,
      !values.endsAt
        ? { field: "endsAt" as const, label: "เวลาสิ้นสุด" }
        : null,
      !values.agencyId
        ? { field: "agencyId" as const, label: "หน่วยงานที่ส่งต่อ" }
        : null,
      !values.note.trim()
        ? { field: "note" as const, label: "เหตุผลการส่งต่อ" }
        : null,
    ].filter(
      (item): item is { field: ReferralField; label: string } => item !== null,
    );
    if (missing.length > 0) {
      setFieldErrors(
        Object.fromEntries(missing.map((item) => [item.field, true])),
      );
      return `กรุณาระบุ ${missing.map((item) => item.label).join(", ")}`;
    }
    if (
      toIsoDateTime(values.endsOn, values.endsAt) <=
      toIsoDateTime(values.startsOn, values.startsAt)
    ) {
      setFieldErrors({ endsOn: true, endsAt: true });
      return "วันและเวลาสิ้นสุดต้องอยู่หลังวันและเวลาเริ่ม";
    }
    setFieldErrors({});
    return null;
  }

  async function handleSend(): Promise<void> {
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }
    const confirmed = await confirm({
      title: "ยืนยันการส่งต่อ",
      description: "คุณต้องการส่งต่อนักเรียนให้หน่วยงานใช่หรือไม่",
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });
    if (!confirmed) return;
    send.mutate(
      {
        caseId,
        payload: {
          referral_agency_id: Number(values.agencyId),
          referral_note: values.note.trim(),
          starts_at: toIsoDateTime(values.startsOn, values.startsAt),
          expires_at: toIsoDateTime(values.endsOn, values.endsAt),
        },
      },
      { onSuccess: (response) => setSent(response.data) },
    );
  }

  return (
    <>
      <div
        className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        data-referral-form
      >
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <label className={FIELD_CLASS}>
            <span className="flex items-center gap-1">
              วันที่เริ่ม <span className="text-danger">*</span>
            </span>
            <DatePicker
              aria-invalid={Boolean(fieldErrors.startsOn)}
              ariaLabel="วันที่เริ่มส่งต่อ"
              onChange={(value) => updateField("startsOn", value)}
              value={values.startsOn}
            />
          </label>
          <label className={FIELD_CLASS}>
            <span className="flex items-center gap-1">
              เวลาเริ่ม <span className="text-danger">*</span>
            </span>
            <TimePicker
              aria-invalid={Boolean(fieldErrors.startsAt)}
              ariaLabel="เวลาเริ่มส่งต่อ"
              onChange={(value) => updateField("startsAt", value)}
              value={values.startsAt}
            />
          </label>
          <label className={FIELD_CLASS}>
            <span className="flex items-center gap-1">
              วันที่สิ้นสุด <span className="text-danger">*</span>
            </span>
            <DatePicker
              aria-invalid={Boolean(fieldErrors.endsOn)}
              ariaLabel="วันที่สิ้นสุดส่งต่อ"
              onChange={(value) => updateField("endsOn", value)}
              placeholder="เลือกวันที่"
              value={values.endsOn}
            />
          </label>
          <label className={FIELD_CLASS}>
            <span className="flex items-center gap-1">
              เวลาสิ้นสุด <span className="text-danger">*</span>
            </span>
            <TimePicker
              aria-invalid={Boolean(fieldErrors.endsAt)}
              ariaLabel="เวลาสิ้นสุดส่งต่อ"
              onChange={(value) => updateField("endsAt", value)}
              value={values.endsAt}
            />
          </label>
          <label className={`${FIELD_CLASS} sm:col-span-2`}>
            <span className="flex items-center gap-1">
              หน่วยงานที่ส่งต่อ <span className="text-danger">*</span>
            </span>
            <Combobox
              aria-invalid={Boolean(fieldErrors.agencyId)}
              ariaLabel="หน่วยงานที่ส่งต่อ"
              emptyText={
                agenciesQuery.isLoading
                  ? "กำลังโหลดรายชื่อหน่วยงาน…"
                  : agenciesQuery.isError
                    ? "โหลดรายชื่อหน่วยงานไม่สำเร็จ"
                    : "ไม่พบหน่วยงานที่เปิดใช้งาน"
              }
              onChange={(value) => updateField("agencyId", value)}
              options={agencies.map((agency) => ({
                value: String(agency.id),
                label: `${agency.agencyName} (${agency.agencyKindLabel})`,
              }))}
              placeholder="เลือกหน่วยงานที่ส่งต่อ"
              value={values.agencyId}
            />
          </label>
        </div>
        <label className="flex min-h-0 flex-col gap-1 text-sm font-medium text-slate-700">
          <span className="flex items-center gap-1">
            เหตุผลการส่งต่อ <span className="text-danger">*</span>
          </span>
          <Textarea
            aria-invalid={Boolean(fieldErrors.note)}
            className="min-h-0 flex-1 resize-none overflow-y-auto"
            maxLength={2000}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="เหตุผลการส่งต่อ"
            value={values.note}
          />
        </label>
      </div>
      <FormErrorAlert
        className="mt-3"
        error={
          formError ? new Error(formError) : send.error || agenciesQuery.error
        }
        fallback={
          agenciesQuery.error
            ? "ไม่สามารถโหลดรายชื่อหน่วยงานได้ กรุณาลองอีกครั้ง"
            : "ไม่สามารถส่งต่อได้ กรุณาลองอีกครั้ง"
        }
      />
      <div className="mt-4 flex flex-wrap justify-end">
        <Button
          isLoading={send.isPending}
          loadingText="กำลังส่งต่อ"
          onClick={() => void handleSend()}
          type="button"
        >
          ส่งต่อ
        </Button>
      </div>
      {confirmDialog}
      {/* The agency's access code, revealed once like a temporary password;
          the link itself stays shareable from the sent referral's step. */}
      <CredentialDialog
        description={
          sent
            ? `แจ้งรหัสนี้กับหน่วยงานแยกจากลิงก์ เช่น ทางโทรศัพท์ รหัสจะแสดงเพียงครั้งเดียว ลิงก์ใช้ได้ ${formatThaiDateTime(sent.starts_at)} ถึง ${formatThaiDateTime(sent.expires_at)} แชร์ลิงก์ได้จากขั้นส่งต่อหน่วยงาน`
            : undefined
        }
        onClose={() => {
          setSent(null);
          onSent();
        }}
        open={sent !== null}
        title="รหัสสำหรับหน่วยงาน"
        value={sent?.access_code ?? ""}
      />
    </>
  );
}
