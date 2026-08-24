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
  const [observationDecision, setObservationDecision] = useState<
    "" | "APPROVE" | "REJECT"
  >("");
  const referralAgencies = useReferralAgencies(
    open && presetAction === "REFER_AGENCY",
  );

  function closeDialog(): void {
    setNote("");
    setReferralAgencyId("");
    setObservationDecision("");
    updateCase.reset();
    onOpenChange(false);
  }

  const selectedAction = (optionsQuery.data?.reviewActions ?? []).find(
    (option) => option.code === presetAction,
  );
  const hasPermission =
    Boolean(selectedAction) &&
    can("dashboard") &&
    can(selectedAction?.requiredPermission || "");
  const submitDisabled =
    !caseRecord ||
    !presetAction ||
    !selectedAction ||
    !hasPermission ||
    !note.trim() ||
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
          care_observation_decision: observationDecision || null,
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
            {selectedAction?.label || "พิจารณาผลการติดตาม"}
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

            <div className="space-y-2">
              <Label htmlFor="care-observation-decision">
                ตรวจข้อสังเกตด้านการดูแลนักเรียน
              </Label>
              <Select
                id="care-observation-decision"
                onChange={(event) =>
                  setObservationDecision(
                    event.target.value as "" | "APPROVE" | "REJECT",
                  )
                }
                value={observationDecision}
              >
                <option value="">ยังไม่พิจารณาในครั้งนี้</option>
                <option value="APPROVE">ยืนยันและเพิ่มในข้อมูลนักเรียน</option>
                <option value="REJECT">ไม่ยืนยันข้อสังเกต</option>
              </Select>
              <p className="text-xs leading-5 text-slate-500">
                ใช้กับข้อสังเกตความด้อยโอกาสหรือความพิการที่ยังรอพิจารณาในเคสนี้
              </p>
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
