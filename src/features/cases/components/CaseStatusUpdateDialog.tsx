import { useMemo, useState } from "react";
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
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useUpdateCase } from "../hooks/useUpdateCase";
import {
  CASE_REVIEW_ACTIONS,
  getCaseReviewActionPermission,
} from "../lib/case-presentation";
import type { CaseRecord, CaseReviewAction } from "../types/cases.types";

interface CaseStatusUpdateDialogProps {
  caseRecord: CaseRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function CaseStatusUpdateDialog({
  caseRecord,
  open,
  onOpenChange,
  onUpdated,
}: CaseStatusUpdateDialogProps) {
  const { can } = usePermissions();
  const updateCase = useUpdateCase();
  const [action, setAction] = useState<CaseReviewAction>("ASSIST");
  const [note, setNote] = useState("");

  const allowedActions = useMemo(
    () =>
      CASE_REVIEW_ACTIONS.filter(
        (option) =>
          can("review-cases") && can(getCaseReviewActionPermission(option.value)),
      ),
    [can],
  );

  const selectedAction = allowedActions.some((option) => option.value === action)
    ? action
    : (allowedActions[0]?.value ?? "ASSIST");

  function handleSubmit(): void {
    if (!caseRecord || allowedActions.length === 0) {
      return;
    }
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: selectedAction,
          review_note: note.trim() || null,
        },
      },
      {
        onSuccess: () => {
          onUpdated?.();
          onOpenChange(false);
        },
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
                options={allowedActions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                searchable={false}
                value={selectedAction}
              />
            </div>
            {allowedActions.length === 0 ? (
              <p className="text-sm font-medium text-danger-700">
                บัญชีนี้ไม่มีสิทธิ์เปลี่ยนสถานะเคส
              </p>
            ) : null}

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
            variant="outline"
          >
            ยกเลิก
          </Button>
          <Button
            disabled={!caseRecord || allowedActions.length === 0}
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
