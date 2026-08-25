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
  MultiSelect,
  Select,
  Textarea,
} from "../../../components/base";
import { usePermissions } from "../../auth/hooks/usePermissions";
import { useCaseTrackingOptions } from "../hooks/useCaseTrackingOptions";
import { useReferralAgencies } from "../hooks/useReferralAgencies";
import { useUpdateCase } from "../hooks/useUpdateCase";
import type { CaseRecord, CaseReviewAction } from "../types/cases.types";

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
  const [referralAgencyId, setReferralAgencyId] = useState("");
  const [assistanceMeasureCodes, setAssistanceMeasureCodes] = useState<
    string[]
  >([]);
  const [assistanceMeasureDetail, setAssistanceMeasureDetail] = useState("");
  const referralAgencies = useReferralAgencies(
    open && presetAction === "REFER_AGENCY",
  );

  function closeDialog(): void {
    setNote("");
    setReferralAgencyId("");
    setAssistanceMeasureCodes([]);
    setAssistanceMeasureDetail("");
    updateCase.reset();
    onOpenChange(false);
  }

  const selectedAction = (optionsQuery.data?.reviewActions ?? []).find(
    (option) => option.code === presetAction,
  );
  const hasAssistanceHistory = Boolean(
    caseRecord?.follow_up_rounds?.some((round) => round.task_type === "ASSIST"),
  );
  const selectedActionLabel =
    selectedAction?.code === "ASSIST"
      ? hasAssistanceHistory
        ? "มอบหมายช่วยเหลืออีกครั้ง"
        : "มอบหมายช่วยเหลือ"
      : selectedAction?.label;
  const hasPermission =
    Boolean(selectedAction) &&
    can("dashboard") &&
    can(selectedAction?.requiredPermission || "");
  const assistanceMeasures = optionsQuery.data?.assistanceMeasures ?? [];
  const assistanceMeasureRequiresDetail = assistanceMeasures.some(
    (measure) =>
      measure.requiresDetail && assistanceMeasureCodes.includes(measure.code),
  );
  const submitDisabled =
    !caseRecord ||
    !presetAction ||
    !selectedAction ||
    !hasPermission ||
    !note.trim() ||
    (presetAction === "ASSIST" && assistanceMeasureCodes.length === 0) ||
    (presetAction === "ASSIST" &&
      assistanceMeasureRequiresDetail &&
      !assistanceMeasureDetail.trim()) ||
    (presetAction === "REFER_AGENCY" && !referralAgencyId) ||
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
          referral_agency_id:
            presetAction === "REFER_AGENCY" ? Number(referralAgencyId) : null,
          assistance_measure_codes:
            presetAction === "ASSIST" ? assistanceMeasureCodes : null,
          assistance_measure_detail:
            presetAction === "ASSIST" && assistanceMeasureRequiresDetail
              ? assistanceMeasureDetail.trim()
              : null,
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) =>
        nextOpen ? onOpenChange(true) : closeDialog()
      }
    >
      <DialogContent className="w-[min(92vw,460px)]" onClose={closeDialog}>
        <DialogHeader>
          <DialogTitle>
            {selectedActionLabel || "พิจารณาผลการติดตาม"}
          </DialogTitle>
          <DialogDescription>
            {caseRecord
              ? `${caseRecord.student_name} · ${caseRecord.student_school || "-"}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={
                optionsQuery.error ?? referralAgencies.error ?? updateCase.error
              }
              fallback="ไม่สามารถบันทึกผลการพิจารณาได้ กรุณาลองอีกครั้ง"
            />

            {!optionsQuery.isLoading && !hasPermission ? (
              <p className="text-sm font-medium text-danger-700">
                บัญชีนี้ไม่มีสิทธิ์พิจารณาเคส
              </p>
            ) : null}

            {presetAction === "REFER_AGENCY" ? (
              <div className="space-y-2">
                <Label required htmlFor="referral-agency">
                  หน่วยงานส่งต่อ
                </Label>
                <Select
                  id="referral-agency"
                  onChange={(event) => setReferralAgencyId(event.target.value)}
                  value={referralAgencyId}
                >
                  <option value="">เลือกหน่วยงานส่งต่อ</option>
                  {(referralAgencies.data ?? []).map((agency) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.agencyKindLabel} · {agency.agencyName}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {presetAction === "ASSIST" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label required>มาตรการช่วยเหลือที่เสนอ</Label>
                  <MultiSelect
                    id="proposed-assistance-measures"
                    onChange={(codes) => {
                      setAssistanceMeasureCodes(codes);
                      const stillRequiresDetail = assistanceMeasures.some(
                        (measure) =>
                          measure.requiresDetail &&
                          codes.includes(measure.code),
                      );
                      if (!stillRequiresDetail) setAssistanceMeasureDetail("");
                    }}
                    options={assistanceMeasures.map((measure) => ({
                      value: measure.code,
                      label: measure.label,
                    }))}
                    placeholder="เลือกได้มากกว่าหนึ่งมาตรการ"
                    value={assistanceMeasureCodes}
                  />
                  <p className="text-xs leading-5 text-slate-500">
                    ระบบจะนำรายการนี้ไปเติมเป็นค่าเริ่มต้นในขั้นมอบหมายงาน
                    และยังแก้ไขได้
                  </p>
                </div>
                {assistanceMeasureRequiresDetail ? (
                  <div className="space-y-2">
                    <Label required htmlFor="assistance-measure-detail">
                      รายละเอียดมาตรการ
                    </Label>
                    <Textarea
                      id="assistance-measure-detail"
                      maxLength={2000}
                      onChange={(event) =>
                        setAssistanceMeasureDetail(event.target.value)
                      }
                      placeholder="ระบุรายละเอียดมาตรการที่เลือก"
                      value={assistanceMeasureDetail}
                    />
                  </div>
                ) : null}
              </div>
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
