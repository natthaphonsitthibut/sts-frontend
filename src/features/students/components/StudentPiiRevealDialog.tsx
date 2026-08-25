import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Alert,
  AlertDescription,
  Button,
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
  Input,
  registerField,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePiiRevealOptions } from "../../privacy/hooks/usePiiRevealOptions";
import { studentsService } from "../api/students.service";
import {
  PII_FIELD_GROUPS,
  PII_FIELD_LABELS,
  isPiiReasonCode,
} from "../pii.constants";
import type {
  StudentPiiField,
  StudentPiiReasonCode,
  StudentPiiRevealResponse,
} from "../types/students.types";

interface StudentPiiRevealDialogProps {
  field: StudentPiiField | null;
  maskedValue: string;
  onOpenChange: (open: boolean) => void;
  onRevealed: (values: StudentPiiRevealResponse["values"]) => void;
  open: boolean;
  studentId: string;
}

interface RevealFormValues {
  reason_code: StudentPiiReasonCode | "";
  reason_note: string;
}

const DEFAULT_FORM_VALUES: RevealFormValues = {
  reason_code: "",
  reason_note: "",
};

function getHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
}

export function StudentPiiRevealDialog({
  field,
  maskedValue,
  onOpenChange,
  onRevealed,
  open,
  studentId,
}: StudentPiiRevealDialogProps) {
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reasonCode, setReasonCode] = useState<StudentPiiReasonCode | "">("");
  const reasonOptionsQuery = usePiiRevealOptions();
  const reasonOptions = reasonOptionsQuery.options;
  const form = useForm<RevealFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
  });
  const { clearErrors, reset, setError, setValue } = form;
  const selectedReason = reasonOptions.find(
    (option) => option.value === reasonCode,
  );
  const noteRequired = selectedReason?.requiresNote === true;
  const fieldLabel = field ? PII_FIELD_LABELS[field] : "";

  function closeDialog(): void {
    reset(DEFAULT_FORM_VALUES);
    setReasonCode("");
    setServerError("");
    setIsSubmitting(false);
    onOpenChange(false);
  }

  function handleReasonChange(nextValue: string): void {
    const nextReasonCode = isPiiReasonCode(nextValue, reasonOptions)
      ? nextValue
      : "";
    setServerError("");
    setReasonCode(nextReasonCode);
    setValue("reason_code", nextReasonCode, { shouldDirty: true });
    clearErrors(["reason_code", "reason_note"]);
  }

  async function handleSubmit(values: RevealFormValues): Promise<void> {
    if (!field) {
      return;
    }

    if (!isPiiReasonCode(values.reason_code, reasonOptions)) {
      setError("reason_code", {
        type: "required",
        message: "กรุณาเลือกเหตุผล",
      });
      return;
    }

    const reasonNote = values.reason_note.trim();
    if (selectedReason?.requiresNote && !reasonNote) {
      setError("reason_note", {
        type: "required",
        message: "กรุณาระบุเหตุผลเพิ่มเติม",
      });
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      const response = await studentsService.revealStudentPii(studentId, {
        field_group: PII_FIELD_GROUPS[field],
        reason_code: values.reason_code,
        reason_note: reasonNote || undefined,
      });
      onRevealed(response.values);
      closeDialog();
    } catch (error) {
      const status = getHttpStatus(error);
      setServerError(
        status === 403
          ? "ไม่มีสิทธิ์"
          : getApiErrorMessage(
              error,
              "ไม่สามารถแสดงข้อมูลได้ กรุณาลองอีกครั้ง",
            ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <DialogContent className="w-[min(92vw,440px)]" onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>แสดงข้อมูลส่วนบุคคล</DialogTitle>
          <DialogDescription>
            {fieldLabel ? `${fieldLabel}: ${maskedValue}` : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <Form form={form} onSubmit={handleSubmit}>
            <div className="space-y-4">
              {serverError ? (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              ) : null}
              {reasonOptionsQuery.isError ? (
                <Alert variant="destructive">
                  <AlertDescription>
                    โหลดรายการเหตุผลไม่สำเร็จ กรุณาลองอีกครั้ง
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormItem>
                <FormLabel htmlFor="pii-reveal-reason" required>
                  เหตุผลในการแสดงข้อมูล
                </FormLabel>
                <Combobox
                  aria-invalid={
                    form.formState.errors.reason_code ? true : undefined
                  }
                  id="pii-reveal-reason"
                  name="reason_code"
                  onChange={handleReasonChange}
                  disabled={
                    reasonOptionsQuery.isLoading || reasonOptionsQuery.isError
                  }
                  options={reasonOptions}
                  placeholder="เลือกเหตุผล"
                  searchable={false}
                  value={reasonCode}
                />
                <FormMessage<RevealFormValues> name="reason_code" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="pii-reveal-note" required={noteRequired}>
                  รายละเอียดเพิ่มเติม
                </FormLabel>
                <Input
                  id="pii-reveal-note"
                  placeholder={
                    noteRequired
                      ? "ระบุเหตุผลเพิ่มเติม"
                      : "ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                  }
                  {...registerField(form, "reason_note")}
                />
                <FormMessage<RevealFormValues> name="reason_note" />
              </FormItem>

              <DialogFooter>
                <Button
                  disabled={isSubmitting}
                  onClick={closeDialog}
                  type="button"
                  variant="outline"
                >
                  ยกเลิก
                </Button>
                <Button
                  disabled={!field}
                  isLoading={isSubmitting}
                  loadingText="กำลังแสดง"
                  type="submit"
                >
                  แสดง
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
