import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../base";
import { CopyButton } from "./copy-button";

interface CredentialDialogProps {
  open: boolean;
  /** One-time secret to reveal (temp password, generated link, …). */
  value: string;
  title?: string;
  description?: string;
  onClose: () => void;
}

/**
 * The shared modal for revealing a one-time secret right after it is generated.
 * Centered so it is never missed (unlike an inline banner above a long form),
 * forces an explicit acknowledge, and reuses the one `CopyButton`. Use this for
 * every "we just generated a credential" moment so the experience is identical
 * across the app.
 */
export function CredentialDialog({
  open,
  value,
  title = "รหัสผ่านชั่วคราว",
  description = "คัดลอกและส่งให้ผู้ใช้งาน รหัสนี้จะแสดงเพียงครั้งเดียว ผู้ใช้งานจะต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก",
  onClose,
}: CredentialDialogProps) {
  return (
    <Dialog onOpenChange={(next) => (next ? undefined : onClose())} open={open}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="break-all text-base font-bold text-slate-900">
            {value}
          </span>
          <CopyButton label="คัดลอก" value={value} />
        </div>

        <DialogFooter>
          <Button onClick={onClose} size="lg" type="button">
            เสร็จสิ้น
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
