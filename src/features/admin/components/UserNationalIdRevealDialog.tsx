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
  FormLabel,
  Input,
} from "../../../components/base";
import { getApiErrorMessage } from "../../../lib/api-error";
import { usePiiRevealOptions } from "../../privacy/hooks/usePiiRevealOptions";
import { isPiiReasonCode } from "../../students/pii.constants";
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
  const reasonOptionsQuery = usePiiRevealOptions();
  const reasonOptions = reasonOptionsQuery.options;
  const selectedReason = reasonOptions.find(
    (option) => option.value === reasonCode,
  );

  function close(): void {
    setReasonCode("");
    setReasonNote("");
    setError("");
    setSubmitting(false);
    onOpenChange(false);
  }

  async function reveal(): Promise<void> {
    if (!isPiiReasonCode(reasonCode, reasonOptions)) {
      setError("กรุณาเลือกเหตุผลในการแสดงข้อมูล");
      return;
    }
    if (selectedReason?.requiresNote && !reasonNote.trim()) {
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
      setError(getApiErrorMessage(requestError, "ไม่สามารถแสดงเลขบัตรได้"));
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
          <DialogTitle>แสดงเลขบัตร</DialogTitle>
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
          {reasonOptionsQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>
                โหลดรายการเหตุผลไม่สำเร็จ กรุณาลองอีกครั้ง
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <FormLabel htmlFor="user-national-id-reason" required>
              เหตุผลในการแสดงข้อมูล
            </FormLabel>
            <Combobox
              id="user-national-id-reason"
              onChange={setReasonCode}
              disabled={
                reasonOptionsQuery.isLoading || reasonOptionsQuery.isError
              }
              options={reasonOptions}
              placeholder="เลือกเหตุผล"
              searchable={false}
              value={reasonCode}
            />
          </div>
          <div className="space-y-2">
            <FormLabel
              htmlFor="user-national-id-note"
              required={selectedReason?.requiresNote === true}
            >
              รายละเอียดเพิ่มเติม
            </FormLabel>
            <Input
              id="user-national-id-note"
              maxLength={500}
              onChange={(event) => setReasonNote(event.target.value)}
              placeholder={
                selectedReason?.requiresNote
                  ? "ระบุเหตุผลเพิ่มเติม"
                  : "ระบุได้ถ้ามี"
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
