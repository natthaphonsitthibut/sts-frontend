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
  FormErrorAlert,
  Label,
  Textarea,
} from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useCaseTrackingOptions } from "../hooks/useCaseTrackingOptions";
import { useUpdateCase } from "../hooks/useUpdateCase";
import type {
  CaseRecord,
  CaseReviewAction,
} from "../types/cases.types";

interface CaseStatusUpdateDialogProps {
  caseRecord: CaseRecord | null;
  presetAction: CaseReviewAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (action: CaseReviewAction) => void;
}

export function CaseStatusUpdateDialog({
  caseRecord,
  presetAction,
  open,
  onOpenChange,
  onUpdated,
}: CaseStatusUpdateDialogProps) {
  const { can } = usePermissions();
  const optionsQuery = useCaseTrackingOptions();
  const updateCase = useUpdateCase();
  const [note, setNote] = useState("");

  function closeDialog(): void {
    setNote("");
    updateCase.reset();
    onOpenChange(false);
  }

  const selectedAction = (optionsQuery.data?.reviewActions ?? []).find(
    (option) => option.code === presetAction,
  );
  const hasPermission =
    Boolean(selectedAction) && can("review-cases") && can(selectedAction?.requiredPermission || "");
  const submitDisabled =
    !caseRecord ||
    !presetAction ||
    !selectedAction ||
    !hasPermission ||
    !note.trim() ||
    optionsQuery.isLoading;

  function handleSubmit(): void {
    if (submitDisabled || !caseRecord || !presetAction) return;
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: presetAction,
          review_note: note.trim(),
          resolution_outcome: null,
        },
      },
      {
        onSuccess: () => {
          onUpdated?.(presetAction);
          closeDialog();
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : closeDialog()}>
      <DialogContent
        className="w-[min(92vw,460px)]"
        onClose={closeDialog}
      >
        <DialogHeader>
          <DialogTitle>{selectedAction?.label || "พิจารณาผลการติดตาม"}</DialogTitle>
          <DialogDescription>
            {caseRecord
              ? `${caseRecord.student_name} · ${caseRecord.student_school || "-"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={optionsQuery.error ?? updateCase.error}
              fallback="ไม่สามารถบันทึกผลการพิจารณาได้ กรุณาลองอีกครั้ง"
            />

            {!optionsQuery.isLoading && !hasPermission ? (
              <p className="text-sm font-medium text-danger-700">
                บัญชีนี้ไม่มีสิทธิ์พิจารณาเคส
              </p>
            ) : null}

            <div className="space-y-2">
              <Label required htmlFor="case-note">
                เหตุผลการพิจารณา
              </Label>
              <Textarea
                id="case-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="ระบุเหตุผลและข้อสรุปจากการติดตาม"
                required
                value={note}
              />
            </div>

          </div>
        </DialogBody>

        <DialogFooter>
          <Button onClick={closeDialog} type="button" variant="outline">
            ยกเลิก
          </Button>
          <Button
            disabled={submitDisabled}
            isLoading={updateCase.isPending}
            loadingText="กำลังบันทึก"
            onClick={handleSubmit}
            type="button"
          >
            {selectedAction?.label || "บันทึกผล"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
