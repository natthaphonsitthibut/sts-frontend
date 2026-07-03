import { useState } from "react";
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
import { useUpdateCaseReferral } from "../hooks/useUpdateCaseReferral";
import type {
  CaseReferralOutcomeStatus,
  CaseReferralRecord,
} from "../types/cases.types";
import { useStatusCatalog } from "../../status-catalog/hooks/useStatusCatalog";

interface CaseReferralOutcomeDialogProps {
  caseId: number | null;
  referral: CaseReferralRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

function getInitialStatus(
  referral: CaseReferralRecord | null,
): CaseReferralOutcomeStatus {
  return referral?.status === "ACKNOWLEDGED" ? "ACKNOWLEDGED" : "ACCEPTED";
}

export function CaseReferralOutcomeDialog({
  caseId,
  referral,
  open,
  onOpenChange,
  onUpdated,
}: CaseReferralOutcomeDialogProps) {
  const referralStatuses = useStatusCatalog("CASE_REFERRAL").items;
  const updateReferral = useUpdateCaseReferral();
  const [status, setStatus] = useState<CaseReferralOutcomeStatus>(
    getInitialStatus(referral),
  );
  const [outcome, setOutcome] = useState("");

  const submitDisabled = !caseId || !referral || updateReferral.isPending;

  function handleSubmit(): void {
    if (!caseId || !referral) {
      return;
    }

    updateReferral.mutate(
      {
        caseId,
        referralId: referral.id,
        payload: {
          status,
          outcome: outcome.trim() || null,
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
          <DialogTitle>บันทึกผลตอบรับจากหน่วยงาน</DialogTitle>
          <DialogDescription>
            {referral ? referral.agency_name_snapshot : ""}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <FormErrorAlert
              error={updateReferral.error}
              fallback="ไม่สามารถบันทึกผลตอบรับได้ กรุณาลองอีกครั้ง"
            />

            <div className="space-y-2">
              <Label htmlFor="referral-outcome-status">สถานะผลตอบรับ</Label>
              <Combobox
                id="referral-outcome-status"
                onChange={(next) => setStatus(next as CaseReferralOutcomeStatus)}
                options={referralStatuses
                  .filter((item) => item.code !== "SENT")
                  .map((item) => ({ value: item.code, label: item.label }))}
                searchable={false}
                value={status}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referral-outcome-note">รายละเอียดผลตอบรับ</Label>
              <Textarea
                id="referral-outcome-note"
                onChange={(event) => setOutcome(event.target.value)}
                placeholder="เช่น รับเคสเข้าระบบแล้ว / ขอข้อมูลเพิ่ม / ส่งกลับให้ติดตามต่อ"
                value={outcome}
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
            disabled={submitDisabled}
            isLoading={updateReferral.isPending}
            loadingText="กำลังบันทึก"
            onClick={handleSubmit}
            type="button"
          >
            บันทึกผลตอบรับ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
