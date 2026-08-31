import { zodResolver } from "@hookform/resolvers/zod";
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
  Textarea,
} from "../../../components/base";

const correctionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร")
    .max(500, "เหตุผลต้องไม่เกิน 500 ตัวอักษร"),
});

type CorrectionFormValues = z.infer<typeof correctionSchema>;

export function AttendanceCorrectionSubmitDialog({
  error,
  isPending,
  onClose,
  onSubmit,
  open,
}: {
  error: unknown;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  open: boolean;
}) {
  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { reason: "" },
  });

  async function handleSubmit(values: CorrectionFormValues): Promise<void> {
    await onSubmit(values.reason.trim());
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>แก้ไขและส่งผลใหม่</DialogTitle>
          <DialogDescription>
            ผลเช็กชื่อนี้เคยส่งแล้ว หากยืนยัน ระบบจะแทนที่ผลล่าสุดและเก็บผู้ส่ง
            เวลา เหตุผล รวมถึงรายการที่เปลี่ยนไว้ในประวัติ
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-3"
              error={error}
              fallback="ไม่สามารถแก้ไขและส่งผลใหม่ได้"
            />
            <FormItem>
              <FormLabel htmlFor="attendance-correction-reason" required>
                เหตุผลการแก้ไข
              </FormLabel>
              <Textarea
                id="attendance-correction-reason"
                rows={4}
                placeholder="เช่น แก้สถานะหลังตรวจสอบข้อมูลกับครูประจำวิชา"
                {...form.register("reason")}
              />
              <FormMessage<CorrectionFormValues> name="reason" />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              กลับไปตรวจ
            </Button>
            <Button
              isLoading={isPending}
              loadingText="กำลังส่งผลใหม่"
              type="submit"
            >
              แก้ไขและส่งผลใหม่
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
