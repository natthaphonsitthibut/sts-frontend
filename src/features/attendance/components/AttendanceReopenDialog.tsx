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

const reopenSchema = z.object({
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500),
});

type ReopenFormValues = z.infer<typeof reopenSchema>;

interface AttendanceReopenDialogProps {
  error: unknown;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  open: boolean;
}

export function AttendanceReopenDialog({
  isPending,
  error,
  onClose,
  onSubmit,
  open,
}: AttendanceReopenDialogProps) {
  const form = useForm<ReopenFormValues>({
    resolver: zodResolver(reopenSchema),
    defaultValues: { reason: "" },
  });

  async function handleSubmit(values: ReopenFormValues): Promise<void> {
    await onSubmit(values.reason.trim());
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>เปิดแก้ไขการเช็คชื่อ</DialogTitle>
          <DialogDescription>
            ระบบจะเพิ่ม revision และเก็บผู้แก้ไขพร้อมเหตุผลไว้ในประวัติ
          </DialogDescription>
        </DialogHeader>
        <Form form={form} onSubmit={handleSubmit}>
          <DialogBody>
            <FormErrorAlert
              className="mb-3"
              error={error}
              fallback="ไม่สามารถเปิดแก้ไขการเช็คชื่อได้"
            />
            <FormItem>
              <FormLabel htmlFor="attendance-reopen-reason" required>
                เหตุผลที่แก้ไข
              </FormLabel>
              <Textarea
                id="attendance-reopen-reason"
                rows={4}
                {...form.register("reason")}
              />
              <FormMessage<ReopenFormValues> name="reason" />
            </FormItem>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button isLoading={isPending} loadingText="กำลังเปิด" type="submit">
              เปิดแก้ไข
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
