import { useState, type FormEvent } from "react";
import {
  Button,
  DatePicker,
  FormErrorAlert,
  Label,
  RadioCardGroup,
  Textarea,
} from "../../../components/base";
import type { RadioCardOption } from "../../../components/base";
import type { ReferralResultCode } from "../../cases/types/cases.types";
import type { SubmitReferralReportPayload } from "../types/referral-report.types";

const RESULT_OPTIONS: Array<RadioCardOption<ReferralResultCode>> = [
  { value: "SUCCEEDED", label: "สำเร็จ" },
  { value: "NOT_SUCCEEDED", label: "ยังไม่สำเร็จ" },
];

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(
    new Date(),
  );
}

interface ReferralReportFormProps {
  error: unknown;
  isSubmitting: boolean;
  onSubmit: (payload: SubmitReferralReportPayload) => void;
}

/** Step "รายงานผลการส่งต่อ" on the agency's page: result, date, summary (D3). */
export function ReferralReportForm({
  error,
  isSubmitting,
  onSubmit,
}: ReferralReportFormProps) {
  const today = todayInBangkok();
  const [resultCode, setResultCode] = useState<ReferralResultCode | null>(null);
  const [actionDate, setActionDate] = useState(today);
  const [note, setNote] = useState("");
  const ready = Boolean(resultCode && actionDate && note.trim());

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!ready || !resultCode || isSubmitting) return;
    onSubmit({
      result_code: resultCode,
      action_date: actionDate,
      result_note: note.trim(),
    });
  }

  return (
    <form
      className="space-y-4"
      data-referral-report-form
      onSubmit={handleSubmit}
    >
      <FormErrorAlert
        error={error}
        fallback="ส่งรายงานไม่สำเร็จ กรุณาลองอีกครั้ง"
      />
      <div className="space-y-2">
        <Label required>ผลการดำเนินการ</Label>
        <RadioCardGroup
          legend="ผลการดำเนินการ"
          name="referral-report-result"
          onChange={setResultCode}
          options={RESULT_OPTIONS}
          value={resultCode}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label required htmlFor="referral-report-date">
            วันที่ดำเนินการ
          </Label>
          <DatePicker
            ariaLabel="วันที่ดำเนินการ"
            id="referral-report-date"
            max={today}
            onChange={setActionDate}
            value={actionDate}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label required htmlFor="referral-report-note">
          สรุปการดำเนินการและผล
        </Label>
        <Textarea
          id="referral-report-note"
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="เช่น หน่วยงานดำเนินการ... ผลคือ..."
          required
          rows={4}
          value={note}
        />
      </div>
      <div className="flex justify-end">
        <Button
          className="w-full sm:w-auto"
          disabled={!ready}
          isLoading={isSubmitting}
          loadingText="กำลังส่ง"
          type="submit"
        >
          ส่งรายงาน
        </Button>
      </div>
    </form>
  );
}
