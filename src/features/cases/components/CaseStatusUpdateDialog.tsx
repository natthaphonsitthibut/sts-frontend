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
import { useReportUpCase } from "../hooks/useReportUpCase";
import { useUpdateCase } from "../hooks/useUpdateCase";
import {
  CASE_REVIEW_ACTIONS,
  CASE_RESOLUTION_OUTCOMES,
  getCaseReviewActionPermission,
} from "../lib/case-presentation";
import type {
  CaseRecord,
  CaseResolutionOutcome,
  CaseWorkflowAction,
} from "../types/cases.types";

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
  const reportUpCase = useReportUpCase();
  const [action, setAction] = useState<CaseWorkflowAction>("ASSIST");
  const [note, setNote] = useState("");
  const [reportSummary, setReportSummary] = useState("");
  const [resolutionOutcome, setResolutionOutcome] = useState("");

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
  const requiresReportUp = selectedAction === "REPORT_UP";
  const requiresResolutionOutcome = selectedAction === "CLOSE";
  const selectedResolutionOutcome = CASE_RESOLUTION_OUTCOMES.some(
    (option) => option.value === resolutionOutcome,
  )
    ? (resolutionOutcome as CaseResolutionOutcome)
    : "";
  const submitDisabled =
    !caseRecord ||
    allowedActions.length === 0 ||
    (requiresReportUp && (!note.trim() || !reportSummary.trim())) ||
    (requiresResolutionOutcome && !selectedResolutionOutcome);

  function handleSubmit(): void {
    if (submitDisabled) {
      return;
    }
    if (selectedAction === "REPORT_UP") {
      reportUpCase.mutate(
        {
          caseId: caseRecord.id,
          payload: { reason: note.trim(), summary: reportSummary.trim() },
        },
        {
          onSuccess: () => {
            onUpdated?.();
            onOpenChange(false);
          },
        },
      );
      return;
    }
    updateCase.mutate(
      {
        caseId: caseRecord.id,
        payload: {
          review_action: selectedAction,
          review_note: note.trim() || null,
          resolution_outcome: requiresResolutionOutcome
            ? selectedResolutionOutcome || null
            : null,
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
              error={updateCase.error ?? reportUpCase.error}
              fallback="ไม่สามารถอัปเดตเคสได้ กรุณาลองอีกครั้ง"
            />

            <div className="space-y-2">
              <Label htmlFor="case-action">การดำเนินการ</Label>
              <Combobox
                id="case-action"
                onChange={(next) => setAction(next as CaseWorkflowAction)}
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

            {requiresResolutionOutcome ? (
              <div className="space-y-2">
                <Label htmlFor="case-resolution-outcome">ผลลัพธ์การติดตาม</Label>
                <Combobox
                  id="case-resolution-outcome"
                  onChange={setResolutionOutcome}
                  options={[
                    { value: "", label: "เลือกผลลัพธ์" },
                    ...CASE_RESOLUTION_OUTCOMES,
                  ]}
                  searchable={false}
                  value={selectedResolutionOutcome}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="case-note">
                {requiresReportUp ? "เหตุผลที่ต้องรายงานขึ้นส่วนกลาง" : "บันทึกเพิ่มเติม"}
              </Label>
              <Textarea
                id="case-note"
                maxLength={requiresReportUp ? 500 : undefined}
                onChange={(event) => setNote(event.target.value)}
                placeholder={
                  requiresReportUp
                    ? "ระบุสิ่งที่โรงเรียนดำเนินการแล้วและเหตุผลที่ยังต้องการการสนับสนุน"
                    : "ระบุรายละเอียดการช่วยเหลือ / เหตุผล (ถ้ามี)"
                }
                value={note}
              />
            </div>

            {requiresReportUp ? (
              <div className="space-y-2">
                <Label htmlFor="case-report-summary">สรุปสำหรับส่วนกลาง</Label>
                <Textarea
                  id="case-report-summary"
                  maxLength={2000}
                  onChange={(event) => setReportSummary(event.target.value)}
                  placeholder="สรุปสถานการณ์โดยไม่ใส่ข้อมูลเกินความจำเป็น"
                  value={reportSummary}
                />
                <p className="text-xs text-slate-500">
                  การรายงานจะเปลี่ยนสถานะเป็น “รายงานขึ้นส่วนกลางแล้ว” เพื่อให้ผู้บริหารเห็นในภาพรวม
                </p>
              </div>
            ) : null}
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
            disabled={submitDisabled}
            isLoading={updateCase.isPending || reportUpCase.isPending}
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
