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
  Textarea,
  registerField,
} from "../../../components/base";
import type {
  AccountDeactivationPayload,
  AccountDeactivationReasonCode,
} from "../types/admin.types";

interface AccountDeactivationDialogProps {
  error?: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: AccountDeactivationPayload) => void;
  open: boolean;
  targetName: string;
}

interface AccountDeactivationFormValues {
  reasonCode: AccountDeactivationReasonCode | "";
  note: string;
}

const REASON_OPTIONS: Array<{ label: string; value: AccountDeactivationReasonCode }> = [
  { value: "STAFF_LEFT", label: "พ้นจากหน้าที่" },
  { value: "TRANSFERRED", label: "ย้ายโรงเรียน/หน่วยงาน" },
  { value: "DUPLICATE", label: "บัญชีซ้ำ" },
  { value: "SECURITY", label: "เหตุด้านความปลอดภัย" },
  { value: "OTHER", label: "อื่น ๆ" },
];

const DEFAULT_VALUES: AccountDeactivationFormValues = {
  reasonCode: "",
  note: "",
};

function isReasonCode(value: string): value is AccountDeactivationReasonCode {
  return REASON_OPTIONS.some((option) => option.value === value);
}

export function AccountDeactivationDialog({
  error,
  isSubmitting = false,
  onClose,
  onSubmit,
  open,
  targetName,
}: AccountDeactivationDialogProps) {
  const [reasonCode, setReasonCode] = useState<AccountDeactivationReasonCode | "">("");
  const form = useForm<AccountDeactivationFormValues>({ defaultValues: DEFAULT_VALUES });
  const { clearErrors, reset, setError, setValue } = form;
  const noteRequired = reasonCode === "OTHER";

  function closeDialog(): void {
    reset(DEFAULT_VALUES);
    setReasonCode("");
    onClose();
  }

  function handleReasonChange(nextValue: string): void {
    const nextReasonCode = isReasonCode(nextValue) ? nextValue : "";
    setReasonCode(nextReasonCode);
    setValue("reasonCode", nextReasonCode, { shouldDirty: true });
    clearErrors(["reasonCode", "note"]);
  }

  function handleSubmit(values: AccountDeactivationFormValues): void {
    if (!isReasonCode(values.reasonCode)) {
      setError("reasonCode", {
        type: "required",
        message: "กรุณาเลือกเหตุผล",
      });
      return;
    }

    const note = values.note.trim();
    if (values.reasonCode === "OTHER" && !note) {
      setError("note", {
        type: "required",
        message: "กรุณาระบุรายละเอียดเพิ่มเติม",
      });
      return;
    }

    if (note.length > 255) {
      setError("note", {
        type: "maxLength",
        message: "รายละเอียดต้องไม่เกิน 255 ตัวอักษร",
      });
      return;
    }

    onSubmit({ reasonCode: values.reasonCode, note: note || undefined });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : closeDialog())}>
      <DialogContent className="w-[min(92vw,440px)]" onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>ปิดใช้งานบัญชี</DialogTitle>
          <DialogDescription>{targetName}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Form form={form} onSubmit={handleSubmit}>
            <div className="space-y-4">
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <FormItem>
                <FormLabel htmlFor="account-deactivation-reason" required>
                  เหตุผล
                </FormLabel>
                <Combobox
                  aria-invalid={form.formState.errors.reasonCode ? true : undefined}
                  id="account-deactivation-reason"
                  name="reasonCode"
                  onChange={handleReasonChange}
                  options={REASON_OPTIONS}
                  placeholder="เลือกเหตุผล"
                  searchable={false}
                  value={reasonCode}
                />
                <FormMessage<AccountDeactivationFormValues> name="reasonCode" />
              </FormItem>

              <FormItem>
                <FormLabel htmlFor="account-deactivation-note" required={noteRequired}>
                  รายละเอียดเพิ่มเติม
                </FormLabel>
                <Textarea
                  id="account-deactivation-note"
                  maxLength={255}
                  placeholder={noteRequired ? "ระบุรายละเอียด" : "ระบุรายละเอียด (ถ้ามี)"}
                  rows={3}
                  {...registerField(form, "note")}
                />
                <FormMessage<AccountDeactivationFormValues> name="note" />
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
                  isLoading={isSubmitting}
                  loadingText="กำลังปิดใช้งาน"
                  type="submit"
                  variant="destructive"
                >
                  ปิดใช้งาน
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
