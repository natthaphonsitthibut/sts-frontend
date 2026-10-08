import { useState } from "react";
import { Check } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormErrorAlert,
  Label,
  Textarea,
} from "../../../components/base";
import { cn } from "../../../lib/utils";
import { useRecordReferralResult } from "../hooks/useRecordReferralResult";
import type {
  CaseReferralRecord,
  ReferralResultCode,
} from "../types/cases.types";

const RESULT_OPTIONS: Array<{ code: ReferralResultCode; label: string }> = [
  { code: "SUCCEEDED", label: "สำเร็จ" },
  { code: "NOT_SUCCEEDED", label: "ยังไม่สำเร็จ" },
];

interface ReferralResultDialogProps {
  caseId: number;
  /** The referral to record, from the case page or the referral register. */
  referral: Pick<CaseReferralRecord, "id" | "agency_name"> | null;
  onOpenChange: (open: boolean) => void;
  onRecorded?: () => void;
}

/** บันทึกผลการส่งต่อ: what the agency reported back, recorded once. */
export function ReferralResultDialog({
  caseId,
  referral,
  onOpenChange,
  onRecorded,
}: ReferralResultDialogProps) {
  const recordResult = useRecordReferralResult();
  const [resultCode, setResultCode] = useState<ReferralResultCode | null>(null);
  const [note, setNote] = useState("");
  const selected = RESULT_OPTIONS.find((option) => option.code === resultCode);
  const submitDisabled = !referral || !selected || !note.trim();

  function closeDialog(): void {
    setResultCode(null);
    setNote("");
    recordResult.reset();
    onOpenChange(false);
  }

  function handleSubmit(): void {
    if (submitDisabled || !referral || !resultCode) return;
    recordResult.mutate(
      {
        caseId,
        referralId: referral.id,
        payload: { result_code: resultCode, result_note: note.trim() },
      },
      {
        onSuccess: () => {
          onRecorded?.();
          closeDialog();
        },
      },
    );
  }

  return (
    <Dialog
      open={referral !== null}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <DialogContent className="w-[min(92vw,460px)]" onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>บันทึกผลการส่งต่อ</DialogTitle>
          <DialogDescription>{referral?.agency_name ?? ""}</DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={recordResult.error}
              fallback="ไม่สามารถบันทึกผลการส่งต่อได้ กรุณาลองอีกครั้ง"
            />

            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-slate-900">
                ผลการส่งต่อ <span className="text-danger">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {RESULT_OPTIONS.map((option) => {
                  const isSelected = resultCode === option.code;
                  return (
                    <label
                      className={cn(
                        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 motion-reduce:transition-none",
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-slate-200 bg-white text-slate-800 hover:border-primary/50",
                      )}
                      key={option.code}
                    >
                      <input
                        checked={isSelected}
                        className="size-5 accent-primary"
                        name="referral-result"
                        onChange={() => setResultCode(option.code)}
                        type="radio"
                        value={option.code}
                      />
                      <span className="text-sm font-semibold">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check className="ml-auto size-5" aria-hidden="true" />
                      ) : null}
                    </label>
                  );
                })}
              </div>
              {/* Either answer goes back to รอพิจารณา, the same way a
                  follow-up report does. The line keeps its space before a
                  choice is made so picking one never makes the dialog grow. */}
              <p
                aria-live="polite"
                className={cn(
                  "text-sm text-content-secondary",
                  selected ? "visible" : "invisible",
                )}
              >
                เคสจะกลับไปรอพิจารณา เพื่อเลือกดำเนินการต่อ
              </p>
            </fieldset>

            <div className="space-y-2">
              <Label required htmlFor="referral-result-note">
                สรุปผลจากหน่วยงาน
              </Label>
              <Textarea
                id="referral-result-note"
                maxLength={2000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="เช่น หน่วยงานแจ้งผลว่า..."
                required
                value={note}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={closeDialog} type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button
            disabled={submitDisabled}
            isLoading={recordResult.isPending}
            loadingText="กำลังบันทึก"
            onClick={handleSubmit}
            type="button"
          >
            บันทึกผล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
