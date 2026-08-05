import { useMemo, useState } from "react";
import {
  Button,
  Combobox,
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (action: CaseReviewAction) => void;
}

export function CaseStatusUpdateDialog({
  caseRecord,
  open,
  onOpenChange,
  onUpdated,
}: CaseStatusUpdateDialogProps) {
  const { can } = usePermissions();
  const optionsQuery = useCaseTrackingOptions();
  const updateCase = useUpdateCase();
  const [action, setAction] = useState("");
  const [note, setNote] = useState("");

  function closeDialog(): void {
    setAction("");
    setNote("");
    updateCase.reset();
    onOpenChange(false);
  }

  const allowedActions = useMemo(
    () =>
      (optionsQuery.data?.reviewActions ?? []).filter(
        (option) =>
          can("review-cases") &&
          Boolean(option.requiredPermission) &&
          can(option.requiredPermission || ""),
      ),
    [can, optionsQuery.data?.reviewActions],
  );

  const selectedAction =
    allowedActions.find((option) => option.code === action) ?? allowedActions[0];
  const submitDisabled =
    !caseRecord ||
    !selectedAction ||
    !note.trim() ||
    optionsQuery.isLoading;

  function handleSubmit(): void {
    if (submitDisabled || !caseRecord || !selectedAction) return;
    const reviewAction = selectedAction.code as CaseReviewAction;
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: reviewAction,
          review_note: note.trim(),
          resolution_outcome: null,
        },
      },
      {
        onSuccess: () => {
          onUpdated?.(reviewAction);
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
          <DialogTitle>พิจารณาผลการติดตาม</DialogTitle>
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

            <div className="space-y-2">
              <Label htmlFor="case-action">ผลการพิจารณา</Label>
              <Combobox
                disabled={optionsQuery.isLoading}
                id="case-action"
                onChange={setAction}
                options={allowedActions.map((option) => ({
                  value: option.code,
                  label: option.label,
                }))}
                placeholder="เลือกผลการพิจารณา"
                searchable={false}
                value={selectedAction?.code ?? ""}
              />
            </div>

            {!optionsQuery.isLoading && allowedActions.length === 0 ? (
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
