import { useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "../../../components/base";

interface CancelReasonDialogProps {
  open: boolean;
  title: string;
  /** What cancelling does, in the words the reviewer acts on. */
  description: ReactNode;
  placeholder: string;
  isPending: boolean;
  /** The server's refusal, if the last try failed. */
  error: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * Withdrawing a round from the case page — ยกเลิกการมอบหมาย and
 * ยกเลิกการส่งต่อ — always needs a reason; one dialog so both ask the same way.
 */
export function CancelReasonDialog({
  open,
  title,
  description,
  placeholder,
  isPending,
  error,
  onClose,
  onConfirm,
}: CancelReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const message = missing ? "กรุณาระบุเหตุผลการยกเลิก" : error;

  function close(): void {
    setReason("");
    setMissing(false);
    onClose();
  }

  return (
    <Dialog onOpenChange={(next) => (next ? undefined : close())} open={open}>
      <DialogContent onClose={close}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="text-sm text-slate-700">{description}</p>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            <span className="flex items-center gap-1">
              เหตุผลการยกเลิก <span className="text-danger">*</span>
            </span>
            <Textarea
              aria-invalid={message ? true : undefined}
              maxLength={500}
              onChange={(event) => {
                setReason(event.target.value);
                setMissing(false);
              }}
              placeholder={placeholder}
              rows={3}
              value={reason}
            />
          </label>
          <p
            className="min-h-5 text-sm font-medium text-danger"
            role={message ? "alert" : undefined}
          >
            {message || "\u00a0"}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button onClick={close} type="button" variant="secondary">
            ยกเลิก
          </Button>
          <Button
            disabled={isPending}
            onClick={() => {
              const trimmed = reason.trim();
              if (!trimmed) {
                setMissing(true);
                return;
              }
              onConfirm(trimmed);
            }}
            type="button"
            variant="destructive"
          >
            {isPending ? "กำลังยกเลิก..." : "ยืนยัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
