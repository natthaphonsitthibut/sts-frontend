import { useState } from "react";
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
  Input,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import {
  PII_REASON_OPTIONS,
  isPiiReasonCode,
} from "../../students/pii.constants";
import { adminService } from "../api/admin.service";

interface UserNationalIdRevealDialogProps {
  onOpenChange: (open: boolean) => void;
  onRevealed: (nationalId: string | null) => void;
  open: boolean;
  userId: number;
}

export function UserNationalIdRevealDialog({
  onOpenChange,
  onRevealed,
  open,
  userId,
}: UserNationalIdRevealDialogProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function close(): void {
    setReasonCode("");
    setReasonNote("");
    setError("");
    setSubmitting(false);
    onOpenChange(false);
  }

  async function reveal(): Promise<void> {
    if (!isPiiReasonCode(reasonCode)) {
      setError("กรุณาเลือกเหตุผลในการแสดงข้อมูล");
      return;
    }
    if (reasonCode === "OTHER" && !reasonNote.trim()) {
      setError("กรุณาระบุเหตุผลเพิ่มเติม");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await adminService.revealUserNationalId(userId, {
        reason_code: reasonCode,
        reason_note: reasonNote.trim() || undefined,
      });
      onRevealed(result.PersonID_Onec);
      close();
    } catch (requestError) {
      setError(
        getApiErrorMessage(requestError, "ไม่สามารถแสดงเลขบัตรประชาชนได้"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent className="w-[min(92vw,440px)]" onClose={close}>
        <DialogHeader>
          <DialogTitle>แสดงเลขบัตรประชาชน</DialogTitle>
          <DialogDescription>
            ระบบจะบันทึกเหตุผลและผู้เปิดดูในประวัติการเข้าถึง
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <label
              className="text-sm font-semibold"
              htmlFor="user-national-id-reason"
            >
              เหตุผล
            </label>
            <Combobox
              id="user-national-id-reason"
              onChange={setReasonCode}
              options={PII_REASON_OPTIONS}
              placeholder="เลือกเหตุผล"
              searchable={false}
              value={reasonCode}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-semibold"
              htmlFor="user-national-id-note"
            >
              รายละเอียดเพิ่มเติม
            </label>
            <Input
              id="user-national-id-note"
              maxLength={500}
              onChange={(event) => setReasonNote(event.target.value)}
              placeholder={
                reasonCode === "OTHER" ? "ระบุเหตุผลเพิ่มเติม" : "ระบุได้ถ้ามี"
              }
              value={reasonNote}
            />
          </div>
          <DialogFooter>
            <Button disabled={submitting} onClick={close} variant="outline">
              ยกเลิก
            </Button>
            <Button
              isLoading={submitting}
              loadingText="กำลังแสดง"
              onClick={() => void reveal()}
            >
              แสดง
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
