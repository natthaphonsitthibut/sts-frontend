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
import type { StudentDetail } from "../types/students.types";
import { studentsService } from "../api/students.service";

const schema = z.object({
  newNationalId: z
    .string()
    .trim()
    .regex(/^[0-9]{13}$/, "เลขบัตรประชาชนใหม่ต้องเป็นตัวเลข 13 หลัก"),
});

type FormValues = z.infer<typeof schema>;

interface StudentNationalIdCorrectionDialogProps {
  onCorrected: (student: StudentDetail) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  studentId: string;
}

const DEFAULT_VALUES: FormValues = { newNationalId: "" };

export function StudentNationalIdCorrectionDialog({
  onCorrected,
  onOpenChange,
  open,
  studentId,
}: StudentNationalIdCorrectionDialogProps) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });
  const correction = useMutation({
    meta: { successMessage: "แก้ไขเลขบัตรประชาชนแล้ว" },
    mutationFn: (values: FormValues) =>
      studentsService.correctStudentNationalId(studentId, {
        newNationalId: values.newNationalId.trim(),
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
          <DialogTitle icon={IdCard}>แก้ไขเลขบัตรประชาชน</DialogTitle>
          <DialogDescription>
            ระบบจะไม่แสดงหรือกรอกเลขบัตรเดิมให้ กรุณาระบุเลขบัตรใหม่เท่านั้น
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
                fallback="ไม่สามารถแก้ไขเลขบัตรประชาชนได้ กรุณาลองอีกครั้ง"
              />

              <FormItem>
                <FormLabel htmlFor="new-national-id" required>
                  เลขบัตรประชาชนใหม่
                </FormLabel>
                <Input
                  autoComplete="off"
                  id="new-national-id"
                  inputMode="numeric"
                  maxLength={13}
                  placeholder="กรอกตัวเลข 13 หลัก"
                  {...registerField(form, "newNationalId")}
                />
                <FormMessage<FormValues> name="newNationalId" />
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
