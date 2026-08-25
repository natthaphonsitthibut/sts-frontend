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
import { teachersService } from "../api/teachers.service";

interface TeacherNationalIdRevealDialogProps {
  maskedValue: string;
  onOpenChange: (open: boolean) => void;
  onRevealed: (nationalId: string) => void;
  open: boolean;
  teacherId: string;
}

export function TeacherNationalIdRevealDialog({
  maskedValue,
  onOpenChange,
  onRevealed,
  open,
  teacherId,
}: TeacherNationalIdRevealDialogProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reasonOptionsQuery = usePiiRevealOptions();
  const selectedReason = reasonOptionsQuery.options.find(
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
    if (!selectedReason) {
      setError("กรุณาเลือกเหตุผลในการแสดงข้อมูล");
      return;
    }
    if (selectedReason.requiresNote && !reasonNote.trim()) {
      setError("กรุณาระบุเหตุผลเพิ่มเติม");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await teachersService.revealTeacherNationalId(teacherId, {
        reason_code: selectedReason.value,
        reason_note: reasonNote.trim() || undefined,
      });
      onRevealed(result.values.citizenId);
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
          <DialogTitle>แสดงเลขบัตรประชาชน</DialogTitle>
          <DialogDescription>
            {maskedValue} · ระบบจะบันทึกผู้เปิดดู เวลา และเหตุผล
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
            <FormLabel htmlFor="teacher-national-id-reason" required>
              เหตุผลในการแสดงข้อมูล
            </FormLabel>
            <Combobox
              disabled={
                reasonOptionsQuery.isLoading || reasonOptionsQuery.isError
              }
              id="teacher-national-id-reason"
              onChange={(value) => {
                setReasonCode(value);
                setError("");
              }}
              options={reasonOptionsQuery.options}
              placeholder="เลือกเหตุผล"
              searchable={false}
              value={reasonCode}
            />
          </div>
          <div className="space-y-2">
            <FormLabel
              htmlFor="teacher-national-id-note"
              required={selectedReason?.requiresNote === true}
            >
              รายละเอียดเพิ่มเติม
            </FormLabel>
            <Input
              id="teacher-national-id-note"
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
            <Button
              disabled={submitting}
              onClick={close}
              type="button"
              variant="outline"
            >
              ยกเลิก
            </Button>
            <Button
              disabled={!selectedReason || reasonOptionsQuery.isError}
              isLoading={submitting}
              loadingText="กำลังแสดง"
              onClick={() => void reveal()}
              type="button"
            >
              แสดง
            </Button>
          </DialogFooter>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
