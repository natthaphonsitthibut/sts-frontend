import { useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Combobox,
  FormErrorAlert,
  Label,
  Textarea,
} from "../../../components/base";
import { useAuthSessionStore } from "../../auth/store/auth-session.store";
import { useUpdateCase } from "../hooks/useUpdateCase";
import { CASE_REVIEW_ACTIONS } from "../lib/case-presentation";
import type { CaseRecord, CaseReviewAction } from "../types/cases.types";

interface CaseStatusUpdateDialogProps {
  caseRecord: CaseRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CaseStatusUpdateDialog({
  caseRecord,
  open,
  onOpenChange,
}: CaseStatusUpdateDialogProps) {
  const user = useAuthSessionStore((state) => state.user);
  const updateCase = useUpdateCase();
  const [action, setAction] = useState<CaseReviewAction>("ASSIST");
  const [note, setNote] = useState("");

  function resolveReviewedBy(): string {
    const fullName = [user?.FirstName, user?.LastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    return fullName || user?.username || "Admin";
  }

  function handleSubmit(): void {
    if (!caseRecord) {
      return;
    }
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: action,
          review_note: note.trim() || null,
          reviewed_by: resolveReviewedBy(),
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(92vw,460px)]"
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle>อัปเดตสถานะเคส</DialogTitle>
          <DialogDescription>
            {caseRecord
              ? `${caseRecord.student_name} · ${caseRecord.student_school || "-"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={updateCase.error}
              fallback="ไม่สามารถอัปเดตเคสได้ กรุณาลองอีกครั้ง"
            />

            <div className="space-y-2">
              <Label htmlFor="case-action">การดำเนินการ</Label>
              <Combobox
                id="case-action"
                onChange={(next) => setAction(next as CaseReviewAction)}
                options={CASE_REVIEW_ACTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                searchable={false}
                value={action}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="case-note">บันทึกเพิ่มเติม</Label>
              <Textarea
                id="case-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="ระบุรายละเอียดการช่วยเหลือ / เหตุผล (ถ้ามี)"
                value={note}
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            ยกเลิก
          </Button>
          <Button
            disabled={!caseRecord}
            isLoading={updateCase.isPending}
            loadingText="กำลังบันทึก"
            onClick={handleSubmit}
            type="button"
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
