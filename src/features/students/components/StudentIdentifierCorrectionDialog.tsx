import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IdCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormErrorAlert,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  registerField,
} from "../../../components/base";
import { studentsService } from "../api/students.service";
import type { StudentDetail } from "../types/students.types";

export type CorrectableStudentIdentifier = "NATIONAL_ID" | "PASSPORT";

interface StudentIdentifierCorrectionDialogProps {
  identifierType: CorrectableStudentIdentifier;
  onCorrected: (student: StudentDetail) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  studentId: string;
}

const schema = z.object({ value: z.string().trim() });
type FormValues = z.infer<typeof schema>;
const DEFAULT_VALUES: FormValues = { value: "" };

export function StudentIdentifierCorrectionDialog({
  identifierType,
  onCorrected,
  onOpenChange,
  open,
  studentId,
}: StudentIdentifierCorrectionDialogProps) {
  const queryClient = useQueryClient();
  const isNationalId = identifierType === "NATIONAL_ID";
  const label = isNationalId ? "เลขบัตรประชาชน" : "เลขหนังสือเดินทาง";
  const form = useForm<FormValues>({
    resolver: zodResolver(
      schema.superRefine((values, context) => {
        if (isNationalId && !/^[0-9]{13}$/.test(values.value)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "เลขบัตรประชาชนใหม่ต้องเป็นตัวเลข 13 หลัก",
            path: ["value"],
          });
        } else if (
          !isNationalId &&
          (values.value.length < 1 || values.value.length > 50)
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              values.value.length === 0
                ? "กรุณาระบุเลขหนังสือเดินทางใหม่"
                : "เลขหนังสือเดินทางยาวเกินไป",
            path: ["value"],
          });
        }
      }),
    ),
    defaultValues: DEFAULT_VALUES,
  });
  const correction = useMutation({
    meta: { successMessage: `แก้ไข${label}แล้ว` },
    mutationFn: (values: FormValues) =>
      isNationalId
        ? studentsService.correctStudentNationalId(studentId, {
            newNationalId: values.value.trim(),
          })
        : studentsService.correctStudentPassport(studentId, {
            newPassportNumber: values.value.trim(),
          }),
    onSuccess: async (student) => {
      queryClient.setQueryData(["student", studentId], student);
      await queryClient.invalidateQueries({ queryKey: ["students"] });
      onCorrected(student);
      closeDialog();
    },
  });

  function closeDialog(): void {
    form.reset(DEFAULT_VALUES);
    correction.reset();
    onOpenChange(false);
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
          <DialogTitle icon={IdCard}>แก้ไข{label}</DialogTitle>
          <DialogDescription>
            ระบบจะไม่แสดงหรือกรอก{label}เดิมให้ กรุณาระบุ{label}ใหม่เท่านั้น
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Form
            form={form}
            onSubmit={async (values) => {
              await correction.mutateAsync(values);
            }}
          >
            <div className="space-y-4">
              <FormErrorAlert
                error={correction.error}
                fallback={`ไม่สามารถแก้ไข${label}ได้ กรุณาลองอีกครั้ง`}
              />
              <FormItem>
                <FormLabel htmlFor="student-identifier-value" required>
                  {label}ใหม่
                </FormLabel>
                <Input
                  autoComplete="off"
                  id="student-identifier-value"
                  inputMode={isNationalId ? "numeric" : "text"}
                  maxLength={isNationalId ? 13 : 50}
                  placeholder={
                    isNationalId ? "กรอกตัวเลข 13 หลัก" : `กรอก${label}`
                  }
                  {...registerField(form, "value")}
                />
                <FormMessage<FormValues> name="value" />
              </FormItem>
              <p className="text-sm text-slate-500">
                ผู้แก้ไข เวลา
                และเหตุผลมาตรฐานของการแก้ไขจะถูกบันทึกในประวัติระบบโดยอัตโนมัติ
              </p>
              <DialogFooter>
                <Button
                  disabled={correction.isPending}
                  onClick={closeDialog}
                  type="button"
                  variant="outline"
                >
                  ยกเลิก
                </Button>
                <Button
                  isLoading={correction.isPending}
                  loadingText="กำลังแก้ไข"
                  type="submit"
                >
                  ยืนยันการแก้ไข
                </Button>
              </DialogFooter>
            </div>
          </Form>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
