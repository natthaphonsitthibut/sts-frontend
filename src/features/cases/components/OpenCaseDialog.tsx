import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  Textarea,
  registerField,
} from "../../../components/base";
import { useOpenCase } from "../hooks/useOpenCase";
import type { StudentReadSource } from "../../students/api/students.service";
import {
  openCaseSchema,
  type OpenCaseFormValues,
} from "../schemas/open-case.schema";
import type { CaseRecord } from "../types/cases.types";

interface OpenCaseDialogProps {
  initialReason?: string;
  /** Which guarded namespace opens the case. */
  source?: StudentReadSource;
  open: boolean;
  studentId: string;
  studentName: string;
  onOpenChange: (open: boolean) => void;
  onOpened: (caseRecord: CaseRecord) => void;
}

export function OpenCaseDialog({
  initialReason = "",
  onOpenChange,
  onOpened,
  open,
  source = "INTERNAL",
  studentId,
  studentName,
}: OpenCaseDialogProps) {
  const openCase = useOpenCase(source);
  const resetOpenCase = openCase.reset;
  const form = useForm<OpenCaseFormValues>({
    defaultValues: { reason: initialReason },
    resolver: zodResolver(openCaseSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: initialReason });
      resetOpenCase();
    }
  }, [form, initialReason, open, resetOpenCase]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && openCase.isPending) return;
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: OpenCaseFormValues): void {
    openCase.mutate(
      { student_id: studentId, reason: values.reason.trim() },
      {
        onSuccess: (response) => {
          onOpenChange(false);
          onOpened(response.data);
        },
      },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="w-[min(92vw,520px)] text-left"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>เปิดเคสติดตามนักเรียน</DialogTitle>
          <DialogDescription>
            {studentName} · ระบบจะใช้ข้อมูลโรงเรียน ชั้น
            และห้องจากระเบียนนักเรียนปัจจุบัน
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-4"
              error={openCase.error}
              fallback="เปิดเคสไม่สำเร็จ กรุณาลองอีกครั้ง"
            />
            <FormItem>
              <FormLabel htmlFor="open-case-reason" required>
                เหตุผลที่เปิดเคส
              </FormLabel>
              <Textarea
                id="open-case-reason"
                maxLength={1000}
                placeholder="ระบุสัญญาณหรือข้อมูลที่ควรติดตาม"
                rows={5}
                {...registerField(form, "reason")}
              />
              <FormMessage<OpenCaseFormValues> name="reason" />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={openCase.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              isLoading={openCase.isPending}
              loadingText="กำลังเปิดเคส"
              type="submit"
            >
              เปิดเคส
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
