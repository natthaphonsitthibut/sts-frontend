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
import { useCloseWatch } from "../hooks/useCloseWatch";
import {
  closeWatchSchema,
  type CloseWatchFormValues,
} from "../schemas/close-watch.schema";

interface CloseWatchDialogProps {
  open: boolean;
  studentId: string;
  studentName: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * ปิดการเฝ้าระวัง: the other decision beside เปิดเคส (ติดตาม). The student returns
 * to ปกติ and leaves the watchlist until a teacher writes a new observation.
 */
export function CloseWatchDialog({
  onOpenChange,
  open,
  studentId,
  studentName,
}: CloseWatchDialogProps) {
  const closeWatch = useCloseWatch();
  const resetCloseWatch = closeWatch.reset;
  const form = useForm<CloseWatchFormValues>({
    defaultValues: { note: "" },
    resolver: zodResolver(closeWatchSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({ note: "" });
      resetCloseWatch();
    }
  }, [form, open, resetCloseWatch]);

  function handleOpenChange(nextOpen: boolean): void {
    if (!nextOpen && closeWatch.isPending) return;
    onOpenChange(nextOpen);
  }

  function handleSubmit(values: CloseWatchFormValues): void {
    const note = values.note.trim();
    closeWatch.mutate(
      { student_id: studentId, ...(note ? { note } : {}) },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        className="w-[min(92vw,520px)] text-left"
        onClose={() => handleOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>ปิดการเฝ้าระวัง</DialogTitle>
          <DialogDescription>
            {studentName} · นักเรียนกลับเป็นสถานะปกติโดยไม่เปิดเคส
            และจะกลับมาในกลุ่มเฝ้าระวังเมื่อครูบันทึกข้อสังเกตใหม่
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-4"
              error={closeWatch.error}
              fallback="ปิดการเฝ้าระวังไม่สำเร็จ กรุณาลองอีกครั้ง"
            />
            <FormItem>
              <FormLabel htmlFor="close-watch-note">หมายเหตุ</FormLabel>
              <Textarea
                id="close-watch-note"
                maxLength={1000}
                placeholder="ไม่บังคับ"
                rows={4}
                {...registerField(form, "note")}
              />
              <FormMessage<CloseWatchFormValues> name="note" />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button
              disabled={closeWatch.isPending}
              onClick={() => handleOpenChange(false)}
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              isLoading={closeWatch.isPending}
              loadingText="กำลังปิด"
              type="submit"
            >
              ปิดการเฝ้าระวัง
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
