import { useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  Button,
  Combobox,
  DatePicker,
  FormErrorAlert,
  FormMessage,
  Textarea,
  TimePicker,
  registerField,
  useConfirm,
} from "../../../components/base";
import { CredentialDialog } from "../../../components/layout/credential-dialog";
import { formatThaiDateTime } from "../../../lib/date-time";
import { focusReferralFormError } from "../lib/referral-form-focus";
import { useReferralAgencies } from "../hooks/useReferralAgencies";
import { useSendReferral } from "../hooks/useReferralLink";
import {
  createReferralFormDefaults,
  referralFormSchema,
  toReferralIsoDateTime,
  type ReferralFormValues,
} from "../schemas/referral.schema";
import type { SendReferralResponse } from "../types/cases.types";

type ReferralPickerField = Exclude<keyof ReferralFormValues, "note">;

const FIELD_CLASS = "flex flex-col gap-1 text-sm font-medium text-slate-700";

/**
 * ส่งต่อ: the referral's มอบหมาย, laid out like the assignment form — the
 * window, who it goes to (an agency instead of a teacher), why. Sending issues
 * the agency's link and shows its access code (`CredentialDialog`).
 */
export function ReferralForm({
  caseId,
  onSent,
}: {
  caseId: number;
  onSent: () => void;
}) {
  const formRoot = useRef<HTMLFormElement>(null);
  const form = useForm<ReferralFormValues>({
    defaultValues: createReferralFormDefaults(),
    resolver: zodResolver(referralFormSchema),
    mode: "onSubmit",
    shouldFocusError: false,
  });
  const values = useWatch({ control: form.control });
  const { errors, isSubmitted } = form.formState;
  const [sent, setSent] = useState<SendReferralResponse["data"] | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const agenciesQuery = useReferralAgencies();
  const agencies = agenciesQuery.data ?? [];
  const send = useSendReferral();

  function updateField(name: ReferralPickerField, value: string): void {
    form.setValue(name, value, { shouldDirty: true });
    // The window is checked across its four fields, so a change to one has to
    // re-check the others once the form has been submitted.
    if (isSubmitted) void form.trigger();
  }

  async function handleSend(referral: ReferralFormValues): Promise<void> {
    if (send.isPending) return;
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
          referral_agency_id: Number(referral.agencyId),
          referral_note: referral.note,
          starts_at: toReferralIsoDateTime(
            referral.startsOn,
            referral.startsAt,
          ),
          expires_at: toReferralIsoDateTime(referral.endsOn, referral.endsAt),
        },
      },
      { onSuccess: (response) => setSent(response.data) },
    );
  }

  return (
    <FormProvider {...form}>
      <form
        noValidate
        ref={formRoot}
        onSubmit={(event) =>
          void form.handleSubmit(handleSend, (errors) =>
            focusReferralFormError(formRoot.current, errors),
          )(event)
        }
      >
        <div
          className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          data-referral-form
        >
          <div className="grid content-start gap-3 sm:grid-cols-2">
            <label className={FIELD_CLASS} data-referral-field="startsOn">
              <span className="flex items-center gap-1">
                วันที่เริ่ม <span className="text-danger">*</span>
              </span>
              <DatePicker
                aria-invalid={Boolean(errors.startsOn)}
                ariaLabel="วันที่เริ่มส่งต่อ"
                onChange={(value) => updateField("startsOn", value)}
                value={values.startsOn ?? ""}
              />
              <FormMessage<ReferralFormValues> name="startsOn" />
            </label>
            <label className={FIELD_CLASS} data-referral-field="startsAt">
              <span className="flex items-center gap-1">
                เวลาเริ่ม <span className="text-danger">*</span>
              </span>
              <TimePicker
                aria-invalid={Boolean(errors.startsAt)}
                ariaLabel="เวลาเริ่มส่งต่อ"
                onChange={(value) => updateField("startsAt", value)}
                value={values.startsAt ?? ""}
              />
              <FormMessage<ReferralFormValues> name="startsAt" />
            </label>
            <label className={FIELD_CLASS} data-referral-field="endsOn">
              <span className="flex items-center gap-1">
                วันที่สิ้นสุด <span className="text-danger">*</span>
              </span>
              <DatePicker
                aria-invalid={Boolean(errors.endsOn)}
                ariaLabel="วันที่สิ้นสุดส่งต่อ"
                onChange={(value) => updateField("endsOn", value)}
                placeholder="เลือกวันที่"
                value={values.endsOn ?? ""}
              />
              <FormMessage<ReferralFormValues> name="endsOn" />
            </label>
            <label className={FIELD_CLASS} data-referral-field="endsAt">
              <span className="flex items-center gap-1">
                เวลาสิ้นสุด <span className="text-danger">*</span>
              </span>
              <TimePicker
                aria-invalid={Boolean(errors.endsAt)}
                ariaLabel="เวลาสิ้นสุดส่งต่อ"
                onChange={(value) => updateField("endsAt", value)}
                value={values.endsAt ?? ""}
              />
              <FormMessage<ReferralFormValues> name="endsAt" />
            </label>
            <label
              className={`${FIELD_CLASS} sm:col-span-2`}
              data-referral-field="agencyId"
            >
              <span className="flex items-center gap-1">
                หน่วยงานที่ส่งต่อ <span className="text-danger">*</span>
              </span>
              <Combobox
                aria-invalid={Boolean(errors.agencyId)}
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
                value={values.agencyId ?? ""}
              />
              <FormMessage<ReferralFormValues> name="agencyId" />
            </label>
          </div>
          <label
            className="flex min-h-0 flex-col gap-1 text-sm font-medium text-slate-700"
            data-referral-field="note"
          >
            <span className="flex items-center gap-1">
              เหตุผลการส่งต่อ <span className="text-danger">*</span>
            </span>
            <Textarea
              className="min-h-0 flex-1 resize-none overflow-y-auto"
              maxLength={2000}
              placeholder="เหตุผลการส่งต่อ"
              {...registerField(form, "note")}
            />
            <FormMessage<ReferralFormValues> name="note" />
          </label>
        </div>
        <FormErrorAlert
          className="mt-3"
          error={send.error || agenciesQuery.error}
          fallback={
            agenciesQuery.error && !send.error
              ? "ไม่สามารถโหลดรายชื่อหน่วยงานได้ กรุณาลองอีกครั้ง"
              : "ไม่สามารถส่งต่อได้ กรุณาลองอีกครั้ง"
          }
        />
        <div className="mt-4 flex flex-wrap justify-end">
          <Button
            isLoading={send.isPending}
            loadingText="กำลังส่งต่อ"
            type="submit"
          >
            ส่งต่อ
          </Button>
        </div>
      </form>
      {confirmDialog}
      {/* The agency's access code, revealed once like a temporary password;
          the link itself stays shareable from the sent referral's step. */}
      <CredentialDialog
        description={
          sent
            ? `แจ้งรหัสนี้กับหน่วยงานแยกจากลิงก์ เช่น ทางโทรศัพท์ รหัสคงเดิมตลอดอายุลิงก์ และผู้อำนวยการเปิดดูได้จากปุ่มดูรหัส ลิงก์ใช้ได้ ${formatThaiDateTime(sent.starts_at)} ถึง ${formatThaiDateTime(sent.expires_at)} แชร์ลิงก์ได้จากขั้นส่งต่อหน่วยงาน`
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
    </FormProvider>
  );
}
