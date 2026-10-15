import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import {
  Button,
  DatePicker,
  FormErrorAlert,
  FormMessage,
  Label,
  RadioCardGroup,
  Textarea,
  registerField,
} from "../../../components/base";
import type { RadioCardOption } from "../../../components/base";
import { getThaiDateKey } from "../../../lib/date-time";
import { focusReferralFormError } from "../../cases/lib/referral-form-focus";
import type { ReferralResultCode } from "../../cases/types/cases.types";
import {
  createReferralReportDefaults,
  referralReportFormSchema,
  type ReferralReportDraft,
} from "../schemas/referral-report.schema";
import type { SubmitReferralReportPayload } from "../types/referral-report.types";
import { PresentationFillBar } from "../../presentation/components/PresentationFillBar";
import {
  REFERRAL_REPORT_EMPTY,
  referralReportSample,
} from "../../presentation/lib/presentation-fill";

const RESULT_OPTIONS: Array<RadioCardOption<ReferralResultCode>> = [
  { value: "SUCCEEDED", label: "สำเร็จ" },
  { value: "NOT_SUCCEEDED", label: "ยังไม่สำเร็จ" },
];

interface ReferralReportFormProps {
  error: unknown;
  isSubmitting: boolean;
  onSubmit: (payload: SubmitReferralReportPayload) => void;
  /** What was typed before the page had to re-verify the agency; read on mount. */
  draft?: ReferralReportDraft | null;
  /** Hands every change up, so the draft outlives this form's unmount. */
  onDraftChange?: (draft: ReferralReportDraft) => void;
}

/** Step "รายงานผลการส่งต่อ" on the agency's page: result, date, summary (D3). */
export function ReferralReportForm({
  draft,
  error,
  isSubmitting,
  onDraftChange,
  onSubmit,
}: ReferralReportFormProps) {
  const today = getThaiDateKey();
  const formRoot = useRef<HTMLFormElement>(null);
  const form = useForm<ReferralReportDraft>({
    defaultValues: draft ?? createReferralReportDefaults(),
    resolver: zodResolver(referralReportFormSchema),
    mode: "onSubmit",
    shouldFocusError: false,
  });
  const values = useWatch({ control: form.control });
  const { errors, isSubmitted } = form.formState;

  useEffect(() => {
    onDraftChange?.(form.getValues());
  }, [form, onDraftChange, values]);

  function handleValid(report: ReferralReportDraft): void {
    if (isSubmitting || report.resultCode === "") return;
    onSubmit({
      result_code: report.resultCode,
      action_date: report.actionDate,
      result_note: report.note,
    });
  }

  return (
    <FormProvider {...form}>
      <form
        className="space-y-4"
        data-referral-report-form
        noValidate
        ref={formRoot}
        onSubmit={(event) =>
          void form.handleSubmit(handleValid, (errors) =>
            focusReferralFormError(formRoot.current, errors),
          )(event)
        }
      >
        <FormErrorAlert
          error={error}
          fallback="ส่งรายงานไม่สำเร็จ กรุณาลองอีกครั้ง"
        />
        <PresentationFillBar
          onClear={() => form.reset(REFERRAL_REPORT_EMPTY)}
          onFill={() => form.reset(referralReportSample())}
        />
        <div className="space-y-2" data-referral-field="resultCode">
          <Label required>ผลการดำเนินการ</Label>
          <RadioCardGroup
            legend="ผลการดำเนินการ"
            name="referral-report-result"
            onChange={(value) =>
              form.setValue("resultCode", value, {
                shouldDirty: true,
                shouldValidate: isSubmitted,
              })
            }
            options={RESULT_OPTIONS}
            value={values.resultCode || null}
          />
          <FormMessage<ReferralReportDraft> name="resultCode" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2" data-referral-field="actionDate">
            <Label required htmlFor="referral-report-date">
              วันที่ดำเนินการ
            </Label>
            <DatePicker
              aria-invalid={Boolean(errors.actionDate)}
              ariaLabel="วันที่ดำเนินการ"
              id="referral-report-date"
              max={today}
              onChange={(value) =>
                form.setValue("actionDate", value, {
                  shouldDirty: true,
                  shouldValidate: isSubmitted,
                })
              }
              value={values.actionDate ?? ""}
            />
            <FormMessage<ReferralReportDraft> name="actionDate" />
          </div>
        </div>
        <div className="space-y-2" data-referral-field="note">
          <Label required htmlFor="referral-report-note">
            สรุปการดำเนินการและผล
          </Label>
          <Textarea
            id="referral-report-note"
            maxLength={2000}
            placeholder="เช่น หน่วยงานดำเนินการ... ผลคือ..."
            rows={4}
            {...registerField(form, "note")}
          />
          <FormMessage<ReferralReportDraft> name="note" />
        </div>
        <div className="flex justify-end">
          <Button
            className="w-full sm:w-auto"
            isLoading={isSubmitting}
            loadingText="กำลังส่ง"
            type="submit"
          >
            ส่งรายงาน
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
